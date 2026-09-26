const { test, expect } = require('@playwright/test');
const { openGame, api, startLab } = require('./helpers');

test.describe('Controls', () => {
    test.beforeEach(async ({ page }) => {
        await openGame(page);
        await startLab(page);
        await api(page, 'setPlayer', { y: 300, vy: 4 }); // falling
    });

    test('Space makes the Novice jump', async ({ page }) => {
        const { jumpStrength } = await api(page, 'getConfig');
        await page.keyboard.press('Space');
        const player = await api(page, 'getPlayer');
        expect(player.vy).toBeCloseTo(jumpStrength);
        await api(page, 'step', 5);
        expect((await api(page, 'getPlayer')).y).toBeLessThan(300);
    });

    test('ArrowUp also flaps', async ({ page }) => {
        await page.keyboard.press('ArrowUp');
        expect((await api(page, 'getPlayer')).vy).toBeLessThan(0);
    });

    test('mouse click on the play field makes the Novice jump', async ({ page }) => {
        const before = (await api(page, 'getPlayer')).flaps;
        await page.getByTestId('game-canvas').click({ position: { x: 60, y: 120 } });
        const player = await api(page, 'getPlayer');
        expect(player.flaps).toBe(before + 1);
        expect(player.vy).toBeLessThan(0);
    });

    test('Escape pauses and resumes', async ({ page }) => {
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('game-state')).toHaveText('paused');
        await expect(page.getByRole('heading', { name: 'Paused' })).toBeVisible();
        // flapping is ignored while paused
        await page.keyboard.press('Space');
        expect((await api(page, 'getPlayer')).vy).toBe(4);
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('game-state')).toHaveText('playing');
    });

    test('pause button and resume button work', async ({ page }) => {
        await page.getByRole('button', { name: 'Pause game' }).click();
        await expect(page.getByTestId('game-state')).toHaveText('paused');
        await page.getByRole('button', { name: 'Resume game' }).first().click();
        await expect(page.getByTestId('game-state')).toHaveText('playing');
    });

    test('the world does not move while paused', async ({ page }) => {
        await api(page, 'spawnObstacle', { x: 400, gapY: 300 });
        await api(page, 'pauseGame');
        const before = await api(page, 'getSnapshot');
        await api(page, 'step', 30);
        const after = await api(page, 'getSnapshot');
        expect(after.obstacles[0].x).toBe(before.obstacles[0].x);
        expect(after.player.y).toBe(before.player.y);
    });

    test('keyboard input never scrolls the page', async ({ page }) => {
        for (let i = 0; i < 5; i++) await page.keyboard.press('Space');
        expect(await page.evaluate(() => window.scrollY)).toBe(0);
    });
});

test.describe('Touch controls', () => {
    test.use({ hasTouch: true });

    test('tap on the play field makes the Novice jump', async ({ page }) => {
        await openGame(page);
        await startLab(page);
        await api(page, 'setPlayer', { y: 300, vy: 4 });
        const before = (await api(page, 'getPlayer')).flaps;
        await page.getByTestId('game-canvas').tap({ position: { x: 80, y: 160 } });
        const player = await api(page, 'getPlayer');
        expect(player.flaps).toBe(before + 1);
        expect(player.vy).toBeLessThan(0);
    });

    test('tapping the Start button starts the game', async ({ page }) => {
        await openGame(page);
        await page.getByRole('button', { name: 'Start game' }).tap();
        await expect(page.getByTestId('game-state')).toHaveText('playing');
    });
});
