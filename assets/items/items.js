/*
 * ORIGINAL ARTWORK — collectible loot
 * -----------------------------------------------------------------------------
 * Pixel maps for the four loot items, plus a helper that draws them with their
 * animated glow / spin. Colours are pulled from the shared Ragna-Memories
 * palette (antique gold, burgundy, Kafra-crystal blue).
 */
(function (FN) {
    'use strict';

    const MAPS = {
        zeny: {
            palette: { D: '#6b4d10', G: '#ecca5e', g: '#c9a227', W: '#fff6c8', d: '#9a7418' },
            rows: [
                '....DDDD....',
                '..DDGGGGDD..',
                '.DGWWGGGGgD.',
                '.DWWGGGGGgD.',
                'DGWGddddGggD',
                'DGGGGGdGGggD',
                'DGGGGdGGGggD',
                'DGGGddddGggD',
                '.DGGGGGGggD.',
                '.DgGGGGgggD.',
                '..DDggggDD..',
                '....DDDD....',
            ],
        },
        potion: {
            palette: { K: '#2a1810', o: '#c89454', O: '#8a5e35', L: '#f4ecf6', R: '#d8323c', r: '#8f1a24', W: '#ffe4e4', l: '#bfb3c8' },
            rows: [
                '....KKKK....',
                '....KooK....',
                '....KOOK....',
                '...KKKKKK...',
                '....KLlK....',
                '...KLLLlK...',
                '..KRRRRRRK..',
                '.KRWRRRRRrK.',
                '.KRWWRRRRrK.',
                '.KRRRRRRRrK.',
                '.KRRRRRRrrK.',
                '..KrRRRrrK..',
                '...KKKKKK...',
            ],
        },
        gem: {
            palette: { K: '#172552', B: '#3f7fe0', b: '#2a52a8', L: '#8fd0ff', W: '#ffffff', n: '#1d3a86' },
            rows: [
                '...KKKKKK...',
                '..KLWLLBbK..',
                '.KLWLLBBbbK.',
                'KLLLLBBBbbbK',
                'KbbbbbnnnnnK',
                '.KLBBBBbbnK.',
                '..KLBBBbnK..',
                '...KLBbnK...',
                '....KBnK....',
                '.....KK.....',
            ],
        },
        crystal: {
            palette: { K: '#123a66', C: '#5fc8ff', c: '#2a8fd6', W: '#f2fdff', L: '#a8e6ff', d: '#1f6cb0' },
            rows: [
                '....KK....',
                '...KWLK...',
                '..KWLCcK..',
                '..KWLCcK..',
                '.KWLCCccK.',
                '.KWLCCcdK.',
                '.KLCCCcdK.',
                '.KLCCccdK.',
                '.KLCCccdK.',
                '.KLCCcddK.',
                '..KLCcdK..',
                '..KLCcdK..',
                '...KCdK...',
                '....KK....',
            ],
        },
    };

    const GLOW = {
        zeny: 'rgba(236, 202, 94, 0.55)',
        potion: 'rgba(230, 70, 80, 0.5)',
        gem: 'rgba(90, 150, 255, 0.55)',
        crystal: 'rgba(95, 200, 255, 0.75)',
    };

    const BURST_COLORS = {
        zeny: ['#ecca5e', '#fff6c8', '#c9a227'],
        potion: ['#ff6b74', '#ffd0d0', '#d8323c'],
        gem: ['#8fd0ff', '#ffffff', '#3f7fe0'],
        crystal: ['#5fc8ff', '#e8fbff', '#a8e6ff', '#b58cff'],
    };

    const UPSCALE = 6; // pre-upscale factor so rotated / scaled draws stay crisp
    let cache = null;

    function getSprites() {
        if (cache) return cache;
        cache = {};
        Object.keys(MAPS).forEach((key) => {
            const base = FN.assets.novice.rasterize(MAPS[key].rows, MAPS[key].palette);
            const big = document.createElement('canvas');
            big.width = base.width * UPSCALE;
            big.height = base.height * UPSCALE;
            const bctx = big.getContext('2d');
            bctx.imageSmoothingEnabled = false;
            bctx.drawImage(base, 0, 0, big.width, big.height);
            cache[key] = { canvas: big, w: base.width, h: base.height };
        });
        return cache;
    }

    /*
     * Draw an item centred at (x, y) in logical units.
     * `pixel` = logical size of one sprite pixel. `time` in seconds.
     */
    function drawItem(ctx, type, x, y, pixel, time, { glow = true } = {}) {
        const sprite = getSprites()[type];
        if (!sprite) return;
        const w = sprite.w * pixel;
        const h = sprite.h * pixel;

        if (glow) {
            const pulse = 0.75 + Math.sin(time * 4 + x * 0.05) * 0.25;
            const r = Math.max(w, h) * (type === 'crystal' ? 1.35 : 1.05) * pulse;
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, GLOW[type]);
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = g;
            ctx.fillRect(x - r, y - r, r * 2, r * 2);
            ctx.restore();
        }

        ctx.save();
        ctx.translate(x, y);
        if (type === 'zeny') {
            // Coin spin: squash horizontally.
            const sx = Math.max(0.2, Math.abs(Math.cos(time * 3.2)));
            ctx.scale(sx, 1);
        } else if (type === 'crystal') {
            ctx.rotate(Math.sin(time * 2) * 0.12);
        }
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(sprite.canvas, -w / 2, -h / 2, w, h);
        ctx.restore();

        if (type === 'crystal' || type === 'gem') {
            // Orbiting glints.
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < 3; i++) {
                const a = time * 2.4 + (i * Math.PI * 2) / 3;
                const px = x + Math.cos(a) * w * 0.9;
                const py = y + Math.sin(a) * h * 0.45;
                const s = 1.2 + Math.sin(time * 6 + i) * 0.6;
                ctx.fillStyle = 'rgba(232, 251, 255, 0.9)';
                ctx.fillRect(px - s / 2, py - s * 1.5, s, s * 3);
                ctx.fillRect(px - s * 1.5, py - s / 2, s * 3, s);
            }
            ctx.restore();
        }
    }

    FN.assets = FN.assets || {};
    FN.assets.items = { MAPS, GLOW, BURST_COLORS, getSprites, drawItem };
})(window.FN = window.FN || {});
