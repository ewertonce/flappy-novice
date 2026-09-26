// @ts-check
const { defineConfig } = require('@playwright/test');

const PORT = Number(process.env.PORT) || 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;

/*
 * Every spec runs on three form factors. Chromium is used for all of them so
 * `npx playwright install chromium` is the only browser download needed.
 */
module.exports = defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
    use: {
        baseURL: BASE_URL,
        browserName: 'chromium',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'desktop',
            use: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
        },
        {
            name: 'tablet',
            use: { viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true },
        },
        {
            name: 'mobile',
            use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true },
        },
    ],
    webServer: {
        command: 'node scripts/serve.mjs',
        url: BASE_URL,
        env: { PORT: String(PORT) },
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
    },
});
