const { test, expect } = require('@playwright/test');
const { openGame, api, startLab, crash, STORAGE_KEY } = require('./helpers');

test.describe('High score', () => {
    test('is stored in localStorage on game over', async ({ page }) => {
        await openGame(page);
        await startLab(page);
        await api(page, 'increaseScore', 7);
        await crash(page);
        expect(await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY)).toBe('7');
        expect(await api(page, 'getHighScore')).toBe(7);
        await expect(page.getByTestId('high-score')).toHaveText('7');
        await expect(page.getByTestId('final-high-score')).toHaveText('7');
        await expect(page.getByTestId('new-record')).toBeVisible();
    });

    test('survives a page refresh', async ({ page }) => {
        await openGame(page);
        await startLab(page);
        await api(page, 'increaseScore', 9);
        await crash(page);
        await page.reload();
        await page.waitForFunction(() => document.body.dataset.ready === 'true');
        expect(await api(page, 'getHighScore')).toBe(9);
        await expect(page.getByTestId('high-score')).toHaveText('9');
        await expect(page.getByTestId('menu-high-score')).toHaveText('9');
    });

    test('a lower score does not overwrite the record', async ({ page }) => {
        await openGame(page);
        await page.evaluate((k) => localStorage.setItem(k, '42'), STORAGE_KEY);
        await page.reload();
        await page.waitForFunction(() => document.body.dataset.ready === 'true');
        await expect(page.getByTestId('menu-high-score')).toHaveText('42');
        await startLab(page);
        await api(page, 'increaseScore', 3);
        await crash(page);
        expect(await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY)).toBe('42');
        await expect(page.getByTestId('final-score')).toHaveText('3');
        await expect(page.getByTestId('final-high-score')).toHaveText('42');
        await expect(page.getByTestId('new-record')).toBeHidden();
    });

    test('corrupted storage falls back to zero', async ({ page }) => {
        await openGame(page);
        await page.evaluate((k) => localStorage.setItem(k, 'not-a-number'), STORAGE_KEY);
        await page.reload();
        await page.waitForFunction(() => document.body.dataset.ready === 'true');
        expect(await api(page, 'getHighScore')).toBe(0);
    });
});
