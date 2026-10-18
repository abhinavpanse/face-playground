'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { PhoneMotion, createImpactDetector } = require('../motion-input.js');

const linear = (x = 0, y = 0, z = 0) => ({ acceleration: { x, y, z } });
const gravity = (x = 0, y = 0, z = 9.81) => ({ accelerationIncludingGravity: { x, y, z } });

function settled(detector, make = linear, start = 0, end = 400) {
  for (let time = start; time <= end; time += 20) {
    assert.equal(detector.sample(make(), time).impact, null);
  }
}

test('stationary gravity, small jitter, and slow tilts do not trigger even at gentle sensitivity', () => {
  const detector = createImpactDetector();
  detector.setSensitivity('gentle');
  for (let time = 0; time < 4000; time += 20) {
    const angle = time / 4000 * Math.PI / 2;
    const sample = detector.sample(gravity(9.81 * Math.sin(angle) + Math.sin(time) * 0.03, 0, 9.81 * Math.cos(angle)), time);
    assert.equal(sample.impact, null);
  }
});

test('each axis can independently trigger, including a front/back z impact', () => {
  for (const axis of ['x', 'y', 'z']) {
    const detector = createImpactDetector();
    settled(detector);
    const event = linear();
    event.acceleration[axis] = 16;
    const { impact } = detector.sample(event, 420);
    assert.ok(impact, axis);
    assert.equal(impact.strength, 16);
    assert.ok(impact.intensity >= 0.7 && impact.intensity <= 1.6);
  }
});

test('startup motion is ignored and cannot trigger as a sustained signal after warmup', () => {
  const detector = createImpactDetector();
  for (let time = 0; time < 1000; time += 20) assert.equal(detector.sample(linear(20), time).impact, null);
  settled(detector, linear, 1000, 1400);
  assert.ok(detector.sample(linear(20), 1420).impact);
});

test('quiet samples early in warmup cannot arm a later sustained startup movement', () => {
  const detector = createImpactDetector();
  settled(detector, linear, 0, 140);
  for (let time = 160; time <= 700; time += 20) {
    assert.equal(detector.sample(linear(20), time).impact, null);
  }
  settled(detector, linear, 720, 880);
  assert.ok(detector.sample(linear(20), 900).impact);
});

test('a sensor timestamp gap restarts calibration instead of treating the first sample as an impact', () => {
  const detector = createImpactDetector();
  settled(detector);
  for (let time = 1800; time <= 2200; time += 20) {
    const result = detector.sample(linear(20), time);
    assert.equal(result.impact, null);
    assert.equal(result.calibrating, time < 2120);
  }
  settled(detector, linear, 2220, 2400);
  assert.ok(detector.sample(linear(20), 2420).impact);
});

test('switching from gravity fallback to linear acceleration recalibrates before accepting an impact', () => {
  const detector = createImpactDetector();
  settled(detector, gravity);
  for (let time = 420; time <= 820; time += 20) {
    const result = detector.sample(linear(20), time);
    assert.equal(result.impact, null);
    assert.equal(result.calibrating, time < 740);
  }
  settled(detector, linear, 840, 1020);
  assert.ok(detector.sample(linear(20), 1040).impact);
});

test('cooldown and quiet release prevent ringing and sustained acceleration from counting twice', () => {
  const detector = createImpactDetector();
  settled(detector);
  assert.ok(detector.sample(linear(18), 420).impact);
  for (let time = 440; time < 1600; time += 20) {
    assert.equal(detector.sample(linear(time % 60 === 0 ? 0 : -18), time).impact, null);
  }
  settled(detector, linear, 1600, 1780);
  assert.ok(detector.sample(linear(-18), 1800).impact);
});

test('gravity fallback removes gravity and retains a fast z impulse', () => {
  const detector = createImpactDetector();
  settled(detector, gravity);
  const result = detector.sample(gravity(0, 0, 27.81), 420);
  assert.ok(result.impact);
  assert.ok(result.impact.strength > 16 && result.impact.strength < 18);
});

test('invalid values never establish sensor readiness, and invalid linear data can use gravity fallback', () => {
  const detector = createImpactDetector();
  for (const value of [null, undefined, NaN, Infinity, -Infinity, '0']) {
    assert.equal(detector.sample({ acceleration: { x: value, y: 0, z: 0 } }, 0).valid, false);
  }
  assert.equal(detector.sample({ acceleration: { x: null, y: null, z: null }, ...gravity() }, 10).valid, true);
  assert.equal(detector.sample(linear(), NaN).valid, false);
});

test('sensitivity changes use the intended acceleration threshold', () => {
  for (const [sensitivity, threshold] of [['gentle', 4], ['normal', 8], ['firm', 14]]) {
    const detector = createImpactDetector();
    detector.setSensitivity(sensitivity);
    settled(detector);
    assert.equal(detector.sample(linear(threshold - 0.1), 420).impact, null);
    assert.ok(detector.sample(linear(threshold), 440).impact);
  }
});

test('lateral direction follows screen orientation and z impacts alternate', () => {
  for (const [angle, event, side] of [[0, linear(12), 'right'], [180, linear(12), 'left'], [90, linear(0, 12), 'left'], [270, linear(0, 12), 'right']]) {
    const detector = createImpactDetector();
    settled(detector);
    assert.equal(detector.sample(event, 420, angle).impact.side, side);
  }
  const detector = createImpactDetector();
  settled(detector);
  const first = detector.sample(linear(0, 0, 15), 420).impact.side;
  settled(detector, linear, 440, 1000);
  assert.notEqual(detector.sample(linear(0, 0, 15), 1020).impact.side, first);
});

test('suppression prevents touch and haptic duplicates while keeping the sensor calibrated', () => {
  const detector = createImpactDetector();
  settled(detector);
  detector.suppress(400, 400);
  assert.equal(detector.sample(linear(18), 420).impact, null);
  settled(detector, linear, 440, 840);
  assert.ok(detector.sample(linear(18), 860).impact);
});

function fakeEnvironment(requestPermission) {
  let time = 0;
  let timerId = 0;
  const timers = new Map();
  const motionListeners = new Set();
  const visibilityListeners = new Set();
  const environment = {
    isSecureContext: true,
    DeviceMotionEvent: requestPermission ? { requestPermission } : {},
    screen: { orientation: { angle: 0 } },
    performance: { now: () => time },
    addEventListener: (type, fn) => { if (type === 'devicemotion') motionListeners.add(fn); },
    removeEventListener: (type, fn) => motionListeners.delete(fn),
    document: {
      hidden: false,
      addEventListener: (type, fn) => visibilityListeners.add(fn),
      removeEventListener: (type, fn) => visibilityListeners.delete(fn)
    },
    setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { fn, at: time + delay }); return id; },
    clearTimeout: id => timers.delete(id)
  };
  return {
    environment, timers, motionListeners, visibilityListeners,
    tick(ms) {
      const until = time + ms;
      while (true) {
        const due = [...timers].filter(([, timer]) => timer.at <= until).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        timers.delete(due[0]);
        time = due[1].at;
        due[1].fn();
      }
      time = until;
    },
    emit(event = linear()) { for (const fn of motionListeners) fn(event); },
    hide(hidden) { environment.document.hidden = hidden; for (const fn of visibilityListeners) fn(); }
  };
}

test('iOS permission is requested synchronously; valid samples are needed before active', async () => {
  let requested = false;
  const fake = fakeEnvironment(() => { requested = true; return Promise.resolve('granted'); });
  const states = [];
  const motion = PhoneMotion({ onState: state => states.push(state.status) }, fake.environment);
  const enabled = motion.enable();
  assert.equal(requested, true);
  assert.deepEqual(states, ['requesting']);
  await enabled;
  assert.equal(states.at(-1), 'waiting');
  fake.emit({ acceleration: { x: null, y: null, z: null } });
  assert.equal(states.at(-1), 'waiting');
  fake.emit();
  assert.equal(states.at(-1), 'calibrating');
  fake.tick(340);
  fake.emit();
  assert.equal(states.at(-1), 'active');
  motion.destroy();
});

test('permission denial and exceptions produce actionable failure states without listeners', async () => {
  for (const [permission, status] of [[() => Promise.resolve('denied'), 'denied'], [() => { throw Error('blocked'); }, 'error']]) {
    const fake = fakeEnvironment(permission);
    const states = [];
    const motion = PhoneMotion({ onState: state => states.push(state) }, fake.environment);
    assert.equal(await motion.enable(), false);
    assert.equal(states.at(-1).status, status);
    assert.match(states.at(-1).message, /Safari or Chrome/);
    assert.equal(fake.motionListeners.size, 0);
  }
});

test('disabling during a permission request prevents late grants from enabling sensors', async () => {
  let grant;
  const fake = fakeEnvironment(() => new Promise(resolve => { grant = resolve; }));
  const states = [];
  const motion = PhoneMotion({ onState: state => states.push(state.status) }, fake.environment);
  const attempt = motion.enable();
  motion.disable();
  grant('granted');
  assert.equal(await attempt, false);
  assert.equal(states.at(-1), 'off');
  assert.equal(fake.motionListeners.size, 0);
  assert.equal(fake.timers.size, 0);
});

test('a stale permission response cannot overwrite a newer retry', async () => {
  const resolvers = [];
  const fake = fakeEnvironment(() => new Promise(resolve => resolvers.push(resolve)));
  const states = [];
  const motion = PhoneMotion({ onState: state => states.push(state.status) }, fake.environment);
  const first = motion.enable();
  motion.disable();
  const second = motion.enable();
  resolvers[1]('granted');
  await second;
  resolvers[0]('denied');
  await first;
  assert.equal(states.at(-1), 'waiting');
  assert.equal(fake.motionListeners.size, 1);
  motion.destroy();
});

test('no-data is honest, keeps listening, and recovers when real numeric data arrives', async () => {
  const fake = fakeEnvironment();
  const states = [];
  const motion = PhoneMotion({ onState: state => states.push(state.status) }, fake.environment);
  await motion.enable();
  fake.tick(3000);
  assert.equal(states.at(-1), 'no-data');
  assert.equal(fake.motionListeners.size, 1);
  fake.emit();
  assert.equal(states.at(-1), 'calibrating');
  fake.tick(340);
  fake.emit();
  assert.equal(states.at(-1), 'active');
  fake.tick(3000);
  assert.equal(states.at(-1), 'no-data');
  motion.destroy();
});

test('visibility pauses, returning recalibrates, and disable cleans up all resources', async () => {
  const fake = fakeEnvironment();
  const states = [];
  const impacts = [];
  const motion = PhoneMotion({ onState: state => states.push(state.status), onImpact: impact => impacts.push(impact) }, fake.environment);
  await motion.enable();
  await motion.enable();
  assert.equal(fake.motionListeners.size, 1);
  fake.emit();
  fake.tick(340);
  fake.emit();
  assert.equal(states.at(-1), 'active');
  fake.hide(true);
  assert.equal(states.at(-1), 'paused');
  fake.tick(5000);
  fake.emit(linear(20));
  assert.equal(states.at(-1), 'paused');
  assert.equal(impacts.length, 0);
  fake.hide(false);
  assert.equal(states.at(-1), 'waiting');
  fake.emit(linear(20));
  assert.equal(states.at(-1), 'calibrating');
  assert.equal(impacts.length, 0);
  motion.disable();
  assert.equal(fake.motionListeners.size, 0);
  assert.equal(fake.visibilityListeners.size, 0);
  assert.equal(fake.timers.size, 0);
  motion.destroy();
  assert.equal(await motion.enable(), false);
});

test('unsupported devices and insecure pages do not ask for permission', async () => {
  for (const key of ['isSecureContext', 'DeviceMotionEvent']) {
    let requested = false;
    const fake = fakeEnvironment(() => { requested = true; return 'granted'; });
    fake.environment[key] = false;
    const states = [];
    const motion = PhoneMotion({ onState: state => states.push(state.status) }, fake.environment);
    assert.equal(await motion.enable(), false);
    assert.equal(states.at(-1), 'unsupported');
    assert.equal(requested, false);
  }
});

test('level updates are bounded and throttled to ten per second', async () => {
  const fake = fakeEnvironment();
  const levels = [];
  const motion = PhoneMotion({ onLevel: level => levels.push(level) }, fake.environment);
  await motion.enable();
  levels.length = 0;
  for (let time = 0; time < 1000; time += 10) {
    fake.emit(linear(time));
    fake.tick(10);
  }
  assert.equal(levels.length, 10);
  assert.ok(levels.every(level => level >= 0 && level <= 1));
  motion.destroy();
});
