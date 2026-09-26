/*
 * Centralised finite state machine.
 * The game never juggles booleans like isPlaying / isDead / hasStarted — there
 * is exactly one current state, and every change goes through transition(),
 * which validates it against the STATE_TRANSITIONS table in config.js.
 */
(function (FN) {
    'use strict';

    class StateMachine {
        constructor(initial, transitions) {
            this.current = initial;
            this.transitions = transitions;
            this.listeners = [];
            this.history = [initial];
        }

        can(to) {
            const allowed = this.transitions[this.current] || [];
            return allowed.includes(to);
        }

        is(state) {
            return this.current === state;
        }

        transition(to, payload = {}) {
            if (!this.can(to)) {
                console.warn(`[FlappyNovice] Ignored invalid transition ${this.current} → ${to}`);
                return false;
            }
            const from = this.current;
            this.current = to;
            this.history.push(to);
            if (this.history.length > 50) this.history.shift();
            this.listeners.forEach((fn) => fn({ from, to, ...payload }));
            return true;
        }

        onChange(fn) {
            this.listeners.push(fn);
            return () => { this.listeners = this.listeners.filter((l) => l !== fn); };
        }
    }

    FN.StateMachine = StateMachine;
})(window.FN = window.FN || {});
