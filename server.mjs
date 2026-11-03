import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { RoomService, GameError, TICK_RATE, SNAPSHOT_RATE } from './server/rooms.mjs';

const defaultRoot = fileURLToPath(new URL('./dist', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

async function readJSON(req, maxBytes=2048) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new GameError(415, 'Gunakan JSON.');
  let bytes = 0;
  const chunks = [];
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > maxBytes) throw new GameError(413, 'Permintaan terlalu besar.');
    chunks.push(chunk);
  }
  try {
    const data = JSON.parse(Buffer.concat(chunks).toString());
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
    return data;
  } catch { throw new GameError(400, 'JSON tidak valid.'); }
}

export function createApp({ rooms = new RoomService(), root = defaultRoot, allowedOrigin = process.env.PUBLIC_ORIGIN } = {}) {
  const joinRates = new Map();
  async function handler(req, res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname.startsWith('/api/')) {
        const origin = req.headers.origin;
        const expectedOrigin = allowedOrigin || `${req.socket.encrypted ? 'https' : 'http'}://${req.headers.host}`;
        if (req.headers['sec-fetch-site'] === 'cross-site' || (origin && origin !== expectedOrigin)) {
          throw new GameError(403, 'Origin tidak diizinkan.');
        }
        if (req.method === 'GET' && url.pathname === '/api/health') {
          return json(res, 200, { ok: true, multiplayer: true, rooms: rooms.rooms.size, players: rooms.sessions.size });
        }
        if (req.method === 'POST' && url.pathname === '/api/join') {
          const now = Date.now(), ip = req.socket.remoteAddress || 'local';
          for (const [key, rate] of joinRates) if (now - rate.start >= 60_000) joinRates.delete(key);
          let rate = joinRates.get(ip);
          if (!rate) {
            if (joinRates.size >= 4096) throw new GameError(503, 'Server sibuk.');
            rate = { start: now, count: 0 }; joinRates.set(ip, rate);
          }
          if (++rate.count > 40) throw new GameError(429, 'Terlalu sering masuk room. Tunggu satu menit.');
          return json(res, 201, rooms.join(await readJSON(req, 128*1024)));
        }
        const token = req.headers.authorization?.replace(/^Bearer /, '') || '';
        const session = rooms.session(token);
        if(req.method==='GET'&&url.pathname.startsWith('/api/avatar/')){
          const data=rooms.avatar(token,url.pathname.slice('/api/avatar/'.length));
          res.writeHead(200,{'Content-Type':'image/png','Content-Length':data.length,'Cache-Control':'private, no-store'});res.end(data);return;
        }
        if (req.method === 'GET' && url.pathname === '/api/stream') {
          rooms.connect(token, res);
          req.socket.setNoDelay(true);
          res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
          res.flushHeaders();
          res.write(`data: ${JSON.stringify(rooms.snapshot(session.room))}\n\n`);
          res.on('close', () => rooms.disconnect(token, res));
          return;
        }
        if (req.method === 'POST' && url.pathname === '/api/input') {
          rooms.acceptInput(token, await readJSON(req));
          res.writeHead(204).end(); return;
        }
        if (req.method === 'POST' && url.pathname === '/api/equipment') {
          return json(res, 200, rooms.equipmentAction(token, await readJSON(req)));
        }
        if (req.method === 'POST' && url.pathname === '/api/respawn') {
          return json(res, 200, rooms.respawn(token));
        }
        if (req.method === 'POST' && url.pathname === '/api/leave') {
          rooms.leave(token); res.writeHead(204).end(); return;
        }
        throw new GameError(404, 'Endpoint tidak ditemukan.');
      }
      if (!['GET', 'HEAD'].includes(req.method)) throw new GameError(405, 'Metode tidak diizinkan.');
      const path = resolve(root, '.' + decodeURIComponent(url.pathname));
      if (path !== root && !path.startsWith(root + sep)) throw new GameError(403, 'Akses ditolak.');
      const file = path === root ? resolve(root, 'index.html') : path;
      let body;
      try { body = await readFile(file); } catch { throw new GameError(404, 'Tidak ditemukan.'); }
      res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch (error) {
      if (res.headersSent) { res.destroy(); return; }
      json(res, error.status || 500, { error: error.status ? error.message : 'Server mengalami gangguan.' });
    }
  }
  const server = http.createServer({ requestTimeout: 10_000, headersTimeout: 10_000, maxHeaderSize: 8192 }, handler);
  let timer, previous = 0, accumulator = 0, tick = 0;
  function startSimulation() {
    if (timer) return;
    previous = performance.now();
    timer = setInterval(() => {
      const now = performance.now();
      accumulator += Math.min((now - previous) / 1000, .15); previous = now;
      while (accumulator >= 1 / TICK_RATE) {
        rooms.tick(); accumulator -= 1 / TICK_RATE;
        if (++tick % (TICK_RATE / SNAPSHOT_RATE) === 0) rooms.broadcast();
      }
    }, 1000 / TICK_RATE);
    timer.unref();
  }
  function stop() { clearInterval(timer); timer = null; rooms.close(); }
  server.on('close', stop);
  return { server, handler, rooms, startSimulation, stop };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const app = createApp();
  const port = Number(process.env.PORT || 3000);
  app.server.on('error', error => { console.error(`BONK Arena gagal berjalan: ${error.message}`); process.exitCode = 1; app.stop(); });
  app.server.listen(port, '0.0.0.0', () => {
    app.startSimulation();
    console.log(`BONK Arena multiplayer: http://localhost:${port}`);
    console.log('Teman satu Wi-Fi: buka http://<IP-komputer-server>:' + port + ' dan gunakan kode room yang sama.');
  });
  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => { app.stop(); app.server.close(); app.server.closeAllConnections(); });
}
