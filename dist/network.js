// Server snapshots arrive over a streaming HTTP response; inputs use small POSTs.
// Both use the same origin, so Node's standard library is sufficient on the server.
export class MultiplayerClient {
  constructor({ onSnapshot, onStatus, onDisconnect, fetcher = globalThis.fetch.bind(globalThis), base = '' }) {
    Object.assign(this, { onSnapshot, onStatus, onDisconnect, fetcher, base });
    this.token = null;
    this.playerId = null;
    this.sequence = 0;
    this.dashSequence = 0;
    this.closed = false;
    this.ready = false;
    this.pending = false;
    this.latency = 0;
    this.controller = new AbortController();
  }

  async request(path, { method = 'POST', data, keepalive = false } = {}) {
    if (this.closed) throw new DOMException('Connection closed', 'AbortError');
    const controller = new AbortController();
    const abort = () => controller.abort();
    this.controller.signal.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(abort, 8000);
    try {
      const response = await this.fetcher(this.base + path, {
        method, headers: { ...(data ? { 'Content-Type': 'application/json' } : {}),
          ...(this.token ? { Authorization: 'Bearer ' + this.token } : {}) },
        body: data ? JSON.stringify(data) : undefined, signal: controller.signal, keepalive,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const error = new Error(body.error || 'Server multiplayer tidak tersedia. Jalankan npm start di komputer server.');
        error.status = response.status;
        throw error;
      }
      return response.status === 204 ? null : await response.json();
    } finally {
      clearTimeout(timeout);
      this.controller.signal.removeEventListener('abort', abort);
    }
  }

  async join(options) {
    const result = await this.request('/api/join', { data: options });
    this.token = result.token;
    this.playerId = result.playerId;
    this.room = result.room;
    return result;
  }

  start(inputProvider) {
    this.inputProvider = inputProvider;
    this.timer = setInterval(() => this.sendInput(), 50);
    void this.readSnapshots();
  }

  async sendInput() {
    if (this.closed) return;
    const input = this.ready ? this.inputProvider() : {};
    if (input.dash) this.dashSequence++;
    if (this.pending) return;
    this.pending = true;
    const began = performance.now();
    try {
      await this.request('/api/input', { data: { seq: ++this.sequence, dashSeq: this.dashSequence,
        x: input.x || 0, y: input.y || 0, angle: input.angle || 0, attack: input.attack === true, block: input.block === true } });
      this.latency = Math.round(performance.now() - began);
    } catch (error) {
      if (error.status === 401) this.fail(error);
      // Other transient input failures are retried with fresh controls next interval.
      // The server clears controls after 350 ms with no accepted input.
    } finally { this.pending = false; }
  }

  async readSnapshots() {
    let failures = 0;
    while (!this.closed) {
      const controller = new AbortController();
      this.streamController = controller;
      let watchdog, reader, received = 0;
      const armWatchdog = () => { clearTimeout(watchdog); watchdog = setTimeout(() => controller.abort(), 5000); };
      try {
        armWatchdog();
        const response = await this.fetcher(this.base + '/api/stream', {
          headers: { Authorization: 'Bearer ' + this.token }, signal: controller.signal,
        });
        if (!response.ok || !response.body) {
          const error = new Error(response.status === 401 ? 'Sesi berakhir. Masuk kembali ke room.' : 'Koneksi arena terputus.');
          error.status = response.status; throw error;
        }
        reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (!this.closed) {
          const { value, done } = await reader.read();
          if (done) throw new Error('Koneksi arena terputus.');
          armWatchdog();
          buffer += decoder.decode(value, { stream: true });
          if (buffer.length > 2_000_000) throw new Error('Data arena tidak valid.');
          let end;
          while ((end = buffer.indexOf('\n\n')) >= 0) {
            const frame = buffer.slice(0, end); buffer = buffer.slice(end + 2);
            if (!frame.startsWith('data: ')) continue;
            const snapshot = JSON.parse(frame.slice(6));
            if (!this.ready) { this.ready = true; this.onStatus('connected'); }
            this.onSnapshot(snapshot);
            if (++received >= 30) failures = 0;
          }
        }
      } catch (error) {
        if (this.closed) return;
        this.ready = false;
        if (error.status === 401 || ++failures >= 4) {
          this.fail(new Error(error.status === 401 ? error.message : 'Koneksi terputus. Periksa jaringan, lalu masuk kembali ke room.'));
          return;
        }
        this.onStatus('reconnecting');
      } finally {
        clearTimeout(watchdog);
        controller.abort();
        if (reader) { try { await reader.cancel(); } catch { /* Connection already closed. */ } }
      }
      if (!this.closed) await new Promise(resolve => setTimeout(resolve, 400 * failures));
    }
  }

  async respawn() { return this.request('/api/respawn'); }

  fail(error) {
    if (this.closed) return;
    this.close();
    this.onDisconnect(error);
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.ready = false;
    clearInterval(this.timer);
    this.streamController?.abort();
    this.controller.abort();
    if (this.token) {
      void this.fetcher(this.base + '/api/leave', { method: 'POST',
        headers: { Authorization: 'Bearer ' + this.token }, keepalive: true }).catch(() => {});
    }
  }
}
