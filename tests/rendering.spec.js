const { test, expect } = require('@playwright/test');
const { openGame, api, startLab, crash } = require('./helpers');

/*
 * Regression tests for interpolation jitter on frozen entities.
 *
 * The renderer draws entities at lerp(prev, current, alpha), where alpha is the
 * real-time loop's fractional tick. Once the simulation stops advancing an
 * entity (game over, pause) its prev/current stay one tick apart, so a varying
 * alpha made it wobble on every frame. Manual mode always renders with
 * alpha = 1 and hides the bug, so these tests set the scene up in manual mode
 * and then hand control back to the real-time loop to watch the drawn positions.
 */

/** Record where the first obstacle and the player are drawn on each frame. */
async function installDrawRecorder(page) {
    await page.evaluate(() => {
        const lerp = (a, b, t) => a + (b - a) * t;
        const proto = window.FN.Renderer.prototype;
        const { drawObstacles, drawPlayer } = proto;
        window.__drawn = { towerX: [], playerY: [] };
        proto.drawObstacles = function (ctx, alpha, t) {
            const o = this.game.obstacles[0];
            if (o) window.__drawn.towerX.push(lerp(o.prevX, o.x, alpha));
            return drawObstacles.call(this, ctx, alpha, t);
        };
        proto.drawPlayer = function (ctx, alpha, t) {
            const p = this.game.player;
            window.__drawn.playerY.push(lerp(p.prevY, p.y, alpha));
            return drawPlayer.call(this, ctx, alpha, t);
        };
    });
}

/** Run the real-time loop for `frames` animation frames and return what was drawn. */
async function recordRealTimeFrames(page, frames = 45) {
    await page.evaluate(() => { window.__drawn.towerX = []; window.__drawn.playerY = []; });
    await api(page, 'setManualMode', false);
    return page.evaluate(async (n) => {
        for (let i = 0; i < n; i++) await new Promise((r) => requestAnimationFrame(r));
        return window.__drawn;
    }, frames);
}

const spread = (values) => Math.max(...values) - Math.min(...values);

test.describe('Rendering', () => {
    test.beforeEach(async ({ page }) => {
        await openGame(page);
        await installDrawRecorder(page);
    });

    test('towers stay still after game over', async ({ page }) => {
        await startLab(page);
        await api(page, 'spawnObstacle', { x: 300, gapY: 300 });
        await api(page, 'step', 5); // the tower scrolls, so its prevX trails x
        await crash(page);

        const { towerX, playerY } = await recordRealTimeFrames(page);
        expect(towerX.length).toBeGreaterThan(10);
        expect(spread(towerX)).toBe(0);
        // Once the Novice has landed it must not wobble either.
        expect(spread(playerY.slice(-10))).toBe(0);
    });

    test('player and towers stay still while paused', async ({ page }) => {
        await startLab(page, { gravity: 0.42 });
        await api(page, 'spawnObstacle', { x: 300, gapY: 300 });
        await api(page, 'setPlayer', { y: 300, vy: -4 });
        await api(page, 'step', 3); // mid-flight: prevY trails y
        await api(page, 'pauseGame');
        await expect(page.getByTestId('game-state')).toHaveText('paused');

        const { towerX, playerY } = await recordRealTimeFrames(page);
        expect(playerY.length).toBeGreaterThan(10);
        expect(spread(playerY)).toBe(0);
        expect(spread(towerX)).toBe(0);
    });
});
