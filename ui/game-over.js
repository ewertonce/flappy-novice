/*
 * Defeat window ("You Died!") — playful MMORPG flavour, never too dramatic.
 * It appears after a short beat so the tumble animation can play first; the
 * game state itself switches to GAME_OVER immediately.
 */
(function (FN) {
    'use strict';

    const { GAME_STATES } = FN.config;
    FN.ui = FN.ui || {};

    const MESSAGES = [
        'Your adventure has ended...',
        'Return to the save point?',
        'Even a Novice falls sometimes.',
        'A wandering jelly giggles at you.',
        'Perhaps pack more Red Potions?',
        'The towers remain undefeated... for now.',
        'Rest a while. The road will wait.',
        'Your Kafra membership is still valid.',
    ];

    FN.ui.createGameOver = function createGameOver({ game, actions, delayMs = 550 }) {
        const screen = document.getElementById('gameover-screen');
        const q = (id) => screen.querySelector(`[data-testid="${id}"]`);
        const restartBtn = document.getElementById('restart-btn');
        let timer = null;

        restartBtn.addEventListener('click', () => actions.restart());
        document.getElementById('gameover-menu-btn').addEventListener('click', () => actions.toMenu());

        function fill() {
            q('final-score').textContent = String(game.score);
            q('final-high-score').textContent = String(game.highScore);
            q('final-towers').textContent = String(game.stats.obstaclesPassed);
            q('final-loot').textContent = String(game.stats.itemsCollected);
            q('new-record').hidden = !game.newHighScore;
            q('gameover-message').textContent = game.newHighScore
                ? 'A new legend is written in the guild records!'
                : MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
        }

        game.on('statechange', ({ to }) => {
            clearTimeout(timer);
            if (to === GAME_STATES.GAME_OVER) {
                fill();
                timer = setTimeout(() => {
                    if (game.state !== GAME_STATES.GAME_OVER) return;
                    screen.hidden = false;
                    FN.ui.focusForKeyboard(restartBtn);
                }, delayMs);
            } else {
                screen.hidden = true;
            }
        });
    };
})(window.FN = window.FN || {});
