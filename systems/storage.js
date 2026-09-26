/*
 * Thin localStorage wrapper. Storage can be unavailable (private mode, blocked
 * cookies, sandboxed iframes), so every access is guarded and falls back to an
 * in-memory map — the game must never crash because of persistence.
 */
(function (FN) {
    'use strict';

    const memory = new Map();

    function read(key) {
        try {
            const value = window.localStorage.getItem(key);
            return value === null ? (memory.has(key) ? memory.get(key) : null) : value;
        } catch (err) {
            return memory.has(key) ? memory.get(key) : null;
        }
    }

    function write(key, value) {
        memory.set(key, String(value));
        try {
            window.localStorage.setItem(key, String(value));
        } catch (err) { /* ignore — memory fallback already updated */ }
    }

    function remove(key) {
        memory.delete(key);
        try { window.localStorage.removeItem(key); } catch (err) { /* ignore */ }
    }

    function readNumber(key, fallback = 0) {
        const n = parseInt(read(key), 10);
        return Number.isFinite(n) && n >= 0 ? n : fallback;
    }

    function readBool(key, fallback) {
        const v = read(key);
        if (v === 'true') return true;
        if (v === 'false') return false;
        return fallback;
    }

    FN.storage = { read, write, remove, readNumber, readBool };
})(window.FN = window.FN || {});
