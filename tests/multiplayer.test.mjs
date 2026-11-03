import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomService, INPUT_TIMEOUT, SESSION_TIMEOUT } from '../server/rooms.mjs';
import { seededRandom, stats } from '../dist/engine.js';

function setup(options = {}) {
  let now = 1000;
  const rooms = new RoomService({ clock: () => now, random: seededRandom(17), botCount: 0, orbCount: 0, ...options });
  return { rooms, advance(ms) { now += ms; }, step(n = 1) { for (let i = 0; i < n; i++) { now += 1000 / 30; rooms.tick(); } } };
}
const controls = (seq, overrides = {}) => ({ seq, dashSeq: 0, x: 0, y: 0, angle: 0, attack: false, ...overrides });
const sink = () => ({ writableLength: 0, write() {}, end() {}, destroy() {} });

test('same room shares actors; different room has an isolated world', () => {
  const { rooms } = setup();
  const one = rooms.join({ name: 'Satu', room: 'rimba' });
  const two = rooms.join({ name: 'Dua', room: 'RIMBA' });
  const other = rooms.join({ name: 'Tiga', room: 'LAIN' });
  assert.equal(two.snapshot.humans, 2);
  assert.notEqual(one.playerId, two.playerId);
  assert.notEqual(one.token, two.token);
  assert.deepEqual(other.snapshot.actors.map(a => a.name), ['Tiga']);
  assert.equal(rooms.rooms.size, 2);
});

test('each authenticated session controls only its own actor', () => {
  const { rooms, step } = setup();
  const one = rooms.join(), two = rooms.join();
  const a = rooms.session(one.token).actor, b = rooms.session(two.token).actor;
  const ax = a.x, bx = b.x, by = b.y;
  rooms.acceptInput(one.token, controls(1, { x: 1, id: b.id, hp: 9999, xp: 99999, level: 5 }));
  step(5);
  assert.ok(a.x > ax);
  assert.equal(b.x, bx); assert.equal(b.y, by);
  assert.equal(a.level, 0); assert.equal(a.hp, 100);
  assert.ok(a.x - ax <= stats(0).speed * 5 / 30 + .01);
  assert.throws(() => rooms.acceptInput('guessed-token', controls(1)), { status: 401 });
});

test('excessive movement is clamped and stale controls stop moving', () => {
  const { rooms, step, advance } = setup();
  const joined = rooms.join(), a = rooms.session(joined.token).actor, x = a.x;
  rooms.acceptInput(joined.token, controls(1, { x: 999 })); step();
  assert.ok(a.x - x <= stats(0).speed / 30 + .001);
  advance(INPUT_TIMEOUT + 1); const stopped = a.x; step(5);
  assert.equal(a.x, stopped);
});

test('out of order packets and repeated dash sequence cannot replay an action', () => {
  const { rooms, step } = setup();
  const joined = rooms.join(), session = rooms.session(joined.token);
  rooms.acceptInput(joined.token, controls(2, { dashSeq: 1, x: 1 })); step();
  assert.ok(session.actor.dashCooldown > 0);
  rooms.acceptInput(joined.token, controls(1, { x: -1, dashSeq: 99 }));
  assert.equal(session.input.x, 1); assert.equal(session.dashSequence, 1);
  step(100);
  assert.equal(session.actor.dashCooldown, 0);
  rooms.acceptInput(joined.token, controls(3, { dashSeq: 1 })); step();
  assert.equal(session.actor.dashCooldown, 0);
});

test('malformed, non-finite, and oversized input bursts are rejected', () => {
  const { rooms } = setup(); const joined = rooms.join();
  for (const bad of [null, {}, controls(1, { x: Infinity }), controls(1, { angle: NaN }), controls(1, { attack: 'yes' })]) {
    assert.throws(() => rooms.acceptInput(joined.token, bad), { status: 400 });
  }
  for (let seq = 1; seq <= 60; seq++) rooms.acceptInput(joined.token, controls(seq));
  assert.throws(() => rooms.acceptInput(joined.token, controls(61)), { status: 429 });
});

test('server resolves PvP hits, records death, and respawns in the same room', () => {
  const { rooms, step } = setup(); const one = rooms.join(), two = rooms.join();
  const sa = rooms.session(one.token), sb = rooms.session(two.token), world = sa.room.arena;
  world.obstacles = []; world.orbs = [];
  Object.assign(sa.actor, { x: 1000, y: 1000, invulnerable: 0, angle: 0 });
  Object.assign(sb.actor, { x: 1050, y: 1000, invulnerable: 0, hp: 20 });
  rooms.acceptInput(one.token, controls(1, { attack: true })); step(10);
  assert.equal(sb.actor.alive, false); assert.equal(sa.actor.kills, 1);
  assert.equal(sb.actor.killer, sa.actor.name); assert.ok(Number.isFinite(sb.actor.diedAt));
  assert.ok(sa.actor.xp >= 45);
  assert.throws(() => rooms.respawn(two.token), { status: 429 });
  step(35); const result = rooms.respawn(two.token);
  assert.equal(result.playerId, two.playerId); assert.equal(sb.actor.alive, true);
  assert.equal(sb.actor.hp, 100); assert.equal(sb.actor.xp, 0); assert.equal(sb.actor.diedAt, null);
  assert.equal(result.snapshot.humans, 2); assert.equal(world.actors.length, 2);
  assert.throws(() => rooms.respawn(two.token), { status: 409 });
});

test('only one player receives a shared crystal and both see the same leaderboard', () => {
  const { rooms, step } = setup(); const one = rooms.join(), two = rooms.join();
  const session = rooms.session(one.token), a = session.actor;
  session.room.arena.orbs = []; session.room.arena.addOrb({ x: a.x, y: a.y }, 120);
  step();
  const snap = rooms.snapshot(session.room);
  assert.equal(snap.actors.find(p => p.id === one.playerId).xp, 120);
  assert.equal(snap.actors.find(p => p.id === two.playerId).xp, 0);
  assert.equal(snap.actors.find(p => p.id === one.playerId).level, 1);
  const collection = session.room.pendingEvents.find(e => e.type === 'collect');
  assert.equal(collection.actor.id, one.playerId);
});

test('room capacity, room codes, and room limits are enforced', () => {
  const { rooms } = setup({ maxPlayers: 2, maxRooms: 1 });
  for (const code of ['', '../ROOM', 'xx', 'a'.repeat(13), null]) assert.throws(() => rooms.join({ room: code }), { status: 400 });
  rooms.join(); rooms.join();
  assert.throws(() => rooms.join(), { status: 409 });
  assert.throws(() => rooms.join({ room: 'NEW' }), { status: 503 });
});

test('leaving removes the actor and empty rooms are reclaimed', () => {
  const { rooms } = setup(); const one = rooms.join(), two = rooms.join();
  rooms.leave(one.token); rooms.leave(one.token);
  assert.equal(rooms.snapshot(rooms.session(two.token).room).actors.length, 1);
  rooms.leave(two.token);
  assert.equal(rooms.sessions.size, 0); assert.equal(rooms.rooms.size, 0);
});

test('disconnect clears inputs, reconnect retains identity, old close cannot remove new stream', () => {
  const { rooms, step } = setup(); const joined = rooms.join();
  const oldStream = sink(), newStream = sink();
  rooms.connect(joined.token, oldStream);
  rooms.acceptInput(joined.token, controls(1, { x: 1 }));
  rooms.disconnect(joined.token, oldStream);
  assert.deepEqual(rooms.session(joined.token).input, {});
  step(3); rooms.connect(joined.token, newStream); rooms.disconnect(joined.token, oldStream);
  assert.equal(rooms.session(joined.token).stream, newStream);
  assert.equal(rooms.session(joined.token).actor.id, joined.playerId);
});

test('orphaned joins and disconnected sessions expire', () => {
  const { rooms, step, advance } = setup(); const joined = rooms.join();
  advance(SESSION_TIMEOUT + 1); step();
  assert.throws(() => rooms.session(joined.token), { status: 401 });
  assert.equal(rooms.rooms.size, 0);
});

test('slow streams disconnect without a growing queue; snapshots contain no secrets', () => {
  const { rooms } = setup({ botCount: 2 }); const joined = rooms.join();
  let destroyed = false;
  rooms.connect(joined.token, { ...sink(), writableLength: 300_000, destroy() { destroyed = true; } });
  rooms.broadcast(); assert.equal(destroyed, true); assert.equal(rooms.session(joined.token).stream, null);
  const snapshot = JSON.stringify(rooms.snapshot(rooms.session(joined.token).room));
  assert.equal(snapshot.includes(joined.token), false);
  for (const key of ['attackHits', 'target', 'input', 'token']) assert.equal(snapshot.includes('"' + key + '"'), false);
});
