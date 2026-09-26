const { test, expect } = require('@playwright/test');
const { openGame, api, startLab, crash } = require('./helpers');

test.describe('Restart', () => {
    test.beforeEach(async ({ page }) => {
        await openGame(page);
        await startLab(page);
        await api(page, 'spawnObstacle', { x: 300, gapY: 300 });
        await api(page, 'increaseScore', 6);
        await crash(page);
        await expect(page.getByRole('button', { name: 'Restart game' })).toBeVisible();
    });

    test('Try Again resets score, player and obstacles and returns to PLAYING', async ({ page }) => {
        const { playerStartY } = await api(page, 'getConfig');
        await page.getByRole('button', { name: 'Restart game' }).click();

        await expect(page.getByTestId('game-state')).toHaveText('playing');
        await expect(page.getByTestId('score')).toHaveText('0');
        expect(await api(page, 'getScore')).toBe(0);

        const player = await api(page, 'getPlayer');
        expect(player.y).toBe(playerStartY);
        expect(player.rotation).toBe(0);

        // No leftovers from the previous run.
        expect(await api(page, 'getObstacles')).toHaveLength(0);
        expect(await api(page, 'getCollectibles')).toHaveLength(0);
        await expect(page.locator('#gameover-screen')).toBeHidden();
    });

    test('fresh obstacles spawn off-screen after a restart', async ({ page }) => {
        await page.getByRole('button', { name: 'Restart game' }).click();
        await api(page, 'setConfig', { autoSpawn: true });
        const { worldWidth } = await api(page, 'getConfig');
        const snap = await api(page, 'step', 1);
        expect(snap.obstacles.length).toBeGreaterThan(0);
        for (const o of snap.obstacles) expect(o.x).toBeGreaterThanOrEqual(worldWidth);
    });

    test('Enter restarts from the game over screen', async ({ page }) => {
        await page.keyboard.press('Enter');
        await expect(page.getByTestId('game-state')).toHaveText('playing');
        expect(await api(page, 'getScore')).toBe(0);
    });

    test('Return to Save Point goes back to the title screen', async ({ page }) => {
        await page.getByRole('button', { name: 'Return to main menu' }).click();
        await expect(page.getByTestId('game-state')).toHaveText('menu');
        await expect(page.getByRole('button', { name: 'Start game' })).toBeVisible();
    });
});

test('restart from the pause window', async ({ page }) => {
    await openGame(page);
    await startLab(page);
    await api(page, 'increaseScore', 4);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Restart game' }).click();
    await expect(page.getByTestId('game-state')).toHaveText('playing');
    await expect(page.getByTestId('score')).toHaveText('0');
});
