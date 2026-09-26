/*
 * Flappy Novice — game configuration
 * -----------------------------------------------------------------------------
 * Every gameplay number lives here so the game can be tuned (or pinned down for
 * automated tests) without touching game logic.
 *
 * Units: the world is a fixed 480 × 720 logical canvas. Speeds and forces are
 * expressed "per tick"; the simulation always runs at a fixed 60 ticks/second,
 * regardless of the monitor refresh rate, so physics are deterministic.
 *
 * Scripts are loaded as classic <script> tags (no bundler, no ES modules) so
 * the game also runs by double-clicking index.html. Everything hangs off the
 * single `window.FN` namespace.
 */
(function (FN) {
    'use strict';

    const GAME_CONFIG = {
        // --- Physics (spec values) -------------------------------------------
        gravity: 0.42,            // px / tick²
        jumpStrength: -7.2,       // px / tick (negative = up)
        maxFallSpeed: 10.5,       // terminal velocity
        obstacleSpeed: 3,         // starting scroll speed, px / tick
        maxObstacleSpeed: 5,      // hard cap for difficulty scaling
        obstacleGap: 155,         // vertical opening between the two towers
        obstacleSpacing: 280,     // horizontal distance between tower pairs
        speedRamp: 0.004,         // how quickly speed eases toward the tier target

        // --- World -----------------------------------------------------------
        worldWidth: 480,
        worldHeight: 720,
        groundHeight: 88,         // ground strip at the bottom (groundY = 632)
        tickRate: 60,

        // --- Player ----------------------------------------------------------
        playerX: 120,
        playerStartY: 300,
        playerRadius: 14,         // circular hit-box, deliberately smaller than the sprite
        flapOnStart: true,        // give the novice a hop when a run begins

        // --- Obstacles -------------------------------------------------------
        obstacleWidth: 72,
        capHeight: 26,            // decorative cap / battlement (part of the hit-box)
        capOverhang: 7,           // how far the cap sticks out on each side
        gapMargin: 70,            // min distance between a gap and the ceiling/ground
        firstObstacleOffset: 170, // extra distance before the first tower appears
        autoSpawn: true,          // disable to place obstacles manually in tests

        // --- Collectibles ----------------------------------------------------
        collectibleChance: 0.6,   // chance of loot between two tower pairs

        // --- Scoring ---------------------------------------------------------
        obstaclePoints: 1,

        // --- Difficulty ------------------------------------------------------
        difficultyScaling: true,

        // --- QA / debug ------------------------------------------------------
        seed: null,               // number → deterministic runs; null → random per run
        invincible: false,        // ignore collisions (soak tests, demos)
    };

    /*
     * Difficulty tiers. Each tier nudges the base config rather than replacing
     * it, so tuning `obstacleSpeed` / `obstacleGap` above still shifts every tier.
     * Rank names mirror the Ragna-Memories difficulty ladder.
     */
    const DIFFICULTY_TIERS = [
        { id: 'easy',    label: 'Easy',    rank: 'Novice',      minScore: 0,  speedBonus: 0.0, gapReduction: 0,  maxGapShift: 170, drift: 0 },
        { id: 'medium',  label: 'Medium',  rank: 'Swordsman',   minScore: 10, speedBonus: 0.5, gapReduction: 6,  maxGapShift: 205, drift: 0 },
        { id: 'hard',    label: 'Hard',    rank: 'Knight',      minScore: 25, speedBonus: 1.1, gapReduction: 13, maxGapShift: 240, drift: 0 },
        { id: 'extreme', label: 'Extreme', rank: 'Lord Knight', minScore: 50, speedBonus: 1.8, gapReduction: 20, maxGapShift: 260, drift: 16 },
    ];

    /* Loot that floats between tower pairs. `weight` controls spawn frequency. */
    const COLLECTIBLE_TYPES = {
        zeny:    { id: 'zeny',    label: 'Zeny Coin',     value: 2, weight: 55, radius: 11 },
        potion:  { id: 'potion',  label: 'Red Potion',    value: 3, weight: 22, radius: 12 },
        gem:     { id: 'gem',     label: 'Blue Gemstone', value: 4, weight: 14, radius: 11 },
        crystal: { id: 'crystal', label: 'Kafra Crystal', value: 5, weight: 9,  radius: 13 },
    };

    const OBSTACLE_TYPES = ['wood', 'stone'];

    /* Explicit, centralised state machine values. */
    const GAME_STATES = Object.freeze({
        MENU: 'menu',
        PLAYING: 'playing',
        PAUSED: 'paused',
        GAME_OVER: 'game_over',
    });

    /* Allowed transitions — anything else is rejected by the state machine. */
    const STATE_TRANSITIONS = Object.freeze({
        menu:      ['playing'],
        playing:   ['paused', 'game_over', 'menu', 'playing'], // playing→playing = restart
        paused:    ['playing', 'menu'],
        game_over: ['playing', 'menu'],
    });

    const STORAGE_KEYS = Object.freeze({
        highScore: 'flappy-novice-best',
        sound: 'flappy-novice-sound',
        music: 'flappy-novice-music',
    });

    FN.config = {
        GAME_CONFIG,
        DIFFICULTY_TIERS,
        COLLECTIBLE_TYPES,
        OBSTACLE_TYPES,
        GAME_STATES,
        STATE_TRANSITIONS,
        STORAGE_KEYS,
    };
})(window.FN = window.FN || {});
