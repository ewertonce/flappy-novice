/*
 * Input system — keyboard, mouse and touch, unified.
 *
 *   SPACE / ↑ / W   flap (also starts the game from the title screen)
 *   CLICK / TAP     flap (on the play field)
 *   ENTER           start / restart / resume
 *   ESC / P         pause / resume
 *   M               toggle sound
 *
 * Pointer events cover mouse, pen and touch with a single code path. The play
 * field uses `touch-action: none` and touch listeners call preventDefault(), so
 * tapping quickly never scrolls or zooms the page.
 */
(function (FN) {
    'use strict';

    const { GAME_STATES } = FN.config;

    function isTypingTarget(el) {
        return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    }

    function createInput({ game, surface, actions }) {
        const onKeyDown = (e) => {
            if (isTypingTarget(e.target)) return;
            const state = game.state;
            switch (e.code) {
                case 'Space':
                case 'ArrowUp':
                case 'KeyW':
                    e.preventDefault(); // no page scroll, no accidental button activation
                    if (e.repeat) return;
                    if (state === GAME_STATES.PLAYING) actions.flap();
                    else if (state === GAME_STATES.MENU && e.code === 'Space') actions.start();
                    break;
                case 'Enter':
                case 'NumpadEnter':
                    e.preventDefault();
                    if (e.repeat) return;
                    if (state === GAME_STATES.MENU) actions.start();
                    else if (state === GAME_STATES.GAME_OVER) actions.restart();
                    else if (state === GAME_STATES.PAUSED) actions.resume();
                    break;
                case 'Escape':
                case 'KeyP':
                    if (state === GAME_STATES.PLAYING) { e.preventDefault(); actions.pause(); }
                    else if (state === GAME_STATES.PAUSED) { e.preventDefault(); actions.resume(); }
                    break;
                case 'KeyM':
                    actions.toggleSound();
                    break;
                default:
                    break;
            }
        };

        const onPointerDown = (e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            if (game.state === GAME_STATES.PLAYING) {
                e.preventDefault();
                actions.flap();
            }
        };

        const blockTouch = (e) => {
            if (e.cancelable) e.preventDefault();
        };

        /* While playing, stop pull-to-refresh / overscroll anywhere on the page. */
        const blockPageScroll = (e) => {
            if (game.state === GAME_STATES.PLAYING && e.cancelable) e.preventDefault();
        };

        window.addEventListener('keydown', onKeyDown);
        surface.addEventListener('pointerdown', onPointerDown);
        surface.addEventListener('touchstart', blockTouch, { passive: false });
        surface.addEventListener('touchmove', blockTouch, { passive: false });
        surface.addEventListener('contextmenu', (e) => e.preventDefault());
        document.addEventListener('touchmove', blockPageScroll, { passive: false });
        surface.addEventListener('dblclick', (e) => e.preventDefault());

        return {
            destroy() {
                window.removeEventListener('keydown', onKeyDown);
                surface.removeEventListener('pointerdown', onPointerDown);
                surface.removeEventListener('touchstart', blockTouch);
                surface.removeEventListener('touchmove', blockTouch);
                document.removeEventListener('touchmove', blockPageScroll);
            },
        };
    }

    FN.createInput = createInput;
})(window.FN = window.FN || {});
