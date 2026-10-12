// scripts/perf/measure.mjs
// Zero-dependency local performance harness for the Genesis landing page.
// Serves ./build (or --dir=<path>, or measures --url=<origin>), drives stock
// Google Chrome over CDP, runs scroll scenarios, and records latency /
// resource / residency / GPU / power telemetry.
//
// Usage:
//   node scripts/perf/measure.mjs [--scenarios=baseline,...] [--headed] [--cycles=6]
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
const PERF_HELPERS_SRC = `(function(){
  if (window.__perf) return;
  const p = { frames: [], longtasks: [], running: false, lt: null };
  window.__perf = p;
  window.__perfStart = function(){
    p.frames = []; p.longtasks = []; p.running = true;
    try { p.lt = new PerformanceObserver(function(l){ for (const e of l.getEntries()) p.longtasks.push(e.duration); }); p.lt.observe({entryTypes:['longtask']}); } catch(e){}
    let last = performance.now();
    p.tick = function(t){ if(!p.running) return; p.frames.push(t-last); last = t; requestAnimationFrame(p.tick); };
    requestAnimationFrame(p.tick);
  };
  window.__perfScrub = async function(cycles, maxMs){
    const maxY = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    for (let c=0;c<cycles;c++){
      const t0 = performance.now();
      let dir = 1;
      await new Promise(function(resolve){
        const step = function(){
          const y = window.scrollY;
          if (dir > 0 && y >= maxY - 2) dir = -1;
          else if (dir < 0 && y <= 2) { resolve(); return; }
          if (performance.now() - t0 > maxMs) { resolve(); return; }
          // Scroll the page itself: a synthetic WheelEvent only moved pages that hijack the
          // wheel in JS (the old Lenis setup); the site now uses native scrolling.
          window.scrollBy({ top: dir * 160, behavior: 'instant' }); // html has scroll-behavior: smooth
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }
    return true;
  };
  window.__perfStop = function(){
    p.running = false; if (p.lt) p.lt.disconnect();
    const f = p.frames.slice(); f.shift();
    const s = f.slice().sort(function(a,b){return a-b;});
    const pct = function(q){ return s.length ? s[Math.min(s.length-1, Math.floor(q*s.length))] : null; };
    const res = performance.getEntriesByType('resource'); let transfer=0, decoded=0;
    for (const r of res){ transfer += r.transferSize||0; decoded += r.decodedBodySize||0; }
    let glRenderer='n/a';
    try { const c=document.createElement('canvas'); const gl=c.getContext('webgl'); const e=gl&&gl.getExtension('WEBGL_debug_renderer_info'); if(e) glRenderer=gl.getParameter(e.UNMASKED_RENDERER_WEBGL); } catch(e){}
    return { frameCount:s.length, frameP50:pct(0.5), frameP95:pct(0.95), frameP99:pct(0.99), frameMax:s[s.length-1]||null, dropped:s.filter(function(x){return x>32;}).length, longtaskCount:p.longtasks.length, longtaskTotal:p.longtasks.reduce(function(a,b){return a+b;},0), scrollHeight:document.documentElement.scrollHeight, domNodes:document.getElementsByTagName('*').length, heapUsedMB: performance.memory?performance.memory.usedJSHeapSize/1048576:null, resourceTransferMB: transfer/1048576, resourceCount: res.length, glRenderer, sc: window.__sc || null };
  };
})();`;

// ---------------------------------------------------------------- scenario
// Injects a stylesheet into every new document. The script runs before <html> exists, so a
// plain document.documentElement.appendChild() threw and silently did nothing: wait for the
// head instead.
const injectCss = (css) => `(() => { const add = () => { const s = document.createElement("style"); s.textContent = ${JSON.stringify(css)}; (document.head || document.documentElement).appendChild(s); }; if (document.head) add(); else document.addEventListener("DOMContentLoaded", add, { once: true }); })();`;

async function runScenario(cdp, scenario) {
  const { url, settleMs = 4000, scrubCycles = DEFAULT_CYCLES, maxMsPerCycle = 40000 } = scenario;
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

  // Record: memory after initial load.
  const rssLoadMB = chromeRssMB();
  const metricsBefore = await perfMetrics(cdp);

  await cdp.send('Runtime.evaluate', { expression: PERF_HELPERS_SRC });
  const poller = startPoller();
  let cpuBefore = await cdpCpuSeconds(cdp);
  if (cpuBefore == null) cpuBefore = chromeCpuSeconds();
  const wall0 = Date.now();

  await cdp.send('Runtime.evaluate', { expression: 'window.__perfStart()' });
  // Record: memory after one full forward/reverse scrub.
  await cdp.send('Runtime.evaluate', { expression: `window.__perfScrub(1, ${maxMsPerCycle})`, awaitPromise: true });
  const rssAfter1ScrubMB = chromeRssMB();
  // Record: memory after N forward/reverse scrubs.
  let rssAfterNScrubMB = rssAfter1ScrubMB;
  if (scrubCycles > 1) {
    await cdp.send('Runtime.evaluate', { expression: `window.__perfScrub(${scrubCycles - 1}, ${maxMsPerCycle})`, awaitPromise: true });
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
    'no-fixed-bg': { name: 'no-fixed-bg', extraCss: '*{background-attachment:scroll!important;}' },
    'no-blend': { name: 'no-blend', extraCss: '*{mix-blend-mode:normal!important;}' },
    'no-fixed-bg-no-blend': { name: 'no-fixed-bg-no-blend', extraCss: '*{background-attachment:scroll!important;mix-blend-mode:normal!important;}' },
    'scale-50': { name: 'scale-50', query: '?atlasScale=0.5' },
    'scale-33': { name: 'scale-33', query: '?atlasScale=0.33' },
    nodraw: { name: 'nodraw', query: '?noCanvasDraw=1' },
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
      process.stderr.write(`    p50=${r.frameP50?.toFixed(1)} p95=${r.frameP95?.toFixed(1)} p99=${r.frameP99?.toFixed(1)}ms  longtask=${r.longtaskTotal}ms  script=${r.cpuScriptMs}ms  cpu=${r.browserCpuPct}%\n`);
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
