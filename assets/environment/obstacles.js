/*
 * ORIGINAL ARTWORK — tower obstacles
 * -----------------------------------------------------------------------------
 * Two procedurally painted tower styles replace the classic pipes:
 *   • wood  — carved plank watchtowers with antique-gold bands, rope bindings
 *             and a Kafra-crystal gem socket in the cap.
 *   • stone — mossy castle-ruin pillars with an emerald gem socket.
 * Tiles are painted once per render scale into off-screen canvases and then
 * repeated vertically, so drawing a tower each frame is just a few drawImage
 * calls.
 */
(function (FN) {
    'use strict';

    const BODY_W = 72;
    const TILE_H = 96;
    const CAP_W = 86;
    const CAP_H = 26;

    function makeCanvas(w, h, scale) {
        const c = document.createElement('canvas');
        c.width = Math.ceil(w * scale);
        c.height = Math.ceil(h * scale);
        const ctx = c.getContext('2d');
        ctx.scale(scale, scale);
        return { canvas: c, ctx };
    }

    /* Tiny deterministic noise for texture placement (visual only). */
    function hash(n) {
        const x = Math.sin(n * 127.1) * 43758.5453;
        return x - Math.floor(x);
    }

    function goldBand(ctx, y, h, w) {
        const g = ctx.createLinearGradient(0, y, 0, y + h);
        g.addColorStop(0, '#6b4d10');
        g.addColorStop(0.3, '#ecca5e');
        g.addColorStop(0.6, '#c9a227');
        g.addColorStop(1, '#5a3f0c');
        ctx.fillStyle = g;
        ctx.fillRect(0, y, w, h);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(0, y + h, w, 1.5);
    }

    function rivet(ctx, x, y, r = 2.2) {
        const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, 0, x, y, r);
        g.addColorStop(0, '#fff2b8');
        g.addColorStop(0.45, '#c9a227');
        g.addColorStop(1, '#5a3f0c');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    function sideShade(ctx, w, h) {
        const g = ctx.createLinearGradient(0, 0, w, 0);
        g.addColorStop(0, 'rgba(20,10,5,0.45)');
        g.addColorStop(0.18, 'rgba(20,10,5,0.05)');
        g.addColorStop(0.35, 'rgba(255,230,180,0.08)');
        g.addColorStop(0.7, 'rgba(20,10,5,0.12)');
        g.addColorStop(1, 'rgba(20,10,5,0.55)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
    }

    /* Gold ring + glowing gem, echoing the Ragna-Memories card-back socket. */
    function gemSocket(ctx, cx, cy, r, inner, mid, outer, glow) {
        const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.6);
        halo.addColorStop(0, glow);
        halo.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = halo;
        ctx.fillRect(cx - r * 3, cy - r * 3, r * 6, r * 6);

        const ring = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
        ring.addColorStop(0, '#ecca5e');
        ring.addColorStop(0.5, '#6b4d10');
        ring.addColorStop(1, '#ecca5e');
        ctx.fillStyle = ring;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 2.2, 0, Math.PI * 2);
        ctx.fill();

        const gem = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, 0, cx, cy, r);
        gem.addColorStop(0, inner);
        gem.addColorStop(0.45, mid);
        gem.addColorStop(1, outer);
        ctx.fillStyle = gem;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath();
        ctx.ellipse(cx - r * 0.35, cy - r * 0.4, r * 0.3, r * 0.18, -0.5, 0, Math.PI * 2);
        ctx.fill();
    }

    /* ---------------------------------------------------------------- wood */
    function paintWoodBody(scale) {
        const { canvas, ctx } = makeCanvas(BODY_W, TILE_H, scale);
        const plankW = BODY_W / 4;
        const tones = [['#9a6a3c', '#6b4428'], ['#8a5e35', '#5f3c22'], ['#94643a', '#664026'], ['#86592f', '#5a3823']];
        for (let i = 0; i < 4; i++) {
            const x = i * plankW;
            const g = ctx.createLinearGradient(x, 0, x + plankW, 0);
            g.addColorStop(0, tones[i][0]);
            g.addColorStop(1, tones[i][1]);
            ctx.fillStyle = g;
            ctx.fillRect(x, 0, plankW, TILE_H);
            // grain
            ctx.strokeStyle = 'rgba(44,28,16,0.35)';
            ctx.lineWidth = 0.8;
            for (let k = 0; k < 3; k++) {
                const gx = x + 3 + k * 5 + hash(i * 7 + k) * 2;
                ctx.beginPath();
                ctx.moveTo(gx, 0);
                for (let y = 0; y <= TILE_H; y += 12) ctx.lineTo(gx + Math.sin(y * 0.09 + i + k) * 1.2, y);
                ctx.stroke();
            }
            // knot
            if (hash(i * 3.3) > 0.45) {
                const ky = 30 + hash(i * 9.1) * 40;
                ctx.fillStyle = 'rgba(44,28,16,0.55)';
                ctx.beginPath();
                ctx.ellipse(x + plankW / 2, ky, 2.4, 4, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = 'rgba(236,202,94,0.15)';
                ctx.stroke();
            }
            // seam
            ctx.fillStyle = '#2c1c10';
            ctx.fillRect(x, 0, 1.2, TILE_H);
        }
        // gold band + rivets
        goldBand(ctx, 6, 8, BODY_W);
        for (let x = 6; x < BODY_W; x += 12) rivet(ctx, x, 10, 1.8);
        // rope binding
        for (let r = 0; r < 4; r++) {
            const y = 58 + r * 4;
            ctx.fillStyle = '#b89160';
            ctx.fillRect(0, y, BODY_W, 3);
            ctx.strokeStyle = '#7a5a30';
            ctx.lineWidth = 0.8;
            for (let x = -4; x < BODY_W; x += 4) {
                ctx.beginPath();
                ctx.moveTo(x, y + 3);
                ctx.lineTo(x + 3, y);
                ctx.stroke();
            }
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(0, y + 3, BODY_W, 1);
        }
        sideShade(ctx, BODY_W, TILE_H);
        return canvas;
    }

    function paintWoodCap(scale, flipped) {
        const { canvas, ctx } = makeCanvas(CAP_W, CAP_H, scale);
        if (flipped) { ctx.translate(0, CAP_H); ctx.scale(1, -1); }
        // carved beam
        const g = ctx.createLinearGradient(0, 0, 0, CAP_H);
        g.addColorStop(0, '#a87644');
        g.addColorStop(0.5, '#6b4428');
        g.addColorStop(1, '#3b2616');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, CAP_W, CAP_H);
        // carved panels
        ctx.strokeStyle = 'rgba(44,28,16,0.7)';
        ctx.lineWidth = 1;
        ctx.strokeRect(4.5, 6.5, 22, 13);
        ctx.strokeRect(CAP_W - 26.5, 6.5, 22, 13);
        ctx.strokeStyle = 'rgba(236,202,94,0.25)';
        ctx.strokeRect(5.5, 7.5, 20, 11);
        ctx.strokeRect(CAP_W - 25.5, 7.5, 20, 11);
        // gold trims
        goldBand(ctx, 0, 3, CAP_W);
        goldBand(ctx, CAP_H - 4, 3, CAP_W);
        // frame outline
        ctx.strokeStyle = '#2c1c10';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(0.6, 0.6, CAP_W - 1.2, CAP_H - 1.2);
        // corner rivets
        rivet(ctx, 4, 13, 1.8);
        rivet(ctx, CAP_W - 4, 13, 1.8);
        // Kafra crystal socket
        gemSocket(ctx, CAP_W / 2, CAP_H / 2, 6, '#e8fbff', '#5fc8ff', '#1f5fa8', 'rgba(95,200,255,0.55)');
        return canvas;
    }

    /* --------------------------------------------------------------- stone */
    function paintStoneBody(scale) {
        const { canvas, ctx } = makeCanvas(BODY_W, TILE_H, scale);
        ctx.fillStyle = '#3f3750';
        ctx.fillRect(0, 0, BODY_W, TILE_H);
        const rowH = 16;
        const tones = ['#8a8098', '#7d7390', '#958aa6', '#72698a', '#877c96'];
        for (let r = 0; r < TILE_H / rowH; r++) {
            const offset = r % 2 ? -12 : 0;
            for (let c = 0; c < 4; c++) {
                const x = offset + c * 24;
                const n = hash(r * 11 + c);
                ctx.fillStyle = tones[Math.floor(n * tones.length)];
                ctx.fillRect(x + 1, r * rowH + 1, 22, rowH - 2);
                ctx.fillStyle = 'rgba(255,255,255,0.14)';
                ctx.fillRect(x + 1, r * rowH + 1, 22, 2);
                ctx.fillStyle = 'rgba(0,0,0,0.18)';
                ctx.fillRect(x + 1, r * rowH + rowH - 3, 22, 2);
                if (n > 0.72) {
                    ctx.strokeStyle = 'rgba(40,30,50,0.6)';
                    ctx.lineWidth = 0.8;
                    ctx.beginPath();
                    ctx.moveTo(x + 6, r * rowH + 3);
                    ctx.lineTo(x + 10, r * rowH + 8);
                    ctx.lineTo(x + 8, r * rowH + 13);
                    ctx.stroke();
                }
            }
            if (offset) {
                // wrap the half brick on the right edge
                const n = hash(r * 11 + 4);
                ctx.fillStyle = tones[Math.floor(n * tones.length)];
                ctx.fillRect(BODY_W - 11, r * rowH + 1, 11, rowH - 2);
            }
        }
        // moss
        for (let i = 0; i < 5; i++) {
            const mx = hash(i * 5.7) * BODY_W;
            const my = hash(i * 3.1) * TILE_H;
            const g = ctx.createRadialGradient(mx, my, 0, mx, my, 9);
            g.addColorStop(0, 'rgba(79,140,80,0.75)');
            g.addColorStop(0.6, 'rgba(47,82,51,0.45)');
            g.addColorStop(1, 'rgba(47,82,51,0)');
            ctx.fillStyle = g;
            ctx.fillRect(mx - 9, my - 9, 18, 18);
        }
        // hanging ivy strand
        ctx.strokeStyle = '#2f5233';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(56, 0);
        for (let y = 0; y <= TILE_H; y += 6) ctx.lineTo(56 + Math.sin(y * 0.12) * 3, y);
        ctx.stroke();
        for (let y = 4; y < TILE_H; y += 11) {
            ctx.fillStyle = y % 2 ? '#4f8c50' : '#3f7a45';
            ctx.beginPath();
            ctx.ellipse(56 + Math.sin(y * 0.12) * 3 + (y % 22 ? 3 : -3), y, 3, 1.8, 0.6, 0, Math.PI * 2);
            ctx.fill();
        }
        sideShade(ctx, BODY_W, TILE_H);
        return canvas;
    }

    function paintStoneCap(scale, flipped) {
        const { canvas, ctx } = makeCanvas(CAP_W, CAP_H, scale);
        if (flipped) { ctx.translate(0, CAP_H); ctx.scale(1, -1); }
        const g = ctx.createLinearGradient(0, 0, 0, CAP_H);
        g.addColorStop(0, '#b3a8c2');
        g.addColorStop(0.35, '#8a8098');
        g.addColorStop(1, '#4e4562');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, CAP_W, CAP_H);
        // block joints
        ctx.fillStyle = 'rgba(40,30,55,0.55)';
        [20, 66].forEach((x) => ctx.fillRect(x, 0, 1.2, CAP_H));
        ctx.fillRect(0, 12, CAP_W, 1.1);
        // bevel highlight
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(0, 0, CAP_W, 2);
        // moss drip
        ctx.fillStyle = '#3f7a45';
        for (let x = 2; x < CAP_W; x += 7) {
            const h = 2 + hash(x) * 4;
            ctx.fillRect(x, CAP_H - 3 - h * 0.3, 5, h * 0.6);
        }
        ctx.fillStyle = '#2f5233';
        ctx.fillRect(0, CAP_H - 3, CAP_W, 3);
        ctx.strokeStyle = '#2a2238';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(0.6, 0.6, CAP_W - 1.2, CAP_H - 1.2);
        // emerald socket
        gemSocket(ctx, CAP_W / 2, CAP_H / 2 - 1, 6, '#d9ffe0', '#4fbf7a', '#1f5a33', 'rgba(79,191,122,0.5)');
        return canvas;
    }

    function build(scale) {
        return {
            scale,
            BODY_W, TILE_H, CAP_W, CAP_H,
            wood: {
                body: paintWoodBody(scale),
                cap: paintWoodCap(scale, false),
                capFlipped: paintWoodCap(scale, true),
            },
            stone: {
                body: paintStoneBody(scale),
                cap: paintStoneCap(scale, false),
                capFlipped: paintStoneCap(scale, true),
            },
        };
    }

    /* Animated banner hanging below a bottom tower's cap. */
    function drawBanner(ctx, x, y, time, color = '#a3222e', shade = '#7a1620') {
        const w = 26;
        const len = 40;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y);
        const segs = 6;
        for (let i = 0; i <= segs; i++) {
            const t = i / segs;
            const wave = Math.sin(time * 3 + t * 4) * 2.2 * t;
            ctx.lineTo(x + w + wave, y + len * t);
        }
        const tipWave = Math.sin(time * 3 + 4) * 2.2;
        ctx.lineTo(x + w / 2 + tipWave, y + len - 9);
        for (let i = segs; i >= 0; i--) {
            const t = i / segs;
            const wave = Math.sin(time * 3 + t * 4) * 2.2 * t;
            ctx.lineTo(x + wave, y + len * t);
        }
        ctx.closePath();
        const g = ctx.createLinearGradient(x, 0, x + w, 0);
        g.addColorStop(0, shade);
        g.addColorStop(0.5, color);
        g.addColorStop(1, shade);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = '#c9a227';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        // emblem: a small gold diamond with a crystal dot
        const ex = x + w / 2 + Math.sin(time * 3 + 2) * 1.1;
        const ey = y + 16;
        ctx.fillStyle = '#ecca5e';
        ctx.beginPath();
        ctx.moveTo(ex, ey - 7);
        ctx.lineTo(ex + 6, ey);
        ctx.lineTo(ex, ey + 7);
        ctx.lineTo(ex - 6, ey);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#5fc8ff';
        ctx.fillRect(ex - 1.5, ey - 1.5, 3, 3);
        // rod
        ctx.fillStyle = '#6b4d10';
        ctx.fillRect(x - 3, y - 1, w + 6, 3);
        ctx.restore();
    }

    FN.assets = FN.assets || {};
    FN.assets.obstacles = { build, drawBanner, BODY_W, TILE_H, CAP_W, CAP_H };
})(window.FN = window.FN || {});
