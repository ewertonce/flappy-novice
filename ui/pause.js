/*
 * Pause window ("Resting at the Inn").
 */
(function (FN) {
    'use strict';

    const { GAME_STATES } = FN.config;
    FN.ui = FN.ui || {};

    FN.ui.createPause = function createPause({ game, actions }) {
        const screen = document.getElementById('pause-screen');
        const score = screen.querySelector('[data-testid="pause-score"]');
        const resumeBtn = document.getElementById('resume-btn');

        resumeBtn.addEventListener('click', () => actions.resume());
        document.getElementById('pause-restart-btn').addEventListener('click', () => actions.restart());
        document.getElementById('pause-menu-btn').addEventListener('click', () => actions.toMenu());

        game.on('statechange', ({ to }) => {
            const visible = to === GAME_STATES.PAUSED;
            screen.hidden = !visible;
            if (visible) {
                score.textContent = String(game.score);
                FN.ui.focusForKeyboard(resumeBtn);
            }
        });
    };
})(window.FN = window.FN || {});
