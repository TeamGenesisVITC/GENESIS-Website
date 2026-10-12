// scripts/perf/scroll.mjs — scroll-smoothness benchmark for the Genesis landing page.
//
// Scrolls inside each landing section with real compositor scroll gestures
// (Input.synthesizeScrollGesture, the same input path as a wheel/touchpad) and reads what was
// actually presented from the Chrome trace (Display::FrameDisplayed, ScrollJankV4,
// EventLatency, renderer main thread). Repeated, randomized runs; a plain calibration page
// is measured in the same session as the ceiling.
//
// Usage:
//   node scripts/perf/scroll.mjs [--dir=dist/client | --url=http://localhost:4173] [--label=name]
//     [--runs=5] [--sections=hero,theses,canvas,team,footer] [--no-calibration] [--no-warmup]
//     [--headless] [--viewport=1440x900] [--dpr=<n>] [--speed=1500] [--distance=1500|full]
//     [--align=center|start] [--source=mouse|touch] [--trace=full|lean] [--seed=<n>]
//     [--settle=800] [--path=/] [--query=?x=1] [--no-scstats]
//     [--css='<css>' [--css-check='selector|property|expected[;;...]']] [--block='<url glob>[,...]']
//     [--port=8123] [--cdp-port=9333] [--out=path.json] [--keep-traces]
//     [--gpu-quiet=<pct> [--gpu-quiet-wait=<s>]]   (Windows: wait for an idle GPU before each run)
//   node scripts/perf/scroll.mjs --compare <before.json> <after.json> [--out=report.md]
//   node scripts/perf/scroll.mjs --render=<result.json>          (re-render the .md)
// Results: scripts/perf/results/<label>.json + <label>.md (see README "Scroll smoothness").

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { CDP, launchChrome, httpJson, sleep } from './lib/cdp.mjs';
import { parseArgs, resolveTarget, gitInfo, CDP_PORT_DEFAULT, ROOT } from './lib/target.mjs';
import { startCalibrationServer } from './lib/calibration.mjs';
import { TRACE_CATEGORIES, traceDuring, scrollGesture, analyzeScrollTrace, summarize, SCROLL_METRICS } from './lib/scroll-trace.mjs';
import { SCROLL_SCHEMA, scrollMarkdown, compareScrollMarkdown } from './lib/scroll-report.mjs';

const RESULTS_DIR = path.join(ROOT, 'scripts', 'perf', 'results');
const args = parseArgs();
const log = (...a) => process.stderr.write(a.join(' ') + '\n');

// ---------------------------------------------------------------- compare / render modes
function loadResult(p) {
  const r = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (r.schema !== SCROLL_SCHEMA) throw new Error(`${p}: not a scroll.mjs result (schema ${r.schema})`);
  return r;
}
function writeOut(md, out) {
  if (typeof out === 'string') {
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    fs.writeFileSync(out, md);
    log(`wrote ${out}`);
  }
  process.stdout.write(md + '\n');
}
if (args.compare) {
  const files = [typeof args.compare === 'string' ? args.compare : null, ...args._].filter(Boolean);
  if (files.length !== 2) { console.error('usage: node scripts/perf/scroll.mjs --compare <before.json> <after.json> [--out=report.md]'); process.exit(2); }
  writeOut(compareScrollMarkdown(loadResult(files[0]), loadResult(files[1])), args.out);
  process.exit(0);
}
if (typeof args.render === 'string') {
  const r = loadResult(args.render);
  const md = scrollMarkdown(r);
  fs.writeFileSync(args.render.replace(/\.json$/, '.md'), md);
  process.stdout.write(md + '\n');
  process.exit(0);
}

// ---------------------------------------------------------------- options
const DEFAULT_SECTIONS = ['hero', 'theses', 'canvas', 'team', 'footer'];
const opt = {
  runs: Math.max(1, parseInt(args.runs, 10) || 5),
  sections: typeof args.sections === 'string' ? args.sections.split(',').map((s) => s.trim()).filter(Boolean) : DEFAULT_SECTIONS,
  calibration: !args['no-calibration'],
  warmup: !args['no-warmup'],
  headless: !!args.headless,
  viewport: typeof args.viewport === 'string' ? args.viewport : '1440x900',
  dpr: args.dpr ? parseFloat(args.dpr) : null,
  speed: parseInt(args.speed, 10) || 1500,
  distance: args.distance === 'full' ? 'full' : parseInt(args.distance, 10) || 1500,
  align: args.align === 'start' ? 'start' : 'center',
  source: args.source === 'touch' ? 'touch' : 'mouse',
  trace: args.trace === 'lean' ? 'lean' : 'full',
  seed: args.seed != null ? parseInt(args.seed, 10) >>> 0 : (Date.now() % 2147483647) >>> 0,
  settleMs: args.settle != null ? parseInt(args.settle, 10) : 800,
  path: typeof args.path === 'string' ? args.path : '/',
  query: typeof args.query === 'string' ? args.query : '',
  // ?scstats makes ScrollCanvas count its draws on window.__sc (a few integer increments per
  // draw); the counters are snapshotted around every gesture. --no-scstats leaves the URL alone.
  scstats: !args['no-scstats'],
  css: typeof args.css === 'string' ? args.css : null,
  cssCheck: typeof args['css-check'] === 'string' ? args['css-check'] : null,
  block: typeof args.block === 'string' ? args.block.split(',').map((s) => s.trim()).filter(Boolean) : [],
  keepTraces: !!args['keep-traces'],
  // Before every measured run, wait (up to gpuQuietWaitS) until all other processes together use
  // at most this many % of the GPU's 3D engine. null = don't wait (the load is still recorded).
  gpuQuiet: args['gpu-quiet'] != null ? parseFloat(args['gpu-quiet']) : null,
  gpuQuietWaitS: parseInt(args['gpu-quiet-wait'], 10) || 300,
};
opt.categories = TRACE_CATEGORIES[opt.trace];
const [VW, VH] = opt.viewport.split('x').map((n) => parseInt(n, 10));
if (!VW || !VH) throw new Error(`--viewport must look like 1440x900 (got ${opt.viewport})`);
const KNOWN_SECTIONS = ['hero', 'theses', 'canvas', 'projects', 'team', 'footer'];
const unknown = opt.sections.filter((s) => !KNOWN_SECTIONS.includes(s));
if (unknown.length) throw new Error(`unknown section(s) ${unknown.join(', ')} (known: ${KNOWN_SECTIONS.join(', ')})`);
if (opt.cssCheck && !opt.css) throw new Error('--css-check needs --css');
const cdpPort = parseInt(args['cdp-port'], 10) || CDP_PORT_DEFAULT;
const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
const label = typeof args.label === 'string' ? args.label : `scroll-${stamp}`;

// ---------------------------------------------------------------- page-side helpers
// Section boxes in document coordinates. hero/theses/canvas/projects/footer are plain
// elements; the team section is pinned by GSAP, so its scroll length is the pin-spacer's.
const SECTION_FINDER = `(() => {
  const $ = (s) => document.querySelector(s);
  const box = (els) => {
    els = els.filter(Boolean);
    if (!els.length) return null;
    let top = Infinity, bottom = -Infinity;
    for (const el of els) { const r = el.getBoundingClientRect(); top = Math.min(top, r.top + scrollY); bottom = Math.max(bottom, r.bottom + scrollY); }
    return { top: Math.round(top), bottom: Math.round(bottom) };
  };
  const team = $('#team-section');
  const teamPin = team && team.parentElement && team.parentElement.classList.contains('pin-spacer') ? team.parentElement : null;
  const sh = document.documentElement.scrollHeight;
  return {
    vw: innerWidth, vh: innerHeight, dpr: devicePixelRatio, scrollHeight: sh, maxScroll: Math.max(0, sh - innerHeight), scrollY,
    teamPinned: !!teamPin,
    sections: {
      hero: box([$('#hero-section')]),
      theses: box([$('#origins-section'), $('#vision-section')]),
      canvas: box([$('#flagship-section')]),
      projects: box([$('#projects-pipeline')]),
      team: box([teamPin || team]),
      footer: box([$('#invest-section'), $('footer')]),
    },
  };
})()`;

const PAGE_STATE = `(() => { const sh = document.documentElement.scrollHeight; return { vw: innerWidth, vh: innerHeight, dpr: devicePixelRatio, scrollHeight: sh, maxScroll: Math.max(0, sh - innerHeight), scrollY, visibility: document.visibilityState, focused: document.hasFocus() }; })()`;

// window.__sc (ScrollCanvas counters, only with ?scstats): numbers only, so deltas are easy.
const SC_STATE = `(() => { const s = window.__sc; if (!s) return null; const o = {}; for (const [k, v] of Object.entries(s)) if (typeof v === 'number') o[k] = v; return o; })()`;
// Counters that accumulate (a delta over the gesture is meaningful); the rest are levels.
const SC_COUNTERS = ['draws', 'missA', 'blank', 'retries', 'failed', 'loaded'];

function scDelta(before, after) {
  if (!before || !after) return null;
  const d = {};
  for (const k of SC_COUNTERS) if (typeof after[k] === 'number') d[k] = after[k] - (before[k] ?? 0);
  // Levels after the gesture: decoded atlases now / peak, compressed atlases held.
  for (const k of ['current', 'resident', 'downloaded']) if (typeof after[k] === 'number') d[k] = after[k];
  return d;
}

// performance.mark('genesis:ready') = the landing is usable (critical atlases decoded, or the
// loader's timeout). Resolves with the mark's time (ms since navigation start) or null.
const READY_MARK = `new Promise((resolve) => {
  const t0 = performance.now();
  const check = () => {
    const m = performance.getEntriesByName('genesis:ready', 'mark')[0];
    if (m) return resolve(Math.round(m.startTime));
    if (performance.now() - t0 > 20000) return resolve(null);
    setTimeout(check, 100);
  };
  check();
})`;

// Scroll range in which the viewport shows the section: when the section is at least
// 600 px taller than the viewport, the range where it fills the viewport; otherwise the
// range where it covers the viewport's centre line. Clamped to the document.
const MIN_FILL_RANGE = 600;
function sectionRange(box, vh, maxScroll) {
  const h = box.bottom - box.top;
  const clamp = (v) => Math.max(0, Math.min(maxScroll, Math.round(v)));
  if (h - vh >= MIN_FILL_RANGE) return { start: clamp(box.top), end: clamp(box.bottom - vh), rule: 'fills viewport' };
  return { start: clamp(box.top - vh / 2), end: clamp(box.bottom - vh / 2), rule: 'covers viewport centre' };
}

function placeGesture(range) {
  const len = range.end - range.start;
  const dist = opt.distance === 'full' ? len : Math.min(opt.distance, len);
  const startY = opt.align === 'start' ? range.start : Math.round(range.start + (len - dist) / 2);
  return { startY, dist };
}

const evaluate = async (s, expression, awaitPromise = false) => {
  const r = await s.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise });
  if (r.exceptionDetails) throw new Error(`page evaluate failed: ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
  return r.result.value;
};
const nextFrames = (s) => evaluate(s, 'new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))', true);

// Network idle tracker for one tab session.
function trackNetwork(s) {
  const inflight = new Set();
  let lastChange = Date.now();
  const touch = () => { lastChange = Date.now(); };
  s.on('Network.requestWillBeSent', (p) => { if (!p.request.url.startsWith('data:')) { inflight.add(p.requestId); touch(); } });
  s.on('Network.loadingFinished', (p) => { if (inflight.delete(p.requestId)) touch(); });
  s.on('Network.loadingFailed', (p) => { if (inflight.delete(p.requestId)) touch(); });
  return {
    reset() { inflight.clear(); touch(); },
    async idle({ quietMs = 500, timeoutMs = 15000 } = {}) {
      const t0 = Date.now();
      while (Date.now() - t0 < timeoutMs) {
        if (inflight.size === 0 && Date.now() - lastChange >= quietMs) return { idle: true, waitedMs: Date.now() - t0 };
        await sleep(100);
      }
      return { idle: false, inflight: inflight.size, waitedMs: Date.now() - t0 };
    },
  };
}

function globToRegex(glob) {
  return new RegExp('^' + glob.split('*').map((p) => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
}

// --css-check 'selector|property|expected' (several separated by ';;'): computed-style asserts.
function cssCheckExpr(spec) {
  const checks = spec.split(';;').map((c) => c.split('|').map((x) => x.trim())).filter((c) => c.length === 3);
  if (!checks.length) throw new Error(`--css-check must be 'selector|property|expected' (got ${spec})`);
  return `(() => ${JSON.stringify(checks)}.map(([sel, prop, expected]) => {
    const el = document.querySelector(sel);
    if (!el) return { sel, prop, expected, ok: false, actual: '(no element matches)' };
    const actual = getComputedStyle(el).getPropertyValue(prop).trim();
    return { sel, prop, expected, actual, ok: actual === expected };
  }))()`;
}

function injectCssExpr(css) {
  return `(() => {
    const s = document.createElement('style');
    s.id = '__perf_css_ablation';
    s.textContent = ${JSON.stringify(css)};
    (document.head || document.documentElement).appendChild(s);
    return s.sheet ? s.sheet.cssRules.length : -1;
  })()`;
}

// Other GPU load on the machine (Windows only): 3D-engine utilization per process from the
// "GPU Engine" performance counters, sampled between measurements (~1-2 s, outside any trace).
// On the development laptop a video player and DWM took most of the iGPU during validation;
// without this record such a session just looks like a slow site.
function hostGpuSample() {
  if (process.platform !== 'win32') return null;
  const ps = "$s=(Get-Counter '\\GPU Engine(*engtype_3D)\\Utilization Percentage' -ErrorAction SilentlyContinue).CounterSamples | Where-Object { $_.CookedValue -gt 1 }; foreach ($x in $s) { if ($x.InstanceName -match 'pid_(\\d+)') { $p = Get-Process -Id $Matches[1] -ErrorAction SilentlyContinue; '{0}|{1}' -f $p.Name, [math]::Round($x.CookedValue, 1) } }";
  try {
    const out = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { encoding: 'utf8', timeout: 20000, windowsHide: true });
    const byName = {};
    for (const line of out.split(/\r?\n/)) {
      const [name, util] = line.trim().split('|');
      if (!name || !Number.isFinite(+util)) continue;
      byName[name] = +((byName[name] || 0) + +util).toFixed(1);
    }
    return byName;
  } catch { return null; }
}

// --gpu-quiet: hold a run until the rest of the machine leaves the GPU alone. Counts every process
// except Chrome (this harness's own, idle between runs), DWM included: on the development laptop
// the desktop compositor alone took ~70 % of the iGPU whenever another window was animating, and
// even the calibration page then dropped from 165 to ~50-85 presented fps.
async function waitForQuietGpu() {
  if (opt.gpuQuiet == null || process.platform !== 'win32') return null;
  const t0 = Date.now();
  for (;;) {
    const sample = hostGpuSample();
    if (!sample) return null;
    const other = Object.entries(sample).filter(([name]) => !/^chrome$/i.test(name)).reduce((sum, [, v]) => sum + v, 0);
    const waitedS = Math.round((Date.now() - t0) / 1000);
    if (other <= opt.gpuQuiet) return { waitedS, otherGpu: +other.toFixed(1), timedOut: false };
    if (waitedS >= opt.gpuQuietWaitS) return { waitedS, otherGpu: +other.toFixed(1), timedOut: true };
    await sleep(3000);
  }
}

function cpuTimes() {
  let idle = 0, total = 0;
  for (const c of os.cpus()) { for (const v of Object.values(c.times)) total += v; idle += c.times.idle; }
  return { idle, total };
}

// Seeded shuffle (mulberry32 + Fisher-Yates) so a session's order can be reproduced.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(list, rand) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ---------------------------------------------------------------- main
async function main() {
  const target = await resolveTarget(args, { legacyNoStore: false });
  const cal = opt.calibration ? await startCalibrationServer() : null;
  const query = opt.scstats && !/[?&]scstats\b/.test(opt.query) ? (opt.query ? `${opt.query}&scstats` : '?scstats') : opt.query;
  const landingUrl = `${target.origin}${opt.path}${query}`;
  log(`target: ${landingUrl} (${target.mode}${target.mode === 'dir' ? ` ${target.describe.dir}, not_found=${target.describe.notFoundHandling}` : ''})`);
  if (cal) log(`calibration: ${cal.url}`);

  const extraArgs = [];
  if (opt.dpr) extraArgs.push(`--force-device-scale-factor=${opt.dpr}`);
  const chrome = await launchChrome({ cdpPort, headed: !opt.headless, marker: `genesis-scroll-${process.pid}`, windowSize: `${VW},${VH}`, extraArgs });
  const root = await CDP.connect(chrome.version.webSocketDebuggerUrl);
  const result = {
    schema: SCROLL_SCHEMA,
    label,
    date: new Date().toISOString(),
    git: gitInfo(),
    target: { ...target.describe, url: landingUrl },
    options: { ...opt, cssCheck: opt.cssCheck || undefined },
    env: { browser: chrome.version.Browser },
    rounds: [],
    warmup: [],
    targets: [],
    // Windows GPU-engine 3D utilization per process name, sampled before every round (% of one
    // engine; this harness's own Chrome shows up as "chrome", idle between measurements).
    hostGpu: [],
  };
  let cssVerified = null;
  let traceIndex = 0;
  const traceDir = path.join(RESULTS_DIR, `${label}-traces`);

  try {
    // GPU adapter (browser-level SystemInfo).
    try {
      const info = await root.send('SystemInfo.getInfo');
      const dev = info.gpu?.devices || [];
      const active = dev.find((d) => d.active) || dev[0];
      // The ANGLE renderer string names the adapter Chrome actually renders with (hybrid laptops
      // list both GPUs in devices[]).
      result.env.glRenderer = info.gpu?.auxAttributes?.glRenderer ?? null;
      result.env.gpu = result.env.glRenderer || (active ? `${active.deviceString}${active.driverVersion ? ` (driver ${active.driverVersion})` : ''}` : null);
      result.env.gpuDevices = dev.map((d) => ({ name: d.deviceString, vendorId: d.vendorId, deviceId: d.deviceId, active: d.active, driver: d.driverVersion }));
      result.env.featureStatus = info.gpu?.featureStatus ? { gpu_compositing: info.gpu.featureStatus.gpu_compositing, rasterization: info.gpu.featureStatus.rasterization, webgl: info.gpu.featureStatus.webgl } : null;
    } catch (e) { result.env.gpu = `n/a (${e.message})`; }

    // One tab for the whole session, re-navigated (via about:blank) for every measurement.
    // Opening a second tab or window made headed Chrome 154 exit on the development laptop
    // (exit code -1, no crash dump), so "fresh tab" is not an option there.
    const initial = (await httpJson(`http://127.0.0.1:${cdpPort}/json/list`)).find((t) => t.type === 'page');
    const targetId = initial.id;
    const { sessionId } = await root.send('Target.attachToTarget', { targetId, flatten: true });
    const s = root.session(sessionId);
    await s.send('Page.enable');
    await s.send('Runtime.enable');
    await s.send('Network.enable');
    // Size the window so that the viewport (innerWidth x innerHeight), not the window, is VWxVH.
    // The browser frame adds a fixed amount, so the set size is corrected until it converges;
    // each step waits for the page to see the resize. The size is tracked here instead of read
    // back: on the development laptop (Windows 11, DPR 1.33) Browser.getWindowBounds reported
    // 2 DIP more than the last Browser.setWindowBounds, so "read, add the difference, set" crept
    // by 2 px per step and never converged. The actual viewport is recorded per run.
    try {
      const { windowId } = await root.send('Browser.getWindowForTarget', { targetId });
      let st = await evaluate(s, PAGE_STATE);
      let { width: setW, height: setH } = (await root.send('Browser.getWindowBounds', { windowId })).bounds;
      for (let i = 0; i < 6 && (st.vw !== VW || st.vh !== VH); i++) {
        setW += VW - st.vw;
        setH += VH - st.vh;
        await root.send('Browser.setWindowBounds', { windowId, bounds: { width: setW, height: setH, windowState: 'normal' } });
        const prev = st;
        for (let k = 0; k < 20; k++) {
          await sleep(100);
          st = await evaluate(s, PAGE_STATE);
          if (st.vw !== prev.vw || st.vh !== prev.vh) break;
        }
        await sleep(200);
        st = await evaluate(s, PAGE_STATE);
      }
      if (st.vw !== VW || st.vh !== VH) log(`  (viewport is ${st.vw}x${st.vh}, not ${VW}x${VH}: window sizing did not converge)`);
    } catch (e) { log(`  (could not size the window: ${e.message})`); }
    const net = trackNetwork(s);
    let run = null; // the measurement in progress (for the Fetch block counter)
    if (opt.block.length) {
      const res = opt.block.map(globToRegex);
      await s.send('Fetch.enable', { patterns: opt.block.map((urlPattern) => ({ urlPattern })) });
      s.on('Fetch.requestPaused', (p) => {
        // Blocking applies to the site only, never to the calibration page.
        const hit = !(cal && p.request.url.startsWith(cal.origin)) && res.some((re) => re.test(p.request.url));
        if (hit && run) run.blocked = (run.blocked || 0) + 1;
        (hit ? s.send('Fetch.failRequest', { requestId: p.requestId, errorReason: 'BlockedByClient' }) : s.send('Fetch.continueRequest', { requestId: p.requestId })).catch(() => {});
      });
    }
    if (opt.source === 'touch') await s.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });

    // One measurement: about:blank -> load -> position -> traced gesture -> verify.
    async function measure(item, round) {
      const isLanding = item !== 'calibration';
      run = { target: item, round };
      await s.send('Page.navigate', { url: 'about:blank' });
      await sleep(300);
      net.reset();
      // Foreground the window (headed: makes it the OS foreground window, document.hasFocus()
      // true — what a visitor scrolling the page has). Recorded per run as `focused`.
      await s.send('Page.bringToFront').catch(() => {});
      const loaded = s.once('Page.loadEventFired');
      await s.send('Page.navigate', { url: isLanding ? landingUrl : cal.url });
      await Promise.race([loaded, sleep(30000)]);
      run.loadIdle = await net.idle({ quietMs: 500, timeoutMs: 15000 });
      await evaluate(s, 'document.fonts ? document.fonts.ready.then(() => true) : true', true);
      if (isLanding) {
        run.readyMarkMs = await evaluate(s, READY_MARK, true);
        if (run.readyMarkMs == null) run.notes = ['no performance.mark("genesis:ready") within 20 s of load'];
      }
      // A preloader may lock scrolling; wait until the document can scroll.
      for (let i = 0; i < 100; i++) {
        const ok = await evaluate(s, `getComputedStyle(document.body).overflowY !== 'hidden' && getComputedStyle(document.documentElement).overflowY !== 'hidden'`);
        if (ok) break;
        await sleep(100);
      }

      if (isLanding && opt.css) {
        const rules = await evaluate(s, injectCssExpr(opt.css));
        if (rules < 1) throw new Error(`--css did not parse into any CSS rule: ${opt.css}`);
        await nextFrames(s);
        if (opt.cssCheck) {
          const checks = await evaluate(s, cssCheckExpr(opt.cssCheck));
          const bad = checks.filter((c) => !c.ok);
          if (bad.length) {
            const msg = bad.map((c) => `${c.sel} ${c.prop}: expected "${c.expected}", got "${c.actual}"`).join('; ');
            const err = new Error(`--css-check failed: ${msg}`);
            err.fatal = true;
            throw err;
          }
          cssVerified = `verified after every landing load (${checks.map((c) => `${c.sel} ${c.prop} = ${c.actual}`).join('; ')})`;
        } else if (!cssVerified) {
          cssVerified = `${rules} rule(s) parsed; computed style NOT checked (pass --css-check)`;
        }
      }

      // Position: the section's scroll range (calibration: a fixed stretch of text).
      let range;
      let st;
      if (isLanding) {
        st = await evaluate(s, SECTION_FINDER);
        const b = st.sections[item];
        if (!b) throw new Error(`section "${item}" not found in the page`);
        range = { ...sectionRange(b, st.vh, st.maxScroll), box: b };
        run.teamPinned = st.teamPinned;
      } else {
        st = await evaluate(s, PAGE_STATE);
        range = { start: 600, end: Math.min(st.maxScroll, 600 + (opt.distance === 'full' ? 3000 : opt.distance)), rule: 'calibration text' };
      }
      const { startY, dist } = placeGesture(range);
      run.range = { start: range.start, end: range.end, rule: range.rule };
      run.startY = startY;
      run.distance = dist;
      run.viewport = `${st.vw}x${st.vh}`;
      run.dpr = +st.dpr.toFixed(3);
      if (dist < 200) run.notes = [...(run.notes || []), `only ${dist} px of scroll range in this section`];
      await evaluate(s, `window.scrollTo({ top: ${startY}, behavior: 'instant' }), true`);
      await nextFrames(s);
      run.positionIdle = await net.idle({ quietMs: 500, timeoutMs: 10000 });
      await sleep(opt.settleMs);
      const before = await evaluate(s, PAGE_STATE);
      run.actualStartY = Math.round(before.scrollY);
      // A hidden (minimized / occluded with native occlusion) or unfocused headed window is
      // presented differently; record it so such runs can be spotted.
      run.visibility = before.visibility;
      run.focused = before.focused;
      if (before.visibility !== 'visible') run.notes = [...(run.notes || []), `document.visibilityState was "${before.visibility}" before the gesture`];
      const sc0 = isLanding ? await evaluate(s, SC_STATE) : null;

      const c0 = cpuTimes();
      const { events, result: g, dataLoss } = await traceDuring(root, opt.categories, () => scrollGesture(s, { x: st.vw / 2, y: st.vh / 2, dy: dist, speed: opt.speed, source: opt.source }));
      const c1 = cpuTimes();
      run.gestureMs = g.gestureMs;
      run.dataLoss = dataLoss;
      run.hostCpuBusyPct = +((1 - (c1.idle - c0.idle) / Math.max(1, c1.total - c0.total)) * 100).toFixed(1);
      if (opt.keepTraces) {
        fs.mkdirSync(traceDir, { recursive: true });
        const f = path.join(traceDir, `${String(++traceIndex).padStart(3, '0')}-r${round}-${item}.json`);
        fs.writeFileSync(f, JSON.stringify({ traceEvents: events }));
        run.traceFile = path.relative(ROOT, f);
      }

      // Verify: started where intended, moved the requested distance, stayed in the section.
      const after = await evaluate(s, PAGE_STATE);
      run.endY = Math.round(after.scrollY);
      if (isLanding) {
        // Canvas counters over the gesture (+ the trace tail): draws, frames drawn without their
        // exact atlas (missA), blank draws (blank), and the decoded/held atlas levels afterwards.
        run.sc = scDelta(sc0, await evaluate(s, SC_STATE));
        if (run.sc?.blank > 0) run.notes = [...(run.notes || []), `the canvas drew ${run.sc.blank} blank frame(s) during the gesture`];
      }
      let range2 = range;
      if (isLanding) {
        const st2 = await evaluate(s, SECTION_FINDER);
        const b2 = st2.sections[item];
        if (b2) range2 = { ...sectionRange(b2, st2.vh, st2.maxScroll) };
      }
      const tol = 4;
      const moved = run.endY - run.actualStartY;
      const problems = [];
      if (Math.abs(run.actualStartY - startY) > tol) problems.push(`start ${run.actualStartY} instead of ${startY}`);
      if (Math.abs(moved - dist) > Math.max(tol, dist * 0.03)) problems.push(`moved ${moved} px instead of ${dist}`);
      if (run.actualStartY < range2.start - tol || run.endY > range2.end + tol) problems.push(`scrolled ${run.actualStartY}→${run.endY} outside the section range ${range2.start}–${range2.end}`);
      run.inSection = problems.length === 0;
      run.verify = problems.length ? problems.join('; ') : `ok ${run.actualStartY}→${run.endY} within ${range2.start}–${range2.end}`;

      const m = analyzeScrollTrace(events);
      Object.assign(run, m, { notes: [...(run.notes || []), ...m.notes] });
      if (!run.notes.length) delete run.notes;
      return run;
    }

    const items = [...(opt.calibration ? ['calibration'] : []), ...opt.sections];
    const fmtRun = (r) => r.error ? `ERROR ${r.error}` : `${String(r.presentedFps ?? '-').padStart(5)} fps  vsync-hit ${String(r.vsyncHitPct ?? '-').padStart(5)}%  >1.5v ${String(r.longIntervalPct ?? '-').padStart(5)}%  janky ${String(r.sjJankyPct ?? '-').padStart(5)}%  lat p50 ${String(r.latencyP50Ms ?? '-').padStart(5)} ms  main ${String(r.mainBusyPct ?? '-').padStart(4)}%  ${r.inSection ? '' : 'OUT-OF-SECTION ' + r.verify}`;
    let chromeExit = null;
    chrome.proc.once('exit', (code) => { chromeExit = code; });
    async function safeMeasure(item, round) {
      try { return await measure(item, round); } catch (e) {
        if (e.fatal) throw e;
        // Chrome gone: every further measurement would fail the same way.
        if (root.closed || chromeExit !== null) {
          const err = new Error(`Chrome exited (code ${chromeExit ?? '?'}) during ${item} round ${round}: ${e.message}`);
          err.fatal = true;
          throw err;
        }
        return { target: item, round, error: e.message, inSection: false };
      }
    }

    if (opt.warmup) {
      log('\nwarm-up round (discarded): ' + items.join(' → '));
      for (const item of items) {
        const r = await safeMeasure(item, 0);
        result.warmup.push(r);
        log(`  ${item.padEnd(12)} ${fmtRun(r)}`);
      }
    }
    const rand = rng(opt.seed);
    const runs = [];
    for (let round = 1; round <= opt.runs; round++) {
      const order = shuffle(items, rand);
      result.rounds.push(order);
      const gpuLoad = hostGpuSample();
      if (gpuLoad) result.hostGpu.push({ round, ...gpuLoad });
      const loadTxt = gpuLoad ? Object.entries(gpuLoad).sort((a, b) => b[1] - a[1]).map(([n, u]) => `${n} ${u}%`).join(', ') || 'none' : 'n/a';
      log(`\nround ${round}/${opt.runs}: ${order.join(' → ')}   (GPU 3D load before the round: ${loadTxt})`);
      for (const item of order) {
        const gate = await waitForQuietGpu();
        if (gate && (gate.waitedS > 0 || gate.timedOut)) {
          log(`  (waited ${gate.waitedS} s for the GPU: other load ${gate.otherGpu} %${gate.timedOut ? ', still busy: measuring anyway' : ''})`);
        }
        const r = await safeMeasure(item, round);
        if (gate) r.gpuGate = gate;
        runs.push(r);
        log(`  ${item.padEnd(12)} ${fmtRun(r)}`);
      }
    }

    // ---- summaries
    const valid = (r) => !r.error && r.inSection;
    const first = runs.find((r) => !r.error && r.vsyncMs);
    result.env.vsyncMs = first?.vsyncMs ?? null;
    result.env.refreshHz = first?.refreshHz ?? null;
    result.env.vsyncSource = first?.vsyncSource ?? null;
    result.env.dpr = runs.find((r) => r.dpr)?.dpr ?? null;
    result.env.viewport = runs.find((r) => r.viewport)?.viewport ?? null;
    const summaryKeys = [...SCROLL_METRICS.map((m) => m.key), 'drawnFps', 'rafMs', 'styleLayoutMs', 'paintMs', 'hostCpuBusyPct', 'latencyMaxMs', 'intervalMaxMs', 'presentedFrames', 'readyMarkMs'];
    for (const item of items) {
      const mine = runs.filter((r) => r.target === item);
      const ok = mine.filter(valid);
      const summary = {};
      for (const k of summaryKeys) summary[k] = summarize(ok.map((r) => r[k]));
      // Canvas counters: draws per presented frame, exact-atlas misses, blank draws, residency.
      if (ok.some((r) => r.sc)) {
        summary.scDrawsPerFrame = summarize(ok.map((r) => (r.sc && r.presentedFrames ? r.sc.draws / r.presentedFrames : null)));
        for (const k of ['draws', 'missA', 'blank', 'resident']) summary[`sc_${k}`] = summarize(ok.map((r) => r.sc?.[k]));
      }
      // Within-round ratios against the calibration page (drift cancels).
      let vsCalibration = null;
      if (item !== 'calibration' && opt.calibration) {
        const ratios = { fpsRatio: [], jankyPctDelta: [], longIntervalPctDelta: [] };
        for (const r of ok) {
          const c = runs.find((x) => x.target === 'calibration' && x.round === r.round && valid(x));
          if (!c) continue;
          if (c.presentedFps && r.presentedFps != null) ratios.fpsRatio.push(r.presentedFps / c.presentedFps);
          if (c.sjJankyPct != null && r.sjJankyPct != null) ratios.jankyPctDelta.push(r.sjJankyPct - c.sjJankyPct);
          if (c.longIntervalPct != null && r.longIntervalPct != null) ratios.longIntervalPctDelta.push(r.longIntervalPct - c.longIntervalPct);
        }
        vsCalibration = Object.fromEntries(Object.entries(ratios).map(([k, v]) => [k, summarize(v)]));
      }
      const withRange = mine.find((r) => r.range);
      result.targets.push({ name: item, range: withRange?.range ?? null, distance: withRange?.distance ?? null, okRuns: ok.length, summary, vsCalibration, runs: mine });
    }
    result.cssVerification = cssVerified;
    result.options.cssCheck = opt.cssCheck || undefined;
  } finally {
    try { root.close(); } catch {}
    await chrome.close();
    if (cal) await cal.close();
    await target.close();
  }

  const out = typeof args.out === 'string' ? path.resolve(args.out) : path.join(RESULTS_DIR, `${label}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(result, null, 2));
  const md = scrollMarkdown(result);
  fs.writeFileSync(out.replace(/\.json$/, '.md'), md);
  log(`\nwrote ${path.relative(process.cwd(), out)} and .md`);
  process.stdout.write(md + '\n');
  const bad = result.targets.flatMap((t) => t.runs.filter((r) => r.error || !r.inSection));
  if (bad.length) log(`WARNING: ${bad.length} run(s) errored or left their section (excluded from the medians; see the run log).`);
}

main().catch((e) => { console.error(e.fatal ? `FATAL: ${e.message}` : e); process.exit(1); });
