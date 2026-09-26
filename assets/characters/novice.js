/*
 * ORIGINAL ARTWORK — "The Novice"
 * -----------------------------------------------------------------------------
 * A chibi apprentice adventurer drawn pixel by pixel for Flappy Novice.
 * Each string row is one pixel row; each character maps to a palette colour
 * ('.' is transparent). Sprites are rasterised once to tiny off-screen canvases
 * and scaled up with nearest-neighbour sampling for a crisp retro look.
 *
 * The magic "mana wings" and the fluttering scarf are drawn procedurally by the
 * renderer so they can animate smoothly on top of these frames.
 */
(function (FN) {
    'use strict';

    const PALETTE = {
        K: '#2a1810', // ink outline (Ragna-Memories --ink)
        H: '#7a4a24', // hair
        h: '#b8783c', // hair highlight
        j: '#e0a458', // hair shine
        S: '#f7d5b2', // skin
        s: '#dfa985', // skin shade
        M: '#f29a8c', // blush
        w: '#ffffff', // eye glint
        C: '#ecdcae', // novice tunic (parchment)
        c: '#c3a672', // tunic shade
        B: '#5a3823', // belt / straps (wood-mid)
        G: '#ecca5e', // gold buckle (gold-bright)
        P: '#6b4a2f', // trousers
        O: '#3b2616', // boots
        R: '#a3222e', // scarf (burgundy-bright)
        r: '#7a1620', // scarf shade (burgundy)
        A: '#8a5e35', // backpack (wood-light)
        a: '#5a3823', // backpack shade
        E: '#5fc8ff', // crystal charm on the backpack
    };

    const HEAD = [
        '.......KKKKKK.......',
        '.....KKhjjhHHKK.....',
        '....KhhjHHHHHHHK....',
        '...KhHHHHHHHHHHHK...',
        '..KHHHHHHHHHHHHHHK..',
        '..KHHHHHHHHHHHHHHHK.',
        '.KHHHHHHHHSHHHHSHHK.',
        '.KHHHHHHHSSSHHSSSHK.',
        '.KHHHHHHSSSSSSSSSSK.',
        '.KHHHHHHSSSKwSSSKwK.',
        '.KHHHHHHSSSKKSSSKKK.',
        '..KHHHHSSMMSSSSSMMK.',
        '...KKHHSSSSSSSKSSK..',
        '.....KKKSSSSSSSSK...',
    ];

    const BODY_FALL = [
        '.....KKRRRRRRRRK....',
        '...KKAKRrRRRRRRK....',
        '..KAAEAKCCCCCCKSK...',
        '..KAAAAKCCCcCCKSK...',
        '..KaaaaKCCCcCCKK....',
        '..KaaaaKBBBGBBK.....',
        '...KKKKKCCCCCCK.....',
        '.......KPPKKPPK.....',
        '.......KPPK.KPPK....',
        '.......KOOK.KOOOK...',
        '.......KKKK.KKKKK...',
    ];

    const BODY_FLAP = [
        '.....KKRRRRRRRRKKK..',
        '...KKAKRrRRRRRRKSSK.',
        '..KAAEAKCCCCCCKKSK..',
        '..KAAAAKCCCcCCK.K...',
        '..KaaaaKCCCcCCK.....',
        '..KaaaaKBBBGBBK.....',
        '...KKKKKCCCCCCK.....',
        '......KPPPKKPPPK....',
        '.....KOOPK..KPPK....',
        '.....KOOK...KOOK....',
        '.....KKK....KKKK....',
    ];

    const FRAMES = {
        fall: HEAD.concat(BODY_FALL),
        flap: HEAD.concat(BODY_FLAP),
    };

    /* Anchor (in sprite pixels) that sits on the physics position. */
    const ANCHOR = { x: 10, y: 13 };
    /* Where the mana wings attach (backpack) and the scarf knot sits. */
    const WING_ROOT = { x: 4, y: 15 };
    const SCARF_ROOT = { x: 6, y: 15 };

    function rasterize(rows, palette) {
        const h = rows.length;
        const w = Math.max(...rows.map((r) => r.length));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        rows.forEach((row, y) => {
            for (let x = 0; x < row.length; x++) {
                const color = palette[row[x]];
                if (!color) continue;
                ctx.fillStyle = color;
                ctx.fillRect(x, y, 1, 1);
            }
        });
        return canvas;
    }

    let cache = null;
    function getSprites() {
        if (!cache) {
            cache = {
                fall: rasterize(FRAMES.fall, PALETTE),
                flap: rasterize(FRAMES.flap, PALETTE),
            };
        }
        return cache;
    }

    FN.assets = FN.assets || {};
    FN.assets.novice = { PALETTE, FRAMES, ANCHOR, WING_ROOT, SCARF_ROOT, getSprites, rasterize };
})(window.FN = window.FN || {});
