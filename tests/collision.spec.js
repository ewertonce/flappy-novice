const { test, expect } = require('@playwright/test');
const { openGame, api, startLab } = require('./helpers');

test.describe('Collision', () => {
    test.beforeEach(async ({ page }) => {
        await openGame(page);
        await startLab(page);
    });

    test('hitting a tower triggers GAME_OVER', async ({ page }) => {
        // Gap far above the Novice (who hovers at y=300) → the bottom tower is in the way.
        await api(page, 'spawnObstacle', { x: 150, gapY: 100, gap: 120 });
        expect((await api(page, 'checkCollision')).collided).toBe(false);
        // Tower body starts at x=150; the Novice's right edge is 120 + 14 = 134 → contact after 6 ticks.
        await api(page, 'step', 5);
        expect(await api(page, 'getGameState')).toBe('playing');
        await api(page, 'step', 2);
        expect(await api(page, 'getGameState')).toBe('game_over');
        const hit = await api(page, 'checkCollision');
        expect(hit.collided).toBe(true);
        expect(hit.type).toBe('obstacle');
        await expect(page.getByTestId('game-state')).toHaveText('game_over');
        await expect(page.getByRole('heading', { name: 'You Died!' })).toBeVisible();
    });

    test('hitting the ground triggers GAME_OVER', async ({ page }) => {
        await api(page, 'setConfig', { gravity: 0.42 });
        await api(page, 'setPlayer', { y: 600, vy: 6 });
        await api(page, 'step', 10);
        expect(await api(page, 'getGameState')).toBe('game_over');
    });

    test('flying through the gap is safe', async ({ page }) => {
        await api(page, 'spawnObstacle', { x: 150, gapY: 300, gap: 155 });
        await api(page, 'step', 80);
        expect(await api(page, 'getGameState')).toBe('playing');
        expect(await api(page, 'getScore')).toBe(1);
    });

    test('the ceiling is solid but not deadly', async ({ page }) => {
        await api(page, 'setPlayer', { y: 20, vy: -10 });
        await api(page, 'step', 5);
        const p = await api(page, 'getPlayer');
        expect(p.y).toBeGreaterThanOrEqual(p.radius);
        expect(await api(page, 'getGameState')).toBe('playing');
    });

    test('the game stops after a collision', async ({ page }) => {
        await api(page, 'spawnObstacle', { x: 150, gapY: 100, gap: 120 });
        await api(page, 'spawnObstacle', { x: 420, gapY: 300 });
        await api(page, 'step', 8);
        expect(await api(page, 'getGameState')).toBe('game_over');
        const before = await api(page, 'getSnapshot');
        await api(page, 'step', 60);
        const after = await api(page, 'getSnapshot');
        expect(after.obstacles.map((o) => o.x)).toEqual(before.obstacles.map((o) => o.x));
        expect(after.score).toBe(before.score);
        expect(await api(page, 'flap')).toBe(false);
        expect(after.state).toBe('game_over');
    });

    test('invincible mode (QA) ignores collisions', async ({ page }) => {
        await api(page, 'setConfig', { invincible: true });
        await api(page, 'spawnObstacle', { x: 150, gapY: 100, gap: 120 });
        await api(page, 'step', 40);
        expect(await api(page, 'getGameState')).toBe('playing');
    });
});
