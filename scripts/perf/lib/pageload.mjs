// scripts/perf/lib/pageload.mjs
// Page-load UX measurement over CDP: FCP, LCP, CLS, TBT/TTI, load, the
// landing's "ready" moment, and network bytes/requests (until load, until
// ready, by type). Each cold run uses a fresh isolated browser context
// (empty HTTP cache, no sockets, no code cache).

import os from 'node:os';
import { sleep } from './cdp.mjs';

// ---------------------------------------------------------------- profiles
// Network presets in CDP units (latency ms, throughput bytes/s).
// "slow4g" is exactly Chrome DevTools' "Slow 4G" preset (also Lighthouse's
// devtools throttling for its mobile profile): a 1.6 Mbps / 150 ms RTT link
// modelled at request level as 1.6 Mbps x 0.9 down, 750 kbps x 0.9 up and
// 150 ms x 3.75 = 562.5 ms request latency.
export const NETWORK_PRESETS = {
  slow4g: { name: 'DevTools "Slow 4G" (1.6 Mbps / 150 ms RTT, request-level: 1.44 Mbps, 562.5 ms)', latency: 562.5, downloadThroughput: (1.6 * 1e6 / 8) * 0.9, uploadThroughput: (750 * 1e3 / 8) * 0.9 },
  'slow4g-raw': { name: '1.6 Mbps / 150 ms request latency (literal, optimistic)', latency: 150, downloadThroughput: 1.6 * 1e6 / 8, uploadThroughput: 750 * 1e3 / 8 },
  fast4g: { name: 'DevTools "Fast 4G" (9 Mbps / 60 ms RTT, request-level: 8.1 Mbps, 165 ms)', latency: 165, downloadThroughput: (9 * 1e6 / 8) * 0.9, uploadThroughput: (1.5 * 1e6 / 8) * 0.9 },
};

export function makeProfiles(net = 'slow4g') {
  const preset = NETWORK_PRESETS[net] || NETWORK_PRESETS.slow4g;
  return {
    desktop: {
      name: 'desktop',
      viewport: { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false },
      cpuSlowdown: 1,
      network: null,
      timeoutMs: 90000,
      quietMs: 5000,
      description: '1600x900 @1x, no CPU or network throttling',
    },
    mobile: {
      name: 'mobile',
      viewport: { width: 412, height: 915, deviceScaleFactor: 2.625, mobile: true },
      cpuSlowdown: 4,
      network: { key: net, ...preset },
      timeoutMs: 300000,
      quietMs: 5000,
      description: `412x915 @2.625x, touch, mobile UA, CPU 4x slowdown, ${preset.name}`,
    },
  };
}

// ---------------------------------------------------------------- in-page observer
// Injected before any page script. Collects paint/LCP/CLS/long tasks/marks and
// detects a preloader overlay (fixed, >=90% of the viewport, z-index >= 50,
// opacity >= 0.5, topmost at the viewport centre) plus body scroll lock.
export const OBSERVER_SRC = `(() => {
  if (window.__ux) return;
  try { performance.setResourceTimingBufferSize(5000); } catch (e) {}
  const ux = { fcp: null, fp: null, lcp: null, lcpSize: 0, lcpUrl: null, lcpEl: null, shifts: [], longtasks: [], marks: [],
    overlay: { seenAt: null, goneAt: null, desc: null }, lock: { seenAt: null, unlockedAt: null }, polls: 0 };
  window.__ux = ux;
  const describe = (el) => {
    if (!el || !el.tagName) return null;
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    if (typeof el.className === 'string' && el.className.trim()) s += '.' + el.className.trim().split(/\\s+/).slice(0, 3).join('.');
    const src = el.currentSrc || el.src;
    if (src) s += ' src=' + String(src).replace(location.origin, '').slice(0, 120);
    return s.slice(0, 220);
  };
  const po = (type, cb) => { try { new PerformanceObserver((l) => cb(l.getEntries())).observe({ type, buffered: true }); } catch (e) {} };
  po('paint', (es) => { for (const e of es) { if (e.name === 'first-contentful-paint') ux.fcp = e.startTime; else if (e.name === 'first-paint') ux.fp = e.startTime; } });
  po('largest-contentful-paint', (es) => { for (const e of es) { ux.lcp = e.startTime; ux.lcpSize = e.size; ux.lcpUrl = e.url ? e.url.replace(location.origin, '') : null; ux.lcpEl = describe(e.element); } });
  po('layout-shift', (es) => { for (const e of es) ux.shifts.push([e.startTime, e.value, e.hadRecentInput ? 1 : 0]); });
  po('longtask', (es) => { for (const e of es) ux.longtasks.push([e.startTime, e.duration]); });
  po('mark', (es) => { for (const e of es) ux.marks.push([e.name, e.startTime]); });
  const SEL = '[data-preloader],#preloader,.preloader,[class*="preloader" i]';
  const visibleCover = (el, w, h) => {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.5) return false;
    const r = el.getBoundingClientRect();
    return r.width >= w * 0.9 && r.height >= h * 0.9 && r.top <= h * 0.05 && r.left <= w * 0.05;
  };
  const overlayEl = () => {
    const w = innerWidth, h = innerHeight;
    if (!document.body || !w || !h) return null;
    for (const el of document.querySelectorAll(SEL)) if (visibleCover(el, w, h)) return el;
    let el = document.elementFromPoint(w / 2, h / 2);
    for (; el && el !== document.documentElement && el !== document.body; el = el.parentElement) {
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed') continue;
      const z = parseInt(cs.zIndex, 10) || 0;
      if (z >= 50 && visibleCover(el, w, h)) return el;
    }
    return null;
  };
  const poll = () => {
    ux.polls++;
    const now = performance.now();
    try {
      if (ux.overlay.goneAt == null) {
        const el = overlayEl();
        if (el && ux.overlay.seenAt == null) { ux.overlay.seenAt = now; ux.overlay.desc = describe(el); }
        else if (!el && ux.overlay.seenAt != null) ux.overlay.goneAt = now;
      }
      if (document.body && ux.lock.unlockedAt == null) {
        const locked = getComputedStyle(document.body).overflow === 'hidden' || getComputedStyle(document.documentElement).overflow === 'hidden';
        if (locked && ux.lock.seenAt == null) ux.lock.seenAt = now;
        else if (!locked && ux.lock.seenAt != null) ux.lock.unlockedAt = now;
      }
    } catch (e) {}
  };
  ux.timer = setInterval(poll, 100);
  ux.stop = () => { clearInterval(ux.timer); poll(); };
})();`;

const SNAPSHOT_EXPR = `(() => {
  const ux = window.__ux || null;
  if (ux && ux.stop) ux.stop();
  const nav = performance.getEntriesByType('navigation')[0];
  const rt = performance.getEntriesByType('resource').map((e) => [e.name, e.responseEnd]);
  return JSON.stringify({
    ux: ux && { ...ux, timer: undefined, stop: undefined },
    nav: nav ? nav.toJSON() : null,
    rt,
    now: performance.now(),
    domNodes: document.getElementsByTagName('*').length,
    heapMB: performance.memory ? performance.memory.usedJSHeapSize / 1048576 : null,
    title: document.title,
    href: location.href,
  });
})()`;

// Lighthouse-style benchmark index (higher = faster host). Used to describe the
// machine and to detect load from other processes before/after a run.
export const BENCHMARK_EXPR = `(() => {
  function gc() { const start = Date.now(); let it = 0; while (Date.now() - start < 500) { let s = ''; for (let j = 0; j < 10000; j++) s += 'a'; if (s.length === 1) throw new Error('x'); it++; } return Math.round(it / ((Date.now() - start) / 1000)); }
  function nogc() { const a = [], b = []; for (let i = 0; i < 100000; i++) a[i] = b[i] = i; const start = Date.now(); let it = 0; while (it % 10 !== 0 || Date.now() - start < 500) { const s = it % 2 === 0 ? a : b; const t = it % 2 === 0 ? b : a; for (let j = 0; j < s.length; j++) t[j] = s[j]; it++; } return Math.round(it / ((Date.now() - start) / 1000)); }
  return Math.round((gc() + nogc()) / 2);
})()`;

// ---------------------------------------------------------------- helpers
export const TYPES = ['html', 'js', 'css', 'font', 'img', 'atlas', 'media', 'other'];
// Atlases by path: /frame-atlases/... (CRA <img> and Vite fetch() + createImageBitmap,
// content-hashed names) or any image whose path contains "atlas".
const ATLAS_RE = /atlas/i;

function classify(r) {
  let pathname = '';
  try { pathname = new URL(r.url).pathname.toLowerCase(); } catch {}
  const mime = (r.mime || '').toLowerCase();
  const t = r.type || '';
  const isImgExt = /\.(webp|avif|png|jpe?g|gif|svg|ico)$/.test(pathname);
  if (ATLAS_RE.test(pathname) && (mime.startsWith('image/') || isImgExt)) return 'atlas';
  if (t === 'Document' || mime.includes('text/html')) return 'html';
  if (t === 'Script' || mime.includes('javascript')) return 'js';
  if (t === 'Stylesheet' || mime.includes('text/css')) return 'css';
  if (t === 'Font' || mime.startsWith('font/') || /\.(woff2?|ttf|otf|eot)$/.test(pathname)) return 'font';
  if (t === 'Image' || mime.startsWith('image/') || isImgExt) return 'img';
  if (t === 'Media' || mime.startsWith('video/') || mime.startsWith('audio/')) return 'media';
  return 'other';
}

const EXCLUDE_FROM_QUIET = new Set(['WebSocket', 'EventSource', 'Media', 'Ping', 'CSPViolationReport']);

function median(values) {
  const v = values.filter((x) => typeof x === 'number' && Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

function clsFromShifts(shifts) {
  let best = 0, cur = 0, winStart = -Infinity, last = -Infinity;
  for (const [t, v, input] of shifts.slice().sort((a, b) => a[0] - b[0])) {
    if (input) continue;
    if (t - last > 1000 || t - winStart > 5000) { cur = 0; winStart = t; }
    cur += v; last = t;
    if (cur > best) best = cur;
  }
  return best;
}

// Lighthouse-style TTI: first 5 s window after FCP with no long task and <= 2
// in-flight GET requests; TTI is the end of the last long task before it (or FCP).
function computeTti(fcp, longtasks, intervals, windowEnd) {
  if (fcp == null) return { tti: null, reached: false };
  const tasks = longtasks.map(([s, d]) => [s, s + d]).sort((a, b) => a[0] - b[0]);
  // A quiet window can start at FCP, at the end of a long task, or when a
  // request finishes (in-flight count drops).
  const candidates = [...new Set([fcp, ...tasks.map(([, e]) => e), ...intervals.map(([, e]) => e)])]
    .filter((t) => Number.isFinite(t) && t >= fcp).sort((a, b) => a - b);
  const busyAt = (t) => { let n = 0; for (const [s, e] of intervals) if (s <= t && t < e) n++; return n; };
  for (const c of candidates) {
    const end = c + 5000;
    if (end > windowEnd) break;
    if (tasks.some(([s, e]) => s < end && e > c)) continue;
    let ok = true;
    for (let t = c; t <= end; t += 50) if (busyAt(t) > 2) { ok = false; break; }
    if (!ok) continue;
    let tti = fcp;
    for (const [, e] of tasks) if (e <= c && e > tti) tti = e;
    return { tti, reached: true };
  }
  return { tti: null, reached: false };
}

function tbtBetween(longtasks, from, to) {
  let tbt = 0;
  for (const [s, d] of longtasks) {
    const e = s + d;
    if (e <= from || s >= to) continue;
    // Only the portion after FCP counts; clip like Lighthouse.
    const clippedStart = Math.max(s, from);
    const clippedEnd = Math.min(e, to);
    const blocking = (clippedEnd - clippedStart) - 50;
    if (blocking > 0) tbt += blocking;
  }
  return tbt;
}

function cpuTimes() {
  let idle = 0, total = 0;
  for (const c of os.cpus()) { for (const v of Object.values(c.times)) total += v; idle += c.times.idle; }
  return { idle, total };
}

async function emulateNetwork(s, net) {
  if (!net) return;
  const params = { offline: false, latency: net.latency, downloadThroughput: net.downloadThroughput, uploadThroughput: net.uploadThroughput };
  try {
    await s.send('Network.emulateNetworkConditions', params);
  } catch {
    await s.send('Network.emulateNetworkConditionsByRule', { matchedNetworkConditions: [{ urlPattern: '', latency: net.latency, downloadThroughput: net.downloadThroughput, uploadThroughput: net.uploadThroughput }] });
  }
}

export function userAgents(browserUA, browserVersion) {
  const major = (/Chrome\/(\d+)/.exec(browserVersion || '') || [])[1] || '154';
  return {
    desktop: (browserUA || '').replace('HeadlessChrome', 'Chrome'),
    mobile: `Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Mobile Safari/537.36`,
    major,
  };
}

async function applyProfile(s, profile, uas) {
  const v = profile.viewport;
  await s.send('Emulation.setDeviceMetricsOverride', { width: v.width, height: v.height, deviceScaleFactor: v.deviceScaleFactor, mobile: v.mobile, screenWidth: v.width, screenHeight: v.height });
  const brands = [{ brand: 'Chromium', version: uas.major }, { brand: 'Google Chrome', version: uas.major }, { brand: 'Not=A?Brand', version: '24' }];
  if (v.mobile) {
    await s.send('Emulation.setUserAgentOverride', { userAgent: uas.mobile, platform: 'Linux armv8l', userAgentMetadata: { brands, platform: 'Android', platformVersion: '14.0.0', architecture: '', model: 'Pixel 7', mobile: true } });
    await s.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  } else if (uas.desktop) {
    await s.send('Emulation.setUserAgentOverride', { userAgent: uas.desktop });
  }
  if (profile.cpuSlowdown > 1) await s.send('Emulation.setCPUThrottlingRate', { rate: profile.cpuSlowdown });
  await emulateNetwork(s, profile.network);
}

// ---------------------------------------------------------------- one visit
// Opens a new tab in `contextId`, navigates to origin+route under `profile`,
// waits for the observation window to end and returns flat metrics.
export async function measureVisit(cdp, { contextId, origin, route, profile, uas, isLanding, thirdParty = 'live', log = () => {} }) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank', browserContextId: contextId });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const s = cdp.session(sessionId);
  const reqs = new Map();
  const rawStatus = new Map();
  const hops = [];
  let docId = null;
  let loadTs = null, dclTs = null;
  let lastBusyWall = Date.now();
  let loadWall = null;
  const pageOrigin = new URL(origin).origin;

  try {
    await s.send('Page.enable');
    await s.send('Network.enable');
    await s.send('Runtime.enable');
    await applyProfile(s, profile, uas);
    if (thirdParty === 'block') {
      // First-party-only mode: every https request is third-party when the
      // site is served from http://127.0.0.1 or http://localhost.
      if (pageOrigin.startsWith('https:')) throw new Error('--third-party=block needs an http:// origin');
      try { await s.send('Network.setBlockedURLs', { urls: ['https://*'] }); } catch { await s.send('Network.setBlockedURLs', { urlPatterns: [{ urlPattern: 'https://*', block: true }] }); }
    }
    await s.send('Page.addScriptToEvaluateOnNewDocument', { source: OBSERVER_SRC });

    s.on('Network.requestWillBeSent', (p) => {
      if (!/^https?:/.test(p.request.url)) return;
      const existing = reqs.get(p.requestId);
      if (existing && p.redirectResponse) {
        hops.push({ url: existing.url, type: existing.type, status: p.redirectResponse.status, mime: p.redirectResponse.mimeType, start: existing.start, end: p.timestamp, bytes: p.redirectResponse.encodedDataLength || 0, thirdParty: existing.thirdParty, redirect: true });
        existing.url = p.request.url;
        existing.start = p.timestamp;
        return;
      }
      let thirdParty = false;
      try { thirdParty = new URL(p.request.url).origin !== pageOrigin; } catch {}
      const r = { url: p.request.url, method: p.request.method, type: p.type, start: p.timestamp, end: null, failed: false, status: null, mime: null, cached: false, bytes: 0, chunks: [], thirdParty, timing: null };
      reqs.set(p.requestId, r);
      if (!docId && p.type === 'Document') docId = p.requestId;
      lastBusyWall = Date.now();
    });
    s.on('Network.requestServedFromCache', (p) => { const r = reqs.get(p.requestId); if (r) r.cached = true; });
    // Raw wire status: a successful revalidation is reported as 200 in
    // responseReceived but as 304 here.
    s.on('Network.responseReceivedExtraInfo', (p) => { rawStatus.set(p.requestId, p.statusCode); });
    s.on('Network.responseReceived', (p) => {
      const r = reqs.get(p.requestId);
      if (!r) return;
      r.status = p.response.status;
      r.mime = p.response.mimeType;
      r.type = p.type || r.type;
      r.timing = p.response.timing || null;
      r.protocol = p.response.protocol;
      r.respTs = p.timestamp;
      if (p.response.fromDiskCache || p.response.fromPrefetchCache || p.response.fromServiceWorker || p.response.fromEarlyHints) r.cached = true;
      lastBusyWall = Date.now();
    });
    s.on('Network.dataReceived', (p) => {
      const r = reqs.get(p.requestId);
      // Encoded (wire) bytes only. Chrome reports many chunks with
      // encodedDataLength 0 and batches the wire bytes into other chunks, so
      // falling back to the decoded dataLength would over-count.
      if (r) r.chunks.push([p.timestamp, p.encodedDataLength || 0]);
      lastBusyWall = Date.now();
    });
    s.on('Network.loadingFinished', (p) => {
      const r = reqs.get(p.requestId);
      if (!r) return;
      r.end = p.timestamp;
      r.bytes = r.cached ? 0 : (p.encodedDataLength || 0);
      lastBusyWall = Date.now();
    });
    s.on('Network.loadingFailed', (p) => {
      const r = reqs.get(p.requestId);
      if (!r) return;
      r.end = p.timestamp;
      r.failed = true;
      r.errorText = p.errorText;
      r.canceled = !!p.canceled;
      r.blocked = p.blockedReason || null;
      r.bytes = r.chunks.reduce((a, [, n]) => a + n, 0);
      lastBusyWall = Date.now();
    });
    s.on('Page.loadEventFired', (p) => { if (loadTs == null) { loadTs = p.timestamp; loadWall = Date.now(); } });
    s.on('Page.domContentEventFired', (p) => { if (dclTs == null) dclTs = p.timestamp; });

    const cpu0 = cpuTimes();
    const wall0 = Date.now();
    const nav = await s.send('Page.navigate', { url: origin + route });
    if (nav.errorText) throw new Error(`navigate ${route}: ${nav.errorText}`);

    // ---- observation window
    // Ends when: load fired, no request in flight for quietMs, no long task
    // in the last 5 s (so Lighthouse-style TTI is computable; given up after
    // CPU_QUIET_MAX_MS of network quiet), and on "/" no preloader overlay.
    let timedOut = false;
    const minAfterLoadMs = 1500;
    const CPU_QUIET_MAX_MS = 20000;
    let netQuietSince = null;
    for (;;) {
      await sleep(250);
      const now = Date.now();
      if (now - wall0 > profile.timeoutMs) { timedOut = true; break; }
      if (loadWall == null) continue;
      let inflight = 0;
      for (const r of reqs.values()) if (r.end == null && !EXCLUDE_FROM_QUIET.has(r.type)) inflight++;
      if (inflight > 0) { lastBusyWall = now; netQuietSince = null; continue; }
      if (now - lastBusyWall < profile.quietMs || now - loadWall < minAfterLoadMs) continue;
      if (netQuietSince == null) netQuietSince = now;
      const { result } = await s.send('Runtime.evaluate', {
        expression: `JSON.stringify(window.__ux ? { ov: window.__ux.overlay, lt: window.__ux.longtasks.length ? window.__ux.longtasks[window.__ux.longtasks.length - 1] : null, now: performance.now() } : null)`,
        returnByValue: true,
      });
      const st = result && result.value ? JSON.parse(result.value) : null;
      // A preloader overlay still covering the page means "not ready yet".
      if (isLanding && st && st.ov && st.ov.seenAt != null && st.ov.goneAt == null) continue;
      if (st && st.lt && st.now - (st.lt[0] + st.lt[1]) < 5000 && now - netQuietSince < CPU_QUIET_MAX_MS) continue;
      break;
    }
    const cpu1 = cpuTimes();
    const { result: snap } = await s.send('Runtime.evaluate', { expression: SNAPSHOT_EXPR, returnByValue: true });
    const page = JSON.parse(snap.value);
    const wallMs = Date.now() - wall0;

    // ---- clock alignment: CDP monotonic seconds -> page performance.now() ms
    const doc = docId ? reqs.get(docId) : null;
    const navE = page.nav || {};
    let off = 0;
    if (doc && doc.timing && navE.requestStart > 0) off = navE.requestStart - (doc.timing.requestTime * 1000 + doc.timing.sendStart);
    else if (doc) off = (navE.fetchStart || 0) - doc.start * 1000;
    const toPage = (ts) => (ts == null ? null : ts * 1000 + off);
    const windowEnd = page.now;

    // Skew check against Resource Timing (median |RT.responseEnd - CDP finish|).
    const rtByUrl = new Map();
    for (const [name, end] of page.rt) rtByUrl.set(name, rtByUrl.has(name) ? null : end);
    const skews = [];
    for (const r of reqs.values()) {
      const e = rtByUrl.get(r.url);
      if (e && r.end && !r.failed) skews.push(Math.abs(e - toPage(r.end)));
    }

    // ---- network aggregation (redirect hops count as requests)
    const all = [...hops.map((h) => ({ ...h, chunks: [], cached: false, failed: false })), ...reqs.values()];
    const loadMs = navE.loadEventEnd > 0 ? navE.loadEventEnd : toPage(loadTs);
    const bytesUntil = (T) => {
      let bytes = 0, count = 0;
      for (const r of all) {
        if (toPage(r.start) > T) continue;
        count++;
        if (r.end != null && toPage(r.end) <= T) bytes += r.bytes;
        else if (!r.cached) for (const [ts, n] of r.chunks) if (toPage(ts) <= T) bytes += n;
      }
      return { bytes, count };
    };
    // Bytes of still-in-flight requests at window end = what was received so far.
    for (const r of all) if (r.end == null) r.bytes = r.cached ? 0 : r.chunks.reduce((a, [, n]) => a + n, 0);

    const m = {
      route, profile: profile.name, url: origin + route, finalPath: (() => { try { return new URL(page.href).pathname; } catch { return null; } })(),
      docStatus: doc ? doc.status : null,
      docRedirects: hops.filter((h) => h.type === 'Document').length,
      timedOut, windowMs: Math.round(windowEnd), wallMs,
    };
    // TTFB from the CDP response event: Navigation Timing's responseStart does
    // not include DevTools' emulated latency, the CDP event does.
    m.ttfb = doc && doc.respTs != null ? toPage(doc.respTs) : navE.responseStart > 0 ? navE.responseStart : null;
    m.domContentLoaded = navE.domContentLoadedEventEnd > 0 ? navE.domContentLoadedEventEnd : toPage(dclTs);
    m.load = loadMs ?? null;
    const ux = page.ux || {};
    m.fcp = ux.fcp ?? null;
    m.lcp = ux.lcp ?? null;
    m.lcpElement = ux.lcpEl ?? null;
    m.lcpUrl = ux.lcpUrl ?? null;
    m.cls = +clsFromShifts(ux.shifts || []).toFixed(4);
    const longtasks = ux.longtasks || [];
    m.longTaskCount = longtasks.length;
    m.longTaskMs = Math.round(longtasks.reduce((a, [, d]) => a + d, 0));
    const intervals = all.filter((r) => r.method !== 'POST' && !EXCLUDE_FROM_QUIET.has(r.type)).map((r) => [toPage(r.start), r.end == null ? Infinity : toPage(r.end)]);
    const { tti, reached } = computeTti(m.fcp, longtasks, intervals, windowEnd);
    m.tti = tti;
    m.ttiReached = reached;
    m.tbt = m.fcp == null ? null : Math.round(tbtBetween(longtasks, m.fcp, reached ? tti : windowEnd));

    // ---- landing readiness
    const atlases = all.filter((r) => classify(r) === 'atlas' && !r.redirect);
    const atlasDone = atlases.filter((r) => r.end != null && !r.failed);
    m.atlasCount = atlases.length;
    m.atlasBytes = atlases.reduce((a, r) => a + r.bytes, 0);
    m.atlasInFlightAtEnd = atlases.filter((r) => r.end == null).length;
    m.atlasFirst = atlasDone.length ? Math.round(Math.min(...atlasDone.map((r) => toPage(r.end)))) : null;
    m.atlasLast = atlasDone.length && m.atlasInFlightAtEnd === 0 ? Math.round(Math.max(...atlasDone.map((r) => toPage(r.end)))) : null;
    const readyMark = (ux.marks || []).find(([name]) => /ready/i.test(name));
    m.readyMark = readyMark ? readyMark[1] : null;
    m.readyMarkName = readyMark ? readyMark[0] : null;
    m.overlaySeen = ux.overlay ? ux.overlay.seenAt != null : false;
    m.overlayDesc = ux.overlay ? ux.overlay.desc : null;
    m.overlayGone = ux.overlay && ux.overlay.seenAt != null ? ux.overlay.goneAt : null;
    m.scrollUnlocked = ux.lock && ux.lock.seenAt != null ? ux.lock.unlockedAt : null;
    if (isLanding) {
      if (m.readyMark != null) { m.ready = m.readyMark; m.readySource = `performance.mark(${m.readyMarkName})`; }
      else if (m.overlaySeen) { m.ready = m.overlayGone; m.readySource = 'preloader overlay hidden'; }
      else if (ux.lock && ux.lock.seenAt != null) { m.ready = m.scrollUnlocked; m.readySource = 'body scroll unlocked'; }
      else if (m.atlasCount) { m.ready = m.atlasLast; m.readySource = 'all requested atlases loaded (no preloader on page)'; }
      else { m.ready = m.load; m.readySource = 'load event (no preloader, no atlases)'; }
    }

    const atLoad = m.load != null ? bytesUntil(m.load) : { bytes: null, count: null };
    m.reqLoad = atLoad.count;
    m.bytesLoad = atLoad.bytes;
    if (isLanding && m.ready != null) {
      const atReady = bytesUntil(m.ready);
      m.reqReady = atReady.count;
      m.bytesReady = atReady.bytes;
    }
    m.reqTotal = all.length;
    m.bytesTotal = all.reduce((a, r) => a + r.bytes, 0);
    const third = all.filter((r) => r.thirdParty);
    m.req3p = third.length;
    m.bytes3p = third.reduce((a, r) => a + r.bytes, 0);
    m.cachedReq = all.filter((r) => r.cached).length;
    for (const [id, r] of reqs) if (rawStatus.has(id)) r.wireStatus = rawStatus.get(id);
    m.revalidated304 = all.filter((r) => r.wireStatus === 304 || r.status === 304).length;
    // Failures the page did not cause itself (canceled = aborted by the page, e.g. img.src = '').
    const netFailed = all.filter((r) => r.failed && !r.canceled && !r.blocked);
    m.blockedReq = all.filter((r) => r.blocked).length;
    m.failedReq = netFailed.length;
    m.failedFirstParty = netFailed.filter((r) => !r.thirdParty).length;
    m.failedErrors = [...new Set(netFailed.map((r) => r.errorText))].join(', ') || null;
    m.canceledReq = all.filter((r) => r.failed && r.canceled).length;
    m.httpErrors = all.filter((r) => r.status >= 400 && r !== doc).length;
    for (const t of TYPES) { m[`bytes_${t}`] = 0; m[`req_${t}`] = 0; m[`bytesLoad_${t}`] = 0; }
    for (const r of all) {
      const t = classify(r);
      m[`bytes_${t}`] += r.bytes;
      m[`req_${t}`] += 1;
      if (m.load != null && r.end != null && toPage(r.end) <= m.load) m[`bytesLoad_${t}`] += r.bytes;
    }
    m.domNodes = page.domNodes;
    m.heapMB = page.heapMB != null ? +page.heapMB.toFixed(1) : null;
    m.hostCpuBusyPct = +((1 - (cpu1.idle - cpu0.idle) / Math.max(1, cpu1.total - cpu0.total)) * 100).toFixed(1);
    m.clockSkewMs = skews.length ? +median(skews).toFixed(1) : null;
    for (const k of ['ttfb', 'domContentLoaded', 'load', 'fcp', 'lcp', 'tti', 'ready', 'readyMark', 'overlayGone', 'scrollUnlocked']) if (typeof m[k] === 'number') m[k] = Math.round(m[k]);
    m.requests = all.map((r) => ({ url: r.url.replace(pageOrigin, ''), type: classify(r), status: r.wireStatus ?? r.status, bytes: r.bytes, cached: r.cached || undefined, failed: r.failed ? (r.blocked ? 'blocked:' + r.blocked : r.canceled ? 'canceled' : r.errorText || true) : undefined, start: Math.round(toPage(r.start)), end: r.end == null ? null : Math.round(toPage(r.end)) }));
    log(m);
    return m;
  } finally {
    s.dispose();
    try { await cdp.send('Target.closeTarget', { targetId }); } catch {}
  }
}

// ---------------------------------------------------------------- stats
export function aggregate(runs) {
  const keys = new Set();
  for (const r of runs) for (const [k, v] of Object.entries(r)) if (typeof v === 'number') keys.add(k);
  const med = {}, min = {}, max = {}, n = {};
  for (const k of keys) {
    const vals = runs.map((r) => r[k]).filter((v) => typeof v === 'number' && Number.isFinite(v));
    n[k] = vals.length;
    if (!vals.length) { med[k] = min[k] = max[k] = null; continue; }
    med[k] = median(vals);
    min[k] = Math.min(...vals);
    max[k] = Math.max(...vals);
  }
  // Non-numeric descriptors: most common value.
  for (const k of ['lcpElement', 'lcpUrl', 'readySource', 'overlayDesc', 'finalPath', 'readyMarkName']) {
    const counts = new Map();
    for (const r of runs) if (r[k] != null) counts.set(r[k], (counts.get(r[k]) || 0) + 1);
    med[k] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }
  med.timedOutRuns = runs.filter((r) => r.timedOut).length;
  med.ttiReachedRuns = runs.filter((r) => r.ttiReached).length;
  med.errorRuns = runs.filter((r) => r.error).length;
  med.okRuns = runs.length - med.errorRuns;
  return { median: med, min, max, n };
}
