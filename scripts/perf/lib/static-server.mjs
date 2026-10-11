// scripts/perf/lib/static-server.mjs
// Zero-dependency static file server that approximates Cloudflare Workers
// static-asset routing, so a local directory (build/ or dist/client) can be
// measured with the same semantics it will have in production.
//
// Approximated behaviour (see README "Static server semantics"):
//   html_handling "auto-trailing-slash" (Cloudflare default):
//     /about        -> about.html (200)          /about.html -> 307 /about
//     /folder       -> 307 /folder/              /folder/    -> folder/index.html
//     /folder/index.html -> 307 /folder/
//   not_found_handling:
//     "404-page"               nearest 404.html, HTTP 404
//     "single-page-application" /index.html, HTTP 200 (today's SPA behaviour)
//     "none"                   empty HTTP 404
//     "auto" (default)         404-page if <dir>/404.html exists, else SPA
//   _headers   (Cloudflare format: path patterns with * and :placeholder,
//               "Name: value" lines, "! Name" removals; values from several
//               matching rules are joined with ", ")
//   _redirects (static + splat rules; 200 = rewrite)
//   Default caching like Cloudflare static assets: strong ETag,
//   "Cache-Control: public, max-age=0, must-revalidate", 304 on If-None-Match.
//   Edge-style compression for text types (brotli q4, else gzip), Range/206.
//
// Legacy mode (noStore: true) reproduces the original harness server:
// SPA fallback, Cache-Control: no-store, no ETag, no compression.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

export const MIME = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.map': 'application/json', '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.wasm': 'application/wasm', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json',
};

const COMPRESSIBLE = /^(text\/|application\/(json|javascript|xml|manifest\+json|wasm)|image\/svg\+xml|model\/gltf\+json|font\/(ttf|otf))/;
const DEFAULT_CACHE_CONTROL = 'public, max-age=0, must-revalidate';

// ---------------------------------------------------------------- _headers
function patternToRegex(pattern) {
  // Strip an absolute-URL prefix: host-specific rules are matched on path only.
  let p = pattern.replace(/^https?:\/\/[^/]+/i, '') || '/';
  let re = '';
  for (let i = 0; i < p.length; i++) {
    const ch = p[i];
    if (ch === '*') { re += '(.*)'; continue; }
    if (ch === ':' && /[A-Za-z]/.test(p[i + 1] || '')) {
      let j = i + 1;
      while (j < p.length && /\w/.test(p[j])) j++;
      re += '([^/]+)';
      i = j - 1;
      continue;
    }
    re += ch.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

export function parseHeadersFile(text) {
  const rules = [];
  let cur = null;
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    if (!/^\s/.test(raw)) {
      cur = { pattern: raw.trim(), regex: patternToRegex(raw.trim()), set: [], unset: [] };
      rules.push(cur);
      continue;
    }
    if (!cur) continue;
    const line = raw.trim();
    if (line.startsWith('!')) { cur.unset.push(line.slice(1).trim().toLowerCase()); continue; }
    const idx = line.indexOf(':');
    if (idx > 0) cur.set.push([line.slice(0, idx).trim(), line.slice(idx + 1).trim()]);
  }
  return rules;
}

export function parseRedirectsFile(text) {
  const rules = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [from, to, status] = line.split(/\s+/);
    if (!from || !to) continue;
    rules.push({ from, to, status: parseInt(status, 10) || 302, regex: patternToRegex(from) });
  }
  return rules;
}

function applyHeaderRules(rules, urlPath, headers) {
  const custom = new Map(); // lower name -> [name, value]
  const removed = new Set();
  for (const rule of rules) {
    if (!rule.regex.test(urlPath)) continue;
    for (const [name, value] of rule.set) {
      const k = name.toLowerCase();
      if (custom.has(k)) custom.get(k)[1] += `, ${value}`;
      else custom.set(k, [name, value]);
    }
    for (const k of rule.unset) removed.add(k);
  }
  for (const [k, [, value]] of custom) headers[k] = value;
  for (const k of removed) delete headers[k];
  return { matched: custom.size + removed.size > 0 };
}

// ---------------------------------------------------------------- wrangler config
// Best effort: read assets.html_handling / not_found_handling from a wrangler
// config in the project root or next to the served directory.
export function readWranglerAssetsConfig(searchDirs) {
  for (const d of searchDirs) {
    for (const name of ['wrangler.jsonc', 'wrangler.json', 'wrangler.toml']) {
      const f = path.join(d, name);
      if (!fs.existsSync(f)) continue;
      const text = fs.readFileSync(f, 'utf8');
      const pick = (key) => {
        const m = text.match(new RegExp(`["']?${key}["']?\\s*[:=]\\s*["']([\\w-]+)["']`));
        return m ? m[1] : undefined;
      };
      const cfg = { file: f, htmlHandling: pick('html_handling'), notFoundHandling: pick('not_found_handling') };
      if (cfg.htmlHandling || cfg.notFoundHandling) return cfg;
    }
  }
  return null;
}

// ---------------------------------------------------------------- server
export function createStaticHandler(options) {
  const dir = path.resolve(options.dir);
  if (!fs.existsSync(dir)) throw new Error(`static dir not found: ${dir}`);
  const noStore = !!options.noStore;
  const htmlHandling = options.htmlHandling || 'auto-trailing-slash';
  let notFoundHandling = options.notFoundHandling || 'auto';
  if (notFoundHandling === 'auto') {
    notFoundHandling = fs.existsSync(path.join(dir, '404.html')) ? '404-page' : 'single-page-application';
  }
  if (noStore) notFoundHandling = 'single-page-application';
  const compress = options.compress ?? !noStore;
  const headersFile = path.join(dir, '_headers');
  const redirectsFile = path.join(dir, '_redirects');
  const headerRules = !noStore && fs.existsSync(headersFile) ? parseHeadersFile(fs.readFileSync(headersFile, 'utf8')) : [];
  const redirectRules = !noStore && fs.existsSync(redirectsFile) ? parseRedirectsFile(fs.readFileSync(redirectsFile, 'utf8')) : [];

  const metaCache = new Map(); // abs path -> { key, etag, br, gzip }
  const isFile = (p) => { try { return fs.statSync(p).isFile(); } catch { return false; } };
  const inside = (p) => p === dir || p.startsWith(dir + path.sep);
  const abs = (urlPath) => {
    const p = path.join(dir, urlPath);
    return inside(p) ? p : null;
  };

  function fileMeta(file) {
    const st = fs.statSync(file);
    const key = `${st.size}:${st.mtimeMs}`;
    let m = metaCache.get(file);
    if (!m || m.key !== key) {
      const buf = fs.readFileSync(file);
      m = { key, size: st.size, etag: `"${crypto.createHash('md5').update(buf).digest('hex')}"`, buf: st.size <= 8 * 1048576 ? buf : null };
      metaCache.set(file, m);
    }
    return m;
  }

  // Resolve a URL path to { file } | { redirect } | null (not found).
  function resolve(urlPath) {
    if (htmlHandling === 'none') {
      const f = abs(urlPath);
      return f && isFile(f) ? { file: f } : null;
    }
    if (urlPath.endsWith('/')) {
      const idx = abs(urlPath + 'index.html');
      if (idx && isFile(idx)) return { file: idx };
      if (urlPath !== '/') {
        const html = abs(urlPath.slice(0, -1) + '.html');
        if (html && isFile(html)) return { redirect: urlPath.slice(0, -1) };
        const exact = abs(urlPath.slice(0, -1));
        if (exact && isFile(exact)) return { redirect: urlPath.slice(0, -1) };
      }
      return null;
    }
    if (urlPath.endsWith('/index.html')) {
      const f = abs(urlPath);
      if (f && isFile(f)) return { redirect: urlPath.slice(0, -'index.html'.length) };
    } else if (urlPath.endsWith('.html')) {
      const f = abs(urlPath);
      if (f && isFile(f)) return { redirect: urlPath.slice(0, -'.html'.length) };
    }
    const f = abs(urlPath);
    if (f && isFile(f)) return { file: f };
    const html = abs(urlPath + '.html');
    if (html && isFile(html)) return { file: html };
    const idx = abs(urlPath + '/index.html');
    if (idx && isFile(idx)) return { redirect: urlPath + '/' };
    return null;
  }

  function notFound(urlPath) {
    if (notFoundHandling === 'single-page-application') {
      const idx = path.join(dir, 'index.html');
      return isFile(idx) ? { file: idx, status: 200 } : { status: 404 };
    }
    if (notFoundHandling === '404-page') {
      let d = path.posix.dirname(urlPath.endsWith('/') ? urlPath + 'x' : urlPath);
      for (;;) {
        const f = abs(path.posix.join(d, '404.html'));
        if (f && isFile(f)) return { file: f, status: 404 };
        if (d === '/' || d === '.' || !d) break;
        d = path.posix.dirname(d);
      }
    }
    return { status: 404 };
  }

  function send(req, res, status, headers, body) {
    res.writeHead(status, headers);
    if (req.method === 'HEAD' || body == null) return res.end();
    if (Buffer.isBuffer(body) || typeof body === 'string') return res.end(body);
    body.pipe(res);
  }

  return function handler(req, res) {
    let urlPath;
    try { urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400); return res.end(); }
    if (urlPath.includes('\0')) { res.writeHead(400); return res.end(); }
    const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';

    // ---- legacy (owner's original harness semantics)
    if (noStore) {
      let file = abs(urlPath);
      if (!file) { res.writeHead(403); return res.end(); }
      if (!isFile(file)) file = path.join(dir, 'index.html');
      return send(req, res, 200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' }, fs.createReadStream(file));
    }

    // ---- _redirects
    for (const r of redirectRules) {
      const m = urlPath.match(r.regex);
      if (!m) continue;
      let to = r.to.replace(/:splat/g, m[1] ?? '');
      if (r.status === 200) { urlPath = to; break; }
      return send(req, res, r.status, { Location: to + query, 'Cache-Control': 'no-store' }, null);
    }

    let hit = resolve(urlPath);
    if (hit && hit.redirect) {
      return send(req, res, 307, { Location: hit.redirect + query, 'Cache-Control': 'no-store', 'Content-Length': '0' }, null);
    }
    let status = 200;
    if (!hit) {
      const nf = notFound(urlPath);
      if (!nf.file) return send(req, res, 404, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': '0' }, null);
      hit = { file: nf.file };
      status = nf.status;
    }

    const file = hit.file;
    const ext = path.extname(file).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    const meta = fileMeta(file);
    const headers = {
      'content-type': type,
      'cache-control': DEFAULT_CACHE_CONTROL,
      etag: meta.etag,
      'accept-ranges': 'bytes',
    };
    applyHeaderRules(headerRules, urlPath, headers);

    if (status === 200 && req.headers['if-none-match'] && req.headers['if-none-match'].split(/\s*,\s*/).includes(meta.etag)) {
      const h = { ...headers };
      delete h['content-type'];
      return send(req, res, 304, h, null);
    }

    const canCompress = compress && COMPRESSIBLE.test(type) && meta.buf && meta.size > 256;
    const ae = String(req.headers['accept-encoding'] || '');
    if (canCompress && (/\bbr\b/.test(ae) || /\bgzip\b/.test(ae))) {
      const enc = /\bbr\b/.test(ae) ? 'br' : 'gzip';
      if (!meta[enc]) {
        meta[enc] = enc === 'br'
          ? zlib.brotliCompressSync(meta.buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 } })
          : zlib.gzipSync(meta.buf, { level: 6 });
      }
      headers['content-encoding'] = enc;
      headers.vary = 'Accept-Encoding';
      headers['content-length'] = String(meta[enc].length);
      return send(req, res, status, headers, meta[enc]);
    }

    // Single-range support (media elements use Range requests).
    const range = req.headers.range && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    if (range && status === 200) {
      let start = range[1] === '' ? meta.size - parseInt(range[2], 10) : parseInt(range[1], 10);
      let end = range[1] !== '' && range[2] !== '' ? parseInt(range[2], 10) : meta.size - 1;
      if (Number.isNaN(start) || start < 0) start = 0;
      end = Math.min(end, meta.size - 1);
      if (start > end) return send(req, res, 416, { 'content-range': `bytes */${meta.size}` }, null);
      headers['content-range'] = `bytes ${start}-${end}/${meta.size}`;
      headers['content-length'] = String(end - start + 1);
      return send(req, res, 206, headers, fs.createReadStream(file, { start, end }));
    }

    headers['content-length'] = String(meta.size);
    return send(req, res, status, headers, meta.buf || fs.createReadStream(file));
  };
}

export async function startStaticServer({ dir, port = 8123, host = '127.0.0.1', ...options }) {
  const handler = createStaticHandler({ dir, ...options });
  const server = http.createServer(handler);
  server.keepAliveTimeout = 30000;
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });
  return {
    server,
    origin: `http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${port}`,
    close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(() => r()); }),
  };
}

// Describe the effective server semantics for reports.
export function describeStaticServer({ dir, noStore = false, htmlHandling, notFoundHandling, compress }) {
  const d = path.resolve(dir);
  let nf = notFoundHandling || 'auto';
  if (nf === 'auto') nf = fs.existsSync(path.join(d, '404.html')) ? '404-page' : 'single-page-application';
  if (noStore) nf = 'single-page-application';
  const headersFile = path.join(d, '_headers');
  return {
    dir: d,
    legacyNoStore: noStore,
    htmlHandling: noStore ? 'spa-fallback (legacy)' : htmlHandling || 'auto-trailing-slash',
    notFoundHandling: nf,
    compression: noStore ? 'none' : compress === false ? 'none' : 'br q4 / gzip 6 for text types',
    headersFile: !noStore && fs.existsSync(headersFile) ? parseHeadersFile(fs.readFileSync(headersFile, 'utf8')).length + ' rules' : 'none',
    redirectsFile: !noStore && fs.existsSync(path.join(d, '_redirects')) ? 'present' : 'none',
    defaultCacheControl: noStore ? 'no-store' : DEFAULT_CACHE_CONTROL,
  };
}
