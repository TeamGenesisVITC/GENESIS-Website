// scripts/perf/lib/scroll-report.mjs
// Markdown for scroll.mjs results (schema genesis-scroll/1) and the before/after comparison.

import { SCROLL_METRICS } from './scroll-trace.mjs';

export const SCROLL_SCHEMA = 'genesis-scroll/1';

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const fmt = (v, d = 1) => (isNum(v) ? v.toFixed(d) : 'n/a');
const metricDef = (key) => SCROLL_METRICS.find((m) => m.key === key) || { key, digits: 1 };
const median = (v) => { const s = v.filter(isNum).sort((a, b) => a - b); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : null; };

// "median [p25–p75]"
export function cell(s, digits = 1) {
  if (!s || !isNum(s.median)) return 'n/a';
  if (s.n < 2) return fmt(s.median, digits);
  return `${fmt(s.median, digits)} [${fmt(s.p25, digits)}–${fmt(s.p75, digits)}]`;
}

const pair = (a, b, d) => {
  if (!a || !isNum(a.median)) return 'n/a';
  return `${fmt(a.median, d)} / ${fmt(b?.median, d)}`;
};

function header(r) {
  const e = r.env || {};
  const L = [];
  L.push(`- **When / what:** ${r.date} · commit ${r.git?.commit ?? '?'}${r.git?.dirty ? ' (dirty)' : ''} · target ${r.target?.mode === 'url' ? r.target.origin : `--dir ${r.target?.dir}`} (${r.target?.notFoundHandling ?? 'n/a'})`);
  L.push(`- **Browser:** ${e.browser ?? '?'} · ${r.options.headless ? 'headless' : 'headed (real GPU path, window must stay visible)'} · GPU: ${e.gpu ?? 'n/a'}`);
  L.push(`- **Display:** ${isNum(e.refreshHz) ? `${e.refreshHz} Hz (vsync ${fmt(e.vsyncMs, 3)} ms, from ${e.vsyncSource})` : 'n/a'} · DPR ${e.dpr ?? '?'}${r.options.dpr ? ' (forced)' : ' (native)'} · viewport ${e.viewport ?? '?'}`);
  L.push(`- **Gesture:** Input.synthesizeScrollGesture, ${r.options.source} source, ${r.options.speed} px/s, ≤ ${r.options.distance} px per gesture, downwards, ${r.options.align}-aligned in each section`);
  L.push(`- **Design:** ${r.options.runs} runs per target, order shuffled per round (seed ${r.options.seed}), calibration page shuffled in like a section; ${r.options.warmup ? '1 discarded warm-up round first' : 'no warm-up'}; every measurement re-navigates the one tab (via about:blank) with a warm HTTP cache; trace \`${r.options.trace}\` (${(r.options.categories || []).join(', ')})`);
  const all = (r.targets || []).flatMap((t) => t.runs);
  const readyWait = all.some((x) => 'readyMarkMs' in x) ? ", the landing's `genesis:ready` mark" : '';
  L.push(`- **State before each gesture:** fresh document, HTTP cache warm${r.options.warmup ? ' (warm-up round)' : ' (no warm-up: the first visit of each target is cold)'}; waited for load, network idle, fonts${readyWait}, the jump to the start position, network idle again and ${r.options.settleMs} ms`);
  const unfocused = all.filter((x) => x.focused === false).length;
  const hidden = all.filter((x) => x.visibility && x.visibility !== 'visible').length;
  if (r.hostGpu?.length) {
    const names = [...new Set(r.hostGpu.flatMap((s) => Object.keys(s).filter((k) => k !== 'round')))];
    const med = names.map((n) => [n, median(r.hostGpu.map((s) => s[n] ?? 0))]).filter(([, v]) => v >= 2).sort((a, b) => b[1] - a[1]);
    L.push(`- **Other GPU load:** ${med.length ? med.map(([n, v]) => `${n} ${fmt(v, 0)} %`).join(', ') : 'none above 2 %'} (median over rounds of the Windows "GPU Engine" 3D utilization per process, sampled before each round${med.some(([n, v]) => !/^(chrome|dwm)$/i.test(n) && v >= 10) ? ' — **another application was using the GPU: absolute numbers are depressed, read the rows relative to calibration**' : ''})`);
  }
  if (all.some((x) => 'focused' in x)) L.push(`- **Window state:** ${hidden ? `**${hidden} run(s) with the page not visible**` : 'page visible in every run'}; ${unfocused ? `${unfocused} of ${all.length} run(s) without keyboard focus (another window was active)` : 'focused in every run'}`);
  if (r.options.css) L.push(`- **CSS ablation:** \`${r.options.css}\` — ${r.cssVerification ?? 'not verified'}`);
  if (r.options.block?.length) L.push(`- **Blocked:** ${r.options.block.map((b) => `\`${b}\``).join(', ')}`);
  if (r.options.query) L.push(`- **Query:** \`${r.options.query}\``);
  return L;
}

export function scrollMarkdown(r) {
  const L = [];
  L.push(`# Scroll smoothness — ${r.label}`, '');
  L.push(...header(r), '');
  L.push('Cells: median [p25–p75] over the runs. Presented frames = distinct presentation timestamps (`Display::FrameDisplayed`) between the first and last presented scroll update. See scripts/perf/README.md "Scroll smoothness" for every definition.', '');

  const targets = r.targets;
  L.push('## Smoothness', '');
  L.push('| target | scroll range (px) | runs ok | presented fps | vsync hit % | interval p50 / p95 / p99 ms | >1.5×vsync % | janky % (SJv4) | missed vsync/s (SJv4) | input→present p50 / p95 ms |');
  L.push('|---|---|---|---|---|---|---|---|---|---|');
  for (const t of targets) {
    const s = t.summary;
    const range = t.range ? `${t.range.start}–${t.range.end} (${t.distance} px)` : '—';
    L.push(`| ${t.name} | ${range} | ${t.okRuns}/${t.runs.length} | ${cell(s.presentedFps, 0)} | ${cell(s.vsyncHitPct, 0)} | ${pair(s.intervalP50Ms, s.intervalP95Ms, 1)} / ${fmt(s.intervalP99Ms?.median, 1)} | ${cell(s.longIntervalPct, 0)} | ${cell(s.sjJankyPct, 0)} | ${cell(s.sjMissedVsyncsPerSec, 0)} | ${pair(s.latencyP50Ms, s.latencyP95Ms, 1)} |`);
  }
  L.push('');
  L.push('## Cost while scrolling', '');
  L.push('| target | main busy % | long tasks (>50 ms) | paints / frame | rAF ms | style+layout ms | paint ms | drawn fps | host CPU busy % |');
  L.push('|---|---|---|---|---|---|---|---|---|');
  for (const t of targets) {
    const s = t.summary;
    L.push(`| ${t.name} | ${cell(s.mainBusyPct, 0)} | ${cell(s.longTasks, 0)} | ${cell(s.paintsPerFrame, 2)} | ${cell(s.rafMs, 0)} | ${cell(s.styleLayoutMs, 0)} | ${cell(s.paintMs, 0)} | ${cell(s.drawnFps, 0)} | ${cell(s.hostCpuBusyPct, 0)} |`);
  }
  L.push('');

  const withSc = targets.filter((t) => t.summary.sc_draws?.n);
  if (withSc.length) {
    L.push('## Scroll canvas counters (`window.__sc`, `?scstats`)', '');
    L.push('Deltas over the traced gesture. draws = canvas redraws; missA = draws without the exact atlas for that frame (nearest resident frame shown); blank = draws with no atlas at all; resident = peak decoded atlases so far in that page load. `genesis:ready` = the landing\'s ready mark (ms after navigation start).', '');
    L.push('| target | canvas draws | draws / presented frame | missA | blank | resident atlases | genesis:ready ms |');
    L.push('|---|---|---|---|---|---|---|');
    for (const t of withSc) {
      const s = t.summary;
      L.push(`| ${t.name} | ${cell(s.sc_draws, 0)} | ${cell(s.scDrawsPerFrame, 2)} | ${cell(s.sc_missA, 0)} | ${cell(s.sc_blank, 0)} | ${cell(s.sc_resident, 0)} | ${cell(s.readyMarkMs, 0)} |`);
    }
    L.push('');
  }

  const cal = targets.find((t) => t.name === 'calibration');
  if (cal && isNum(cal.summary.presentedFps?.median)) {
    L.push('## Relative to the calibration page', '');
    L.push('Medians of the ratio section ÷ calibration taken *within the same round* (so slow drift of the machine cancels out). 1.00 = as smooth as a plain text page in this session.', '');
    L.push('| target | presented fps ratio | janky % − calibration | >1.5×vsync % − calibration |');
    L.push('|---|---|---|---|');
    for (const t of targets) {
      if (t.name === 'calibration') continue;
      L.push(`| ${t.name} | ${cell(t.vsCalibration?.fpsRatio, 2)} | ${cell(t.vsCalibration?.jankyPctDelta, 0)} | ${cell(t.vsCalibration?.longIntervalPctDelta, 0)} |`);
    }
    L.push('');
  }

  const problems = [];
  for (const t of targets) {
    for (const run of t.runs) {
      if (run.error) problems.push(`- ${t.name} round ${run.round}: **error** ${run.error}`);
      else if (!run.inSection) problems.push(`- ${t.name} round ${run.round}: **left its section** — ${run.verify}`);
      if (run.dataLoss) problems.push(`- ${t.name} round ${run.round}: trace buffer data loss`);
      for (const n of run.notes || []) problems.push(`- ${t.name} round ${run.round}: ${n}`);
    }
  }
  L.push('## Run log', '');
  if (problems.length) L.push(...[...new Set(problems)]);
  else L.push('All gestures stayed inside their sections; no trace data loss; no analysis notes.');
  L.push('');
  L.push('Per-round order: ' + r.rounds.map((o, i) => `${i + 1}: ${o.join(' → ')}`).join('; '), '');
  return L.join('\n');
}

// ---------------------------------------------------------------- compare
// A difference is "~noise" when either median lies inside the other side's run-to-run IQR.
export function verdict(a, b, dir) {
  if (!a || !b || !isNum(a.median) || !isNum(b.median)) return 'n/a';
  const inside = (v, s) => isNum(s.p25) && v >= s.p25 && v <= s.p75;
  if (a.median === b.median || inside(b.median, a) || inside(a.median, b)) return '~noise';
  const better = dir > 0 ? b.median > a.median : b.median < a.median;
  return better ? 'better' : 'worse';
}

export function compareScrollMarkdown(a, b, { labels = [a.label, b.label] } = {}) {
  const L = [];
  L.push(`# Scroll smoothness: ${labels[0]} → ${labels[1]}`, '');
  L.push(`- before: ${a.date} · commit ${a.git?.commit ?? '?'} · ${a.env?.browser ?? '?'} · ${a.options.headless ? 'headless' : 'headed'} · DPR ${a.env?.dpr} · ${a.env?.refreshHz} Hz · ${a.options.runs} runs · trace ${a.options.trace}${a.options.css ? ` · css \`${a.options.css}\`` : ''}${a.options.block?.length ? ` · block ${a.options.block.join(',')}` : ''}`);
  L.push(`- after:  ${b.date} · commit ${b.git?.commit ?? '?'} · ${b.env?.browser ?? '?'} · ${b.options.headless ? 'headless' : 'headed'} · DPR ${b.env?.dpr} · ${b.env?.refreshHz} Hz · ${b.options.runs} runs · trace ${b.options.trace}${b.options.css ? ` · css \`${b.options.css}\`` : ''}${b.options.block?.length ? ` · block ${b.options.block.join(',')}` : ''}`);
  const warn = [];
  for (const k of ['headless', 'source', 'speed', 'distance', 'trace', 'align']) if (a.options[k] !== b.options[k]) warn.push(`${k}: ${a.options[k]} vs ${b.options[k]}`);
  if (a.env?.dpr !== b.env?.dpr) warn.push(`DPR: ${a.env?.dpr} vs ${b.env?.dpr}`);
  if (a.env?.viewport !== b.env?.viewport) warn.push(`viewport: ${a.env?.viewport} vs ${b.env?.viewport}`);
  if (a.env?.gpu !== b.env?.gpu) warn.push(`GPU: ${a.env?.gpu} vs ${b.env?.gpu}`);
  const busy = (r) => {
    if (!r.hostGpu?.length) return null; // not recorded (Linux/macOS, or a result from before it existed)
    const names = [...new Set(r.hostGpu.flatMap((s) => Object.keys(s).filter((k) => k !== 'round')))];
    return names.map((n) => [n, median(r.hostGpu.map((s) => s[n] ?? 0))]).filter(([n, v]) => !/^(chrome|dwm)$/i.test(n) && v >= 10).map(([n, v]) => `${n} ${fmt(v, 0)} %`).join(', ');
  };
  const [ba, bb] = [busy(a), busy(b)];
  if (ba || bb) warn.push(`other GPU load: before ${ba ?? 'not recorded'}${ba === '' ? 'none' : ''}, after ${bb ?? 'not recorded'}${bb === '' ? 'none' : ''}`);
  if (warn.length) L.push('', `> **Not like for like:** ${warn.join('; ')}.`);
  L.push('', 'Each cell: before → after median (Δ). **~noise** = one median lies inside the other run set\'s IQR (p25–p75); otherwise better/worse by the metric\'s direction.', '');

  const calA = a.targets.find((t) => t.name === 'calibration');
  const calB = b.targets.find((t) => t.name === 'calibration');
  if (calA && calB) {
    const v = verdict(calA.summary.presentedFps, calB.summary.presentedFps, +1);
    if (v !== '~noise' && v !== 'n/a') {
      L.push(`> **The calibration page itself changed (${fmt(calA.summary.presentedFps.median, 0)} → ${fmt(calB.summary.presentedFps.median, 0)} presented fps):** the machine/session differed between the runs. Trust the "relative to calibration" rows more than the absolute ones.`, '');
    }
  }

  const keys = SCROLL_METRICS.map((m) => m.key);
  const names = [...new Set([...a.targets.map((t) => t.name), ...b.targets.map((t) => t.name)])];
  L.push(`| metric | ${names.join(' | ')} |`);
  L.push(`|---|${names.map(() => '---').join('|')}|`);
  for (const key of keys) {
    const m = metricDef(key);
    const cells = names.map((n) => {
      const ta = a.targets.find((t) => t.name === n);
      const tb = b.targets.find((t) => t.name === n);
      const sa = ta?.summary?.[key];
      const sb = tb?.summary?.[key];
      if (!sa || !sb || !isNum(sa.median) || !isNum(sb.median)) return 'n/a';
      const d = sb.median - sa.median;
      const v = verdict(sa, sb, m.dir);
      const tag = v === '~noise' ? '~noise' : `**${v}**`;
      return `${fmt(sa.median, m.digits)} → ${fmt(sb.median, m.digits)} (${d >= 0 ? '+' : ''}${fmt(d, m.digits)}) ${tag}`;
    });
    L.push(`| ${m.label} | ${cells.join(' | ')} |`);
  }
  // relative-to-calibration rows
  const rel = [['fpsRatio', 'fps ÷ calibration', +1, 2], ['jankyPctDelta', 'janky % − calibration', -1, 0], ['longIntervalPctDelta', '>1.5×vsync % − calibration', -1, 0]];
  for (const [key, label, dir, digits] of rel) {
    const cells = names.map((n) => {
      if (n === 'calibration') return '—';
      const sa = a.targets.find((t) => t.name === n)?.vsCalibration?.[key];
      const sb = b.targets.find((t) => t.name === n)?.vsCalibration?.[key];
      if (!sa || !sb || !isNum(sa.median) || !isNum(sb.median)) return 'n/a';
      const d = sb.median - sa.median;
      const v = verdict(sa, sb, dir);
      return `${fmt(sa.median, digits)} → ${fmt(sb.median, digits)} (${d >= 0 ? '+' : ''}${fmt(d, digits)}) ${v === '~noise' ? '~noise' : `**${v}**`}`;
    });
    L.push(`| ${label} | ${cells.join(' | ')} |`);
  }
  L.push('');
  return L.join('\n');
}
