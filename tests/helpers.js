// Shared helpers for the Flappy Novice Playwright suite.
const { expect } = require('@playwright/test');

const STORAGE_KEY = 'flappy-novice-best';

/**
 * Open the game in a deterministic configuration.
 *  - seed:   fixed RNG seed so obstacle layouts are reproducible
 *  - manual: freeze the real-time loop; the test advances ticks with step(n)
 */
async function openGame(page, { seed = 1234, manual = true } = {}) {
    // Keep the suite hermetic: web fonts are decorative and may be offline.
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
    const params = new URLSearchParams({ seed: String(seed) });
    if (manual) params.set('manual', '1');
    await page.goto(`/?${params}`);
    await page.waitForFunction(() => window.FlappyNovice && document.body.dataset.ready === 'true');
}

/** Run a FlappyNovice API method in the page. */
function api(page, method, ...args) {
    return page.evaluate(([m, a]) => {
        const path = m.split('.');
        let target = window.FlappyNovice;
        for (let i = 0; i < path.length - 1; i++) target = target[path[i]];
        return target[path[path.length - 1]](...a);
    }, [method, args]);
}

/**
 * A controlled "lab" setup: no gravity, no automatic spawning, no loot and no
 * start hop — the Novice hangs still until the test moves things.
 */
async function startLab(page, config = {}) {
    await api(page, 'setConfig', {
        gravity: 0,
        autoSpawn: false,
        collectibleChance: 0,
        flapOnStart: false,
        ...config,
    });
    await api(page, 'startGame');
    await api(page, 'clearObstacles');
    await api(page, 'setPlayer', { y: 300, vy: 0 });
}

/** Crash the Novice into the ground in a couple of ticks. */
async function crash(page) {
    await api(page, 'setConfig', { gravity: 0.42 });
    await api(page, 'setPlayer', { y: 615, vy: 8 });
    await api(page, 'step', 3);
    await expect(page.getByTestId('game-state')).toHaveText('game_over');
}

module.exports = { openGame, api, startLab, crash, STORAGE_KEY };
