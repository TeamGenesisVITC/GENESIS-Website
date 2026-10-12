// scripts/perf/measure.mjs
// Zero-dependency local performance harness for the Genesis landing page.
// Serves ./build (or --dir=<path>, or measures --url=<origin>), drives stock
// Google Chrome over CDP, scrubs the whole page with real scroll gestures
// (Input.synthesizeScrollGesture: browser input -> compositor thread, like a wheel),
// and records presentation / jank (Chrome trace), resource, residency, GPU and power
// telemetry. For section-by-section smoothness with repeated runs use scroll.mjs.
//
// Usage:
//   node scripts/perf/measure.mjs [--scenarios=baseline,...] [--headed] [--cycles=6]
//        [--speed=3000]  (gesture speed in px/s)
//        [--trace=lean|none]  (none: gestures without tracing, so no frame metrics; residency
//                              numbers then carry no trace-buffer memory)
//        [--dir=build | --dir=dist/client | --url=http://localhost:4173]
//        [--cf-cache]   (--dir mode: Cloudflare-like caching instead of no-store)
// Output: human summary on stderr + JSON prefixed with PERF_RESULT on stdout.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { CDP, httpJson, sleep, launchChrome as launchStockChrome } from './lib/cdp.mjs';
import { parseArgs, resolveTarget, CDP_PORT_DEFAULT, ROOT } from './lib/target.mjs';
import { imageDims, readAtlasManifest } from './lib/image-dims.mjs';
import { TRACE_CATEGORIES, traceDuring, scrollGesture, analyzeScrollTrace, quantile } from './lib/scroll-trace.mjs';

const execFileAsync = promisify(execFile);

const ARGS = parseArgs();
const CDP_PORT = parseInt(ARGS['cdp-port'], 10) || CDP_PORT_DEFAULT;
const RUN_MARKER_BASE = `genesisperf-${process.pid}`;
let RUN_MARKER = RUN_MARKER_BASE;

const HEADED = !!ARGS.headed;

// Scrollytelling frame atlases, recognised by path (independent of <img> vs fetch()).
function isAtlasUrl(url, mime = '') {
  let p = '';
  try { p = new URL(url).pathname; } catch { return false; }
  const isImage = /\.(webp|avif|png|jpe?g)$/i.test(p) || /^image\//.test(mime);
  return isImage && (/\/frame-atlases\//.test(p) || /atlas[^/]*$/i.test(p));
}
// Fallback for the decoded-memory model when no atlas body could be read.
const ATLAS_MANIFEST = readAtlasManifest(ROOT);
const DEFAULT_CYCLES = ARGS.cycles ? parseInt(ARGS.cycles, 10) : 6;
// Scrub speed. The old rAF scrub moved 160 px per frame (~9600 px/s at 60 Hz); a whole-page
// gesture at 3000 px/s keeps a 6-cycle run near a minute while staying a plausible fast scroll.
const SCRUB_SPEED = parseInt(ARGS.speed, 10) || 3000;
const TRACE = ARGS.trace === 'none' ? 'none' : 'lean';

// ---------------------------------------------------------------- telemetry
// Sum RSS (working set) of this run's Chrome process tree.
function chromeRssMB() {
  const ps = `$p=Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -like '*${RUN_MARKER}*' } | ForEach-Object { try { (Get-Process -Id $_.ProcessId -ErrorAction Stop).WorkingSet64 } catch {} }; ($p | Measure-Object -Sum).Sum`;
  try {
    const out = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { encoding: 'utf8', timeout: 30000 }).trim();
    const n = parseInt(out, 10);
    return Number.isFinite(n) ? n / 1048576 : null;
  } catch { return null; }
}

// Browser-process CPU seconds for this run's Chrome tree (Get-Process sum).
function chromeCpuSeconds() {
  const ps = `$pids=(Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -like '*${RUN_MARKER}*' }).ProcessId; ((Get-Process -Id $pids -EA SilentlyContinue | ForEach-Object { $_.TotalProcessorTime.TotalSeconds }) | Measure-Object -Sum).Sum`;
  try {
    const out = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { encoding: 'utf8', timeout: 20000 }).trim();
    const v = parseFloat(out);
    return Number.isFinite(v) ? v : null;
  } catch { return null; }
}

// NVIDIA dGPU telemetry: util / mem / temp / power (async, non-blocking).
async function nvidiaSample() {
  try {
    const { stdout } = await execFileAsync('nvidia-smi', ['--query-gpu=utilization.gpu,memory.used,temperature.gpu,power.draw', '--format=csv,noheader,nounits'], { timeout: 10000 });
    const [util, mem, temp, power] = stdout.trim().split(',').map(parseFloat);
    if ([util, mem, temp, power].some((n) => Number.isNaN(n))) return null;
    return { util, mem, temp, power };
  } catch { return null; }
}

// Hybrid-safe GPU telemetry via Windows GPU perf counters for this run's Chrome
// PIDs (captures Intel/AMD iGPU work that nvidia-smi cannot see). Async.
async function windowsGpuSample() {
  const ps = `$pids=(Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -like '*${RUN_MARKER}*' }).ProcessId; $u=((Get-Counter '\\GPU Engine(*)\\Utilization Percentage' -EA SilentlyContinue).CounterSamples | Where-Object { $n=$_.InstanceName; $pids | Where-Object { $n -like "*pid_$_*" } } | Measure-Object CookedValue -Sum).Sum; $m=((Get-Counter '\\GPU Process Memory(*)\\Local Usage' -EA SilentlyContinue).CounterSamples | Where-Object { $n=$_.InstanceName; $pids | Where-Object { $n -like "*pid_$_*" } } | Measure-Object CookedValue -Sum).Sum; "$u;$m"`;
  try {
    const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { timeout: 25000, maxBuffer: 1 << 24 });
    const [u, m] = stdout.trim().split(';').map(parseFloat);
    return { winUtil: Number.isFinite(u) ? +u.toFixed(1) : null, winMemMB: Number.isFinite(m) ? +(m / 1048576).toFixed(1) : null };
  } catch { return null; }
}

// Background non-blocking poller. One sample in flight at a time.
function startPoller(intervalMs = 3000) {
  const samples = [];
  let stopped = false;
  let inFlight = false;
  const tick = async () => {
    if (stopped || inFlight) return;
    inFlight = true;
    try {
      const [n, w] = await Promise.all([nvidiaSample(), windowsGpuSample()]);
      if (n || w) samples.push({ ...(n || {}), ...(w || {}) });
    } finally {
      inFlight = false;
      if (!stopped) setTimeout(tick, intervalMs);
    }
  };
  tick();
  return { samples, stop: () => { stopped = true; } };
}

function summarize(samples, key) {
  const vals = samples.map((s) => s[key]).filter((v) => v != null && Number.isFinite(v));
  if (!vals.length) return { max: null, mean: null };
  return { max: Math.max(...vals), mean: +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) };
}

async function perfMetrics(cdp) {
  const { metrics } = await cdp.send('Performance.getMetrics');
  const m = {};
  for (const { name, value } of metrics) m[name] = value;
  return m;
}

// Cumulative CPU seconds across all Chrome processes for this page's browser,
// via the SystemInfo domain (fast, no PowerShell).
async function cdpCpuSeconds(cdp) {
  try {
    const { processInfo } = await cdp.send('SystemInfo.getProcessInfo');
    return processInfo.reduce((a, p) => a + (p.cpuTime || 0), 0);
  } catch { return null; }
}

// ---------------------------------------------------------------- chrome
// Same flags as the original harness (the shared launcher adds the common
// --no-first-run / background-throttling flags). The run marker is part of
// the user-data-dir so the PowerShell RSS/CPU probes can find this tree.
function launchChrome() {
  return launchStockChrome({
    cdpPort: CDP_PORT,
    headed: HEADED,
    marker: RUN_MARKER,
    windowSize: '1600,900',
    extraArgs: ['--force-device-scale-factor=1', '--enable-precise-memory-info', '--js-flags=--expose-gc', '--ignore-gpu-blocklist'],
  });
}

// ---------------------------------------------------------------- page helpers
// Long tasks + page summary. Frame timing comes from the Chrome trace (scrub() below), not
// from requestAnimationFrame: rAF intervals say nothing about what the compositor presented
// during a compositor-thread scroll.
const PERF_HELPERS_SRC = `(function(){
  if (window.__perf) return;
  const p = { longtasks: [], lt: null };
  window.__perf = p;
  window.__perfStart = function(){
    p.longtasks = [];
    try { p.lt = new PerformanceObserver(function(l){ for (const e of l.getEntries()) p.longtasks.push(e.duration); }); p.lt.observe({entryTypes:['longtask']}); } catch(e){}
  };
  window.__perfStop = function(){
    if (p.lt) p.lt.disconnect();
    const res = performance.getEntriesByType('resource'); let transfer=0, decoded=0;
    for (const r of res){ transfer += r.transferSize||0; decoded += r.decodedBodySize||0; }
    let glRenderer='n/a';
    try { const c=document.createElement('canvas'); const gl=c.getContext('webgl'); const e=gl&&gl.getExtension('WEBGL_debug_renderer_info'); if(e) glRenderer=gl.getParameter(e.UNMASKED_RENDERER_WEBGL); } catch(e){}
    return { longtaskCount:p.longtasks.length, longtaskTotal:p.longtasks.reduce(function(a,b){return a+b;},0), scrollHeight:document.documentElement.scrollHeight, domNodes:document.getElementsByTagName('*').length, heapUsedMB: performance.memory?performance.memory.usedJSHeapSize/1048576:null, resourceTransferMB: transfer/1048576, resourceCount: res.length, glRenderer, sc: window.__sc || null };
  };
})();`;

// ---------------------------------------------------------------- scrub
// One cycle = a real scroll gesture from the top to the bottom of the page, then back up.
// Each gesture is traced (viz + input.scrolling only, to keep long traces small) and the
// presentation intervals of all gestures are pooled into `acc`.
const pageY = async (cdp) => (await cdp.send('Runtime.evaluate', { expression: '({ y: scrollY, max: document.documentElement.scrollHeight - innerHeight, w: innerWidth, h: innerHeight })', returnByValue: true })).result.value;

async function scrub(cdp, cycles, acc) {
  for (let c = 0; c < cycles; c++) {
    for (const dir of [1, -1]) {
      const st = await pageY(cdp);
      const dy = dir > 0 ? st.max - st.y : -st.y;
      if (Math.abs(dy) < 2) continue;
      const gesture = () => scrollGesture(cdp, { x: st.w / 2, y: st.h / 2, dy, speed: SCRUB_SPEED });
      if (TRACE === 'none') {
        await gesture();
        const end = await pageY(cdp);
        acc.gestures.push({ dir: dir > 0 ? 'down' : 'up', from: Math.round(st.y), to: Math.round(end.y), requested: Math.round(dy) });
        if (Math.abs(end.y - (st.y + dy)) > 8) acc.notes.push(`gesture ${dir > 0 ? 'down' : 'up'} reached ${Math.round(end.y)} instead of ${Math.round(st.y + dy)}`);
        continue;
      }
      const { events, dataLoss } = await traceDuring(cdp, TRACE_CATEGORIES.lean, gesture, { lead: 50, tail: 150 });
      const m = analyzeScrollTrace(events, { raw: true });
      const end = await pageY(cdp);
      acc.gestures.push({ dir: dir > 0 ? 'down' : 'up', from: Math.round(st.y), to: Math.round(end.y), requested: Math.round(dy), presentedFps: m.presentedFps, sjJankyPct: m.sjJankyPct, dataLoss });
      if (Math.abs(end.y - (st.y + dy)) > 8) acc.notes.push(`gesture ${dir > 0 ? 'down' : 'up'} reached ${Math.round(end.y)} instead of ${Math.round(st.y + dy)}`);
      if (m.vsyncMs) acc.vsyncMs.push(m.vsyncMs);
      acc.intervals.push(...m.raw.intervalsMs);
      acc.presented += m.presentedFrames || 0;
      acc.latencies.push(...m.raw.latenciesMs);
      acc.windowMs += m.raw.windowMs;
      acc.sjFrames += m.sjFrames || 0;
      acc.sjJanky += m.sjJankyFrames || 0;
      acc.sjMissed += m.sjMissedVsyncs || 0;
    }
  }
}

function scrubSummary(acc) {
  const vsyncMs = acc.vsyncMs.length ? quantile(acc.vsyncMs, 0.5) : null;
  const iv = acc.intervals;
  const r = (v, d = 2) => (v == null ? null : +v.toFixed(d));
  // "dropped" = vsyncs on which no new frame was presented while the page was scrolling
  // (relative to the display's own vsync interval, so it is meaningful at 165 Hz).
  const missed = vsyncMs ? iv.reduce((s, d) => s + Math.max(0, Math.round(d / vsyncMs) - 1), 0) : null;
  return {
    vsyncMs: r(vsyncMs, 3),
    refreshHz: vsyncMs ? r(1000 / vsyncMs, 1) : null,
    gestures: acc.gestures.length,
    frameCount: acc.presented, // presented frames (distinct presentation timestamps) while scrolling
    presentedFps: acc.windowMs > 0 ? r(iv.length / (acc.windowMs / 1000), 1) : null,
    frameP50: r(quantile(iv, 0.5)),
    frameP95: r(quantile(iv, 0.95)),
    frameP99: r(quantile(iv, 0.99)),
    frameMax: iv.length ? r(Math.max(...iv)) : null,
    dropped: missed,
    droppedPct: missed != null && iv.length ? r((100 * missed) / (missed + iv.length), 1) : null,
    longIntervalPct: vsyncMs && iv.length ? r((100 * iv.filter((d) => d > 1.5 * vsyncMs).length) / iv.length, 1) : null,
    sjJankyPct: acc.sjFrames ? r((100 * acc.sjJanky) / acc.sjFrames, 1) : null,
    sjMissedVsyncs: acc.sjFrames ? acc.sjMissed : null,
    latencyP50: r(quantile(acc.latencies, 0.5), 1),
    latencyP95: r(quantile(acc.latencies, 0.95), 1),
    scrubNotes: acc.notes,
    scrubGestures: acc.gestures,
  };
}

// ---------------------------------------------------------------- scenario
// Injects a stylesheet into every new document. The script runs before <html> exists, so a
// plain document.documentElement.appendChild() threw and silently did nothing: wait for the
// head instead.
const injectCss = (css) => `(() => { const add = () => { const s = document.createElement("style"); s.setAttribute("data-perf-ablation", ""); s.textContent = ${JSON.stringify(css)}; (document.head || document.documentElement).appendChild(s); }; if (document.head) add(); else document.addEventListener("DOMContentLoaded", add, { once: true }); })();`;

// After load, proves that every CSS ablation applied: the injected <style>s exist and parsed,
// and no element's computed value of the ablated property differs from the forced one
// (multi-value properties like background-attachment: every comma-separated item). An
// ablation that silently did nothing measures the baseline under another name: fail loudly.
const verifyCssExpr = (checks) => `(() => {
  const styles = [...document.querySelectorAll('style[data-perf-ablation]')];
  const rules = styles.reduce((n, s) => n + (s.sheet ? s.sheet.cssRules.length : 0), 0);
  const all = document.querySelectorAll('*');
  const out = { styles: styles.length, rules, elements: all.length, checks: [] };
  for (const [prop, expected] of ${JSON.stringify(checks)}) {
    let bad = 0; let example = null;
    for (const el of all) {
      const v = getComputedStyle(el).getPropertyValue(prop).trim();
      if (v && !v.split(',').every((x) => x.trim() === expected)) { bad++; if (!example) example = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + ' = ' + v; }
    }
    out.checks.push({ prop, expected, bad, example });
  }
  return out;
})()`;

const BACKDROP_CHECKS = [['backdrop-filter', 'none']];

async function runScenario(cdp, scenario) {
  const { url, settleMs = 4000, scrubCycles = DEFAULT_CYCLES } = scenario;
  await cdp.send('Network.enable');
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');

  const atlasInfo = { count: 0, bytes: 0, urls: new Set(), dims: null, dimsSource: null };
  const reqUrl = new Map();
  // Atlases are recognised by path, not by how they are loaded: CRA build
  // /frame-atlases/atlas-N.webp via <img>; Vite build content-hashed
  // /frame-atlases/atlas-N.<hash>.webp via fetch() + createImageBitmap.
  cdp.on('Network.responseReceived', (p) => reqUrl.set(p.requestId, { url: p.response.url, mime: p.response.mimeType }));
  cdp.on('Network.loadingFinished', (p) => {
    const u = reqUrl.get(p.requestId);
    if (!u || !isAtlasUrl(u.url, u.mime)) return;
    atlasInfo.count++;
    atlasInfo.urls.add(u.url.split('?')[0]);
    atlasInfo.bytes += p.encodedDataLength || 0;
    // Real atlas dimensions from the first atlas body (decoded-memory model).
    if (!atlasInfo.dims && !atlasInfo.dimsPending) {
      atlasInfo.dimsPending = true;
      cdp.send('Network.getResponseBody', { requestId: p.requestId }).then(({ body, base64Encoded }) => {
        const d = imageDims(Buffer.from(body, base64Encoded ? 'base64' : 'binary'));
        if (d) { atlasInfo.dims = d; atlasInfo.dimsSource = 'first atlas response'; }
      }).catch(() => {}).finally(() => { atlasInfo.dimsPending = false; });
    }
  });

  let fetchEnabled = false;
  let atlasSeen = 0;
  const maxAtlases = scenario.maxAtlases ?? Infinity;
  if (scenario.blockAtlases || maxAtlases !== Infinity) {
    // No resourceType filter: fetch()-loaded atlases are type "Fetch", not "Image".
    await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*/frame-atlases/*' }, { urlPattern: '*atlas*' }] });
    fetchEnabled = true;
    cdp.on('Fetch.requestPaused', async (p) => {
      if (!isAtlasUrl(p.request.url)) { try { await cdp.send('Fetch.continueRequest', { requestId: p.requestId }); } catch {} return; }
      atlasSeen++;
      const allow = !scenario.blockAtlases && atlasSeen <= maxAtlases;
      try { allow ? await cdp.send('Fetch.continueRequest', { requestId: p.requestId }) : await cdp.send('Fetch.failRequest', { requestId: p.requestId, errorReason: 'Aborted' }); } catch {}
    });
  }

  if (scenario.disableBackdrop) {
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: injectCss('*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;}') });
  }
  if (scenario.disableFilterAnim) {
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: injectCss('*{filter:none!important;}') });
  }
  if (scenario.extraCss) {
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: injectCss(scenario.extraCss) });
  }

  const loaded = cdp.once('Page.loadEventFired');
  await cdp.send('Page.navigate', { url });
  await loaded;
  await sleep(settleMs);

  let cssVerification = null;
  const cssChecks = [
    ...(scenario.disableBackdrop ? BACKDROP_CHECKS : []),
    ...(scenario.disableFilterAnim ? [['filter', 'none']] : []),
    ...(scenario.cssChecks || []),
  ];
  const expectedStyles = (scenario.disableBackdrop ? 1 : 0) + (scenario.disableFilterAnim ? 1 : 0) + (scenario.extraCss ? 1 : 0);
  if (expectedStyles) {
    const { result: vr } = await cdp.send('Runtime.evaluate', { expression: verifyCssExpr(cssChecks), returnByValue: true });
    const v = vr.value;
    const problems = [];
    if (v.styles !== expectedStyles) problems.push(`${v.styles} injected <style> element(s) in the page, expected ${expectedStyles}`);
    if (v.rules < expectedStyles) problems.push(`only ${v.rules} CSS rule(s) parsed`);
    for (const c of v.checks) if (c.bad) problems.push(`${c.bad} element(s) still have ${c.prop} != ${c.expected} (e.g. ${c.example})`);
    if (problems.length) throw new Error(`scenario ${scenario.name}: CSS ablation did not apply: ${problems.join('; ')}`);
    cssVerification = `${v.styles} style(s), ${v.rules} rule(s); ${v.checks.map((c) => `${c.prop} = ${c.expected} on all ${v.elements} elements`).join('; ') || 'no computed-style check defined'}`;
    process.stderr.write(`    css ablation verified: ${cssVerification}\n`);
  }

  // Record: memory after initial load.
  const rssLoadMB = chromeRssMB();
  const metricsBefore = await perfMetrics(cdp);

  await cdp.send('Runtime.evaluate', { expression: PERF_HELPERS_SRC });
  const poller = startPoller();
  let cpuBefore = await cdpCpuSeconds(cdp);
  if (cpuBefore == null) cpuBefore = chromeCpuSeconds();
  const wall0 = Date.now();

  await cdp.send('Runtime.evaluate', { expression: 'window.__perfStart()' });
  await cdp.send('Runtime.evaluate', { expression: `window.scrollTo({ top: 0, behavior: 'instant' })` });
  await sleep(300);
  const acc = { gestures: [], notes: [], vsyncMs: [], intervals: [], latencies: [], windowMs: 0, presented: 0, sjFrames: 0, sjJanky: 0, sjMissed: 0 };
  // Record: memory after one full forward/reverse scrub.
  await scrub(cdp, 1, acc);
  const rssAfter1ScrubMB = chromeRssMB();
  // Record: memory after N forward/reverse scrubs.
  let rssAfterNScrubMB = rssAfter1ScrubMB;
  if (scrubCycles > 1) {
    await scrub(cdp, scrubCycles - 1, acc);
    rssAfterNScrubMB = chromeRssMB();
  }

  const { result } = await cdp.send('Runtime.evaluate', { expression: 'window.__perfStop()', returnByValue: true });
  const wallSeconds = (Date.now() - wall0) / 1000;
  const cpuAfter = (await cdpCpuSeconds(cdp)) ?? chromeCpuSeconds();
  const metricsAfter = await perfMetrics(cdp);
  poller.stop();

  // Steady-state residency after GC + idle.
  await cdp.send('Runtime.evaluate', {
    expression: `(async () => { if (window.gc) { try { window.gc(); } catch (e) {} } await new Promise((r) => setTimeout(r, 1500)); })()`,
    awaitPromise: true,
  });
  const rssSettledMB = chromeRssMB();

  if (fetchEnabled) await cdp.send('Fetch.disable');
  cdp.handlers.clear();

  const atlasDims = atlasInfo.dims || (ATLAS_MANIFEST?.width ? { w: ATLAS_MANIFEST.width, h: ATLAS_MANIFEST.height } : null);
  const delta = (k) => (metricsAfter[k] ?? 0) - (metricsBefore[k] ?? 0);
  const samples = poller.samples;
  const gpu = {
    winUtilMaxPct: summarize(samples, 'winUtil').max,
    winUtilMeanPct: summarize(samples, 'winUtil').mean,
    winGpuMemMaxMB: summarize(samples, 'winMemMB').max,
    nvUtilMaxPct: summarize(samples, 'util').max,
    nvUtilMeanPct: summarize(samples, 'util').mean,
    nvMemMaxMB: summarize(samples, 'mem').max,
    tempMaxC: summarize(samples, 'temp').max,
    powerMaxW: summarize(samples, 'power').max,
    powerMeanW: summarize(samples, 'power').mean,
    samples: samples.length,
  };

  return {
    scenario: scenario.name,
    browser: scenario.browser,
    atlasRequests: atlasInfo.count,
    atlasMB: +(atlasInfo.bytes / 1048576).toFixed(1),
    // Decoded RGBA size of the distinct atlases fetched, using real dimensions
    // (first atlas body; else the repo's atlas-manifest.json).
    atlasUnique: atlasInfo.urls.size,
    atlasDims: atlasDims ? `${atlasDims.w}x${atlasDims.h}` : null,
    atlasDimsSource: atlasInfo.dims ? atlasInfo.dimsSource : atlasDims ? `manifest v${ATLAS_MANIFEST.version}` : null,
    manifestAtlasCount: ATLAS_MANIFEST?.count ?? null,
    modeledDecodedAtlasMB: atlasDims ? +((atlasInfo.urls.size * atlasDims.w * atlasDims.h * 4) / 1048576).toFixed(0) : null,
    rssIdleMB: scenario.idleRssMB,
    rssLoadMB,
    rssAfter1ScrubMB,
    rssAfterNScrubMB,
    rssSettledMB,
    pageResidentMB: rssLoadMB != null && scenario.idleRssMB != null ? +(rssLoadMB - scenario.idleRssMB).toFixed(0) : null,
    scrubCycles,
    wallSeconds: +wallSeconds.toFixed(1),
    browserCpuPct: cpuBefore != null && cpuAfter != null ? +(((cpuAfter - cpuBefore) / wallSeconds) * 100).toFixed(1) : null,
    cpuTaskMs: +(delta('TaskDuration') * 1000).toFixed(0),
    cpuScriptMs: +(delta('ScriptDuration') * 1000).toFixed(0),
    ...gpu,
    cssVerification,
    scrubSpeedPxPerS: SCRUB_SPEED,
    scrubTrace: TRACE,
    ...scrubSummary(acc),
    ...(result.value || {}),
  };
}

// ---------------------------------------------------------------- main
async function main() {
  const argScenarios = typeof ARGS.scenarios === 'string' ? ARGS.scenarios : '';
  const all = {
    baseline: { name: 'baseline' },
    nobackdrop: { name: 'nobackdrop', disableBackdrop: true },
    'no-backdrop': { name: 'no-backdrop', disableBackdrop: true },
    'no-filter': { name: 'no-filter', disableFilterAnim: true },
    'no-atlas-no-backdrop': { name: 'no-atlas-no-backdrop', blockAtlases: true, disableBackdrop: true },
    // Page-level paint costs: fixed-attachment backgrounds repaint on every scroll in Chrome,
    // and mix-blend-mode layers force a blend pass over everything beneath them.
    'no-fixed-bg': { name: 'no-fixed-bg', extraCss: '*{background-attachment:scroll!important;}', cssChecks: [['background-attachment', 'scroll']] },
    'no-blend': { name: 'no-blend', extraCss: '*{mix-blend-mode:normal!important;}', cssChecks: [['mix-blend-mode', 'normal']] },
    'no-fixed-bg-no-blend': { name: 'no-fixed-bg-no-blend', extraCss: '*{background-attachment:scroll!important;mix-blend-mode:normal!important;}', cssChecks: [['background-attachment', 'scroll'], ['mix-blend-mode', 'normal']] },
    // scale-50 / scale-33 (?atlasScale=) and nodraw (?noCanvasDraw=1) were removed: the current
    // ScrollCanvas reads neither parameter, so they measured the baseline under another name.
    'no-atlas': { name: 'no-atlas', blockAtlases: true },
    'max-8-atlas': { name: 'max-8-atlas', maxAtlases: 8 },
    'max-16-atlas': { name: 'max-16-atlas', maxAtlases: 16 },
  };
  const names = argScenarios ? argScenarios.split(',') : ['baseline'];
  const unknown = names.filter((n) => !all[n]);
  if (unknown.length) throw new Error(`unknown scenario(s): ${unknown.join(', ')} (known: ${Object.keys(all).join(', ')})`);

  // --dir (default build/) is served with the original no-store SPA semantics
  // so numbers stay comparable with the README; --url measures a live server.
  const target = await resolveTarget(ARGS, { legacyNoStore: true });
  const base = `${target.origin}/`;
  process.stderr.write(`target: ${base} (${target.mode}${target.mode === 'dir' ? ` ${target.describe.dir}` : ''})\n`);
  // ?scstats makes the optimized ScrollCanvas expose its debug counters on
  // window.__sc (collected as 'sc'); older builds ignore it. --no-scstats to omit.
  const withStats = (q) => (ARGS['no-scstats'] ? q || '' : q ? `${q}&scstats` : '?scstats');
  const scenarios = names.map((n) => all[n]).map((s) => ({ ...s, url: base + withStats(s.query) }));
  const results = [];

  for (const scenario of scenarios) {
    RUN_MARKER = `${RUN_MARKER_BASE}-${scenario.name}`;
    const chrome = await launchChrome();
    const { version } = chrome;
    let cdp = null;
    try {
      const targets = await httpJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
      const page = targets.find((t) => t.type === 'page');
      cdp = await CDP.connect(page.webSocketDebuggerUrl);
      await cdp.send('Performance.enable');
      await sleep(1200);
      scenario.idleRssMB = chromeRssMB();
      scenario.browser = version.Browser;
      process.stderr.write(`\n>>> ${scenario.name} (idle ${scenario.idleRssMB?.toFixed(0)}MB${HEADED ? ', headed' : ''})\n`);
      const r = await runScenario(cdp, scenario);
      results.push(r);
      process.stderr.write(`    resident=${r.pageResidentMB}MB  after1=${r.rssAfter1ScrubMB?.toFixed(0)}  after${r.scrubCycles}=${r.rssAfterNScrubMB?.toFixed(0)}  settled=${r.rssSettledMB?.toFixed(0)}\n`);
      process.stderr.write(`    presented ${r.presentedFps} fps @ ${r.refreshHz} Hz  interval p50=${r.frameP50} p95=${r.frameP95} p99=${r.frameP99} max=${r.frameMax} ms  dropped=${r.dropped} vsyncs (${r.droppedPct}%)  janky=${r.sjJankyPct}%  latency p50=${r.latencyP50} ms\n`);
      process.stderr.write(`    longtask=${r.longtaskTotal}ms  script=${r.cpuScriptMs}ms  cpu=${r.browserCpuPct}%${r.scrubNotes.length ? '  NOTE ' + r.scrubNotes.join('; ') : ''}\n`);
      process.stderr.write(`    gpu(win)=${r.winUtilMaxPct}%/${r.winGpuMemMaxMB}MB gpu(nv)=${r.nvUtilMaxPct}%/${r.nvMemMaxMB}MB temp=${r.tempMaxC}C power=${r.powerMaxW}W gl=${r.glRenderer}\n`);
    } finally {
      if (cdp) cdp.close();
      await chrome.close();
    }
  }
  await target.close();

  console.log('\nBROWSER ' + (results[0]?.browser || '?') + (HEADED ? ' (headed)' : ' (headless)'));
  console.log(JSON.stringify(results, null, 2));
  console.log('PERF_RESULT ' + JSON.stringify(results));
}

main().catch((e) => { console.error(e); process.exit(1); });
