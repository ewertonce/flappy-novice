const { test, expect } = require('@playwright/test');
const { openGame, api } = require('./helpers');

test.describe('Start', () => {
    test('game loads with the title screen', async ({ page }) => {
        await openGame(page);
        await expect(page).toHaveTitle(/Flappy Novice/);
        await expect(page.getByRole('heading', { name: /Flappy\s*Novice/ })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Start game' })).toBeVisible();
        await expect(page.getByTestId('game-state')).toHaveText('menu');
        await expect(page.getByTestId('score')).toHaveText('0');
        await expect(page.getByTestId('game-canvas')).toBeVisible();
        expect(await api(page, 'getGameState')).toBe('menu');
    });

    test('start button switches the state to PLAYING', async ({ page }) => {
        await openGame(page);
        await page.getByRole('button', { name: 'Start game' }).click();
        await expect(page.getByTestId('game-state')).toHaveText('playing');
        await expect(page.locator('#menu-screen')).toBeHidden();
        expect(await api(page, 'getGameState')).toBe('playing');
        await expect(page.locator('body')).toHaveAttribute('data-state', 'playing');
    });

    test('Enter starts the game from the menu', async ({ page }) => {
        await openGame(page);
        await page.keyboard.press('Enter');
        await expect(page.getByTestId('game-state')).toHaveText('playing');
    });

    test('Space starts the game from the menu', async ({ page }) => {
        await openGame(page);
        await page.keyboard.press('Space');
        await expect(page.getByTestId('game-state')).toHaveText('playing');
    });

    test('the real-time loop advances the world once playing', async ({ page }) => {
        await openGame(page, { manual: false });
        await api(page, 'setConfig', { invincible: true });
        await page.getByRole('button', { name: 'Start game' }).click();
        await expect.poll(async () => (await api(page, 'getSnapshot')).tick, { timeout: 5000 }).toBeGreaterThan(20);
        const obstacles = await api(page, 'getObstacles');
        expect(obstacles.length).toBeGreaterThan(0);
    });
});
