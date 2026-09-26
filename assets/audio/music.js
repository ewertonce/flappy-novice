/*
 * ORIGINAL MUSIC — "Road to the Capital" (a short tavern-style loop)
 * -----------------------------------------------------------------------------
 * Composed for Flappy Novice in D minor, 6/8 time. Stored as note data and
 * synthesised live with the Web Audio API — there are no audio files and no
 * third-party or Ragnarok Online music.
 *
 * Each melody entry is [note, lengthInEighths]. `bass` holds one root per bar.
 */
(function (FN) {
    'use strict';

    const SONG = {
        eighth: 0.19, // seconds per eighth note (~105 bpm dotted-quarter pulse)
        melody: [
            // Phrase A
            ['D4', 2], ['F4', 1], ['A4', 2], ['G4', 1],
            ['F4', 2], ['E4', 1], ['D4', 3],
            ['C4', 2], ['E4', 1], ['G4', 2], ['F4', 1],
            ['E4', 2], ['D4', 1], ['C4', 3],
            // Phrase A'
            ['D4', 2], ['F4', 1], ['A4', 2], ['C5', 1],
            ['D5', 2], ['C5', 1], ['A4', 3],
            ['G4', 2], ['A4', 1], ['F4', 2], ['E4', 1],
            ['D4', 6],
            // Phrase B
            ['A4', 2], ['C5', 1], ['D5', 2], ['E5', 1],
            ['F5', 2], ['E5', 1], ['D5', 3],
            ['C5', 2], ['A4', 1], ['G4', 2], ['A4', 1],
            ['E4', 3], ['A4', 3],
            // Phrase B'
            ['F4', 2], ['G4', 1], ['A4', 2], ['C5', 1],
            ['D5', 2], ['C5', 1], ['A4', 2], ['G4', 1],
            ['F4', 2], ['E4', 1], ['C4', 2], ['E4', 1],
            ['D4', 6],
        ],
        bass: ['D2', 'D2', 'C2', 'C2', 'D2', 'F2', 'C2', 'D2', 'A2', 'D2', 'F2', 'A2', 'F2', 'D2', 'C2', 'D2'],
    };

    const NOTE_INDEX = { C: -9, 'C#': -8, D: -7, 'D#': -6, E: -5, F: -4, 'F#': -3, G: -2, 'G#': -1, A: 0, 'A#': 1, B: 2 };

    function noteToFreq(note) {
        const m = /^([A-G]#?)(\d)$/.exec(note);
        if (!m) return 440;
        const semis = NOTE_INDEX[m[1]] + (parseInt(m[2], 10) - 4) * 12;
        return 440 * Math.pow(2, semis / 12);
    }

    FN.assets = FN.assets || {};
    FN.assets.music = { SONG, noteToFreq };
})(window.FN = window.FN || {});
