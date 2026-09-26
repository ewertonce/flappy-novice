/*
 * Loot floating between tower pairs: Zeny, potions, gemstones, Kafra crystals.
 */
(function (FN) {
    'use strict';

    class Collectible {
        constructor({ id, type, x, y, value, radius, phase = 0 }) {
            this.id = id;
            this.type = type;
            this.x = x;
            this.prevX = x;
            this.baseY = y;
            this.y = y;
            this.value = value;
            this.radius = radius;
            this.phase = phase;
            this.collected = false;
        }

        /* Bobbing is tick-based so collisions stay deterministic. */
        update(speed, tick) {
            this.prevX = this.x;
            this.x -= speed;
            this.y = this.baseY + Math.sin(tick * 0.08 + this.phase) * 6;
        }

        snapshot() {
            return {
                id: this.id,
                type: this.type,
                x: this.x,
                y: this.y,
                value: this.value,
                collected: this.collected,
            };
        }
    }

    FN.Collectible = Collectible;
})(window.FN = window.FN || {});
