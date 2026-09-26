/*
 * Flappy Novice — core game logic
 * -----------------------------------------------------------------------------
 * The Game class owns the simulation: state machine, physics, spawning,
 * scoring, collisions and difficulty. It knows nothing about the DOM or the
 * canvas. Renderer, UI, audio and input subscribe to its events instead.
 *
 * update() advances exactly one fixed 60 Hz tick, so the same seed + the same
 * inputs on the same ticks always produce the same run.
 */
(function (FN) {
    'use strict';

    const { GAME_CONFIG, DIFFICULTY_TIERS, COLLECTIBLE_TYPES, OBSTACLE_TYPES, GAME_STATES, STATE_TRANSITIONS, STORAGE_KEYS } = FN.config;

    class Game {
        constructor(overrides = {}) {
            this.config = { ...GAME_CONFIG, ...overrides };
            this.listeners = {};
            this.fsm = new FN.StateMachine(GAME_STATES.MENU, STATE_TRANSITIONS);
            this.fsm.onChange((change) => this.emit('statechange', change));
            this.highScore = FN.storage.readNumber(STORAGE_KEYS.highScore, 0);
            this.player = new FN.Player(this.config);
            this.menuTick = 0;
            this.resetGame();
        }

        /* ------------------------------------------------------------------ */
        /* Events                                                              */
        /* ------------------------------------------------------------------ */
        on(event, fn) {
            (this.listeners[event] = this.listeners[event] || []).push(fn);
            return () => { this.listeners[event] = this.listeners[event].filter((f) => f !== fn); };
        }

        emit(event, payload) {
            (this.listeners[event] || []).forEach((fn) => {
                try { fn(payload); } catch (err) { console.error(`[FlappyNovice] listener for "${event}" failed`, err); }
            });
        }

        /* ------------------------------------------------------------------ */
        /* Accessors                                                           */
        /* ------------------------------------------------------------------ */
        get state() { return this.fsm.current; }
        get groundY() { return this.config.worldHeight - this.config.groundHeight; }
        get tier() { return DIFFICULTY_TIERS[this.tierIndex]; }

        getGameState() { return this.fsm.current; }
        getScore() { return this.score; }
        getHighScore() { return this.highScore; }

        /* ------------------------------------------------------------------ */
        /* Lifecycle / state transitions                                       */
        /* ------------------------------------------------------------------ */

        /* Reset the run without changing state (used by start / restart). */
        resetGame() {
            const c = this.config;
            this.seed = c.seed != null ? (Number(c.seed) >>> 0) : FN.random.randomSeed();
            this.rng = FN.random.createRng(this.seed);
            this.tick = 0;
            this.score = 0;
            this.stats = { obstaclesPassed: 0, itemsCollected: 0, loot: { zeny: 0, potion: 0, gem: 0, crystal: 0 } };
            this.speed = c.obstacleSpeed;
            this.distance = this.distance || 0; // keep background continuity between runs
            this.tierIndex = 0;
            this.obstacles = [];
            this.collectibles = [];
            this.nextId = 1;
            this.deathTick = null;
            this.deathCause = null;
            this.newHighScore = false;
            this.player.reset(c);
            this.emit('reset', { seed: this.seed });
        }

        startGame() {
            if (this.state === GAME_STATES.PLAYING) return false;
            if (this.state === GAME_STATES.PAUSED) return this.resumeGame();
            this.resetGame();
            const ok = this.fsm.transition(GAME_STATES.PLAYING, { reason: 'start' });
            if (ok && this.config.flapOnStart) this.player.flap(this.config);
            return ok;
        }

        restartGame() {
            if (this.state === GAME_STATES.MENU) return this.startGame();
            this.resetGame();
            const ok = this.fsm.transition(GAME_STATES.PLAYING, { reason: 'restart' });
            if (ok && this.config.flapOnStart) this.player.flap(this.config);
            return ok;
        }

        pauseGame() {
            if (this.state !== GAME_STATES.PLAYING) return false;
            return this.fsm.transition(GAME_STATES.PAUSED);
        }

        resumeGame() {
            if (this.state !== GAME_STATES.PAUSED) return false;
            return this.fsm.transition(GAME_STATES.PLAYING, { reason: 'resume' });
        }

        togglePause() {
            return this.state === GAME_STATES.PAUSED ? this.resumeGame() : this.pauseGame();
        }

        goToMenu() {
            if (this.state === GAME_STATES.MENU) return false;
            const ok = this.fsm.transition(GAME_STATES.MENU);
            if (ok) this.resetGame();
            return ok;
        }

        gameOver(cause = 'obstacle') {
            if (this.state !== GAME_STATES.PLAYING) return false;
            this.deathTick = this.tick;
            this.deathCause = cause;
            if (this.score > this.highScore) {
                this.highScore = this.score;
                this.newHighScore = true;
            }
            FN.storage.write(STORAGE_KEYS.highScore, this.highScore);
            this.emit('hit', { cause, x: this.player.x, y: this.player.y });
            return this.fsm.transition(GAME_STATES.GAME_OVER, {
                score: this.score,
                highScore: this.highScore,
                newHighScore: this.newHighScore,
                cause,
            });
        }

        /* ------------------------------------------------------------------ */
        /* Player input                                                        */
        /* ------------------------------------------------------------------ */
        flap() {
            if (this.state !== GAME_STATES.PLAYING) return false;
            this.player.flap(this.config);
            this.emit('flap', { x: this.player.x, y: this.player.y });
            return true;
        }

        /* ------------------------------------------------------------------ */
        /* Simulation                                                          */
        /* ------------------------------------------------------------------ */
        update() {
            switch (this.state) {
                case GAME_STATES.MENU:
                    this.menuTick += 1;
                    this.distance += 1.2;
                    // Gentle hover so the Novice looks alive behind the title panel.
                    this.player.prevY = this.player.y;
                    this.player.y = this.config.playerStartY + Math.sin(this.menuTick * 0.06) * 10;
                    this.player.ticksSinceFlap = (this.menuTick % 40);
                    this.player.rotation = 0;
                    break;
                case GAME_STATES.PLAYING:
                    this.updatePlaying();
                    break;
                case GAME_STATES.GAME_OVER:
                    this.tick += 1;
                    this.player.updateDying(this.config);
                    break;
                case GAME_STATES.PAUSED:
                default:
                    break;
            }
        }

        updatePlaying() {
            const c = this.config;
            this.tick += 1;

            // Difficulty: ease speed toward the current tier target.
            const target = this.targetSpeed();
            if (this.speed < target) this.speed = Math.min(target, this.speed + c.speedRamp);
            else if (this.speed > target) this.speed = target;

            this.distance += this.speed;
            this.player.update(c);

            for (const o of this.obstacles) o.update(this.speed, this.tick);
            for (const item of this.collectibles) item.update(this.speed, this.tick);

            if (c.autoSpawn) this.autoSpawn();

            this.updateScoring();
            this.updateCollectibles();

            // Despawn anything that scrolled off the left edge.
            this.obstacles = this.obstacles.filter((o) => o.right + c.capOverhang > -40);
            this.collectibles = this.collectibles.filter((i) => !i.collected && i.x > -40);

            const hit = this.checkCollision();
            if (hit.collided) {
                if (hit.type === 'ground') this.player.y = this.groundY - this.player.radius;
                if (!c.invincible) this.gameOver(hit.type);
                else if (hit.type === 'ground') { this.player.vy = c.jumpStrength; }
            }
        }

        targetSpeed() {
            const c = this.config;
            const bonus = c.difficultyScaling ? this.tier.speedBonus : 0;
            return Math.min(c.obstacleSpeed + bonus, Math.max(c.maxObstacleSpeed, c.obstacleSpeed));
        }

        currentGap() {
            const c = this.config;
            return c.obstacleGap - (c.difficultyScaling ? this.tier.gapReduction : 0);
        }

        /* Keep towers flowing in from the right at exactly obstacleSpacing apart. */
        autoSpawn() {
            const c = this.config;
            const last = this.obstacles[this.obstacles.length - 1];
            if (!last) {
                this.spawnObstacle({ x: c.worldWidth + c.firstObstacleOffset });
                return;
            }
            if (last.x + c.obstacleSpacing <= c.worldWidth + 40) {
                const prev = last;
                const next = this.spawnObstacle({ x: last.x + c.obstacleSpacing });
                this.maybeSpawnLoot(prev, next);
            }
        }

        /*
         * Spawn a tower pair. Every option is overridable for tests:
         * spawnObstacle({ x: 300, gapY: 320, gap: 200, type: 'stone' })
         */
        spawnObstacle(opts = {}) {
            const c = this.config;
            const gap = opts.gap != null ? opts.gap : this.currentGap();
            const minY = c.gapMargin + gap / 2;
            const maxY = this.groundY - c.gapMargin - gap / 2;
            let gapY = opts.gapY;
            if (gapY == null) {
                const last = this.obstacles[this.obstacles.length - 1];
                const shift = this.tier.maxGapShift;
                const lo = last ? Math.max(minY, last.baseGapY - shift) : minY + 40;
                const hi = last ? Math.min(maxY, last.baseGapY + shift) : maxY - 40;
                gapY = this.rng.range(lo, hi);
            }
            const tierDrift = c.difficultyScaling ? this.tier.drift : 0;
            const drift = opts.drift != null ? opts.drift : tierDrift;
            const obstacle = new FN.Obstacle({
                id: this.nextId++,
                x: opts.x != null ? opts.x : c.worldWidth + 20,
                gapY: drift ? Math.min(maxY - drift, Math.max(minY + drift, gapY)) : gapY,
                gap,
                width: opts.width || c.obstacleWidth,
                type: opts.type || this.rng.pick(OBSTACLE_TYPES),
                drift,
                phase: this.rng.range(0, Math.PI * 2),
            });
            this.obstacles.push(obstacle);
            this.emit('spawn', obstacle.snapshot());
            return obstacle;
        }

        maybeSpawnLoot(prev, next) {
            const c = this.config;
            if (this.rng.next() >= c.collectibleChance) return null;
            const def = this.rng.weighted(Object.values(COLLECTIBLE_TYPES));
            const x = (prev.x + prev.width / 2 + next.x + next.width / 2) / 2;
            const y = (prev.baseGapY + next.baseGapY) / 2 + this.rng.range(-30, 30);
            return this.spawnCollectible({ type: def.id, x, y });
        }

        spawnCollectible(opts = {}) {
            const def = COLLECTIBLE_TYPES[opts.type] || COLLECTIBLE_TYPES.zeny;
            const c = this.config;
            const y = Math.max(40, Math.min(this.groundY - 40, opts.y != null ? opts.y : this.player.y));
            const item = new FN.Collectible({
                id: this.nextId++,
                type: def.id,
                x: opts.x != null ? opts.x : c.worldWidth + 20,
                y,
                value: def.value,
                radius: def.radius,
                phase: this.rng.range(0, Math.PI * 2),
            });
            item.y = y;
            this.collectibles.push(item);
            return item;
        }

        /* An obstacle scores once its right edge (cap included) is behind the Novice. */
        updateScoring() {
            const c = this.config;
            for (const o of this.obstacles) {
                if (!o.passed && o.right + c.capOverhang < this.player.x) {
                    o.passed = true;
                    this.stats.obstaclesPassed += 1;
                    this.increaseScore(c.obstaclePoints, 'obstacle', { obstacleId: o.id });
                }
            }
        }

        updateCollectibles() {
            const p = this.player;
            for (const item of this.collectibles) {
                if (item.collected) continue;
                if (FN.collision.circleCircle(p.x, p.y, p.radius + 4, item.x, item.y, item.radius)) {
                    item.collected = true;
                    this.stats.itemsCollected += 1;
                    this.stats.loot[item.type] = (this.stats.loot[item.type] || 0) + 1;
                    this.emit('collect', { type: item.type, value: item.value, x: item.x, y: item.y });
                    this.increaseScore(item.value, 'collect', { type: item.type, x: item.x, y: item.y });
                }
            }
        }

        increaseScore(amount = 1, reason = 'manual', meta = {}) {
            const n = Math.max(0, Math.floor(Number(amount) || 0));
            if (!n) return this.score;
            this.score += n;
            this.emit('score', { amount: n, total: this.score, reason, ...meta });
            this.updateTier();
            return this.score;
        }

        updateTier() {
            let index = 0;
            DIFFICULTY_TIERS.forEach((t, i) => { if (this.score >= t.minScore) index = i; });
            if (index !== this.tierIndex) {
                const up = index > this.tierIndex;
                this.tierIndex = index;
                this.emit('tierchange', { tier: this.tier, index, up });
            }
        }

        checkCollision() {
            return FN.collision.checkPlayerCollision(this.player, this.obstacles, this.config);
        }

        /* ------------------------------------------------------------------ */
        /* QA helpers                                                          */
        /* ------------------------------------------------------------------ */
        setConfig(partial = {}) {
            Object.assign(this.config, partial);
            if (partial.playerRadius != null) this.player.radius = partial.playerRadius;
            return { ...this.config };
        }

        setSeed(seed) {
            this.config.seed = seed == null ? null : Number(seed) >>> 0;
            this.seed = this.config.seed != null ? this.config.seed : FN.random.randomSeed();
            this.rng = FN.random.createRng(this.seed);
            return this.seed;
        }

        setPlayer({ x, y, vy } = {}) {
            if (x != null) this.player.x = x;
            if (y != null) { this.player.y = y; this.player.prevY = y; }
            if (vy != null) this.player.vy = vy;
            return this.player.snapshot();
        }

        clearObstacles() {
            this.obstacles = [];
            this.collectibles = [];
        }

        resetHighScore() {
            this.highScore = 0;
            FN.storage.write(STORAGE_KEYS.highScore, 0);
        }

        snapshot() {
            return {
                state: this.state,
                tick: this.tick,
                score: this.score,
                highScore: this.highScore,
                seed: this.seed,
                speed: this.speed,
                tier: this.tier.id,
                rank: this.tier.rank,
                player: this.player.snapshot(),
                obstacles: this.obstacles.map((o) => o.snapshot()),
                collectibles: this.collectibles.map((i) => i.snapshot()),
                stats: JSON.parse(JSON.stringify(this.stats)),
            };
        }
    }

    FN.Game = Game;
})(window.FN = window.FN || {});
