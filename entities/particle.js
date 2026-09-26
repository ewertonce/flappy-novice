/*
 * Visual-only particle system (sparkles, bursts, dust, floating score text).
 * Runs on real frame time and Math.random — it never affects gameplay, so it
 * is intentionally kept out of the deterministic simulation.
 */
(function (FN) {
    'use strict';

    class Particle {
        constructor(opts) {
            this.x = opts.x;
            this.y = opts.y;
            this.vx = opts.vx || 0;
            this.vy = opts.vy || 0;
            this.gravity = opts.gravity || 0;
            this.drag = opts.drag == null ? 0.98 : opts.drag;
            this.life = opts.life || 0.8;    // seconds
            this.age = 0;
            this.size = opts.size || 3;
            this.color = opts.color || '#ecca5e';
            this.shape = opts.shape || 'spark'; // spark | star | dust | text | ring
            this.text = opts.text || '';
            this.glow = opts.glow || false;
            this.spin = opts.spin || 0;
            this.angle = opts.angle || 0;
            this.scrolls = opts.scrolls !== false; // moves with the world?
        }

        get alive() { return this.age < this.life; }
        get t() { return Math.min(1, this.age / this.life); }

        update(dt, worldSpeedPx) {
            this.age += dt;
            const f = dt * 60;
            this.vx *= Math.pow(this.drag, f);
            this.vy = this.vy * Math.pow(this.drag, f) + this.gravity * f;
            this.x += this.vx * f - (this.scrolls ? worldSpeedPx * f : 0);
            this.y += this.vy * f;
            this.angle += this.spin * f;
        }
    }

    class ParticleSystem {
        constructor(max = 400) {
            this.items = [];
            this.max = max;
        }

        add(opts) {
            if (this.items.length >= this.max) this.items.shift();
            this.items.push(new Particle(opts));
        }

        burst(x, y, { count = 14, colors = ['#ecca5e'], speed = 3, life = 0.7, size = 3, gravity = 0.05, shape = 'spark', glow = true } = {}) {
            for (let i = 0; i < count; i++) {
                const a = (Math.PI * 2 * i) / count + Math.random() * 0.5;
                const s = speed * (0.5 + Math.random() * 0.8);
                this.add({
                    x, y,
                    vx: Math.cos(a) * s,
                    vy: Math.sin(a) * s,
                    life: life * (0.7 + Math.random() * 0.6),
                    size: size * (0.6 + Math.random() * 0.8),
                    color: colors[i % colors.length],
                    gravity, shape, glow,
                    spin: (Math.random() - 0.5) * 0.3,
                });
            }
        }

        text(x, y, text, color) {
            this.add({ x, y, vy: -1.1, drag: 0.96, life: 0.9, text, color, shape: 'text', scrolls: false });
        }

        update(dt, worldSpeedPx) {
            for (const p of this.items) p.update(dt, worldSpeedPx);
            this.items = this.items.filter((p) => p.alive);
        }

        clear() { this.items.length = 0; }
    }

    FN.ParticleSystem = ParticleSystem;
})(window.FN = window.FN || {});
