/*
 * A pair of fantasy towers (top + bottom) with a gap the Novice flies through.
 * `gapY` is the centre of the opening; `gap` its height.
 */
(function (FN) {
    'use strict';

    class Obstacle {
        constructor({ id, x, gapY, gap, width, type = 'wood', drift = 0, phase = 0 }) {
            this.id = id;
            this.x = x;
            this.prevX = x;
            this.baseGapY = gapY;
            this.gapY = gapY;
            this.gap = gap;
            this.width = width;
            this.type = type;
            this.drift = drift;   // vertical sway amplitude (extreme tier only)
            this.phase = phase;
            this.passed = false;  // scored already? (prevents double scoring)
        }

        get gapTop() { return this.gapY - this.gap / 2; }
        get gapBottom() { return this.gapY + this.gap / 2; }
        get right() { return this.x + this.width; }

        update(speed, tick) {
            this.prevX = this.x;
            this.x -= speed;
            if (this.drift) {
                this.gapY = this.baseGapY + Math.sin(tick * 0.035 + this.phase) * this.drift;
            }
        }

        /* Collision rectangles: tower bodies + their wider caps. */
        getRects(config) {
            const groundY = config.worldHeight - config.groundHeight;
            const o = config.capOverhang;
            const ch = config.capHeight;
            const top = this.gapTop;
            const bottom = this.gapBottom;
            return [
                { part: 'top-body',    x: this.x,     y: -1000,       w: this.width,         h: top - ch + 1000 },
                { part: 'top-cap',     x: this.x - o, y: top - ch,    w: this.width + o * 2, h: ch },
                { part: 'bottom-cap',  x: this.x - o, y: bottom,      w: this.width + o * 2, h: ch },
                { part: 'bottom-body', x: this.x,     y: bottom + ch, w: this.width,         h: Math.max(0, groundY - bottom - ch) },
            ];
        }

        snapshot() {
            return {
                id: this.id,
                x: this.x,
                width: this.width,
                gapY: this.gapY,
                gap: this.gap,
                gapTop: this.gapTop,
                gapBottom: this.gapBottom,
                type: this.type,
                passed: this.passed,
            };
        }
    }

    FN.Obstacle = Obstacle;
})(window.FN = window.FN || {});
