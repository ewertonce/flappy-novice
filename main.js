/*
 * Flappy Novice — bootstrap
 * -----------------------------------------------------------------------------
 * Wires the pure game logic to the renderer, UI, audio and input, runs the
 * fixed-timestep loop with requestAnimationFrame, and exposes a small public
 * API on `window.FlappyNovice` for QA / Playwright.
 *
 * URL parameters (handy for testing and bug reports):
 *   ?seed=1234   deterministic obstacle / loot layout
 *   ?manual=1    freeze the simulation; advance it only with FlappyNovice.step(n)
 *   ?hitbox=1    draw the player's collision circle
 */
(function (FN) {
    'use strict';

    const { GAME_STATES } = FN.config;
    const STEP_MS = 1000 / 60;

    const params = new URLSearchParams(window.location.search);
    const overrides = {};
    if (params.has('seed') && params.get('seed') !== '') overrides.seed = Number(params.get('seed')) >>> 0;

    const game = new FN.Game(overrides);
    const audio = new FN.AudioSystem();
    const canvas = document.getElementById('game-canvas');
    const stage = document.getElementById('stage');
    const renderer = new FN.Renderer(canvas, game);
    renderer.debugHitbox = params.get('hitbox') === '1';

    let manual = params.get('manual') === '1';

    /* ------------------------------------------------------------------ */
    /* Actions (shared by buttons, keyboard, pointer and the public API)   */
    /* ------------------------------------------------------------------ */
    const blurActive = () => {
        if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    };
    const actions = {
        start() { audio.unlock(); blurActive(); return game.startGame(); },
        restart() { audio.unlock(); blurActive(); return game.restartGame(); },
        flap() { audio.unlock(); return game.flap(); },
        pause() { return game.pauseGame(); },
        resume() { blurActive(); return game.resumeGame(); },
        toMenu() { const ok = game.goToMenu(); if (ok) menu.focus(); return ok; },
        toggleSound() { return audio.toggle(); },
        toggleMusic() {
            const on = audio.toggleMusic();
            if (on && game.state === GAME_STATES.PLAYING) audio.startMusic();
            return on;
        },
    };

    /* ------------------------------------------------------------------ */
    /* UI + audio wiring                                                   */
    /* ------------------------------------------------------------------ */
    FN.ui.createHud({ game, audio, actions });
    const menu = FN.ui.createMenu({ game, actions });
    FN.ui.createPause({ game, actions });
    FN.ui.createGameOver({ game, actions });
    FN.createInput({ game, surface: canvas, actions });

    game.on('flap', () => audio.play('flap'));
    game.on('score', ({ reason }) => { if (reason === 'obstacle') audio.play('score'); });
    game.on('collect', ({ type }) => audio.play(`collect-${type}`));
    game.on('hit', () => audio.play('hit'));
    game.on('tierchange', ({ up }) => { if (up) audio.play('rankup'); });
    game.on('statechange', ({ to, reason }) => {
        switch (to) {
            case GAME_STATES.PLAYING:
                if (reason === 'resume') audio.play('click');
                else audio.play('start');
                audio.startMusic();
                break;
            case GAME_STATES.PAUSED:
                audio.play('pause');
                audio.stopMusic();
                break;
            case GAME_STATES.GAME_OVER:
                audio.stopMusic();
                audio.play('gameover');
                break;
            case GAME_STATES.MENU:
                audio.stopMusic();
                audio.play('click');
                break;
            default:
                break;
        }
    });

    // Auto-pause when the tab is hidden — nobody likes dying off-screen.
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && game.state === GAME_STATES.PLAYING) game.pauseGame();
    });

    /* ------------------------------------------------------------------ */
    /* Responsive canvas                                                   */
    /* ------------------------------------------------------------------ */
    const onResize = () => { renderer.resize(); menu.drawLootIcons(); };
    window.addEventListener('resize', onResize);
    if ('ResizeObserver' in window) new ResizeObserver(() => renderer.resize()).observe(stage);

    /* ------------------------------------------------------------------ */
    /* Main loop: fixed 60 Hz simulation, render every animation frame     */
    /* ------------------------------------------------------------------ */
    let last = performance.now();
    let acc = 0;
    let uiTime = 0;

    function frame(now) {
        let dt = now - last;
        last = now;
        if (dt > 250) dt = 250; // tab was asleep — don't fast-forward the world

        if (!manual) {
            acc += dt;
            let steps = 0;
            while (acc >= STEP_MS && steps < 8) {
                game.update();
                acc -= STEP_MS;
                steps += 1;
            }
            if (steps === 8) acc = 0;
        }

        renderer.render(manual ? 1 : acc / STEP_MS, dt / 1000);
        uiTime += dt / 1000;
        menu.animate(uiTime);
        window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame(frame);

    /* ------------------------------------------------------------------ */
    /* Public, test-friendly API                                           */
    /* ------------------------------------------------------------------ */
    const api = {
        version: '1.0.0',
        GAME_STATES,

        // lifecycle
        startGame: () => actions.start(),
        pauseGame: () => actions.pause(),
        resumeGame: () => actions.resume(),
        restartGame: () => actions.restart(),
        goToMenu: () => actions.toMenu(),
        resetGame: () => { game.resetGame(); return game.snapshot(); },
        flap: () => actions.flap(),

        // world manipulation
        spawnObstacle: (opts) => game.spawnObstacle(opts).snapshot(),
        spawnCollectible: (opts) => game.spawnCollectible(opts).snapshot(),
        clearObstacles: () => { game.clearObstacles(); return true; },
        increaseScore: (amount = 1) => game.increaseScore(amount, 'manual'),
        checkCollision: () => game.checkCollision(),
        setPlayer: (opts) => game.setPlayer(opts),

        // queries
        getGameState: () => game.getGameState(),
        getScore: () => game.getScore(),
        getHighScore: () => game.getHighScore(),
        resetHighScore: () => { game.resetHighScore(); return 0; },
        getPlayer: () => game.player.snapshot(),
        getObstacles: () => game.obstacles.map((o) => o.snapshot()),
        getCollectibles: () => game.collectibles.map((c) => c.snapshot()),
        getStats: () => JSON.parse(JSON.stringify(game.stats)),
        getSnapshot: () => game.snapshot(),
        getTier: () => ({ ...game.tier }),

        // configuration / determinism
        getConfig: () => ({ ...game.config }),
        setConfig: (partial) => game.setConfig(partial),
        setSeed: (seed) => game.setSeed(seed),
        getSeed: () => game.seed,
        step: (n = 1) => {
            for (let i = 0; i < n; i++) game.update();
            return game.snapshot();
        },
        setManualMode: (on = true) => { manual = !!on; acc = 0; return manual; },
        isManualMode: () => manual,
        setDebugHitboxes: (on = true) => { renderer.debugHitbox = !!on; return renderer.debugHitbox; },

        // audio
        audio: {
            isEnabled: () => audio.enabled,
            setEnabled: (on) => audio.setEnabled(on),
            toggle: () => actions.toggleSound(),
            isMusicEnabled: () => audio.musicEnabled,
            setMusicEnabled: (on) => audio.setMusicEnabled(on),
            isMusicPlaying: () => audio.music.playing,
            getLastSound: () => audio.lastSound,
            getHistory: () => audio.history.slice(),
            clearHistory: () => { audio.history.length = 0; audio.lastSound = null; },
        },

        on: (event, fn) => game.on(event, fn),
        game, // raw access for advanced debugging
    };

    window.FlappyNovice = api;
    document.body.dataset.ready = 'true';
})(window.FN = window.FN || {});
