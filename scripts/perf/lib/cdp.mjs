// scripts/perf/lib/cdp.mjs
// Tiny zero-dependency Chrome DevTools Protocol client + stock-Chrome launcher.
// Works with a page-level websocket (legacy harness) or the browser websocket
// with flattened sessions (Target.attachToTarget { flatten: true }).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

export const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
].filter(Boolean);

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function findChrome() {
  for (const c of CHROME_CANDIDATES) if (fs.existsSync(c)) return c;
  throw new Error('Chrome not found (set CHROME_PATH)');
}

export async function httpJson(url) {
  return (await fetch(url)).json();
}

export class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.handlers = new Map(); // method -> [fn(params, sessionId)]
    this.closed = false;
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : ev.data.toString());
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject, method } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(`${method}: ${JSON.stringify(msg.error)}`));
        else resolve(msg.result);
      } else if (msg.method) {
        const list = this.handlers.get(msg.method);
        if (list) for (const fn of list.slice()) fn(msg.params, msg.sessionId);
      }
    });
    ws.addEventListener('close', () => {
      this.closed = true;
      for (const { reject, method } of this.pending.values()) reject(new Error(`${method}: websocket closed`));
      this.pending.clear();
    });
  }

  static async connect(wsUrl) {
    const ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', reject, { once: true });
    });
    return new CDP(ws);
  }

  send(method, params = {}, sessionId) {
    if (this.closed) return Promise.reject(new Error(`${method}: websocket closed`));
    const id = ++this.id;
    const msg = { id, method, params };
    if (sessionId) msg.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      this.ws.send(JSON.stringify(msg));
    });
  }

  on(method, fn) {
    if (!this.handlers.has(method)) this.handlers.set(method, []);
    this.handlers.get(method).push(fn);
    return () => this.off(method, fn);
  }

  off(method, fn) {
    const list = this.handlers.get(method);
    if (!list) return;
    const i = list.indexOf(fn);
    if (i !== -1) list.splice(i, 1);
  }

  once(method, predicate = () => true) {
    return new Promise((resolve) => {
      const fn = (p, sid) => {
        if (!predicate(p, sid)) return;
        this.off(method, fn);
        resolve(p);
      };
      this.on(method, fn);
    });
  }

  // A view of this connection scoped to one flattened target session.
  session(sessionId) {
    const root = this;
    const offs = [];
    return {
      sessionId,
      send: (method, params = {}) => root.send(method, params, sessionId),
      on: (method, fn) => {
        const wrapped = (p, sid) => { if (sid === sessionId) fn(p); };
        const off = root.on(method, wrapped);
        offs.push(off);
        return off;
      },
      once: (method, predicate = () => true) => root.once(method, (p, sid) => sid === sessionId && predicate(p)),
      dispose: () => { for (const off of offs.splice(0)) off(); },
    };
  }

  close() {
    try { this.ws.close(); } catch {}
  }
}

// Launch stock Chrome with remote debugging. Returns { proc, version, userDataDir, close }.
export async function launchChrome({
  cdpPort = 9333,
  headed = false,
  marker = `genesisperf-${process.pid}`,
  windowSize = '1600,900',
  extraArgs = [],
} = {}) {
  const userDataDir = path.join(os.tmpdir(), `${marker}-profile`);
  fs.mkdirSync(userDataDir, { recursive: true });
  const args = [
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--disable-component-update', '--disable-sync', '--disable-translate',
    '--disable-background-networking', '--disable-default-apps',
    '--metrics-recording-only', '--password-store=basic',
    `--window-size=${windowSize}`,
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    ...extraArgs,
    'about:blank',
  ];
  if (!headed) args.unshift('--headless=new');
  const proc = spawn(findChrome(), args, { stdio: 'ignore', windowsHide: true });
  const deadline = Date.now() + 30000;
  let version = null;
  while (Date.now() < deadline) {
    try { version = await httpJson(`http://127.0.0.1:${cdpPort}/json/version`); break; } catch { await sleep(300); }
  }
  if (!version) { try { proc.kill('SIGKILL'); } catch {} throw new Error(`Chrome CDP did not start on port ${cdpPort}`); }

  const close = async (cdp) => {
    if (cdp && !cdp.closed) { try { await Promise.race([cdp.send('Browser.close'), sleep(3000)]); } catch {} }
    try { proc.kill('SIGKILL'); } catch {}
    await sleep(800);
    for (let i = 0; i < 5; i++) {
      try { fs.rmSync(userDataDir, { recursive: true, force: true }); break; } catch { await sleep(500); }
    }
  };
  return { proc, version, userDataDir, close };
}
