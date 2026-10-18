const test = require('node:test');
const assert = require('node:assert/strict');
const createGameState = require('../game-state.js');

function memoryStorage(initial = null) {
  let value = initial;
  return {getItem: () => value, setItem: (_key, next) => { value = next; }};
}

test('an accepted hit counts one slap and starts a streak', () => {
  const game = createGameState();
  const state = game.hit(0);
  assert.equal(state.slaps, 1);
  assert.equal(state.combo, 1);
  assert.equal(state.best, 1);
  assert.equal(state.comboExpiresAt, 1400);
});

test('rapid duplicate hits do not count or extend the streak window', () => {
  const game = createGameState();
  const first = game.hit(100);
  assert.equal(game.hit(279), null);
  assert.deepEqual(game.snapshot(), first);
  assert.equal(game.hit(280).slaps, 2);
});

test('touch release after a sensor impact cannot count again before 600ms', () => {
  const game = createGameState();
  game.hit(100, 'motion');
  assert.equal(game.hit(350, 'tap'), null);
  assert.equal(game.hit(699, 'tap'), null);
  assert.equal(game.snapshot().slaps, 1);
  assert.equal(game.hit(700, 'tap').slaps, 2);
});

test('separate sensor impacts can count after the universal hit cooldown', () => {
  const game = createGameState();
  game.hit(100, 'motion');
  assert.equal(game.hit(279, 'motion'), null);
  assert.equal(game.hit(280, 'motion').slaps, 2);
});

test('a hit at the 1400ms streak boundary continues the streak', () => {
  const game = createGameState();
  game.hit(100);
  assert.equal(game.hit(1500).combo, 2);
  assert.equal(game.hit(2900).combo, 3);
});

test('a hit outside the streak window starts a new streak without losing round count', () => {
  const game = createGameState();
  game.hit(100);
  game.hit(400);
  const state = game.hit(1801);
  assert.equal(state.slaps, 3);
  assert.equal(state.combo, 1);
  assert.equal(state.best, 2);
});

test('streak expiry leaves the total and record intact', () => {
  const game = createGameState();
  game.hit(100);
  game.hit(400);
  assert.equal(game.expireCombo(1800).combo, 2);
  const expired = game.expireCombo(1801);
  assert.equal(expired.combo, 0);
  assert.equal(expired.comboExpiresAt, 0);
  assert.equal(expired.slaps, 2);
  assert.equal(expired.best, 2);
});

test('pausing rejects inputs and ends a streak until resumed', () => {
  const game = createGameState();
  game.hit(100);
  game.hit(400);
  const paused = game.setPaused(true);
  assert.equal(paused.combo, 0);
  assert.equal(game.hit(700, 'tap'), null);
  assert.equal(game.hit(1000, 'motion'), null);
  assert.deepEqual(game.snapshot(), paused);
  game.setPaused(false);
  const next = game.hit(1100);
  assert.equal(next.combo, 1);
  assert.equal(next.slaps, 3);
});

test('round reset clears the round and streak but keeps the best score', () => {
  const game = createGameState();
  game.hit(0);
  game.hit(200);
  game.hit(400);
  const reset = game.resetRound();
  assert.equal(reset.slaps, 0);
  assert.equal(reset.combo, 0);
  assert.equal(reset.best, 3);
  const next = game.hit(401);
  assert.equal(next.slaps, 1);
  assert.equal(next.combo, 1);
});

test('a new game reloads the persisted record without continuing an old round', () => {
  const storage = memoryStorage();
  const game = createGameState({storage});
  game.hit(0);
  game.hit(200);
  const reloaded = createGameState({storage}).snapshot();
  assert.equal(reloaded.best, 2);
  assert.equal(reloaded.slaps, 0);
  assert.equal(reloaded.combo, 0);
});

test('a weaker streak does not overwrite a saved record', () => {
  const storage = memoryStorage('8');
  const game = createGameState({storage});
  assert.equal(game.hit(0).best, 8);
  game.hit(200);
  assert.equal(storage.getItem(), '8');
});

test('an older tab cannot overwrite a stronger record saved by another tab', () => {
  const storage = memoryStorage('0');
  const firstTab = createGameState({storage});
  const secondTab = createGameState({storage});
  for (let hit = 0; hit < 5; hit += 1) firstTab.hit(hit * 200);
  secondTab.hit(0);
  const state = secondTab.hit(200);
  assert.equal(state.slaps, 2);
  assert.equal(state.combo, 2);
  assert.equal(state.best, 5);
  assert.equal(storage.getItem(), '5');
  assert.equal(createGameState({storage}).snapshot().best, 5);
});

test('invalid storage written after loading cannot corrupt a new record', () => {
  const storage = memoryStorage('0');
  const game = createGameState({storage});
  storage.setItem('', 'not a score');
  assert.equal(game.hit(0).best, 1);
  assert.equal(storage.getItem(), '1');
});

test('invalid stored scores are ignored', () => {
  for (const value of ['oops', '-4', '2.5', 'Infinity', '9007199254740992']) {
    assert.equal(createGameState({storage: memoryStorage(value)}).snapshot().best, 0);
  }
});

test('storage failures do not prevent play or reset', () => {
  const storage = {
    getItem() { throw new Error('Blocked'); },
    setItem() { throw new Error('Full'); },
  };
  const game = createGameState({storage});
  assert.equal(game.hit(100).slaps, 1);
  assert.equal(game.hit(300).best, 2);
  assert.equal(game.resetRound().best, 2);
});

test('non-monotonic timestamps cannot add a hit', () => {
  const game = createGameState();
  const first = game.hit(500);
  assert.equal(game.hit(400), null);
  assert.deepEqual(game.snapshot(), first);
});

test('invalid hit arguments are rejected without changing state', () => {
  const game = createGameState();
  const initial = game.snapshot();
  for (const time of [NaN, Infinity, -1]) assert.throws(() => game.hit(time), TypeError);
  assert.throws(() => game.hit(100, 'preview'), TypeError);
  assert.deepEqual(game.snapshot(), initial);
});
