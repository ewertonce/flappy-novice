/*
 * ORIGINAL ARTWORK — parallax scenery
 * -----------------------------------------------------------------------------
 * The whole landscape is painted procedurally (no bitmap assets):
 *   sky        dusk gradient from Ragna-Memories' page background, stars, moon
 *   mountains  distant lilac ridges with snowy caps          (parallax 0.08)
 *   clouds     soft sunset clouds                            (parallax 0.16)
 *   castle     a hill-top capital with spires and a crystal tower (0.28)
 *   town       rooftops, chimneys and round trees            (parallax 0.52)
 *   ground     grass, cobblestone road and dirt              (parallax 1.00)
 * Each scrolling layer is a seamless horizontal tile.
 */
(function (FN) {
    'use strict';

    const W = 480;
    const H = 720;
    const GROUND_Y = 632;
    const TILE = 960;

    function rng(seed) {
        let s = seed >>> 0;
        return () => {
            s = (s + 0x6d2b79f5) >>> 0;
            let t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function makeLayer(w, h, scale) {
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(w * scale);
        canvas.height = Math.ceil(h * scale);
        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);
        return { canvas, ctx };
    }

    /* Draw something that may cross the tile edge twice so the tile is seamless. */
    function wrap(fn, x, width = TILE) {
        fn(x);
        fn(x - width);
        fn(x + width);
    }

    /* ------------------------------------------------------------------ sky */
    function paintSky(scale) {
        const { canvas, ctx } = makeLayer(W, H, scale);
        const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
        g.addColorStop(0, '#1b1636');
        g.addColorStop(0.28, '#33285c');
        g.addColorStop(0.52, '#5e4a86');
        g.addColorStop(0.72, '#9a6f93');
        g.addColorStop(0.86, '#d69a86');
        g.addColorStop(1, '#f0c48a');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        // Warm golden haze (mirrors the Ragna-Memories radial glow).
        const haze = ctx.createRadialGradient(W * 0.5, GROUND_Y - 40, 10, W * 0.5, GROUND_Y - 40, 360);
        haze.addColorStop(0, 'rgba(255, 214, 140, 0.45)');
        haze.addColorStop(1, 'rgba(255, 214, 140, 0)');
        ctx.fillStyle = haze;
        ctx.fillRect(0, 0, W, H);

        // Magical aurora ribbons.
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        [['rgba(95,200,255,0.10)', 120, 0.9], ['rgba(181,140,255,0.10)', 170, 1.3]].forEach(([color, y, f]) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = 26;
            ctx.lineCap = 'round';
            ctx.beginPath();
            for (let x = -20; x <= W + 20; x += 10) {
                const yy = y + Math.sin(x * 0.012 * f) * 24 + Math.sin(x * 0.03) * 6;
                if (x === -20) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
            }
            ctx.stroke();
        });
        ctx.restore();

        // Stars.
        const r = rng(7);
        for (let i = 0; i < 90; i++) {
            const x = r() * W;
            const y = r() * 330;
            const a = (1 - y / 360) * (0.35 + r() * 0.6);
            const s = r() < 0.12 ? 1.6 : 0.9;
            ctx.fillStyle = `rgba(255, 246, 220, ${a.toFixed(3)})`;
            ctx.fillRect(x, y, s, s);
        }

        // Moon with halo.
        const mx = 370;
        const my = 118;
        const halo = ctx.createRadialGradient(mx, my, 10, mx, my, 110);
        halo.addColorStop(0, 'rgba(255, 240, 200, 0.35)');
        halo.addColorStop(1, 'rgba(255, 240, 200, 0)');
        ctx.fillStyle = halo;
        ctx.fillRect(mx - 120, my - 120, 240, 240);
        const moon = ctx.createRadialGradient(mx - 8, my - 8, 2, mx, my, 30);
        moon.addColorStop(0, '#fffbe8');
        moon.addColorStop(0.7, '#f5e2b0');
        moon.addColorStop(1, '#e2c07e');
        ctx.fillStyle = moon;
        ctx.beginPath();
        ctx.arc(mx, my, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(190, 150, 90, 0.35)';
        [[-8, -6, 5], [9, 4, 4], [-2, 12, 3], [11, -12, 2.5]].forEach(([dx, dy, rr]) => {
            ctx.beginPath();
            ctx.arc(mx + dx, my + dy, rr, 0, Math.PI * 2);
            ctx.fill();
        });
        return canvas;
    }

    /* ------------------------------------------------------------ mountains */
    function paintMountains(scale) {
        const top = 330;
        const h = 300;
        const { canvas, ctx } = makeLayer(TILE, h, scale);
        const ranges = [
            { base: 250, amp: 120, color: '#6f5d95', snow: 'rgba(235,225,255,0.55)', seed: 3, step: 60 },
            { base: 270, amp: 80, color: '#5a4a80', snow: 'rgba(235,225,255,0.35)', seed: 11, step: 48 },
        ];
        ranges.forEach((range) => {
            const r = rng(range.seed);
            const pts = [];
            for (let x = 0; x <= TILE; x += range.step) {
                pts.push([x, range.base - range.amp * (0.35 + r() * 0.65)]);
            }
            pts[pts.length - 1][1] = pts[0][1]; // seamless
            ctx.fillStyle = range.color;
            ctx.beginPath();
            ctx.moveTo(0, h);
            pts.forEach(([x, y], i) => {
                if (i === 0) ctx.lineTo(x, y);
                else {
                    const [px, py] = pts[i - 1];
                    ctx.lineTo((px + x) / 2, Math.max(py, y) + 12 * r());
                    ctx.lineTo(x, y);
                }
            });
            ctx.lineTo(TILE, h);
            ctx.closePath();
            ctx.fill();
            // snow caps on peaks
            ctx.fillStyle = range.snow;
            pts.forEach(([x, y]) => {
                if (y > range.base - range.amp * 0.6) return;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + 12, y + 16);
                ctx.lineTo(x + 4, y + 13);
                ctx.lineTo(x - 3, y + 18);
                ctx.lineTo(x - 11, y + 15);
                ctx.closePath();
                ctx.fill();
            });
        });
        // atmospheric haze toward the horizon
        const haze = ctx.createLinearGradient(0, 120, 0, h);
        haze.addColorStop(0, 'rgba(214,154,134,0)');
        haze.addColorStop(1, 'rgba(230,170,140,0.55)');
        ctx.fillStyle = haze;
        ctx.fillRect(0, 0, TILE, h);
        return { canvas, top, h };
    }

    /* --------------------------------------------------------------- clouds */
    function paintClouds(scale) {
        const top = 150;
        const h = 330;
        const { canvas, ctx } = makeLayer(TILE, h, scale);
        const r = rng(21);
        for (let i = 0; i < 7; i++) {
            const cx = (i / 7) * TILE + r() * 80;
            const cy = 30 + r() * (h - 80);
            const size = 26 + r() * 26;
            const alpha = 0.35 + (cy / h) * 0.35;
            wrap((x) => {
                // shadowed underside
                ctx.fillStyle = `rgba(120, 90, 150, ${alpha * 0.55})`;
                for (let k = 0; k < 5; k++) {
                    ctx.beginPath();
                    ctx.ellipse(x + (k - 2) * size * 0.7, cy + 6, size * 0.75, size * 0.42, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.fillStyle = `rgba(255, 222, 205, ${alpha})`;
                for (let k = 0; k < 5; k++) {
                    const bump = k === 2 ? 1.2 : k % 2 ? 0.9 : 0.7;
                    ctx.beginPath();
                    ctx.ellipse(x + (k - 2) * size * 0.7, cy - size * 0.18 * bump, size * 0.7 * bump, size * 0.46 * bump, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            }, cx);
        }
        return { canvas, top, h };
    }

    /* --------------------------------------------------------------- castle */
    function paintCastle(scale) {
        const top = 380;
        const h = 252;
        const { canvas, ctx } = makeLayer(TILE, h, scale);
        const base = h;
        const body = '#3d2c58';
        const rim = 'rgba(255, 190, 150, 0.22)';
        const r = rng(33);

        function tower(x, w, th, roofH, opts = {}) {
            ctx.fillStyle = body;
            ctx.fillRect(x, base - th, w, th);
            // rim light (sunset from the right)
            ctx.fillStyle = rim;
            ctx.fillRect(x + w - 2, base - th, 2, th);
            // conical roof
            ctx.fillStyle = opts.roof || '#4a2f5e';
            ctx.beginPath();
            ctx.moveTo(x - 3, base - th);
            ctx.lineTo(x + w / 2, base - th - roofH);
            ctx.lineTo(x + w + 3, base - th);
            ctx.closePath();
            ctx.fill();
            // flag
            if (opts.flag) {
                const fx = x + w / 2;
                const fy = base - th - roofH;
                ctx.fillStyle = body;
                ctx.fillRect(fx - 0.6, fy - 12, 1.2, 12);
                ctx.fillStyle = '#a3222e';
                ctx.beginPath();
                ctx.moveTo(fx, fy - 12);
                ctx.lineTo(fx + 10, fy - 9);
                ctx.lineTo(fx, fy - 6);
                ctx.fill();
            }
            // lit windows
            const rows = Math.floor(th / 22);
            for (let i = 1; i < rows; i++) {
                if (r() < 0.45) continue;
                ctx.fillStyle = 'rgba(255, 210, 130, 0.9)';
                ctx.fillRect(x + w / 2 - 1.5, base - th + i * 22, 3, 5);
            }
        }

        function wall(x, w, wh) {
            ctx.fillStyle = body;
            ctx.fillRect(x, base - wh, w, wh);
            for (let cx = x; cx < x + w; cx += 8) ctx.fillRect(cx, base - wh - 5, 5, 5);
        }

        function castle(cx) {
            // hill
            ctx.fillStyle = '#34264c';
            ctx.beginPath();
            ctx.ellipse(cx, base + 30, 190, 70, 0, Math.PI, 0);
            ctx.fill();
            wall(cx - 140, 280, 60);
            tower(cx - 150, 22, 92, 30, { flag: true });
            tower(cx + 128, 22, 92, 30, { flag: true });
            tower(cx - 90, 26, 120, 36);
            tower(cx + 64, 26, 120, 36);
            // keep
            ctx.fillStyle = body;
            ctx.fillRect(cx - 50, base - 150, 100, 150);
            for (let x = cx - 50; x < cx + 50; x += 10) ctx.fillRect(x, base - 157, 6, 7);
            ctx.fillStyle = rim;
            ctx.fillRect(cx + 48, base - 150, 2, 150);
            // great hall dome
            ctx.fillStyle = '#4a2f5e';
            ctx.beginPath();
            ctx.ellipse(cx, base - 150, 34, 30, 0, Math.PI, 0);
            ctx.fill();
            tower(cx - 8, 16, 190, 44, { flag: true });
            // rose window
            ctx.fillStyle = 'rgba(255, 200, 120, 0.85)';
            ctx.beginPath();
            ctx.arc(cx, base - 110, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = body;
            ctx.fillRect(cx - 0.8, base - 118, 1.6, 16);
            ctx.fillRect(cx - 8, base - 110.8, 16, 1.6);
            // gate
            ctx.fillStyle = 'rgba(255, 200, 120, 0.6)';
            ctx.beginPath();
            ctx.moveTo(cx - 10, base);
            ctx.lineTo(cx - 10, base - 22);
            ctx.arc(cx, base - 22, 10, Math.PI, 0);
            ctx.lineTo(cx + 10, base);
            ctx.fill();
        }

        function crystalTower(x) {
            ctx.fillStyle = body;
            ctx.beginPath();
            ctx.moveTo(x - 9, base);
            ctx.lineTo(x - 6, base - 150);
            ctx.lineTo(x + 6, base - 150);
            ctx.lineTo(x + 9, base);
            ctx.fill();
            ctx.fillRect(x - 11, base - 156, 22, 8);
            // floating crystal glow
            const g = ctx.createRadialGradient(x, base - 176, 0, x, base - 176, 34);
            g.addColorStop(0, 'rgba(160, 230, 255, 0.85)');
            g.addColorStop(0.3, 'rgba(95, 200, 255, 0.35)');
            g.addColorStop(1, 'rgba(95, 200, 255, 0)');
            ctx.fillStyle = g;
            ctx.fillRect(x - 40, base - 216, 80, 80);
            ctx.fillStyle = '#bff0ff';
            ctx.beginPath();
            ctx.moveTo(x, base - 192);
            ctx.lineTo(x + 6, base - 176);
            ctx.lineTo(x, base - 162);
            ctx.lineTo(x - 6, base - 176);
            ctx.closePath();
            ctx.fill();
        }

        function windmill(x) {
            ctx.fillStyle = body;
            ctx.beginPath();
            ctx.moveTo(x - 10, base);
            ctx.lineTo(x - 6, base - 60);
            ctx.lineTo(x + 6, base - 60);
            ctx.lineTo(x + 10, base);
            ctx.fill();
            ctx.strokeStyle = body;
            ctx.lineWidth = 2.5;
            [0.4, 1.97, 3.54, 5.11].forEach((a) => {
                ctx.beginPath();
                ctx.moveTo(x, base - 58);
                ctx.lineTo(x + Math.cos(a) * 30, base - 58 + Math.sin(a) * 30);
                ctx.stroke();
            });
        }

        wrap(castle, 300);
        wrap(crystalTower, 640);
        wrap(windmill, 820);
        // distant town walls between landmarks
        wrap((x) => { ctx.fillStyle = '#34264c'; ctx.fillRect(x, base - 26, 180, 26); }, 520);
        wrap((x) => { tower(x, 18, 70, 24); }, 560);
        wrap((x) => { tower(x, 18, 58, 22, { flag: true }); }, 740);

        // horizon haze
        const haze = ctx.createLinearGradient(0, 0, 0, h);
        haze.addColorStop(0, 'rgba(240,190,150,0)');
        haze.addColorStop(1, 'rgba(240,190,150,0.28)');
        ctx.fillStyle = haze;
        ctx.fillRect(0, 0, TILE, h);
        return { canvas, top, h };
    }

    /* ----------------------------------------------------------------- town */
    function paintTown(scale) {
        const top = 500;
        const h = GROUND_Y - top + 6;
        const { canvas, ctx } = makeLayer(TILE, h, scale);
        const base = h;
        const r = rng(55);

        function house(x, w, hh, roofColor, seed) {
            const hr = rng(seed); // local generator → identical copies across the seam
            ctx.fillStyle = '#2b1f3c';
            ctx.fillRect(x, base - hh, w, hh);
            // timber frame hints
            ctx.fillStyle = 'rgba(255,220,180,0.06)';
            ctx.fillRect(x + 2, base - hh + 4, w - 4, 1);
            ctx.fillStyle = roofColor;
            ctx.beginPath();
            ctx.moveTo(x - 5, base - hh);
            ctx.lineTo(x + w / 2, base - hh - w * 0.55);
            ctx.lineTo(x + w + 5, base - hh);
            ctx.closePath();
            ctx.fill();
            // chimney
            if (hr() > 0.4) {
                ctx.fillStyle = '#2b1f3c';
                ctx.fillRect(x + w * 0.7, base - hh - w * 0.45, 5, 14);
            }
            // windows
            const n = Math.max(1, Math.floor(w / 16));
            for (let i = 0; i < n; i++) {
                if (hr() < 0.35) continue;
                ctx.fillStyle = 'rgba(255, 205, 120, 0.95)';
                ctx.fillRect(x + 5 + i * 16, base - hh + 10, 5, 6);
                ctx.fillStyle = 'rgba(255, 205, 120, 0.25)';
                ctx.fillRect(x + 3 + i * 16, base - hh + 8, 9, 10);
            }
        }

        function tree(x, size) {
            ctx.fillStyle = '#241a2c';
            ctx.fillRect(x - 2, base - size * 0.9, 4, size * 0.9);
            const tones = ['#1f3a35', '#264a3c', '#2f5a42'];
            [[0, -1.3, 0.75], [-0.45, -0.95, 0.6], [0.45, -0.95, 0.6], [0, -0.8, 0.7]].forEach(([dx, dy, s], i) => {
                ctx.fillStyle = tones[i % tones.length];
                ctx.beginPath();
                ctx.arc(x + dx * size, base + dy * size, s * size * 0.6, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.fillStyle = 'rgba(255, 190, 150, 0.12)';
            ctx.beginPath();
            ctx.arc(x + size * 0.2, base - size * 1.4, size * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }

        const roofs = ['#5a2a3a', '#4a2f5e', '#6b3a2e', '#3f3060'];
        let x = 0;
        while (x < TILE - 40) {
            const kind = r();
            if (kind < 0.55) {
                const w = 34 + r() * 30;
                const hh = 26 + r() * 30;
                const roof = roofs[Math.floor(r() * roofs.length)];
                const seed = Math.floor(r() * 1e9);
                wrap((xx) => house(xx, w, hh, roof, seed), x);
                x += w + 10 + r() * 20;
            } else {
                const s = 26 + r() * 20;
                wrap((xx) => tree(xx, s), x + s * 0.5);
                x += s + 6;
            }
        }
        return { canvas, top, h };
    }

    /* --------------------------------------------------------------- ground */
    function paintGround(scale) {
        const top = GROUND_Y - 10;
        const h = H - top;
        const { canvas, ctx } = makeLayer(TILE, h, scale);
        const r = rng(77);
        const y0 = 10; // ground line inside this layer

        // dirt
        const dirt = ctx.createLinearGradient(0, y0, 0, h);
        dirt.addColorStop(0, '#6b4428');
        dirt.addColorStop(0.5, '#4a2e18');
        dirt.addColorStop(1, '#2c1c10');
        ctx.fillStyle = dirt;
        ctx.fillRect(0, y0, TILE, h - y0);

        // cobblestone road
        const roadTop = y0 + 12;
        const roadH = 30;
        ctx.fillStyle = '#3b2a1c';
        ctx.fillRect(0, roadTop, TILE, roadH);
        for (let row = 0; row < 3; row++) {
            let x = row % 2 ? -8 : 0;
            while (x < TILE) {
                const w = 14 + r() * 10;
                const shade = 120 + Math.floor(r() * 40);
                ctx.fillStyle = `rgb(${shade + 14}, ${shade}, ${shade - 20})`;
                const sy = roadTop + 1 + row * 10;
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(x + 1, sy, w - 2, 8.5, 3);
                else ctx.rect(x + 1, sy, w - 2, 8.5);
                ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.18)';
                ctx.fillRect(x + 3, sy + 1, w - 7, 1.2);
                x += w;
            }
        }
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(0, roadTop + roadH, TILE, 2);

        // pebbles in the dirt
        for (let i = 0; i < 120; i++) {
            ctx.fillStyle = r() > 0.5 ? 'rgba(160,130,100,0.5)' : 'rgba(30,18,10,0.45)';
            ctx.fillRect(r() * TILE, roadTop + roadH + 4 + r() * (h - roadTop - roadH - 6), 2, 1.5);
        }

        // grass band with tufts
        const grass = ctx.createLinearGradient(0, 0, 0, y0 + 12);
        grass.addColorStop(0, '#7dbb4f');
        grass.addColorStop(0.5, '#4f8a3a');
        grass.addColorStop(1, '#2f5233');
        ctx.fillStyle = grass;
        ctx.fillRect(0, y0, TILE, 12);
        for (let x = 0; x < TILE; x += 3) {
            const th = 3 + r() * 7;
            ctx.fillStyle = r() > 0.5 ? '#5f9a3e' : '#8cc45a';
            ctx.beginPath();
            ctx.moveTo(x, y0 + 2);
            ctx.lineTo(x + 1.5, y0 + 2 - th);
            ctx.lineTo(x + 3, y0 + 2);
            ctx.fill();
        }
        // wildflowers
        const petals = ['#ecca5e', '#ff8fa0', '#9fd8ff', '#fff6e0'];
        for (let i = 0; i < 40; i++) {
            const fx = r() * TILE;
            const fy = y0 - 1 + r() * 6;
            ctx.fillStyle = petals[Math.floor(r() * petals.length)];
            ctx.fillRect(fx, fy, 2.4, 2.4);
        }
        // wooden fence posts along the road
        for (let x = 40; x < TILE; x += 160) {
            ctx.fillStyle = '#5a3823';
            ctx.fillRect(x, y0 - 12, 5, 16);
            ctx.fillRect(x + 40, y0 - 12, 5, 16);
            ctx.fillStyle = '#8a5e35';
            ctx.fillRect(x - 2, y0 - 9, 49, 3);
            ctx.fillRect(x - 2, y0 - 3, 49, 3);
            ctx.fillStyle = '#c9a227';
            ctx.fillRect(x + 1, y0 - 13, 3, 2);
            ctx.fillRect(x + 41, y0 - 13, 3, 2);
        }
        return { canvas, top, h };
    }

    function paintVignette(scale) {
        const { canvas, ctx } = makeLayer(W, H, scale);
        const g = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.35, W / 2, H * 0.45, H * 0.8);
        g.addColorStop(0, 'rgba(20,10,30,0)');
        g.addColorStop(1, 'rgba(20,10,30,0.45)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        return canvas;
    }

    function build(scale) {
        const s = Math.min(scale, 2.5); // cap memory on very high-DPI phones
        return {
            scale: s,
            sky: paintSky(s),
            vignette: paintVignette(s),
            layers: [
                { name: 'mountains', speed: 0.08, ...paintMountains(s) },
                { name: 'clouds', speed: 0.16, drift: 0.12, ...paintClouds(s) },
                { name: 'castle', speed: 0.28, ...paintCastle(s) },
                { name: 'town', speed: 0.52, ...paintTown(s) },
            ],
            ground: { name: 'ground', speed: 1, ...paintGround(s) },
            tile: TILE,
        };
    }

    FN.assets = FN.assets || {};
    FN.assets.scenery = { build, TILE, GROUND_Y };
})(window.FN = window.FN || {});
