import { randomBytes } from 'node:crypto';
import { Arena, COLORS, WORLD, clamp } from '../dist/engine.js';
import { encodeAvatar } from './avatars.mjs';

export const TICK_RATE = 30;
export const SNAPSHOT_RATE = 15;
export const MAX_PLAYERS = 16;
export const INPUT_TIMEOUT = 350;
export const SESSION_TIMEOUT = 15_000;

export class GameError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function normalizeRoom(value = 'RIMBA') {
  if (typeof value !== 'string' || !/^[A-Za-z0-9]{3,12}$/.test(value.trim())) {
    throw new GameError(400, 'Kode room harus 3–12 huruf atau angka.');
  }
  return value.trim().toUpperCase();
}

// Explicit fields prevent leaking session tokens, AI references, or cyclic state.
export function publicActor(a) {
  const fields = ['id', 'name', 'color', 'xp', 'level', 'x', 'y', 'angle', 'hp', 'kills',
    'alive', 'cooldown', 'dashCooldown', 'dashTime', 'attackTime', 'attackAngle',
    'invulnerable', 'hitFlash', 'windup', 'walking', 'isBoss', 'bossType', 'bossMaxHP', 'slamUntil',
    'castTime', 'castX', 'castY', 'castAngle', 'avatarId'];
  const out = { human: a.isPlayer, joinedAt: a.joinedAt ?? 0, diedAt: a.diedAt ?? null, killer: a.killer ?? null };
  for (const field of fields) out[field] = a[field];
  out.weapon = a.weapon ? { ...a.weapon } : null;
  out.skill = a.skill ? { ...a.skill } : null;
  out.slowUntil = a.slowUntil || 0;
  out.inventory = [...a.inventory];out.equipment = {...a.equipment};out.nextDecayAt=a.nextDecayAt;out.peakXP=a.peakXP;
  return out;
}

function publicEvent(e) {
  const out = { type: e.type };
  if (e.actor) out.actor = publicActor(e.actor);
  if (e.attacker) out.attacker = publicActor(e.attacker);
  for (const key of ['x', 'y', 'damage', 'value', 'powerType', 'replaced', 'gearType', 'demoted', 'bossType']) if (e[key] !== undefined) out[key] = e[key];
  return out;
}

export class RoomService {
  constructor({ clock = Date.now, random = Math.random, botCount = 6, orbCount = 420,
    maxPlayers = MAX_PLAYERS, maxRooms = 24 } = {}) {
    Object.assign(this, { clock, random, botCount, orbCount, maxPlayers, maxRooms });
    this.rooms = new Map();
    this.sessions = new Map();
  }

  join({ name, color, room: rawRoom, avatarPixels } = {}) {
    const code = normalizeRoom(rawRoom);
    if (name !== undefined && typeof name !== 'string') throw new GameError(400, 'Nama tidak valid.');
    name = (name || 'Petualang').replace(/[\p{C}]/gu, '').trim().slice(0, 16) || 'Petualang';
    color = COLORS.includes(color) ? color : COLORS[0];
    const avatar=avatarPixels==null?null:encodeAvatar(avatarPixels);
    let room = this.rooms.get(code);
    if (!room) {
      if (this.rooms.size >= this.maxRooms) throw new GameError(503, 'Server penuh. Coba lagi nanti.');
      const arena = new Arena({ random: this.random, botCount: this.botCount, orbCount: this.orbCount });
      arena.reset();
      arena.actors = arena.actors.filter(a => !a.isPlayer);
      arena.player = null;
      room = { code, arena, members: new Set(), sequence: 0, pendingEvents: [], avatars:new Map() };
      this.rooms.set(code, room);
    }
    if (room.members.size >= this.maxPlayers) throw new GameError(409, 'Room penuh. Gunakan kode room lain.');
    const actor = room.arena.actor(name, color, 0, true);
    actor.avatarId=avatar?.id||null;
    if(avatar)room.avatars.set(avatar.id,avatar.data);
    this.spawn(room, actor);
    actor.joinedAt = room.arena.time;
    room.arena.actors.push(actor);
    const token = randomBytes(24).toString('hex');
    const now = this.clock();
    const session = { token, room, actor, input: {}, sequence: -1, dashSequence: 0,
      lastInput: now, lastSeen: now, disconnectedAt: now, stream: null,
      rateStart: now, rateCount: 0 };
    this.sessions.set(token, session);
    room.members.add(token);
    return { token, playerId: actor.id, room: code, maxPlayers: this.maxPlayers,
      snapshot: this.snapshot(room), obstacles: room.arena.obstacles };
  }

  spawn(room, actor) {
    const others = room.arena.actors.filter(a => a !== actor && a.alive);
    for (let i = 0; i < 180; i++) {
      const radius = i === 0 ? 0 : 150 + this.random() * 450;
      const angle = this.random() * Math.PI * 2;
      const p = i < 80 ? { x: WORLD / 2 + Math.cos(angle) * radius, y: WORLD / 2 + Math.sin(angle) * radius }
        : room.arena.freePoint();
      if (others.some(a => Math.hypot(a.x - p.x, a.y - p.y) < 160)) continue;
      if (room.arena.obstacles.some(o => Math.hypot(o.x - p.x, o.y - p.y) < o.r + 45)) continue;
      Object.assign(actor, p);
      return;
    }
    Object.assign(actor, room.arena.freePoint());
  }

  session(token) {
    const session = this.sessions.get(token);
    if (!session) throw new GameError(401, 'Sesi berakhir. Masuk kembali ke room.');
    return session;
  }
  avatar(token,id){
    const session=this.session(token);
    if(!/^[a-f0-9]{64}$/.test(id)||!session.room.avatars.has(id))throw new GameError(404,'Avatar tidak ditemukan.');
    return session.room.avatars.get(id);
  }

  acceptInput(token, payload) {
    const session = this.session(token), now = this.clock();
    if (now - session.rateStart >= 1000) { session.rateStart = now; session.rateCount = 0; }
    if (++session.rateCount > 65) throw new GameError(429, 'Input terlalu cepat.');
    if (!payload || !Number.isSafeInteger(payload.seq) || payload.seq < 0 ||
      !Number.isSafeInteger(payload.dashSeq) || payload.dashSeq < 0 ||
      ![payload.x, payload.y, payload.angle].every(Number.isFinite) || typeof payload.attack !== 'boolean') {
      throw new GameError(400, 'Input tidak valid.');
    }
    if (payload.seq <= session.sequence) return;
    session.sequence = payload.seq;
    // Only controls are accepted. Position, damage, XP, IDs, and elapsed time are server-owned.
    const dash = payload.dashSeq > session.dashSequence;
    session.dashSequence = Math.max(session.dashSequence, payload.dashSeq);
    session.input = { x: clamp(payload.x, -1, 1), y: clamp(payload.y, -1, 1),
      angle: Math.atan2(Math.sin(payload.angle), Math.cos(payload.angle)), attack: payload.attack,
      dash: dash || session.input.dash === true };
    session.lastInput = now;
    session.lastSeen = now;
  }

  connect(token, stream) {
    const session = this.session(token);
    if (session.stream) session.stream.end();
    session.stream = stream;
    session.disconnectedAt = null;
    session.lastSeen = this.clock();
    return session;
  }

  disconnect(token, stream) {
    const session = this.sessions.get(token);
    if (!session || session.stream !== stream) return;
    session.stream = null;
    session.disconnectedAt = this.clock();
    session.input = {};
  }

  equipmentAction(token,payload) {
    const session=this.session(token),now=this.clock();
    if(now-(session.lastEquipmentAt||0)<150)throw new GameError(429,'Tunggu sebentar sebelum mengganti equipment.');
    session.lastEquipmentAt=now;
    if(!payload||!['equip','unequip','store','drop'].includes(payload.action))throw new GameError(400,'Aksi equipment tidak valid.');
    const world=session.room.arena;
    const success=payload.action==='drop'?world.dropEquipment(session.actor,payload.type):world.equip(session.actor,payload.type,['unequip','store'].includes(payload.action));
    if(!success)throw new GameError(400,'Item tidak tersedia, karakter tumbang, atau tidak ada ruang untuk membuang item.');
    return {ok:true};
  }

  respawn(token) {
    const session = this.session(token), { actor, room } = session;
    if (actor.alive) throw new GameError(409, 'Karakter masih hidup.');
    if (room.arena.time - actor.diedAt < 1) throw new GameError(429, 'Tunggu sebentar sebelum respawn.');
    const replacement = room.arena.actor(actor.name, actor.color, 0, true);
    replacement.avatarId=actor.avatarId||null;
    replacement.id = actor.id;
    replacement.joinedAt = room.arena.time;
    this.spawn(room, replacement);
    Object.assign(actor, replacement, { diedAt: null, killer: null });
    session.input = {};
    session.lastSeen = this.clock();
    return { playerId: actor.id, snapshot: this.snapshot(room) };
  }

  leave(token) {
    const session = this.sessions.get(token);
    if (!session) return;
    this.sessions.delete(token);
    const { room, actor } = session;
    actor.alive = false;
    room.arena.actors = room.arena.actors.filter(a => a !== actor);
    if(actor.avatarId&&!room.arena.actors.some(a=>a.avatarId===actor.avatarId))room.avatars.delete(actor.avatarId);
    room.members.delete(token);
    session.stream?.end();
    if (!room.members.size) this.rooms.delete(room.code);
  }

  tick(dt = 1 / TICK_RATE) {
    const now = this.clock();
    for (const session of this.sessions.values()) {
      if ((session.disconnectedAt !== null && now - session.disconnectedAt > SESSION_TIMEOUT) ||
        now - session.lastSeen > 60_000) this.leave(session.token);
    }
    for (const room of this.rooms.values()) {
      const inputs = new Map();
      for (const token of room.members) {
        const session = this.sessions.get(token);
        inputs.set(session.actor.id, now - session.lastInput <= INPUT_TIMEOUT ? { ...session.input } : {});
        session.input.dash = false;
      }
      room.arena.update(dt, inputs);
      for (const event of room.arena.drainEvents()) {
        if (event.type === 'kill') {
          event.actor.diedAt = room.arena.time;
          event.actor.killer = event.attacker.name;
        }
        room.pendingEvents.push(publicEvent(event));
      }
      if (room.pendingEvents.length > 128) room.pendingEvents.splice(0, room.pendingEvents.length - 128);
    }
  }

  snapshot(room, events = []) {
    return { type: 'snapshot', room: room.code, sequence: room.sequence, time: room.arena.time,
      humans: room.members.size, bots: this.botCount, maxPlayers: this.maxPlayers,
      actors: room.arena.actors.map(publicActor),
      nextBossAt:room.arena.nextBossAt,nextBossType:room.arena.nextBossType,bossSite:room.arena.bossSite?{...room.arena.bossSite}:null,
      gearLoot: room.arena.gearLoot.map(item=>({...item})),
      pickups: room.arena.pickups.map(p => ({ ...p })),
      orbs: room.arena.orbs.map(o => ({ ...o, x: Math.round(o.x), y: Math.round(o.y) })), events };
  }

  broadcast() {
    for (const room of this.rooms.values()) {
      room.sequence++;
      const snapshot = this.snapshot(room, room.pendingEvents.splice(0));
      const message = `data: ${JSON.stringify(snapshot)}\n\n`;
      for (const token of room.members) {
        const session = this.sessions.get(token), stream = session.stream;
        if (!stream) continue;
        if (stream.destroyed || stream.writableLength > 256 * 1024) {
          this.disconnect(token, stream);
          stream.destroy();
        } else stream.write(message);
      }
    }
  }

  close() { for (const token of [...this.sessions.keys()]) this.leave(token); }
}
