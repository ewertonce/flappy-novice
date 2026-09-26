/*
 * Audio system — every sound is synthesised with the Web Audio API.
 * No audio files, no copyrighted samples. The blip-and-arpeggio style (square
 * "flip", rising victory arpeggio, falling defeat motif) deliberately echoes
 * the synthesised sound palette of Ragna-Memories.
 *
 * Testability: `lastSound` / `history` record what was *played* (only while
 * sound is enabled), so Playwright can assert on audio without speakers.
 */
(function (FN) {
    'use strict';

    const { STORAGE_KEYS } = FN.config;

    class AudioSystem {
        constructor() {
            this.enabled = FN.storage.readBool(STORAGE_KEYS.sound, true);
            this.musicEnabled = FN.storage.readBool(STORAGE_KEYS.music, true);
            this.ctx = null;
            this.master = null;
            this.musicGain = null;
            this.lastSound = null;
            this.history = [];
            this.listeners = [];
            this.music = { playing: false, timer: null, nextTime: 0, step: 0, bar: 0 };
        }

        /* Lazily create / resume the AudioContext (must follow a user gesture). */
        unlock() {
            try {
                if (!this.ctx) {
                    const Ctx = window.AudioContext || window.webkitAudioContext;
                    if (!Ctx) return null;
                    this.ctx = new Ctx();
                    this.master = this.ctx.createGain();
                    this.master.gain.value = 0.9;
                    this.master.connect(this.ctx.destination);
                    this.musicGain = this.ctx.createGain();
                    this.musicGain.gain.value = 0.55;
                    this.musicGain.connect(this.master);
                }
                if (this.ctx.state === 'suspended') this.ctx.resume();
            } catch (err) {
                this.ctx = null;
            }
            return this.ctx;
        }

        onChange(fn) { this.listeners.push(fn); }
        notify() { this.listeners.forEach((fn) => fn(this)); }

        setEnabled(on) {
            this.enabled = !!on;
            FN.storage.write(STORAGE_KEYS.sound, this.enabled);
            if (!this.enabled) this.stopMusic();
            this.notify();
            return this.enabled;
        }

        toggle() {
            const on = this.setEnabled(!this.enabled);
            if (on) { this.unlock(); this.play('click'); }
            return on;
        }

        setMusicEnabled(on) {
            this.musicEnabled = !!on;
            FN.storage.write(STORAGE_KEYS.music, this.musicEnabled);
            if (!this.musicEnabled) this.stopMusic();
            this.notify();
            return this.musicEnabled;
        }

        toggleMusic() { return this.setMusicEnabled(!this.musicEnabled); }

        /* ------------------------------------------------------------ SFX */
        tone(freq, dur, { type = 'square', delay = 0, vol = 0.12, slideTo = null, dest = null } = {}) {
            const ctx = this.ctx;
            if (!ctx) return;
            const t0 = ctx.currentTime + delay;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, t0);
            if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
            gain.gain.setValueAtTime(0.0001, t0);
            gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
            osc.connect(gain);
            gain.connect(dest || this.master);
            osc.start(t0);
            osc.stop(t0 + dur + 0.02);
        }

        noise(dur, { delay = 0, vol = 0.12, from = 800, to = 2400, type = 'bandpass', q = 1.2 } = {}) {
            const ctx = this.ctx;
            if (!ctx) return;
            const t0 = ctx.currentTime + delay;
            const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
            const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
            const src = ctx.createBufferSource();
            src.buffer = buffer;
            const filter = ctx.createBiquadFilter();
            filter.type = type;
            filter.Q.value = q;
            filter.frequency.setValueAtTime(from, t0);
            filter.frequency.exponentialRampToValueAtTime(to, t0 + dur);
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(vol, t0);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
            src.connect(filter);
            filter.connect(gain);
            gain.connect(this.master);
            src.start(t0);
            src.stop(t0 + dur + 0.02);
        }

        play(name) {
            if (!this.enabled) return false;
            this.lastSound = name;
            this.history.push(name);
            if (this.history.length > 40) this.history.shift();
            if (!this.unlock()) return true;
            try {
                switch (name) {
                    case 'flap': // magic whoosh + tiny chime
                        this.noise(0.14, { from: 700, to: 2600, vol: 0.09 });
                        this.tone(880, 0.09, { type: 'sine', slideTo: 1320, vol: 0.05 });
                        break;
                    case 'score':
                        this.tone(1175, 0.07, { type: 'triangle', vol: 0.08 });
                        break;
                    case 'collect-zeny':
                        this.tone(988, 0.07, { type: 'square', vol: 0.06 });
                        this.tone(1319, 0.16, { type: 'square', delay: 0.07, vol: 0.06 });
                        break;
                    case 'collect-potion':
                        [420, 560, 740].forEach((f, i) => this.tone(f, 0.09, { type: 'sine', delay: i * 0.05, slideTo: f * 1.5, vol: 0.09 }));
                        break;
                    case 'collect-gem':
                        [1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.12, { type: 'triangle', delay: i * 0.05, vol: 0.08 }));
                        break;
                    case 'collect-crystal':
                        [1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.18, { type: 'triangle', delay: i * 0.06, vol: 0.08 }));
                        this.tone(2637, 0.4, { type: 'sine', delay: 0.24, vol: 0.04 });
                        break;
                    case 'hit':
                        this.noise(0.22, { from: 900, to: 120, type: 'lowpass', vol: 0.25 });
                        this.tone(150, 0.25, { type: 'sine', slideTo: 50, vol: 0.2 });
                        break;
                    case 'gameover': // same falling motif as Ragna-Memories' defeat
                        [392, 349, 311, 262].forEach((f, i) => this.tone(f, 0.26, { type: 'sawtooth', delay: 0.25 + i * 0.16, vol: 0.07 }));
                        break;
                    case 'rankup': // rising victory arpeggio
                        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, { type: 'square', delay: i * 0.1, vol: 0.07 }));
                        break;
                    case 'start':
                        [587, 740, 880].forEach((f, i) => this.tone(f, 0.12, { type: 'square', delay: i * 0.07, vol: 0.06 }));
                        break;
                    case 'pause':
                        this.tone(660, 0.08, { type: 'triangle', vol: 0.08 });
                        this.tone(440, 0.1, { type: 'triangle', delay: 0.07, vol: 0.08 });
                        break;
                    case 'click':
                    default:
                        this.tone(440, 0.06, { type: 'square', vol: 0.06 });
                        break;
                }
            } catch (err) { /* never let audio break the game */ }
            return true;
        }

        /* ---------------------------------------------------------- music */
        startMusic() {
            if (!this.enabled || !this.musicEnabled || this.music.playing) return false;
            if (!this.unlock()) return false;
            const m = this.music;
            m.playing = true;
            m.nextTime = this.ctx.currentTime + 0.1;
            m.step = 0;
            m.eighthCount = 0;
            m.timer = setInterval(() => this.scheduleMusic(), 90);
            this.scheduleMusic();
            this.notify();
            return true;
        }

        stopMusic() {
            const m = this.music;
            if (m.timer) clearInterval(m.timer);
            m.timer = null;
            m.playing = false;
            this.notify();
        }

        /* Look-ahead scheduler: queue notes up to 0.3 s into the future. */
        scheduleMusic() {
            const ctx = this.ctx;
            const m = this.music;
            if (!ctx || !m.playing) return;
            const { SONG, noteToFreq } = FN.assets.music;
            while (m.nextTime < ctx.currentTime + 0.3) {
                const [note, len] = SONG.melody[m.step];
                const dur = len * SONG.eighth;
                const barIndex = Math.floor(m.eighthCount / 6) % SONG.bass.length;
                const posInBar = m.eighthCount % 6;
                const delay = Math.max(0, m.nextTime - ctx.currentTime);
                this.tone(noteToFreq(note), dur * 0.95, { type: 'triangle', delay, vol: 0.06, dest: this.musicGain });
                // Bass: root on beat 1, fifth-ish on beat 2 of each 6/8 bar.
                for (let e = 0; e < len; e++) {
                    const pos = (posInBar + e) % 6;
                    if (pos === 0 || pos === 3) {
                        const root = noteToFreq(SONG.bass[(barIndex + Math.floor((posInBar + e) / 6)) % SONG.bass.length]);
                        const f = pos === 0 ? root : root * 1.5;
                        this.tone(f, SONG.eighth * 2.6, { type: 'sine', delay: delay + e * SONG.eighth, vol: 0.07, dest: this.musicGain });
                    }
                }
                m.nextTime += dur;
                m.eighthCount += len;
                m.step = (m.step + 1) % SONG.melody.length;
            }
        }
    }

    FN.AudioSystem = AudioSystem;
})(window.FN = window.FN || {});
