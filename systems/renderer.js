/*
 * Canvas renderer
 * -----------------------------------------------------------------------------
 * Reads game state and paints it. Never mutates gameplay state — it only owns
 * visual-only things (particles, screen shake, ambient motes, animation clock).
 *
 * The world is drawn in fixed logical units (480 × 720). The canvas backing
 * store is sized to CSS size × devicePixelRatio and a single transform maps
 * logical → device pixels, so everything stays crisp on any screen.
 */
(function (FN) {
    'use strict';

    const { GAME_STATES } = FN.config;
    const SPRITE_PIXEL = 2.3;   // logical px per novice sprite pixel
    const ITEM_PIXEL = 2.1;
    const UPSCALE = 6;

    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function lerp(a, b, t) { return a + (b - a) * t; }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

    /* Nearest-neighbour upscale so rotated sprites keep chunky pixels. */
    function upscale(canvas, factor) {
        const out = document.createElement('canvas');
        out.width = canvas.width * factor;
        out.height = canvas.height * factor;
        const ctx = out.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(canvas, 0, 0, out.width, out.height);
        return out;
    }

    let noviceCache = null;
    function noviceSprites() {
        if (!noviceCache) {
            const base = FN.assets.novice.getSprites();
            noviceCache = {
                fall: upscale(base.fall, UPSCALE),
                flap: upscale(base.flap, UPSCALE),
                w: base.fall.width,
                h: base.fall.height,
            };
        }
        return noviceCache;
    }

    /* --------------------------------------------------------------------- */
    /* The Novice (shared by the game canvas and the UI portraits)           */
    /* --------------------------------------------------------------------- */

    /* Wing angle from the flap cycle. `sinceFlap` is in ticks. */
    function wingAngle(sinceFlap, time, dead) {
        if (dead) return -3.6;
        if (sinceFlap < 6) return lerp(-1.9, -3.45, sinceFlap / 6);
        if (sinceFlap < 20) return lerp(-3.45, -2.25, (sinceFlap - 6) / 14);
        return -2.35 + Math.sin(time * 11) * 0.22;
    }

    function drawWing(ctx, angle, size, alpha, dim) {
        const feathers = [
            { off: 0.0, len: 1.0, w: 0.26 },
            { off: 0.38, len: 0.86, w: 0.24 },
            { off: 0.74, len: 0.68, w: 0.22 },
        ];
        ctx.save();
        ctx.globalAlpha = alpha;
        feathers.forEach((f) => {
            ctx.save();
            ctx.rotate(angle + f.off);
            const len = size * f.len;
            const g = ctx.createLinearGradient(0, 0, len, 0);
            if (dim) {
                g.addColorStop(0, 'rgba(190,200,215,0.8)');
                g.addColorStop(1, 'rgba(120,130,150,0.4)');
            } else {
                g.addColorStop(0, 'rgba(236,252,255,0.95)');
                g.addColorStop(0.55, 'rgba(160,226,255,0.8)');
                g.addColorStop(1, 'rgba(95,200,255,0.35)');
            }
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.ellipse(len / 2, 0, len / 2, size * f.w, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = dim ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.85)';
            ctx.lineWidth = 0.9;
            ctx.stroke();
            ctx.restore();
        });
        ctx.restore();
    }

    function drawScarf(ctx, rootX, rootY, time, vy) {
        const pts = [];
        const lift = clamp(-vy * 0.35, -3, 3);
        for (let i = 0; i < 5; i++) {
            pts.push([
                rootX - i * 5.2,
                rootY + i * 1.3 - lift * i * 0.5 + Math.sin(time * 14 - i * 1.1) * (0.6 + i * 0.55),
            ]);
        }
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        [['#7a1620', 5.2, 1.2], ['#b3262f', 3.8, 0]].forEach(([color, width, dy]) => {
            ctx.strokeStyle = color;
            ctx.beginPath();
            pts.forEach(([x, y], i) => {
                ctx.lineWidth = width;
                if (i === 0) ctx.moveTo(x, y + dy); else ctx.lineTo(x, y + dy);
            });
            ctx.stroke();
        });
        ctx.restore();
    }

    /*
     * Draw the Novice with its origin on the physics position.
     * opts: { rotation (deg), sinceFlap (ticks), vy, time (s), dead, scale }
     */
    function drawNovice(ctx, x, y, opts = {}) {
        const sprites = noviceSprites();
        const { ANCHOR, WING_ROOT, SCARF_ROOT } = FN.assets.novice;
        const px = (opts.scale || 1) * SPRITE_PIXEL;
        const time = opts.time || 0;
        const sinceFlap = opts.sinceFlap == null ? 99 : opts.sinceFlap;
        const vy = opts.vy || 0;
        const dead = !!opts.dead;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(((opts.rotation || 0) * Math.PI) / 180);

        // Magic under-glow right after a flap.
        if (!dead && sinceFlap < 16) {
            const a = 1 - sinceFlap / 16;
            const g = ctx.createRadialGradient(0, 10 * px, 0, 0, 10 * px, 18 * px);
            g.addColorStop(0, `rgba(160,230,255,${0.45 * a})`);
            g.addColorStop(1, 'rgba(95,200,255,0)');
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = g;
            ctx.fillRect(-18 * px, -8 * px, 36 * px, 36 * px);
            ctx.restore();
        }

        const wx = (WING_ROOT.x - ANCHOR.x) * px;
        const wy = (WING_ROOT.y - ANCHOR.y) * px;
        const angle = wingAngle(sinceFlap, time, dead);

        // Back wing (slightly darker, offset), scarf, then body, then front wing.
        ctx.save();
        ctx.translate(wx + 2 * px, wy - 0.5 * px);
        drawWing(ctx, angle + 0.25, 11 * px, 0.55, dead);
        ctx.restore();

        drawScarf(ctx, (SCARF_ROOT.x - ANCHOR.x) * px, (SCARF_ROOT.y - ANCHOR.y) * px + 1, time, vy);

        const frame = !dead && sinceFlap < 12 ? sprites.flap : sprites.fall;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(frame, -ANCHOR.x * px, -ANCHOR.y * px, sprites.w * px, sprites.h * px);

        ctx.save();
        ctx.translate(wx, wy);
        drawWing(ctx, angle, 12 * px, 0.92, dead);
        ctx.restore();

        ctx.restore();

        if (dead && opts.dizzy) {
            // Cartoon dizzy stars circling the head.
            for (let i = 0; i < 3; i++) {
                const a = time * 4 + (i * Math.PI * 2) / 3;
                const sx = x + Math.cos(a) * 16;
                const sy = y - 26 + Math.sin(a) * 5;
                drawStar(ctx, sx, sy, 4, '#ecca5e');
            }
        }
    }

    function drawStar(ctx, x, y, r, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const rr = i % 2 ? r * 0.4 : r;
            const a = (i * Math.PI) / 4 - Math.PI / 2;
            ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fill();
    }

    /* Small animated portrait used by the menu and the side panel. */
    function drawPortrait(canvas, time) {
        const ctx = canvas.getContext('2d');
        const dpr = Math.min(window.devicePixelRatio || 1, 3);
        const cssW = canvas.clientWidth || canvas.width;
        const cssH = canvas.clientHeight || canvas.height;
        if (canvas.width !== Math.round(cssW * dpr)) {
            canvas.width = Math.round(cssW * dpr);
            canvas.height = Math.round(cssH * dpr);
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const s = canvas.width / 120;
        ctx.setTransform(s, 0, 0, s, 0, 0);
        const h = (canvas.height / canvas.width) * 120;
        const glow = ctx.createRadialGradient(60, h / 2, 4, 60, h / 2, 60);
        glow.addColorStop(0, 'rgba(236,202,94,0.45)');
        glow.addColorStop(1, 'rgba(236,202,94,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, 120, h);
        const cycle = (time * 60) % 48;
        const bob = Math.sin(time * 3) * 4;
        drawNovice(ctx, 64, h / 2 + 4 + bob, { scale: 1.45, time, sinceFlap: cycle, rotation: -4 });
    }

    /* --------------------------------------------------------------------- */
    /* Renderer                                                              */
    /* --------------------------------------------------------------------- */
    class Renderer {
        constructor(canvas, game) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.game = game;
            this.particles = new FN.ParticleSystem(reducedMotion ? 120 : 420);
            this.time = 0;
            this.scale = 0;
            this.hitAt = -10;
            this.flashAt = -10;
            this.scenery = null;
            this.towers = null;
            this.motes = this.createMotes(38);
            this.bindEvents();
            this.resize();
        }

        createMotes(n) {
            const colors = ['#ecca5e', '#5fc8ff', '#b58cff', '#fff6c8', '#4fbf7a'];
            const motes = [];
            for (let i = 0; i < n; i++) {
                motes.push({
                    x: Math.random() * 480,
                    y: Math.random() * 620,
                    vy: -(0.08 + Math.random() * 0.25),
                    depth: 0.2 + Math.random() * 0.6,
                    size: 0.8 + Math.random() * 1.8,
                    phase: Math.random() * Math.PI * 2,
                    color: colors[i % colors.length],
                });
            }
            return motes;
        }

        bindEvents() {
            const g = this.game;
            g.on('flap', ({ x, y }) => {
                for (let i = 0; i < 7; i++) {
                    this.particles.add({
                        x: x - 6 + Math.random() * 6,
                        y: y + 10,
                        vx: -1.2 - Math.random() * 1.4,
                        vy: 0.6 + Math.random() * 1.6,
                        life: 0.45 + Math.random() * 0.25,
                        size: 1.4 + Math.random() * 1.8,
                        color: i % 3 ? '#a8e6ff' : '#ecca5e',
                        shape: 'star',
                        glow: true,
                    });
                }
            });
            g.on('collect', ({ type, x, y, value }) => {
                const colors = FN.assets.items.BURST_COLORS[type];
                this.particles.burst(x, y, { count: type === 'crystal' ? 26 : 16, colors, speed: 3.4, size: 3, shape: 'star' });
                this.particles.add({ x, y, life: 0.45, size: 24, color: colors[0], shape: 'ring' });
                this.particles.text(x, y - 16, `+${value}`, type === 'crystal' || type === 'gem' ? '#a8e6ff' : type === 'potion' ? '#ff9aa2' : '#ecca5e');
            });
            g.on('score', ({ reason, amount }) => {
                if (reason !== 'obstacle') return;
                const p = g.player;
                this.particles.text(p.x + 10, p.y - 34, `+${amount}`, '#fff6c8');
            });
            g.on('hit', ({ x, y }) => {
                this.hitAt = this.time;
                this.flashAt = this.time;
                this.particles.burst(x, y, { count: 18, colors: ['#ecdcae', '#c9a227', '#8a5e35'], speed: 3.6, size: 3.4, gravity: 0.12, shape: 'dust', glow: false });
                for (let i = 0; i < 5; i++) {
                    this.particles.add({ x, y: y - 10, vx: (Math.random() - 0.5) * 4, vy: -2 - Math.random() * 2, gravity: 0.1, life: 0.9, size: 5, color: '#ecca5e', shape: 'star', glow: true, scrolls: false });
                }
            });
            g.on('tierchange', ({ up }) => {
                if (!up) return;
                const p = g.player;
                this.particles.burst(p.x, p.y, { count: 34, colors: ['#ecca5e', '#4fbf7a', '#5fc8ff', '#fff6c8'], speed: 5, size: 3.2, gravity: 0, shape: 'star', life: 0.9 });
                this.particles.add({ x: p.x, y: p.y, life: 0.7, size: 60, color: '#ecca5e', shape: 'ring', scrolls: false });
            });
            g.on('reset', () => { this.particles.clear(); });
        }

        resize() {
            const rect = this.canvas.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            const dpr = Math.min(window.devicePixelRatio || 1, 3);
            const w = Math.round(rect.width * dpr);
            const h = Math.round(rect.height * dpr);
            if (w !== this.canvas.width || h !== this.canvas.height) {
                this.canvas.width = w;
                this.canvas.height = h;
            }
            const scale = w / this.game.config.worldWidth;
            if (Math.abs(scale - this.scale) > 0.01 || !this.scenery) {
                this.scale = scale;
                this.scenery = FN.assets.scenery.build(scale);
                this.towers = FN.assets.obstacles.build(scale);
            }
        }

        /* ----------------------------------------------------------------- */
        render(alpha, dt) {
            const g = this.game;
            const ctx = this.ctx;
            const state = g.state;
            if (state !== GAME_STATES.PAUSED) this.time += dt;
            const t = this.time;
            const W = g.config.worldWidth;
            const H = g.config.worldHeight;

            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.imageSmoothingEnabled = true;
            ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);

            // Screen shake after a crash.
            const sinceHit = t - this.hitAt;
            if (sinceHit < 0.35 && !reducedMotion) {
                const k = (1 - sinceHit / 0.35) * 6;
                ctx.translate((Math.random() - 0.5) * k, (Math.random() - 0.5) * k);
            }

            const worldSpeed = state === GAME_STATES.PLAYING ? g.speed : state === GAME_STATES.MENU ? 1.2 : 0;
            const distance = g.distance;

            this.drawBackground(ctx, distance, t, W, H);
            this.drawMotes(ctx, dt, worldSpeed, t, false);
            this.drawObstacles(ctx, alpha, t);
            this.drawCollectibles(ctx, alpha, t);
            if (state !== GAME_STATES.PAUSED) this.particles.update(dt, worldSpeed);
            this.drawParticles(ctx, false);
            this.drawPlayer(ctx, alpha, t);
            this.drawGround(ctx, distance, W);
            this.drawMotes(ctx, dt, worldSpeed, t, true);
            this.drawParticles(ctx, true);

            ctx.drawImage(this.scenery.vignette, 0, 0, W, H);

            const sinceFlash = t - this.flashAt;
            if (sinceFlash < 0.25) {
                ctx.fillStyle = `rgba(255, 246, 220, ${0.55 * (1 - sinceFlash / 0.25)})`;
                ctx.fillRect(-10, -10, W + 20, H + 20);
            }
            if (state === GAME_STATES.PAUSED) {
                ctx.fillStyle = 'rgba(20, 12, 8, 0.35)';
                ctx.fillRect(-10, -10, W + 20, H + 20);
            }
        }

        drawBackground(ctx, distance, t, W, H) {
            const sc = this.scenery;
            ctx.drawImage(sc.sky, 0, 0, W, H);

            // Twinkling stars + pulsing moon glow on top of the static sky.
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < 10; i++) {
                const sx = (i * 97.3) % W;
                const sy = 20 + ((i * 53.1) % 240);
                const a = Math.max(0, Math.sin(t * 2 + i * 1.7)) * 0.8;
                ctx.fillStyle = `rgba(255,246,220,${a.toFixed(3)})`;
                ctx.fillRect(sx - 0.6, sy - 2.5, 1.2, 5);
                ctx.fillRect(sx - 2.5, sy - 0.6, 5, 1.2);
            }
            ctx.restore();

            for (const layer of sc.layers) {
                const offset = distance * layer.speed + (layer.drift ? t * 60 * layer.drift : 0);
                this.drawTiled(ctx, layer, offset);
            }
        }

        drawTiled(ctx, layer, offset) {
            const tile = this.scenery.tile;
            const x0 = -(((offset % tile) + tile) % tile);
            // Snap to device pixels and overlap by one pixel so tile seams never show.
            const px = 1 / this.scale;
            const start = Math.floor(x0 * this.scale) / this.scale;
            for (let x = start; x < this.game.config.worldWidth; x += tile) {
                ctx.drawImage(layer.canvas, x, layer.top, tile + px, layer.h);
            }
        }

        drawGround(ctx, distance) {
            this.drawTiled(ctx, this.scenery.ground, distance * this.scenery.ground.speed);
        }

        drawMotes(ctx, dt, worldSpeed, t, front) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const f = dt * 60;
            for (let i = 0; i < this.motes.length; i++) {
                const m = this.motes[i];
                const isFront = m.depth > 0.62;
                if (isFront !== front) continue;
                // Each mote belongs to exactly one pass, so it updates once per frame.
                m.y += m.vy * f;
                m.x -= worldSpeed * m.depth * f * 0.6;
                if (m.y < -10) { m.y = 640; m.x = Math.random() * 480; }
                if (m.x < -10) m.x += 500;
                const flicker = 0.45 + Math.sin(t * 3 + m.phase) * 0.35;
                const x = m.x + Math.sin(t * 0.8 + m.phase) * 6;
                const r = m.size * (front ? 2.4 : 1.8);
                const grad = ctx.createRadialGradient(x, m.y, 0, x, m.y, r * 2.5);
                grad.addColorStop(0, m.color);
                grad.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.globalAlpha = flicker * (front ? 0.55 : 0.4);
                ctx.fillStyle = grad;
                ctx.fillRect(x - r * 2.5, m.y - r * 2.5, r * 5, r * 5);
            }
            ctx.restore();
        }

        drawObstacles(ctx, alpha, t) {
            const g = this.game;
            const c = g.config;
            const tw = this.towers;
            const groundY = g.groundY;
            for (const o of g.obstacles) {
                const x = lerp(o.prevX, o.x, alpha);
                if (x > c.worldWidth + 20 || x + o.width < -30) continue;
                const art = tw[o.type] || tw.wood;
                const top = o.gapTop;
                const bottom = o.gapBottom;
                const ch = c.capHeight;
                const bw = o.width;

                // top tower: tiles anchored at the cap, repeating upward
                ctx.save();
                ctx.beginPath();
                ctx.rect(x, -5, bw, top - ch + 5);
                ctx.clip();
                for (let y = top - ch - tw.TILE_H; y > -tw.TILE_H; y -= tw.TILE_H) {
                    ctx.drawImage(art.body, x, y, bw, tw.TILE_H);
                }
                this.capShadow(ctx, x, top - ch, bw, -1);
                ctx.restore();
                ctx.drawImage(art.capFlipped, x - c.capOverhang, top - ch, bw + c.capOverhang * 2, ch);

                // bottom tower: tiles anchored below the cap, repeating downward
                ctx.save();
                ctx.beginPath();
                ctx.rect(x, bottom + ch, bw, groundY - bottom - ch + 14);
                ctx.clip();
                for (let y = bottom + ch; y < groundY + 14; y += tw.TILE_H) {
                    ctx.drawImage(art.body, x, y, bw, tw.TILE_H);
                }
                this.capShadow(ctx, x, bottom + ch, bw, 1);
                ctx.restore();
                ctx.drawImage(art.cap, x - c.capOverhang, bottom, bw + c.capOverhang * 2, ch);

                if (o.type === 'wood') {
                    FN.assets.obstacles.drawBanner(ctx, x + bw / 2 - 13, bottom + ch + 4, t + o.id);
                } else {
                    FN.assets.obstacles.drawBanner(ctx, x + bw / 2 - 13, bottom + ch + 4, t + o.id, '#2f5233', '#1d3a22');
                }

                // Faint crystal glow washing over the gap edges.
                const pulse = 0.5 + Math.sin(t * 2.5 + o.id) * 0.2;
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                const gg = ctx.createRadialGradient(x + bw / 2, top + 2, 0, x + bw / 2, top + 2, 30);
                gg.addColorStop(0, `rgba(95,200,255,${0.22 * pulse})`);
                gg.addColorStop(1, 'rgba(95,200,255,0)');
                ctx.fillStyle = gg;
                ctx.fillRect(x - 20, top - 28, bw + 40, 60);
                const gb = ctx.createRadialGradient(x + bw / 2, bottom - 2, 0, x + bw / 2, bottom - 2, 30);
                gb.addColorStop(0, `rgba(95,200,255,${0.22 * pulse})`);
                gb.addColorStop(1, 'rgba(95,200,255,0)');
                ctx.fillStyle = gb;
                ctx.fillRect(x - 20, bottom - 30, bw + 40, 60);
                ctx.restore();
            }
        }

        capShadow(ctx, x, y, w, dir) {
            const grad = ctx.createLinearGradient(0, y, 0, y + 12 * dir);
            grad.addColorStop(0, 'rgba(20,10,5,0.55)');
            grad.addColorStop(1, 'rgba(20,10,5,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(x, dir > 0 ? y : y - 12, w, 12);
        }

        drawCollectibles(ctx, alpha, t) {
            for (const item of this.game.collectibles) {
                if (item.collected) continue;
                const x = lerp(item.prevX, item.x, alpha);
                FN.assets.items.drawItem(ctx, item.type, x, item.y, ITEM_PIXEL, t + item.phase);
            }
        }

        drawPlayer(ctx, alpha, t) {
            const g = this.game;
            const p = g.player;
            const y = lerp(p.prevY, p.y, alpha);
            const rotation = lerp(p.prevRotation, p.rotation, alpha);
            const dead = g.state === GAME_STATES.GAME_OVER;
            // soft ground shadow
            const groundY = g.groundY;
            const dist = clamp((groundY - y) / 400, 0, 1);
            ctx.fillStyle = `rgba(20,10,5,${0.28 * (1 - dist)})`;
            ctx.beginPath();
            ctx.ellipse(p.x, groundY + 4, 16 * (1 - dist * 0.5), 4, 0, 0, Math.PI * 2);
            ctx.fill();

            drawNovice(ctx, p.x, y, {
                rotation,
                sinceFlap: p.ticksSinceFlap + (dead ? 0 : alpha),
                vy: p.vy,
                time: t,
                dead,
                dizzy: dead && p.grounded,
            });

            if (this.debugHitbox) {
                ctx.strokeStyle = '#ff0';
                ctx.beginPath();
                ctx.arc(p.x, y, p.radius, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        drawParticles(ctx, foreground) {
            for (const p of this.particles.items) {
                const isFront = p.shape === 'text' || p.shape === 'ring';
                if (isFront !== foreground) continue;
                const k = 1 - p.t;
                ctx.save();
                if (p.glow) ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = Math.max(0, k);
                switch (p.shape) {
                    case 'text': {
                        const s = 1 + Math.max(0, 0.25 - p.t) * 2;
                        ctx.font = `${Math.round(13 * s)}px "Press Start 2P", monospace`;
                        ctx.textAlign = 'center';
                        ctx.lineWidth = 4;
                        ctx.strokeStyle = 'rgba(42,24,16,0.9)';
                        ctx.strokeText(p.text, p.x, p.y);
                        ctx.fillStyle = p.color;
                        ctx.fillText(p.text, p.x, p.y);
                        break;
                    }
                    case 'ring': {
                        ctx.strokeStyle = p.color;
                        ctx.lineWidth = 3 * k;
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, p.size * (0.3 + p.t), 0, Math.PI * 2);
                        ctx.stroke();
                        break;
                    }
                    case 'star':
                        ctx.translate(p.x, p.y);
                        ctx.rotate(p.angle);
                        drawStar(ctx, 0, 0, p.size * (0.5 + k * 0.5), p.color);
                        break;
                    case 'dust':
                        ctx.fillStyle = p.color;
                        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
                        break;
                    default:
                        ctx.fillStyle = p.color;
                        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
                }
                ctx.restore();
            }
        }
    }

    FN.Renderer = Renderer;
    FN.drawNovice = drawNovice;
    FN.drawPortrait = drawPortrait;
})(window.FN = window.FN || {});
