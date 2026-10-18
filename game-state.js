(function (global) {
  'use strict';

  const COMBO_WINDOW_MS = 1400;
  const STORAGE_KEY = 'slap-your-ex:best-combo';

  function createGameState({storage} = {}) {
    let slaps = 0;
    let combo = 0;
    let best = 0;
    let comboExpiresAt = 0;
    let lastHitAt = -Infinity;
    let lastSource = null;
    let paused = false;

    try {
      const saved = Number(storage?.getItem(STORAGE_KEY));
      if (Number.isSafeInteger(saved) && saved >= 0) best = saved;
    } catch {
      // Private browsing can make storage unavailable; the round still works.
    }

    function snapshot() {
      return Object.freeze({slaps, combo, best, comboExpiresAt, paused});
    }

    function clearCombo() {
      combo = 0;
      comboExpiresAt = 0;
      return snapshot();
    }

    function expireCombo(now) {
      if (combo && now > comboExpiresAt) clearCombo();
      return snapshot();
    }

    function hit(now, source = 'tap') {
      if (!Number.isFinite(now) || now < 0) throw new TypeError('Hit time must be a non-negative finite number.');
      if (source !== 'tap' && source !== 'motion') throw new TypeError('Hit source must be tap or motion.');
      if (paused || now - lastHitAt < 180) return null;
      if (source === 'tap' && lastSource === 'motion' && now - lastHitAt < 600) return null;

      combo = combo && now <= comboExpiresAt ? combo + 1 : 1;
      slaps += 1;
      comboExpiresAt = now + COMBO_WINDOW_MS;
      lastHitAt = now;
      lastSource = source;
      if (combo > best) {
        best = combo;
        try {
          const saved = Number(storage?.getItem(STORAGE_KEY));
          if (Number.isSafeInteger(saved) && saved >= 0) best = Math.max(best, saved);
          storage?.setItem(STORAGE_KEY, String(best));
        } catch {
          // A blocked or full storage area must not interrupt a hit.
        }
      }
      return snapshot();
    }

    function setPaused(value) {
      paused = Boolean(value);
      if (paused) clearCombo();
      return snapshot();
    }

    function resetRound() {
      slaps = 0;
      lastHitAt = -Infinity;
      lastSource = null;
      return clearCombo();
    }

    return Object.freeze({snapshot, hit, clearCombo, expireCombo, setPaused, resetRound});
  }

  createGameState.COMBO_WINDOW_MS = COMBO_WINDOW_MS;
  if (typeof module === 'object' && module.exports) module.exports = createGameState;
  else global.SlapGameState = createGameState;
})(typeof window === 'object' ? window : globalThis);
