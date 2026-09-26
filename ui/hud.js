/*
 * HUD — keeps the DOM in sync with the game: score plaque, best score, rank,
 * difficulty badge, rank progress bar, sound/music toggles and the observable
 * `data-testid="game-state"` element used by automated tests.
 */
(function (FN) {
    'use strict';

    const { DIFFICULTY_TIERS, GAME_STATES } = FN.config;
    FN.ui = FN.ui || {};

    /*
     * Move focus to a dialog button only for keyboard players — mouse/touch
     * players should not see a focus ring pop up on its own.
     */
    let keyboardUser = false;
    window.addEventListener('keydown', () => { keyboardUser = true; }, true);
    window.addEventListener('pointerdown', () => { keyboardUser = false; }, true);
    FN.ui.focusForKeyboard = function focusForKeyboard(el) {
        if (keyboardUser && el) el.focus({ preventScroll: true });
    };

    FN.ui.createHud = function createHud({ game, audio, actions }) {
        const $ = (sel) => document.querySelector(sel);
        const $$ = (sel) => Array.from(document.querySelectorAll(sel));

        const els = {
            score: $('[data-testid="score"]'),
            best: $$('[data-testid="high-score"], [data-testid="menu-high-score"]'),
            rank: $('[data-testid="rank"]'),
            difficulty: $('[data-testid="difficulty"]'),
            nextRank: $('[data-testid="next-rank"]'),
            progress: $('#rank-progress-fill'),
            ladder: $$('.rank-ladder li'),
            state: $('[data-testid="game-state"]'),
            pauseBtn: $('#pause-btn'),
            soundBtn: $('#sound-btn'),
            soundText: $('[data-testid="sound-state"]'),
            musicBtn: $('#music-btn'),
            rankPopup: $('#rank-popup'),
            flapHint: $('#flap-hint'),
        };

        function restartAnimation(el, cls) {
            el.classList.remove(cls);
            void el.offsetWidth; // reflow so the animation can replay
            el.classList.add(cls);
        }

        function renderScore(pulse) {
            els.score.textContent = String(game.score);
            if (pulse) restartAnimation(els.score, 'pulse');
            const live = Math.max(game.highScore, game.score);
            const beating = game.score > 0 && game.score > game.highScore;
            els.best.forEach((el) => {
                el.textContent = String(el.dataset.testid === 'high-score' ? live : game.highScore);
                el.classList.toggle('record', beating && el.dataset.testid === 'high-score');
            });
        }

        function renderTier() {
            const tier = game.tier;
            const index = game.tierIndex;
            const next = DIFFICULTY_TIERS[index + 1];
            els.rank.textContent = tier.rank;
            els.difficulty.textContent = tier.label;
            els.difficulty.dataset.tier = tier.id;
            els.ladder.forEach((li, i) => {
                li.classList.toggle('active', i === index);
                li.classList.toggle('reached', i < index);
            });
            if (next) {
                const span = next.minScore - tier.minScore;
                const pct = Math.max(0, Math.min(100, ((game.score - tier.minScore) / span) * 100));
                els.progress.style.width = `${pct}%`;
                els.nextRank.textContent = `Next: ${next.rank}`;
                els.nextRank.title = `${next.rank} at ${next.minScore} points`;
            } else {
                els.progress.style.width = '100%';
                els.nextRank.textContent = 'Max rank reached!';
            }
        }

        function renderState() {
            const state = game.state;
            els.state.textContent = state;
            document.body.dataset.state = state;
            const canPause = state === GAME_STATES.PLAYING || state === GAME_STATES.PAUSED;
            els.pauseBtn.disabled = !canPause;
            const paused = state === GAME_STATES.PAUSED;
            els.pauseBtn.setAttribute('aria-label', paused ? 'Resume game' : 'Pause game');
            els.pauseBtn.querySelector('.btn-text').textContent = paused ? 'Resume' : 'Pause';
            els.pauseBtn.querySelector('svg').innerHTML = paused ? '<path d="M7 5l12 7-12 7z"/>' : '<path d="M8 5v14M16 5v14"/>';
        }

        function renderAudio() {
            const on = audio.enabled;
            els.soundBtn.setAttribute('aria-pressed', String(on));
            els.soundBtn.setAttribute('aria-label', on ? 'Mute sound' : 'Unmute sound');
            els.soundBtn.title = on ? 'Sound ON (M)' : 'Sound OFF (M)';
            els.soundText.textContent = on ? 'Sound ON' : 'Sound OFF';
            const musicOn = audio.musicEnabled;
            els.musicBtn.setAttribute('aria-pressed', String(musicOn));
            els.musicBtn.setAttribute('aria-label', musicOn ? 'Mute music' : 'Unmute music');
            els.musicBtn.querySelector('.btn-text').textContent = musicOn ? 'Music ON' : 'Music OFF';
        }

        function showRankUp(tier) {
            els.rankPopup.innerHTML = `<small>Rank up</small>${tier.rank}`;
            restartAnimation(els.rankPopup, 'show');
        }

        game.on('score', () => { renderScore(true); renderTier(); });
        game.on('reset', () => { renderScore(false); renderTier(); });
        game.on('tierchange', ({ tier, up }) => { renderTier(); if (up) showRankUp(tier); });
        game.on('statechange', ({ to, reason }) => {
            renderState();
            renderScore(false);
            if (to === GAME_STATES.PLAYING && (reason === 'start' || reason === 'restart')) {
                restartAnimation(els.flapHint, 'show');
            }
        });
        audio.onChange(renderAudio);

        els.pauseBtn.addEventListener('click', () => {
            if (game.state === GAME_STATES.PAUSED) actions.resume();
            else actions.pause();
            els.pauseBtn.blur();
        });
        els.soundBtn.addEventListener('click', () => { actions.toggleSound(); els.soundBtn.blur(); });
        els.musicBtn.addEventListener('click', () => { actions.toggleMusic(); els.musicBtn.blur(); });

        renderScore(false);
        renderTier();
        renderState();
        renderAudio();

        return { renderScore, renderTier, renderState, renderAudio };
    };
})(window.FN = window.FN || {});
