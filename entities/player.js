/*
 * The Novice — player entity (logic only; drawing lives in the renderer).
 */
(function (FN) {
    'use strict';

    const ROTATION_UP = -15;   // degrees when rising
    const ROTATION_DOWN = 20;  // degrees when falling fast

    class Player {
        constructor(config) {
            this.reset(config);
        }

        reset(config) {
            this.x = config.playerX;
            this.y = config.playerStartY;
            this.prevY = this.y;
            this.vy = 0;
            this.radius = config.playerRadius;
            this.rotation = 0;         // degrees
            this.prevRotation = 0;
            this.ticksSinceFlap = 999; // drives the flap animation
            this.flaps = 0;
            this.grounded = false;
        }

        flap(config) {
            this.vy = config.jumpStrength;
            this.ticksSinceFlap = 0;
            this.flaps += 1;
        }

        /* One physics tick. */
        update(config) {
            this.prevY = this.y;
            this.prevRotation = this.rotation;
            this.ticksSinceFlap += 1;

            this.vy = Math.min(this.vy + config.gravity, config.maxFallSpeed);
            this.y += this.vy;

            // Soft ceiling: you can't fly over the towers.
            if (this.y - this.radius < 0) {
                this.y = this.radius;
                this.vy = Math.max(this.vy, 0);
            }

            this.rotation += (Player.targetRotation(this.vy) - this.rotation) * 0.22;
        }

        /* Death tumble after a crash: fall to the ground, nose-dive. */
        updateDying(config) {
            this.prevY = this.y;
            this.prevRotation = this.rotation;
            const groundY = config.worldHeight - config.groundHeight;
            if (this.grounded) return;
            this.vy = Math.min(this.vy + config.gravity * 1.2, config.maxFallSpeed * 1.2);
            this.y += this.vy;
            this.rotation = Math.min(this.rotation + 6, 90);
            if (this.y + this.radius >= groundY) {
                this.y = groundY - this.radius;
                this.vy = 0;
                this.grounded = true;
            }
        }

        static targetRotation(vy) {
            if (vy < 0) return ROTATION_UP;
            return Math.min(ROTATION_DOWN, ROTATION_UP + (vy / 6) * (ROTATION_DOWN - ROTATION_UP));
        }

        snapshot() {
            return {
                x: this.x,
                y: this.y,
                vy: this.vy,
                rotation: this.rotation,
                radius: this.radius,
                flaps: this.flaps,
            };
        }
    }

    Player.ROTATION_UP = ROTATION_UP;
    Player.ROTATION_DOWN = ROTATION_DOWN;
    FN.Player = Player;
})(window.FN = window.FN || {});
