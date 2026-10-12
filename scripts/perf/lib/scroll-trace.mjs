// scripts/perf/lib/scroll-trace.mjs
// Real (compositor-thread) scroll gestures over CDP and the Chrome trace analysis behind
// scroll.mjs and measure.mjs. See README "Scroll smoothness: scroll.mjs" for metric definitions.
//
// Gestures: Input.synthesizeScrollGesture goes through the browser's input router, the
// renderer's compositor thread and viz, exactly like a wheel/touchpad scroll. The page is
// never scrolled from JavaScript, so main-thread work only shows up when the page itself
// adds it (scroll listeners, rAF loops, paints).
//
// Trace events used (Chrome 154; names checked against a real trace):
//   Display::FrameDisplayed          viz, GPU process. Timestamp = presentation time reported by
//                                    the OS (vsync-quantized). Frames that share a timestamp were
//                                    replaced before they reached the screen, so presented frames
//                                    = distinct timestamps.
//   Graphics.Pipeline.DrawAndSwap    async end = presentation time (fallback for the above).
//   Display::DrawAndSwap             viz draws (counted as "drawn"; not vsync-aligned).
//   ScrollJankV4                     input.scrolling, renderer compositor. One per presented
//                                    scroll frame: is_janky, missed_vsyncs_per_jank_reason[],
//                                    vsync_interval_us.
//   EventLatency                     input.scrolling. Async slice from the input event's OS/
//                                    generation timestamp to presentation (or to termination
//                                    when the event was coalesced and never drew a frame).
//   DisplayScheduler::BeginFrame     viz. args.args.interval_us = display vsync interval.
//   RunTask / Paint / Layout / ...   devtools.timeline, renderer main thread.

import { sleep } from './cdp.mjs';

export const TRACE_CATEGORIES = {
  // Frame + input pipeline + renderer main thread (what DevTools' Performance panel records).
  full: ['viz', 'input.scrolling', 'devtools.timeline', 'disabled-by-default-devtools.timeline'],
  // Frames + input only: no main-thread metrics, lowest tracing overhead.
  lean: ['viz', 'input.scrolling'],
};

const SCROLL_UPDATE_TYPES = new Set(['GESTURE_SCROLL_UPDATE', 'FIRST_GESTURE_SCROLL_UPDATE', 'INERTIAL_GESTURE_SCROLL_UPDATE']);
const LONG_TASK_MS = 50;

// ---------------------------------------------------------------- stats
export function quantile(values, q) {
  const s = values.filter((v) => typeof v === 'number' && Number.isFinite(v)).sort((a, b) => a - b);
  if (!s.length) return null;
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

// median + inter-quartile range of per-run values (linear interpolation, like numpy default).
export function summarize(values) {
  const v = values.filter((x) => typeof x === 'number' && Number.isFinite(x));
  if (!v.length) return { n: 0, median: null, p25: null, p75: null, iqr: null, min: null, max: null };
  const p25 = quantile(v, 0.25);
  const p75 = quantile(v, 0.75);
  return { n: v.length, median: quantile(v, 0.5), p25, p75, iqr: p75 - p25, min: Math.min(...v), max: Math.max(...v) };
}

const round = (v, d = 1) => (typeof v === 'number' && Number.isFinite(v) ? +v.toFixed(d) : null);

// ---------------------------------------------------------------- tracing
// Records a trace around fn() on a browser-level (or page-level) CDP connection.
export async function traceDuring(cdp, categories, fn, { lead = 100, tail = 200 } = {}) {
  const events = [];
  const offData = cdp.on('Tracing.dataCollected', (p) => { for (const e of p.value) events.push(e); });
  let dataLoss = false;
  const done = cdp.once('Tracing.tracingComplete');
  await cdp.send('Tracing.start', {
    transferMode: 'ReportEvents',
    traceConfig: { recordMode: 'recordAsMuchAsPossible', includedCategories: categories },
  });
  let result;
  let error = null;
  try {
    await sleep(lead);
    result = await fn();
    await sleep(tail);
  } catch (e) {
    error = e;
  } finally {
    await cdp.send('Tracing.end');
    const fin = await done;
    dataLoss = !!fin?.dataLossOccurred;
    offData();
  }
  if (error) throw error;
  return { events, result, dataLoss };
}

// One real scroll gesture (down = positive dy). Resolves when Chrome reports the gesture done.
export async function scrollGesture(session, { x, y, dy, speed = 1500, source = 'mouse' }) {
  const t0 = Date.now();
  await session.send('Input.synthesizeScrollGesture', {
    x: Math.round(x), y: Math.round(y), xDistance: 0, yDistance: -Math.round(dy),
    speed: Math.round(speed), gestureSourceType: source, repeatCount: 0,
  });
  return { gestureMs: Date.now() - t0 };
}

// ---------------------------------------------------------------- analysis helpers
const asyncKey = (e) => `${e.pid}:${e.tid}:${e.cat}:${e.name}:${e.id2?.local ?? e.id2?.global ?? e.id ?? ''}`;

// Pairs async b/e events (stack per key: same-id slices nest).
function pairAsync(events, name) {
  const open = new Map();
  const out = [];
  const list = events.filter((e) => e.name === name && (e.ph === 'b' || e.ph === 'e'));
  list.sort((a, b) => a.ts - b.ts || (a.ph === 'e' ? -1 : 1));
  for (const e of list) {
    const k = asyncKey(e);
    if (e.ph === 'b') { if (!open.has(k)) open.set(k, []); open.get(k).push(e); continue; }
    const b = open.get(k)?.pop();
    if (b) out.push({ begin: b, end: e, ts: b.ts, endTs: e.ts, dur: e.ts - b.ts, args: b.args || {} });
  }
  return out;
}

function mode(values) {
  const c = new Map();
  for (const v of values) c.set(v, (c.get(v) || 0) + 1);
  let best = null;
  let n = -1;
  for (const [v, k] of c) if (k > n) { best = v; n = k; }
  return best;
}

function overlap(a0, a1, b0, b1) { return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0)); }

// ---------------------------------------------------------------- analysis
// Turns the trace of one gesture into the per-gesture metrics (times in ms unless noted).
// opts.raw: also return the raw presentation intervals and latencies (for aggregating gestures).
export function analyzeScrollTrace(events, opts = {}) {
  const notes = [];

  // -- renderer that scrolled: the pid with the most scroll-update EventLatency slices.
  const latencies = pairAsync(events, 'EventLatency').map((p) => ({ ...p, type: p.args.event_latency?.event_type }));
  const updates = latencies.filter((l) => SCROLL_UPDATE_TYPES.has(l.type));
  const pidCount = new Map();
  for (const u of updates) pidCount.set(u.begin.pid, (pidCount.get(u.begin.pid) || 0) + 1);
  const rendererPid = [...pidCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const myUpdates = updates.filter((u) => u.begin.pid === rendererPid);
  if (!myUpdates.length) notes.push('no scroll-update EventLatency events: the gesture did not scroll (or input.scrolling was not traced)');

  // -- vsync interval
  const sjAll = events.filter((e) => e.name === 'ScrollJankV4' && e.ph === 'b' && e.args?.scroll_jank_v4);
  const sj = sjAll.filter((e) => rendererPid == null || e.pid === rendererPid).map((e) => ({ ts: e.ts, ...e.args.scroll_jank_v4 }));
  let vsyncUs = null;
  let vsyncSource = null;
  const sjV = sj.map((j) => j.vsync_interval_us).filter((v) => v > 0);
  // Despite its name, Chrome 154 reports vsync_interval_us in nanoseconds (6061000 at 165 Hz):
  // normalize by plausibility (a vsync interval is 2-100 ms).
  if (sjV.length) { const v = mode(sjV); vsyncUs = v / 1000 >= 2000 ? v / 1000 : v; vsyncSource = 'ScrollJankV4.vsync_interval_us'; }
  if (!vsyncUs) {
    const elV = latencies.map((l) => l.args.event_latency?.vsync_interval_ms).filter((v) => v > 0);
    if (elV.length) { vsyncUs = mode(elV) * 1000; vsyncSource = 'EventLatency.vsync_interval_ms'; }
  }
  if (!vsyncUs) {
    const bf = events.filter((e) => e.name === 'DisplayScheduler::BeginFrame').map((e) => e.args?.args?.interval_us).filter((v) => v > 0);
    if (bf.length) { vsyncUs = quantile(bf, 0.5); vsyncSource = 'DisplayScheduler::BeginFrame.interval_us'; }
  }
  if (!vsyncUs) {
    const bf = events.filter((e) => e.name === 'ExternalBeginFrameSource::OnBeginFrame').map((e) => e.args?.begin_frame_args?.interval_delta_us).filter((v) => v > 0);
    if (bf.length) { vsyncUs = quantile(bf, 0.5); vsyncSource = 'OnBeginFrame.interval_delta_us'; }
  }
  const vsyncMs = vsyncUs ? vsyncUs / 1000 : null;

  // -- presentation timestamps (us)
  let presentSource = 'Display::FrameDisplayed';
  let present = events.filter((e) => e.name === 'Display::FrameDisplayed').map((e) => e.ts);
  if (!present.length) {
    presentSource = 'Graphics.Pipeline.DrawAndSwap end';
    present = events.filter((e) => e.name === 'Graphics.Pipeline.DrawAndSwap' && e.ph === 'e').map((e) => e.ts);
  }
  if (!present.length) {
    presentSource = 'Display::DrawAndSwap end (not vsync-aligned)';
    present = events.filter((e) => e.name === 'Display::DrawAndSwap' && e.ph === 'X').map((e) => e.ts + (e.dur || 0));
  }
  if (!present.length) { presentSource = null; notes.push('no presentation events (viz not traced?)'); }
  const presentSet = new Set(present);
  const presented = [...presentSet].sort((a, b) => a - b);

  // -- scroll window: first scroll-update input -> last presented scroll update
  const presentedUpdates = myUpdates.filter((u) => presentSet.has(u.endTs));
  const firstInput = myUpdates.length ? Math.min(...myUpdates.map((u) => u.ts)) : null;
  let w0 = presentedUpdates.length ? Math.min(...presentedUpdates.map((u) => u.endTs)) : null;
  let w1 = presentedUpdates.length ? Math.max(...presentedUpdates.map((u) => u.endTs)) : null;
  if (w0 == null && myUpdates.length) {
    w0 = Math.min(...myUpdates.map((u) => u.endTs));
    w1 = Math.max(...myUpdates.map((u) => u.endTs));
    notes.push('presentation timestamps could not be matched to scroll updates; window = scroll-update end times');
  }

  const out = {
    rendererPid,
    vsyncMs: round(vsyncMs, 3),
    refreshHz: vsyncMs ? round(1000 / vsyncMs, 1) : null,
    vsyncSource,
    presentSource,
    scrollUpdates: myUpdates.length,
    presentedScrollUpdates: presentedUpdates.length,
    windowMs: w0 != null ? round((w1 - w0) / 1000, 1) : null,
  };

  // -- presentation intervals inside the window
  const inWin = w0 != null ? presented.filter((t) => t >= w0 && t <= w1) : [];
  const intervals = [];
  for (let i = 1; i < inWin.length; i++) intervals.push((inWin[i] - inWin[i - 1]) / 1000);
  const drawn = w0 != null ? events.filter((e) => e.name === 'Display::DrawAndSwap' && e.ph === 'X' && e.ts >= w0 && e.ts <= w1).length : 0;
  out.presentedFrames = inWin.length;
  out.drawnFrames = drawn;
  out.presentedFps = intervals.length ? round((intervals.length / ((w1 - w0) / 1e6)), 1) : null;
  out.drawnFps = intervals.length ? round((Math.max(0, drawn - 1) / ((w1 - w0) / 1e6)), 1) : null;
  out.intervalP50Ms = round(quantile(intervals, 0.5), 2);
  out.intervalP95Ms = round(quantile(intervals, 0.95), 2);
  out.intervalP99Ms = round(quantile(intervals, 0.99), 2);
  out.intervalMaxMs = intervals.length ? round(Math.max(...intervals), 2) : null;
  if (vsyncMs && intervals.length) {
    const vsyncs = intervals.map((d) => Math.max(1, Math.round(d / vsyncMs)));
    const expected = vsyncs.reduce((a, b) => a + b, 0);
    out.longIntervalPct = round((100 * intervals.filter((d) => d > 1.5 * vsyncMs).length) / intervals.length, 1);
    out.vsyncHitPct = round((100 * intervals.length) / expected, 1);
    out.missedVsyncsPresent = expected - intervals.length;
    const hist = {};
    for (const v of vsyncs) { const k = v >= 6 ? '6+' : String(v); hist[k] = (hist[k] || 0) + 1; }
    out.intervalHistVsyncs = hist;
  } else {
    out.longIntervalPct = null; out.vsyncHitPct = null; out.missedVsyncsPresent = null; out.intervalHistVsyncs = null;
  }

  // -- ScrollJankV4 (Chrome's own scroll-jank attribution)
  const janky = sj.filter((j) => j.is_janky);
  const byReason = {};
  let missed = 0;
  for (const j of janky) {
    let worst = 0;
    for (const r of j.missed_vsyncs_per_jank_reason || []) {
      byReason[r.jank_reason] = (byReason[r.jank_reason] || 0) + r.missed_vsyncs;
      worst = Math.max(worst, r.missed_vsyncs);
    }
    missed += worst; // reasons overlap: a frame's missed vsyncs = its worst reason
  }
  out.sjFrames = sj.length;
  out.sjJankyFrames = janky.length;
  out.sjJankyPct = sj.length ? round((100 * janky.length) / sj.length, 1) : null;
  out.sjMissedVsyncs = sj.length ? missed : null;
  const scrollSec = firstInput != null && w1 != null ? (w1 - firstInput) / 1e6 : null;
  out.sjMissedVsyncsPerSec = sj.length && scrollSec ? round(missed / scrollSec, 1) : null;
  out.sjMissedByReason = byReason;

  // -- input -> presentation latency (EventLatency of presented scroll updates)
  const lat = presentedUpdates.map((u) => u.dur / 1000);
  out.latencyP50Ms = round(quantile(lat, 0.5), 1);
  out.latencyP95Ms = round(quantile(lat, 0.95), 1);
  out.latencyMaxMs = lat.length ? round(Math.max(...lat), 1) : null;

  // -- renderer main thread (needs devtools.timeline categories)
  const mainTid = events.find((e) => e.ph === 'M' && e.name === 'thread_name' && e.pid === rendererPid && e.args?.name === 'CrRendererMain')?.tid;
  const hasTimeline = events.some((e) => e.name === 'RunTask' && e.cat.includes('devtools.timeline'));
  if (mainTid != null && hasTimeline && w0 != null) {
    const m0 = firstInput ?? w0;
    const m1 = w1;
    const winMs = (m1 - m0) / 1000;
    const X = events.filter((e) => e.ph === 'X' && e.pid === rendererPid && e.tid === mainTid && typeof e.dur === 'number' && e.ts < m1 && e.ts + e.dur > m0);
    const tasks = X.filter((e) => e.name === 'RunTask');
    const busy = tasks.reduce((s, e) => s + overlap(e.ts, e.ts + e.dur, m0, m1), 0) / 1000;
    const long = tasks.filter((e) => e.dur / 1000 > LONG_TASK_MS);
    const sumBy = (names) => X.filter((e) => names.includes(e.name)).reduce((s, e) => s + e.dur, 0) / 1000;
    const paints = X.filter((e) => e.name === 'Paint').length;
    out.mainBusyPct = winMs > 0 ? round((100 * busy) / winMs, 1) : null;
    out.mainBusyMs = round(busy, 1);
    out.longTasks = long.length;
    out.longTaskMs = round(long.reduce((s, e) => s + e.dur, 0) / 1000, 1);
    out.rafMs = round(sumBy(['FireAnimationFrame']), 1);
    out.styleLayoutMs = round(sumBy(['UpdateLayoutTree', 'Layout']), 1);
    out.paintMs = round(sumBy(['Paint', 'PrePaint', 'Layerize']), 1);
    out.paints = paints;
    out.paintsPerFrame = inWin.length ? round(paints / inWin.length, 2) : null;
    out.mainFrames = X.filter((e) => e.name === 'PrePaint').length; // one lifecycle update per main frame
  } else {
    Object.assign(out, { mainBusyPct: null, mainBusyMs: null, longTasks: null, longTaskMs: null, rafMs: null, styleLayoutMs: null, paintMs: null, paints: null, paintsPerFrame: null, mainFrames: null });
    if (!hasTimeline) notes.push('main-thread metrics need --trace=full');
  }
  out.notes = notes;
  if (opts.raw) out.raw = { intervalsMs: intervals, latenciesMs: lat, windowMs: w0 != null ? (w1 - w0) / 1000 : 0 };
  return out;
}

// Per-gesture metrics that scroll.mjs summarizes (median + IQR) and compares.
// dir: +1 = higher is better, -1 = lower is better.
export const SCROLL_METRICS = [
  { key: 'presentedFps', label: 'presented fps', dir: +1, digits: 0 },
  { key: 'vsyncHitPct', label: 'vsync hit %', dir: +1, digits: 0 },
  { key: 'intervalP50Ms', label: 'interval p50 ms', dir: -1, digits: 1 },
  { key: 'intervalP95Ms', label: 'interval p95 ms', dir: -1, digits: 1 },
  { key: 'intervalP99Ms', label: 'interval p99 ms', dir: -1, digits: 1 },
  { key: 'longIntervalPct', label: '>1.5×vsync %', dir: -1, digits: 0 },
  { key: 'sjJankyPct', label: 'janky % (SJv4)', dir: -1, digits: 0 },
  { key: 'sjMissedVsyncsPerSec', label: 'missed vsync/s (SJv4)', dir: -1, digits: 0 },
  { key: 'latencyP50Ms', label: 'input→present p50 ms', dir: -1, digits: 1 },
  { key: 'latencyP95Ms', label: 'input→present p95 ms', dir: -1, digits: 1 },
  { key: 'mainBusyPct', label: 'main busy %', dir: -1, digits: 0 },
  { key: 'longTasks', label: 'long tasks', dir: -1, digits: 0 },
  { key: 'paintsPerFrame', label: 'paints/frame', dir: -1, digits: 2 },
];
