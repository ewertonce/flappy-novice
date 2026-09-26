const { test, expect } = require('@playwright/test');
const { openGame, api, startLab } = require('./helpers');

test.describe('Scoring', () => {
    test.beforeEach(async ({ page }) => {
        await openGame(page);
        await startLab(page);
    });

    test('passing an obstacle increases the score by one', async ({ page }) => {
        await api(page, 'spawnObstacle', { x: 200, gapY: 300, gap: 220 });
        // Right edge (incl. cap) = 200 + 72 + 7 = 279 → passes x=120 after 54 ticks at speed 3.
        await api(page, 'step', 50);
        expect(await api(page, 'getScore')).toBe(0);
        await api(page, 'step', 10);
        expect(await api(page, 'getScore')).toBe(1);
        await expect(page.getByTestId('score')).toHaveText('1');
        expect(await api(page, 'getGameState')).toBe('playing');
    });

    test('the same obstacle cannot score twice', async ({ page }) => {
        await api(page, 'spawnObstacle', { x: 200, gapY: 300, gap: 220 });
        await api(page, 'step', 60);
        expect(await api(page, 'getScore')).toBe(1);
        await api(page, 'step', 120);
        expect(await api(page, 'getScore')).toBe(1);
        expect((await api(page, 'getStats')).obstaclesPassed).toBe(1);
    });

    test('each obstacle in a row scores exactly once', async ({ page }) => {
        for (let i = 0; i < 3; i++) await api(page, 'spawnObstacle', { x: 200 + i * 150, gapY: 300, gap: 220 });
        await api(page, 'step', 220);
        expect(await api(page, 'getScore')).toBe(3);
    });

    test('collectibles award bonus points', async ({ page }) => {
        await api(page, 'spawnCollectible', { type: 'zeny', x: 150, y: 300 });
        await api(page, 'spawnCollectible', { type: 'crystal', x: 220, y: 300 });
        await api(page, 'step', 45);
        expect(await api(page, 'getScore')).toBe(2 + 5);
        const stats = await api(page, 'getStats');
        expect(stats.itemsCollected).toBe(2);
        expect(stats.loot.crystal).toBe(1);
        expect(await api(page, 'getCollectibles')).toHaveLength(0);
    });

    test('difficulty and rank progress with the score', async ({ page }) => {
        await expect(page.getByTestId('difficulty')).toHaveText('Easy');
        await expect(page.getByTestId('rank')).toHaveText('Novice');
        await api(page, 'increaseScore', 10);
        await expect(page.getByTestId('difficulty')).toHaveText('Medium');
        await expect(page.getByTestId('rank')).toHaveText('Swordsman');
        await api(page, 'increaseScore', 15);
        await expect(page.getByTestId('difficulty')).toHaveText('Hard');
        await api(page, 'increaseScore', 25);
        await expect(page.getByTestId('difficulty')).toHaveText('Extreme');
        await expect(page.getByTestId('rank')).toHaveText('Lord Knight');
    });

    test('speed ramps up with difficulty but never exceeds the cap', async ({ page }) => {
        const { maxObstacleSpeed, obstacleSpeed } = await api(page, 'getConfig');
        await api(page, 'increaseScore', 60);
        const snap = await api(page, 'step', 2000);
        expect(snap.speed).toBeGreaterThan(obstacleSpeed);
        expect(snap.speed).toBeLessThanOrEqual(maxObstacleSpeed);
    });

    test('the same seed produces the same obstacle layout', async ({ page }) => {
        await api(page, 'setConfig', { autoSpawn: true, gravity: 0, invincible: true });
        await api(page, 'setSeed', 42);
        await api(page, 'restartGame');
        const first = (await api(page, 'step', 300)).obstacles.map((o) => Math.round(o.gapY));
        await api(page, 'restartGame');
        const second = (await api(page, 'step', 300)).obstacles.map((o) => Math.round(o.gapY));
        expect(first.length).toBeGreaterThan(1);
        expect(second).toEqual(first);
    });
});
