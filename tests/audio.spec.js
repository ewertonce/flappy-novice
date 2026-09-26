const { test, expect } = require('@playwright/test');
const { openGame, api, startLab } = require('./helpers');

test.describe('Audio', () => {
    test('sound can be turned off and on', async ({ page }) => {
        await openGame(page);
        const toggle = page.getByTestId('sound-toggle');
        await expect(toggle).toHaveAttribute('aria-label', 'Mute sound');
        await expect(page.getByTestId('sound-state')).toHaveText('Sound ON');

        await page.getByRole('button', { name: 'Mute sound' }).click();
        await expect(toggle).toHaveAttribute('aria-label', 'Unmute sound');
        await expect(toggle).toHaveAttribute('aria-pressed', 'false');
        await expect(page.getByTestId('sound-state')).toHaveText('Sound OFF');
        expect(await api(page, 'audio.isEnabled')).toBe(false);

        await page.getByRole('button', { name: 'Unmute sound' }).click();
        await expect(page.getByTestId('sound-state')).toHaveText('Sound ON');
        expect(await api(page, 'audio.isEnabled')).toBe(true);
    });

    test('the sound preference persists across reloads', async ({ page }) => {
        await openGame(page);
        await page.getByRole('button', { name: 'Mute sound' }).click();
        await page.reload();
        await page.waitForFunction(() => document.body.dataset.ready === 'true');
        await expect(page.getByTestId('sound-state')).toHaveText('Sound OFF');
        expect(await api(page, 'audio.isEnabled')).toBe(false);
    });

    test('muted games play no sound effects', async ({ page }) => {
        await openGame(page);
        await startLab(page);
        await api(page, 'audio.clearHistory');
        await page.keyboard.press('Space');
        expect(await api(page, 'audio.getHistory')).toContain('flap');

        await api(page, 'audio.setEnabled', false);
        await api(page, 'audio.clearHistory');
        await page.keyboard.press('Space');
        expect(await api(page, 'audio.getHistory')).toEqual([]);
        expect(await api(page, 'audio.getLastSound')).toBeNull();
    });

    test('M key toggles sound', async ({ page }) => {
        await openGame(page);
        await page.keyboard.press('m');
        await expect(page.getByTestId('sound-state')).toHaveText('Sound OFF');
        await page.keyboard.press('m');
        await expect(page.getByTestId('sound-state')).toHaveText('Sound ON');
    });

    test('music can be toggled independently', async ({ page }) => {
        await openGame(page);
        await page.getByRole('button', { name: 'Mute music' }).click();
        await expect(page.getByTestId('music-toggle')).toHaveAttribute('aria-pressed', 'false');
        expect(await api(page, 'audio.isMusicEnabled')).toBe(false);
        expect(await api(page, 'audio.isEnabled')).toBe(true);
    });

    test('game events trigger the matching sound effects', async ({ page }) => {
        await openGame(page);
        await startLab(page);
        await api(page, 'audio.clearHistory');
        await api(page, 'spawnCollectible', { type: 'crystal', x: 130, y: 300 });
        await api(page, 'step', 2);
        expect(await api(page, 'audio.getHistory')).toContain('collect-crystal');
    });
});
