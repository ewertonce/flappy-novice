const { test, expect } = require('@playwright/test');
const { openGame, api, startLab, crash } = require('./helpers');

test.describe('State machine', () => {
    test('exposes the four explicit states', async ({ page }) => {
        await openGame(page);
        const states = await page.evaluate(() => window.FlappyNovice.GAME_STATES);
        expect(states).toEqual({ MENU: 'menu', PLAYING: 'playing', PAUSED: 'paused', GAME_OVER: 'game_over' });
    });

    test('rejects transitions that make no sense', async ({ page }) => {
        await openGame(page);
        expect(await api(page, 'pauseGame')).toBe(false);   // menu → paused
        expect(await api(page, 'resumeGame')).toBe(false);  // menu → playing via resume
        expect(await api(page, 'getGameState')).toBe('menu');

        await startLab(page);
        expect(await api(page, 'resumeGame')).toBe(false);  // not paused
        await crash(page);
        expect(await api(page, 'pauseGame')).toBe(false);   // game_over → paused
        expect(await api(page, 'getGameState')).toBe('game_over');
    });

    test('walks the full happy path', async ({ page }) => {
        await openGame(page);
        const seen = [];
        await page.exposeFunction('recordState', (s) => seen.push(s));
        await page.evaluate(() => window.FlappyNovice.on('statechange', ({ to }) => window.recordState(to)));
        await startLab(page);
        await api(page, 'pauseGame');
        await api(page, 'resumeGame');
        await crash(page);
        await api(page, 'restartGame');
        await api(page, 'goToMenu');
        await expect.poll(() => seen.length).toBe(6);
        expect(seen).toEqual(['playing', 'paused', 'playing', 'game_over', 'playing', 'menu']);
    });

    test('auto-pauses when the tab is hidden', async ({ page }) => {
        await openGame(page);
        await startLab(page);
        await page.evaluate(() => {
            Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
            document.dispatchEvent(new Event('visibilitychange'));
        });
        await expect(page.getByTestId('game-state')).toHaveText('paused');
    });
});
