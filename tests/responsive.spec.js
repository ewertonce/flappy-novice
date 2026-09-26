const { test, expect } = require('@playwright/test');
const { openGame, api } = require('./helpers');

test.describe('Responsive layout', () => {
    test.beforeEach(async ({ page }) => {
        await openGame(page);
    });

    test('play field is fully visible with a 2:3 aspect ratio', async ({ page }) => {
        const viewport = page.viewportSize();
        const box = await page.getByTestId('game-canvas').boundingBox();
        expect(box).not.toBeNull();
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 0.5);
        expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 0.5);
        expect(box.width / box.height).toBeCloseTo(2 / 3, 2);
    });

    test('game occupies a large share of the viewport', async ({ page }, testInfo) => {
        const viewport = page.viewportSize();
        const box = await page.getByTestId('game-canvas').boundingBox();
        if (testInfo.project.name === 'mobile') {
            expect(box.width / viewport.width).toBeGreaterThan(0.9);
        }
        expect(box.height / viewport.height).toBeGreaterThan(0.55);
    });

    test('page never scrolls', async ({ page }) => {
        const dims = await page.evaluate(() => ({
            sw: document.documentElement.scrollWidth,
            sh: document.documentElement.scrollHeight,
            w: window.innerWidth,
            h: window.innerHeight,
        }));
        expect(dims.sw).toBeLessThanOrEqual(dims.w);
        expect(dims.sh).toBeLessThanOrEqual(dims.h);
    });

    test('touch targets are large enough', async ({ page }) => {
        for (const name of ['Start game', 'Mute sound', 'Mute music']) {
            const box = await page.getByRole('button', { name }).boundingBox();
            expect(box.height, `${name} height`).toBeGreaterThanOrEqual(44);
            expect(box.width, `${name} width`).toBeGreaterThanOrEqual(44);
        }
    });

    test('key text stays readable', async ({ page }) => {
        const sizes = await page.evaluate(() => {
            const px = (sel) => parseFloat(getComputedStyle(document.querySelector(sel)).fontSize);
            return { score: px('[data-testid="score"]'), start: px('#start-btn'), subtitle: px('.subtitle') };
        });
        expect(sizes.score).toBeGreaterThanOrEqual(14);
        expect(sizes.start).toBeGreaterThanOrEqual(14);
        expect(sizes.subtitle).toBeGreaterThanOrEqual(14);
    });

    test('canvas backing store matches its CSS size (crisp on HiDPI)', async ({ page }) => {
        const info = await page.evaluate(() => {
            const c = document.getElementById('game-canvas');
            const r = c.getBoundingClientRect();
            return { w: c.width, cssW: r.width, dpr: Math.min(window.devicePixelRatio, 3) };
        });
        expect(Math.abs(info.w - info.cssW * info.dpr)).toBeLessThanOrEqual(2);
    });

    test('the Novice is clearly visible on screen', async ({ page }) => {
        await api(page, 'startGame');
        const info = await page.evaluate(() => {
            const r = document.getElementById('game-canvas').getBoundingClientRect();
            const cfg = window.FlappyNovice.getConfig();
            const p = window.FlappyNovice.getPlayer();
            return { scale: r.width / cfg.worldWidth, x: p.x, y: p.y, W: cfg.worldWidth, H: cfg.worldHeight };
        });
        // The sprite is ~46 world units wide; require at least ~20 CSS px on any device.
        expect(46 * info.scale).toBeGreaterThan(20);
        expect(info.x).toBeGreaterThan(0);
        expect(info.x).toBeLessThan(info.W);
        expect(info.y).toBeGreaterThan(0);
        expect(info.y).toBeLessThan(info.H);
    });

    test('side panels only appear on wide screens', async ({ page }, testInfo) => {
        const panel = page.getByRole('complementary', { name: 'Loot table and controls' });
        if (testInfo.project.name === 'desktop') await expect(panel).toBeVisible();
        else await expect(panel).toBeHidden();
    });
});
