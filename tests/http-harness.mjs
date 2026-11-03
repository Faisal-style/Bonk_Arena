import { Readable, Writable } from 'node:stream';

// Exercise the real HTTP handler and streaming client without binding a TCP port.
// Used when a sandbox disallows listen(); the TCP smoke test is separate.
export function handlerFetch(handler) {
  return async (url, options = {}) => new Promise((resolve, reject) => {
    const parsed = new URL(url, 'http://localhost');
    const req = Readable.from(options.body ? [Buffer.from(options.body)] : []);
    req.url = parsed.pathname + parsed.search;
    req.method = options.method || 'GET';
    req.headers = { host: 'localhost', ...Object.fromEntries(new Headers(options.headers).entries()) };
    req.socket = { remoteAddress: '127.0.0.1', encrypted: false, setNoDelay() {} };
    let controller, done = false, headersSent = false;
    const headers = new Headers();
    const body = new ReadableStream({ start(c) { controller = c; } });
    const response = new Writable({
      write(chunk, encoding, callback) { if (!done) controller.enqueue(new Uint8Array(chunk)); callback(); },
      final(callback) { if (!done) { done = true; controller.close(); } callback(); },
      destroy(error, callback) { if (!done) { done = true; error ? controller.error(error) : controller.close(); } callback(); },
    });
    response.setHeader = (key, value) => headers.set(key, value);
    Object.defineProperty(response, 'headersSent', { get: () => headersSent });
    response.writeHead = (status, values = {}) => {
      for (const [key, value] of Object.entries(values)) headers.set(key, value);
      headersSent = true;
      resolve(new Response([204, 304].includes(status) || req.method === 'HEAD' ? null : body, { status, headers }));
      return response;
    };
    response.flushHeaders = () => {};
    const abort = () => {
      const error = new DOMException('Aborted', 'AbortError');
      if (!headersSent) reject(error);
      response.destroy(error);
    };
    response.on('error', () => {});
    options.signal?.addEventListener('abort', abort, { once: true });
    response.on('close', () => options.signal?.removeEventListener('abort', abort));
    if (options.signal?.aborted) { abort(); return; }
    void handler(req, response).catch(reject);
  });
}
