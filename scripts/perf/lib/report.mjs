// scripts/perf/lib/report.mjs
// Markdown rendering for ux.mjs results and before/after comparisons.

import { TYPES } from './pageload.mjs';

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
export const fmtS = (ms) => (isNum(ms) ? `${(ms / 1000).toFixed(2)} s` : 'n/a');
export const fmtMsInt = (ms) => (isNum(ms) ? `${Math.round(ms)} ms` : 'n/a');
export const fmtBytes = (b) => {
  if (!isNum(b)) return 'n/a';
  if (b >= 1048576) return `${(b / 1048576).toFixed(2)} MB`;
  return `${(b / 1024).toFixed(1)} KB`;
};
const fmtKBplain = (b) => (isNum(b) ? (b / 1024).toFixed(1) : 'n/a');
const fmtCls = (v) => (isNum(v) ? v.toFixed(3) : 'n/a');
const fmtInt = (v) => (isNum(v) ? String(Math.round(v)) : 'n/a');
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const trunc = (s, n = 70) => {
  if (s == null) return '(missing)';
  const t = String(s);
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
};

export const METRICS = [
  // key, label, formatter, lower-is-better
  ['docStatus', 'HTTP status', fmtInt],
  ['ttfb', 'TTFB', fmtMsInt],
  ['fcp', 'FCP', fmtS],
  ['lcp', 'LCP', fmtS],
  ['cls', 'CLS', fmtCls],
  ['tbt', 'TBT', fmtMsInt],
  ['tti', 'TTI', fmtS],
  ['load', 'load event', fmtS],
  ['ready', 'ready ("/" only)', fmtS],
  ['reqLoad', 'requests until load', fmtInt],
  ['bytesLoad', 'bytes until load', fmtBytes],
  ['reqReady', 'requests until ready', fmtInt],
  ['bytesReady', 'bytes until ready', fmtBytes],
  ['reqTotal', 'requests (whole window)', fmtInt],
  ['bytesTotal', 'bytes (whole window)', fmtBytes],
  ['bytes_html', 'bytes: HTML', fmtBytes],
  ['bytes_js', 'bytes: JS', fmtBytes],
  ['bytes_css', 'bytes: CSS', fmtBytes],
  ['bytes_font', 'bytes: fonts', fmtBytes],
  ['bytes_img', 'bytes: images', fmtBytes],
  ['bytes_atlas', 'bytes: atlases', fmtBytes],
  ['bytes_media', 'bytes: media', fmtBytes],
  ['bytes3p', 'bytes: third-party', fmtBytes],
  ['longTaskMs', 'long tasks total', fmtMsInt],
  ['revalidated304', 'requests revalidated (304)', fmtInt],
  ['cachedReq', 'requests served from cache', fmtInt],
];
const METRIC_FMT = Object.fromEntries(METRICS.map(([k, , f]) => [k, f]));

function envLines(r) {
  const e = r.env || {};
  const src = r.source || {};
  const lines = [];
  lines.push(`- **Measured:** ${r.createdAt} · label \`${r.label}\``);
  if (src.mode === 'dir') {
    lines.push(`- **Source:** \`--dir=${src.dir}\` served by the harness (${src.origin}) with Cloudflare-like static routing: html_handling \`${src.htmlHandling}\`, not-found \`${src.notFoundHandling}\`, \`_headers\` ${src.headersFile}, \`_redirects\` ${src.redirectsFile}, default Cache-Control \`${src.defaultCacheControl}\`, compression ${src.compression}.`);
  } else {
    lines.push(`- **Source:** \`--url=${src.origin}\` (already-running server; its own routing, headers and compression).`);
  }
  if (r.git) lines.push(`- **Code:** ${r.git.branch} @ ${r.git.commit}${r.git.dirty ? ' (uncommitted changes)' : ''} — ${esc(r.git.subject)}`);
  if (r.config?.thirdParty === 'block') lines.push('- **Third-party requests BLOCKED** (`--third-party=block`): first-party-only numbers; fonts fall back, FCP is not gated by Fontshare / Google Fonts.');
  lines.push(`- **Browser:** ${e.chrome || 'n/a'} (${e.headless ? 'headless=new, software raster' : 'headed'}), stock Chrome driven over CDP.`);
  lines.push(`- **Host:** ${e.cpu} (${e.logicalCores} logical cores), ${e.ramGB} GB RAM, ${e.os}, Node ${e.node}.`);
  if (r.mergedFrom) lines.push(`- **Merged:** profile(s) ${r.mergedFrom.profiles.join(', ') || 'none'}${r.mergedFrom.linkPreview ? ' and the link preview' : ''} come from \`${r.mergedFrom.file}\` measured ${r.mergedFrom.createdAt} (benchmarkIndex ${r.mergedFrom.env?.benchmarkIndexBefore ?? 'n/a'} → ${r.mergedFrom.env?.benchmarkIndexAfter ?? 'n/a'}).`);
  if (isNum(e.benchmarkIndexBefore)) lines.push(`- **Host benchmarkIndex** (Lighthouse-style, higher = faster): ${e.benchmarkIndexBefore} before, ${e.benchmarkIndexAfter ?? 'n/a'} after the run. Lower = slower or busier machine; compare it across results, and a gap between the two values means the load changed during the run.`);
  const busy = Object.values(r.pageLoad || {}).flatMap((byRoute) => Object.values(byRoute).flatMap((x) => (x.runs || []).map((run) => run.hostCpuBusyPct))).filter(isNum).sort((a, b) => a - b);
  if (busy.length) {
    const gate = r.config?.hostIdleGate;
    lines.push(`- **Host load during visits:** whole-machine CPU busy median ${busy[Math.floor(busy.length / 2)].toFixed(0)} % (range ${busy[0].toFixed(0)}–${busy[busy.length - 1].toFixed(0)} %), including the Chrome under test${gate ? `; before each visit the harness waited up to ${gate.maxWaitS} s for < ${gate.thresholdPct} %` : ''}.`);
  }
  return lines;
}

function profileLines(r) {
  const out = [];
  for (const [name, p] of Object.entries(r.config?.profiles || {})) {
    const net = p.network ? ` CDP network: latency ${p.network.latency} ms, down ${(p.network.downloadThroughput * 8 / 1e6).toFixed(2)} Mbps, up ${(p.network.uploadThroughput * 8 / 1e3).toFixed(0)} kbps.` : '';
    out.push(`- **${name}:** ${p.description}.${net} Window ends after load + ${p.quietMs / 1000} s network quiet (cap ${p.timeoutMs / 1000} s).`);
  }
  return out;
}

function pageLoadSection(r, pname) {
  const pl = r.pageLoad[pname];
  if (!pl) return [];
  const routes = Object.keys(pl);
  const runs = r.config?.runsByProfile?.[pname] ?? r.config?.runs;
  const L = [];
  L.push(`## ${pname} — medians of ${runs} cold-cache runs`, '');
  L.push('| route | HTTP | TTFB | FCP | LCP | CLS | TBT | TTI | load | ready | req @load | bytes @load | req total | bytes total |');
  L.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const route of routes) {
    const m = pl[route].median;
    const tti = isNum(m.tti) ? fmtS(m.tti) + (m.ttiReachedRuns < (m.okRuns ?? 0) ? '*' : '') : 'not reached';
    L.push(`| \`${route}\` | ${fmtInt(m.docStatus)} | ${fmtMsInt(m.ttfb)} | ${fmtS(m.fcp)} | ${fmtS(m.lcp)} | ${fmtCls(m.cls)} | ${fmtMsInt(m.tbt)} | ${tti} | ${fmtS(m.load)} | ${route === '/' ? fmtS(m.ready) : '—'} | ${fmtInt(m.reqLoad)} | ${fmtBytes(m.bytesLoad)} | ${fmtInt(m.reqTotal)} | ${fmtBytes(m.bytesTotal)} |`);
  }
  L.push('');
  L.push('### Transferred bytes by type (KB, whole observation window, median)', '');
  L.push(`| route | ${TYPES.join(' | ')} | of which third-party |`);
  L.push(`|---|${TYPES.map(() => '---:').join('|')}|---:|`);
  for (const route of routes) {
    const m = pl[route].median;
    L.push(`| \`${route}\` | ${TYPES.map((t) => `${fmtKBplain(m[`bytes_${t}`])} (${fmtInt(m[`req_${t}`])})`).join(' | ')} | ${fmtKBplain(m.bytes3p)} (${fmtInt(m.req3p)}) |`);
  }
  L.push('', '_Cells are KB (request count). "atlas" = scrollytelling frame atlases; "img" = all other images._', '');

  const land = pl['/'];
  if (land) {
    const m = land.median;
    const w = land.warm;
    L.push('### "/" readiness and repeat visit', '');
    L.push(`| | cold (median) | warm repeat visit |`);
    L.push('|---|---|---|');
    const row = (label, a, b) => L.push(`| ${label} | ${a} | ${b} |`);
    row('ready', fmtS(m.ready), w ? fmtS(w.ready) : 'n/a');
    row('ready signal', esc(m.readySource), w ? esc(w.readySource) : 'n/a');
    row('FCP / LCP', `${fmtS(m.fcp)} / ${fmtS(m.lcp)}`, w ? `${fmtS(w.fcp)} / ${fmtS(w.lcp)}` : 'n/a');
    row('load event', fmtS(m.load), w ? fmtS(w.load) : 'n/a');
    row('requests / bytes until ready', `${fmtInt(m.reqReady)} / ${fmtBytes(m.bytesReady)}`, w ? `${fmtInt(w.reqReady)} / ${fmtBytes(w.bytesReady)}` : 'n/a');
    row('requests / bytes whole window', `${fmtInt(m.reqTotal)} / ${fmtBytes(m.bytesTotal)}`, w ? `${fmtInt(w.reqTotal)} / ${fmtBytes(w.bytesTotal)}` : 'n/a');
    row('atlases requested / transferred', `${fmtInt(m.atlasCount)} / ${fmtBytes(m.atlasBytes)}`, w ? `${fmtInt(w.atlasCount)} / ${fmtBytes(w.atlasBytes)}` : 'n/a');
    row('first atlas / last atlas done', `${fmtS(m.atlasFirst)} / ${fmtS(m.atlasLast)}`, w ? `${fmtS(w.atlasFirst)} / ${fmtS(w.atlasLast)}` : 'n/a');
    row('served from cache / 304 revalidations', `${fmtInt(m.cachedReq)} / ${fmtInt(m.revalidated304)}`, w ? `${fmtInt(w.cachedReq)} / ${fmtInt(w.revalidated304)}` : 'n/a');
    row('preloader overlay seen', m.overlaySeen ? `yes (${esc(m.overlayDesc)})` : 'no', w ? (w.overlaySeen ? 'yes' : 'no') : 'n/a');
    row('LCP element', `\`${esc(trunc(m.lcpElement, 90))}\``, w ? `\`${esc(trunc(w.lcpElement, 90))}\`` : 'n/a');
    L.push('');
  }

  L.push('### Run-to-run variance (min – max over cold runs)', '');
  L.push('| route | FCP | LCP | TBT | load | ready | bytes total | host CPU busy | visits retried / runs with failed requests |');
  L.push('|---|---|---|---|---|---|---|---|---|');
  const rng = (p, k, f) => (isNum(p.min[k]) ? `${f(p.min[k])} – ${f(p.max[k])}` : 'n/a');
  for (const route of routes) {
    const p = pl[route];
    L.push(`| \`${route}\` | ${rng(p, 'fcp', fmtS)} | ${rng(p, 'lcp', fmtS)} | ${rng(p, 'tbt', fmtMsInt)} | ${rng(p, 'load', fmtS)} | ${route === '/' ? rng(p, 'ready', fmtS) : '—'} | ${rng(p, 'bytesTotal', fmtBytes)} | ${rng(p, 'hostCpuBusyPct', (v) => `${v.toFixed(0)}%`)} | ${(p.runs || []).filter((x) => x.attempts > 1).length} / ${(p.runs || []).filter((x) => x.failedReq > 0 || x.error).length} |`);
  }
  L.push('');
  const lcpRows = routes.filter((rt) => pl[rt].median.lcpElement);
  if (lcpRows.length) {
    L.push('<details><summary>LCP elements</summary>', '');
    for (const rt of lcpRows) L.push(`- \`${rt}\`: \`${esc(trunc(pl[rt].median.lcpElement, 140))}\``);
    L.push('', '</details>', '');
  }
  return L;
}

function linkPreviewSection(rows) {
  if (!rows) return [];
  const L = ['## Link previews (raw HTML, no JavaScript — what WhatsApp / LinkedIn / Slack bots see)', ''];
  L.push('| route | HTTP | `<title>` | meta description | og:title | og:description | og:image | canonical | twitter:card |');
  L.push('|---|---|---|---|---|---|---|---|---|');
  for (const r of rows) {
    if (r.error) { L.push(`| \`${r.route}\` | error | ${esc(r.error)} | | | | | | |`); continue; }
    const status = `${r.status}${r.redirects?.length ? ` (via ${r.redirects.join(', ')})` : ''}`;
    const same = r.sameTitleAsHome ? ' **[same as /]**' : '';
    L.push(`| \`${r.route}\` | ${esc(status)} | ${esc(trunc(r.title, 60))}${same} | ${esc(trunc(r.description, 60))} | ${esc(trunc(r.ogTitle, 50))} | ${esc(trunc(r.ogDescription, 50))} | ${esc(trunc(r.ogImage, 50))} | ${esc(trunc(r.canonical, 50))} | ${esc(r.twitterCard ?? '(missing)')} |`);
  }
  L.push('');
  const checks = new Map();
  for (const r of rows) if (r.ogImageCheck) checks.set(r.ogImageCheck.checkedUrl, r.ogImageCheck);
  for (const [, c] of checks) {
    L.push(`- og:image check: \`${c.checkedUrl}\`${c.mappedToLocal ? ' (production URL mapped onto the local origin)' : ''} → HTTP ${c.status ?? 'error'}, ${c.type ?? 'n/a'}, ${fmtBytes(c.bytes)}${c.dims ? `, ${c.dims.w}×${c.dims.h}` : ''}.`);
  }
  const prerendered = rows.filter((r) => !r.error && r.textChars > 200).map((r) => r.route);
  L.push(`- Routes whose raw HTML contains visible text outside \`<noscript>\` (prerendered content): ${prerendered.length ? prerendered.map((x) => `\`${x}\``).join(', ') : 'none'}.`);
  const sameAll = rows.filter((r) => r.sameOgAsHome).map((r) => r.route);
  if (sameAll.length) L.push(`- Routes whose title / og tags are identical to "/" (bots cannot tell them apart): ${sameAll.map((x) => `\`${x}\``).join(', ')}.`);
  L.push('');
  return L;
}

export function toMarkdown(r) {
  const L = [`# Page-load UX report: ${r.label}`, ''];
  L.push(...envLines(r), '');
  // Optional hand-written observations stored in the result JSON ("notes": [..]).
  if (Array.isArray(r.notes) && r.notes.length) L.push('## Observations', '', ...r.notes.map((n) => `- ${n}`), '');
  L.push('### Profiles', '', ...profileLines(r), '');
  L.push('Metric notes: medians over cold runs, each in a fresh isolated browser context (empty HTTP cache, new connections). FCP/LCP/CLS from PerformanceObserver; TBT = Σ(long task − 50 ms) between FCP and TTI (Lighthouse definition; TTI = start of the first 5 s window with no long task and ≤ 2 requests in flight; `*` = not reached in every run, TBT then runs to the window end). Bytes are transferred bytes (headers + encoded body) from CDP, redirects included; "@load" = finished by the load event. "ready" applies to "/" only — see the readiness table for which signal was used.', '');
  for (const pname of Object.keys(r.pageLoad || {})) L.push(...pageLoadSection(r, pname));
  L.push(...linkPreviewSection(r.linkPreview));
  return L.join('\n') + '\n';
}

// ---------------------------------------------------------------- compare
const COMPARE_KEYS = ['docStatus', 'ttfb', 'fcp', 'lcp', 'cls', 'tbt', 'tti', 'load', 'ready', 'reqLoad', 'bytesLoad', 'reqReady', 'bytesReady', 'reqTotal', 'bytesTotal', 'bytes_html', 'bytes_js', 'bytes_css', 'bytes_font', 'bytes_img', 'bytes_atlas', 'bytes3p', 'longTaskMs'];

function deltaCell(key, before, after) {
  const f = METRIC_FMT[key] || fmtInt;
  const b = before?.median?.[key];
  const a = after?.median?.[key];
  if (!isNum(b) && !isNum(a)) return '—';
  if (key === 'docStatus') return b === a ? String(b) : `**${b ?? 'n/a'} → ${a ?? 'n/a'}**`;
  if (!isNum(b) || !isNum(a)) return `${f(b)} → ${f(a)}`;
  const pct = b === 0 ? (a === 0 ? 0 : Infinity) : ((a - b) / Math.abs(b)) * 100;
  const pctS = Number.isFinite(pct) ? `${pct > 0 ? '+' : ''}${pct.toFixed(0)}%` : 'new';
  // Within noise: after median falls inside the before min–max range (or vice versa).
  const inRange = (v, s) => isNum(s?.min?.[key]) && v >= s.min[key] && v <= s.max[key];
  const noisy = key !== 'docStatus' && (inRange(a, before) || inRange(b, after)) && Math.abs(a - b) > 0;
  const tiny = Number.isFinite(pct) && Math.abs(pct) < 1;
  const tag = a === b || tiny ? '' : noisy ? ' ~noise' : a < b ? ' better' : ' worse';
  return `${f(b)} → ${f(a)} (${pctS}${tag})`;
}

export function compareMarkdown(before, after) {
  const L = [`# Before / after: \`${before.label}\` → \`${after.label}\``, ''];
  const src = (r) => (r.source?.mode === 'dir' ? `--dir=${r.source.dir} (harness server, 404=${r.source.notFoundHandling}, _headers ${r.source.headersFile})` : `--url=${r.source?.origin}`);
  L.push(`- **Before:** ${src(before)} · ${before.git?.commit ?? '?'} · ${before.createdAt} · ${before.env?.chrome ?? ''} · benchmarkIndex ${before.env?.benchmarkIndexBefore ?? 'n/a'}`);
  L.push(`- **After:** ${src(after)} · ${after.git?.commit ?? '?'} · ${after.createdAt} · ${after.env?.chrome ?? ''} · benchmarkIndex ${after.env?.benchmarkIndexBefore ?? 'n/a'}`);
  L.push('', 'Cells: before median → after median (relative change). Lower is better for every row. `~noise` = the after median lies inside the before run range (or the before median inside the after range), so the difference is not distinguishable from run-to-run variance. Byte counts are deterministic and rarely noisy; timings are. Compare runs made on the same machine under similar load (see benchmarkIndex).', '');
  if ((before.config?.thirdParty || 'live') !== (after.config?.thirdParty || 'live')) L.push(`> Warning: third-party mode differs (before: ${before.config?.thirdParty || 'live'}, after: ${after.config?.thirdParty || 'live'}).`, '');
  if (before.env?.cpu !== after.env?.cpu || before.env?.chrome !== after.env?.chrome) {
    L.push(`> Warning: environments differ (before: ${before.env?.cpu} / ${before.env?.chrome}; after: ${after.env?.cpu} / ${after.env?.chrome}).`, '');
  }
  const profiles = [...new Set([...Object.keys(before.pageLoad || {}), ...Object.keys(after.pageLoad || {})])];
  for (const p of profiles) {
    const bp = before.pageLoad?.[p] || {};
    const ap = after.pageLoad?.[p] || {};
    const routes = [...new Set([...Object.keys(bp), ...Object.keys(ap)])];
    L.push(`## ${p}`, '');
    L.push(`| metric | ${routes.map((r) => `\`${r}\``).join(' | ')} |`);
    L.push(`|---|${routes.map(() => '---').join('|')}|`);
    for (const key of COMPARE_KEYS) {
      if (key === 'reqReady' || key === 'bytesReady' || key === 'ready') {
        L.push(`| ${METRICS.find(([k]) => k === key)?.[1] ?? key} | ${routes.map((r) => (r === '/' ? deltaCell(key, bp[r], ap[r]) : '—')).join(' | ')} |`);
        continue;
      }
      const label = METRICS.find(([k]) => k === key)?.[1] ?? key;
      L.push(`| ${label} | ${routes.map((r) => deltaCell(key, bp[r], ap[r])).join(' | ')} |`);
    }
    L.push('');
    const bw = bp['/']?.warm;
    const aw = ap['/']?.warm;
    if (bw || aw) {
      const wrap = (w) => (w ? { median: w } : null);
      L.push(`### ${p}: "/" warm repeat visit (single run each)`, '');
      L.push('| metric | before → after |', '|---|---|');
      for (const key of ['fcp', 'lcp', 'load', 'ready', 'reqTotal', 'bytesTotal', 'revalidated304', 'cachedReq']) {
        L.push(`| ${METRICS.find(([k]) => k === key)?.[1] ?? key} | ${deltaCell(key, wrap(bw), wrap(aw))} |`);
      }
      L.push('');
    }
    const br = bp['/']?.median?.readySource;
    const ar = ap['/']?.median?.readySource;
    if (br || ar) L.push(`"/" ready signal — before: ${br ?? 'n/a'}; after: ${ar ?? 'n/a'}.`, '');
  }

  if (before.linkPreview || after.linkPreview) {
    L.push('## Link previews (raw HTML)', '');
    L.push('| route | HTTP | title | og:title | og:description | canonical | og:image |');
    L.push('|---|---|---|---|---|---|---|');
    const routes = [...new Set([...(before.linkPreview || []).map((r) => r.route), ...(after.linkPreview || []).map((r) => r.route)])];
    const ch = (a, b, n = 45) => (a === b ? esc(trunc(b, n)) : `${esc(trunc(a, n))} → **${esc(trunc(b, n))}**`);
    for (const route of routes) {
      const b = (before.linkPreview || []).find((r) => r.route === route) || {};
      const a = (after.linkPreview || []).find((r) => r.route === route) || {};
      L.push(`| \`${route}\` | ${ch(b.status, a.status)} | ${ch(b.title, a.title)} | ${ch(b.ogTitle, a.ogTitle)} | ${ch(b.ogDescription, a.ogDescription)} | ${ch(b.canonical, a.canonical)} | ${ch(b.ogImage, a.ogImage)} |`);
    }
    L.push('');
  }
  return L.join('\n') + '\n';
}
