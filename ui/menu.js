/*
 * Title screen ("Quest Board") and decorative side panels.
 */
(function (FN) {
    'use strict';

    const { GAME_STATES } = FN.config;
    FN.ui = FN.ui || {};

    FN.ui.createMenu = function createMenu({ game, actions }) {
        const screen = document.getElementById('menu-screen');
        const startBtn = document.getElementById('start-btn');
        const portraits = Array.from(document.querySelectorAll('[data-portrait]'));

        startBtn.addEventListener('click', () => actions.start());

        function sync() {
            const visible = game.state === GAME_STATES.MENU;
            screen.hidden = !visible;
        }
        game.on('statechange', sync);
        sync();

        /* Static loot icons in the side panel, drawn with the in-game sprites. */
        function drawLootIcons() {
            const dpr = Math.min(window.devicePixelRatio || 1, 3);
            document.querySelectorAll('canvas[data-item]').forEach((canvas) => {
                const size = canvas.clientWidth || 32;
                canvas.width = Math.round(size * dpr);
                canvas.height = Math.round(size * dpr);
                const ctx = canvas.getContext('2d');
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                ctx.clearRect(0, 0, size, size);
                FN.assets.items.drawItem(ctx, canvas.dataset.item, size / 2, size / 2, 2, 0.4, { glow: true });
            });
        }
        drawLootIcons();

        /* Animate only the portraits that are actually on screen. */
        function animate(time) {
            for (const canvas of portraits) {
                if (canvas.offsetParent === null) continue;
                FN.drawPortrait(canvas, time);
            }
        }

        return { animate, drawLootIcons, focus: () => FN.ui.focusForKeyboard(startBtn) };
    };
})(window.FN = window.FN || {});
