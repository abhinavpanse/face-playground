(function (root) {
  'use strict';

  const THRESHOLDS = { gentle: 4, normal: 8, firm: 14 };
  const WARMUP_MS = 320;
  const COOLDOWN_MS = 420;
  const RELEASE_MS = 110;
  const NO_DATA_MS = 3000;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function vector(value) {
    return value && ['x', 'y', 'z'].every(axis => typeof value[axis] === 'number' && Number.isFinite(value[axis]))
      ? { x: value.x, y: value.y, z: value.z }
      : null;
  }

  function createImpactDetector() {
    let threshold = THRESHOLDS.normal;
    let started, previousTime, source, gravity, quietSince, lastImpact, suppressedUntil, armed;
    let alternateSide = 'right';

    function reset() {
      started = previousTime = source = gravity = quietSince = null;
      lastImpact = suppressedUntil = -Infinity;
      armed = false;
    }

    function setSensitivity(value) {
      if (Object.prototype.hasOwnProperty.call(THRESHOLDS, value)) threshold = THRESHOLDS[value];
    }

    function suppress(ms, now) {
      suppressedUntil = Math.max(suppressedUntil, now + Math.max(0, Number(ms) || 0));
      armed = false;
      quietSince = null;
    }

    function sample(event, now, orientation = 0) {
      let acceleration = vector(event.acceleration);
      const nextSource = acceleration ? 'linear' : 'gravity';
      if (!acceleration) acceleration = vector(event.accelerationIncludingGravity);
      if (!acceleration || !Number.isFinite(now)) return { valid: false };

      if (source !== nextSource || (previousTime !== null && (now < previousTime || now - previousTime > 1200))) {
        // A source change or resumed sensor stream needs a fresh gravity baseline.
        const suppression = suppressedUntil;
        reset();
        suppressedUntil = suppression;
      }
      source = nextSource;
      if (started === null) started = now;
      const dt = previousTime === null ? 16 : Math.max(1, now - previousTime);
      previousTime = now;

      if (source === 'gravity') {
        if (!gravity) gravity = { ...acceleration };
        // Estimate gravity with a 200 ms time constant, independent of sensor rate.
        const alpha = 1 - Math.exp(-dt / 200);
        for (const axis of ['x', 'y', 'z']) gravity[axis] += alpha * (acceleration[axis] - gravity[axis]);
        acceleration = {
          x: acceleration.x - gravity.x,
          y: acceleration.y - gravity.y,
          z: acceleration.z - gravity.z
        };
      }

      const strength = Math.hypot(acceleration.x, acceleration.y, acceleration.z);
      const calibrating = now - started < WARMUP_MS;
      const suppressed = now < suppressedUntil;
      if (strength <= threshold * 0.32) {
        if (quietSince === null) quietSince = now;
        if (!suppressed && now - quietSince >= RELEASE_MS && now - lastImpact >= COOLDOWN_MS) armed = true;
      } else {
        quietSince = null;
      }
      if (calibrating || suppressed) armed = false;

      let impact = null;
      if (!calibrating && !suppressed && armed && strength >= threshold && now - lastImpact >= COOLDOWN_MS) {
        const angle = Number.isFinite(orientation) ? orientation * Math.PI / 180 : 0;
        const lateral = acceleration.x * Math.cos(angle) - acceleration.y * Math.sin(angle);
        let side;
        if (Math.abs(lateral) > strength * 0.45) {
          side = lateral > 0 ? 'right' : 'left';
        } else {
          side = alternateSide;
          alternateSide = side === 'right' ? 'left' : 'right';
        }
        impact = { side, strength, intensity: clamp(0.7 + (strength / threshold - 1) * 0.5, 0.7, 1.6) };
        armed = false;
        quietSince = null;
        lastImpact = now;
      }
      return { valid: true, calibrating, level: clamp(strength / threshold, 0, 1), impact };
    }

    reset();
    return { sample, reset, setSensitivity, suppress };
  }

  function PhoneMotion(options = {}, environment = root) {
    const detector = createImpactDetector();
    const document = environment.document;
    const onImpact = options.onImpact || (() => {});
    const onState = options.onState || (() => {});
    const onLevel = options.onLevel || (() => {});
    const now = () => environment.performance.now();
    let wanted = false;
    let listening = false;
    let destroyed = false;
    let generation = 0;
    let pending = null;
    let status = 'off';
    let watchdog = null;
    let lastValid = null;
    let listeningSince = 0;
    let lastLevel = -Infinity;

    function state(next, message) {
      if (status === next) return;
      status = next;
      onState({ status: next, message });
    }

    function clearWatchdog() {
      if (watchdog !== null) environment.clearTimeout(watchdog);
      watchdog = null;
    }

    function watchForData(delay = NO_DATA_MS) {
      if (watchdog !== null) return;
      watchdog = environment.setTimeout(() => {
        watchdog = null;
        if (!wanted || !listening || document.hidden) return;
        const elapsed = now() - (lastValid === null ? listeningSince : lastValid);
        if (elapsed >= NO_DATA_MS) {
          detector.reset();
          lastValid = null;
          onLevel(0);
          state('no-data', 'No motion data received. Open this page directly in Safari or Chrome and allow motion access. Tap controls still work.');
        } else {
          watchForData(NO_DATA_MS - elapsed);
        }
      }, delay);
    }

    function waitForData() {
      detector.reset();
      clearWatchdog();
      lastValid = null;
      lastLevel = -Infinity;
      listeningSince = now();
      onLevel(0);
      state('waiting', 'Waiting for your phone’s motion sensors…');
      watchForData();
    }

    function motion(event) {
      if (!wanted || document.hidden) return;
      const timestamp = now();
      const angle = environment.screen?.orientation?.angle ?? environment.orientation ?? 0;
      const result = detector.sample(event, timestamp, angle);
      if (!result.valid) return;
      lastValid = timestamp;
      watchForData();
      state(result.calibrating ? 'calibrating' : 'active', result.calibrating
        ? 'Hold your phone still for a moment.'
        : 'Motion is ready. A quick shake triggers a slap.');
      if (timestamp - lastLevel >= 100) {
        lastLevel = timestamp;
        onLevel(result.level);
      }
      if (result.impact) onImpact(result.impact);
    }

    function visibility() {
      if (!wanted || !listening) return;
      if (document.hidden) {
        detector.reset();
        clearWatchdog();
        onLevel(0);
        state('paused', 'Motion is paused while this page is in the background.');
      } else {
        waitForData();
      }
    }

    function startListening() {
      if (!listening) {
        environment.addEventListener('devicemotion', motion);
        document.addEventListener('visibilitychange', visibility);
        listening = true;
      }
      if (document.hidden) visibility();
      else waitForData();
    }

    function stopListening() {
      clearWatchdog();
      if (listening) {
        environment.removeEventListener('devicemotion', motion);
        document.removeEventListener('visibilitychange', visibility);
      }
      listening = false;
      detector.reset();
      lastValid = null;
      onLevel(0);
    }

    function enable() {
      if (destroyed) return Promise.resolve(false);
      if (wanted) return pending || Promise.resolve(true);
      const token = ++generation;
      wanted = true;
      if (!environment.isSecureContext || !environment.DeviceMotionEvent) {
        wanted = false;
        state('unsupported', !environment.isSecureContext
          ? 'Open the HTTPS version of this page to use phone motion.'
          : 'Motion sensors are unavailable here. Open this page in Safari on iPhone or Chrome on Android.');
        return Promise.resolve(false);
      }

      state('requesting', 'Allow motion access when your browser asks.');
      let permission;
      try {
        // Invoke inside the click handler, before any await or promise continuation.
        permission = typeof environment.DeviceMotionEvent.requestPermission === 'function'
          ? environment.DeviceMotionEvent.requestPermission()
          : 'granted';
      } catch (error) {
        permission = Promise.reject(error);
      }

      const attempt = Promise.resolve(permission).then(result => {
        if (token !== generation || !wanted || destroyed) return false;
        if (result !== 'granted') {
          wanted = false;
          state('denied', 'Motion access was denied. Check this site’s motion permission, reload, and try again in Safari or Chrome.');
          return false;
        }
        startListening();
        return true;
      }).catch(() => {
        if (token !== generation || !wanted || destroyed) return false;
        wanted = false;
        stopListening();
        state('error', 'Could not start motion sensors. Tap Enable motion again in Safari or Chrome; embedded browsers may block access.');
        return false;
      }).finally(() => {
        if (token === generation) pending = null;
      });
      pending = attempt;
      return attempt;
    }

    function disable() {
      ++generation;
      wanted = false;
      pending = null;
      stopListening();
      state('off', 'Motion is off. Tap Enable motion to use your phone’s sensors.');
    }

    return {
      enable,
      disable,
      setSensitivity: detector.setSensitivity,
      suppress: ms => detector.suppress(ms, now()),
      destroy() { disable(); destroyed = true; }
    };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { PhoneMotion, createImpactDetector };
  else root.PhoneMotion = PhoneMotion;
})(typeof window !== 'undefined' ? window : globalThis);
