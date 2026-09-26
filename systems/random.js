/*
 * Seedable pseudo-random generator (mulberry32).
 * Gameplay randomness (gap heights, loot, tower style) always goes through an
 * instance of this, so a given seed reproduces the exact same run — handy for
 * QA and Playwright tests. Purely visual randomness may use Math.random().
 */
(function (FN) {
    'use strict';

    function createRng(seed) {
        let s = (Number(seed) >>> 0) || 0x9e3779b9;
        const next = function () {
            s = (s + 0x6d2b79f5) >>> 0;
            let t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
        return {
            seed: seed,
            next: next,
            range: (min, max) => min + next() * (max - min),
            int: (min, max) => Math.floor(min + next() * (max - min + 1)),
            pick: (list) => list[Math.floor(next() * list.length)],
            weighted: (entries) => {
                // entries: [{ weight, ...}]
                const total = entries.reduce((sum, e) => sum + e.weight, 0);
                let roll = next() * total;
                for (const entry of entries) {
                    roll -= entry.weight;
                    if (roll < 0) return entry;
                }
                return entries[entries.length - 1];
            },
        };
    }

    function randomSeed() {
        return Math.floor(Math.random() * 0xffffffff) >>> 0;
    }

    FN.random = { createRng, randomSeed };
})(window.FN = window.FN || {});
