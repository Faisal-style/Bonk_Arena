import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.mjs';
import { RoomService } from '../server/rooms.mjs';
import { MultiplayerClient } from '../dist/network.js';
import { handlerFetch } from './http-harness.mjs';

const post = (data, token) => ({ method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(data) });
const waitFor = async (predicate, timeout = 2500) => {
  const end = Date.now() + timeout;
  while (!predicate()) { if (Date.now() > end) throw new Error('Timed out waiting for network state'); await new Promise(resolve => setTimeout(resolve, 10)); }
};

test('HTTP assets, API authentication, validation, and cross-origin rejection', async t => {
  const app = createApp(); t.after(() => app.stop()); const fetch = handlerFetch(app.handler);
  assert.equal((await fetch('/')).status, 200);
  assert.match(await (await fetch('/network.js')).text(), /class MultiplayerClient/);
  assert.equal((await fetch('/api/health')).status, 200);
  assert.equal((await fetch('/api/input', post({}))).status, 401);
  assert.equal((await fetch('/api/join', { ...post({}), headers: { 'Content-Type': 'application/json', Origin: 'https://attacker.invalid' } })).status, 403);
  assert.equal((await fetch('/api/join', post({ room: '../bad' }))).status, 400);
  assert.equal((await fetch('/api/join', post({ name: 'x'.repeat(3000) }))).status, 413);
  assert.equal((await fetch('/api/join', { ...post({}), body: '{invalid' })).status, 400);
  assert.equal((await fetch('/api/join', { method: 'POST', body: '{}' })).status, 415);
  const joined = await (await fetch('/api/join', post({ name: 'Test' }))).json();
  const input = { seq: 1, dashSeq: 0, x: 1, y: 0, angle: 0, attack: false };
  assert.equal((await fetch('/api/input', post(input, joined.token))).status, 204);
  assert.equal((await fetch('/api/respawn', post({}, joined.token))).status, 409);
  assert.equal((await fetch('/api/leave', post({}, joined.token))).status, 204);
  assert.equal((await fetch('/api/input', post(input, joined.token))).status, 401);
  assert.equal((await fetch('/%2e%2e%2fserver.mjs')).status, 403);
});

test('two real multiplayer clients exchange authoritative snapshots and independent inputs', async t => {
  const app = createApp({ rooms: new RoomService({ botCount: 0, orbCount: 0 }) });
  const fetcher = handlerFetch(app.handler), failures = [], snapshots = [[], []];
  const clients = snapshots.map((list, i) => new MultiplayerClient({ fetcher,
    onSnapshot: snapshot => list.push(snapshot), onStatus() {}, onDisconnect: error => failures.push(error) }));
  t.after(() => { for (const client of clients) client.close(); app.stop(); });
  const [one, two] = await Promise.all(clients.map((client, i) => client.join({ name: 'Player ' + i, room: 'TEST' })));
  app.rooms.session(one.token).room.arena.orbs = [];
  const bx = app.rooms.session(two.token).actor.x, by = app.rooms.session(two.token).actor.y;
  clients[0].start(() => ({ x: 1, angle: 0 })); clients[1].start(() => ({}));
  app.startSimulation();
  await waitFor(() => snapshots.every(list => list.length >= 6));
  const latest = snapshots[1].at(-1);
  assert.equal(latest.humans, 2);
  const a = latest.actors.find(a => a.id === one.playerId), b = latest.actors.find(a => a.id === two.playerId);
  assert.ok(a.x > one.snapshot.actors.find(a => a.id === one.playerId).x + 15);
  assert.equal(b.x, bx); assert.equal(b.y, by);
  assert.equal(failures.length, 0);
  assert.equal(JSON.stringify(latest).includes(one.token), false);
  clients[0].close();
  await waitFor(() => snapshots[1].at(-1).humans === 1);
  assert.equal(snapshots[1].at(-1).actors.some(a => a.id === one.playerId), false);
});

test('stream interruption reconnects the same player without duplicating membership', async t => {
  const app = createApp({ rooms: new RoomService({ botCount: 0, orbCount: 0 }) });
  const states = [], failures = [], snapshots = [];
  const client = new MultiplayerClient({ fetcher: handlerFetch(app.handler), onSnapshot: s => snapshots.push(s),
    onStatus: s => states.push(s), onDisconnect: e => failures.push(e) });
  t.after(() => { client.close(); app.stop(); });
  const joined = await client.join({ room: 'REJOIN' }); client.start(() => ({})); app.startSimulation();
  await waitFor(() => snapshots.length >= 2);
  app.rooms.session(joined.token).stream.destroy();
  await waitFor(() => states.filter(s => s === 'connected').length === 2);
  assert.ok(states.includes('reconnecting'));
  assert.equal(app.rooms.sessions.size, 1); assert.equal(app.rooms.session(joined.token).actor.id, joined.playerId);
  assert.equal(failures.length, 0);
});

test('real TCP server smoke test when listening is permitted', async t => {
  const app = createApp();
  const result = await new Promise(resolve => {
    app.server.once('error', error => resolve(error));
    app.server.listen(0, '127.0.0.1', () => resolve(null));
  });
  if (result) {
    app.stop();
    if (['EPERM', 'EACCES'].includes(result.code)) { t.skip('Sandbox blocks TCP listen: ' + result.code); return; }
    throw result;
  }
  t.after(() => { app.stop(); app.server.closeAllConnections(); app.server.close(); });
  const base = 'http://127.0.0.1:' + app.server.address().port;
  const response = await fetch(base + '/api/join', post({ name: 'TCP Player' }));
  assert.equal(response.status, 201);
  assert.equal((await response.json()).snapshot.humans, 1);
});
