// scripts/perf/ux.mjs
// Page-load UX + link-preview measurement for every route, two profiles,
// several cold-cache runs (medians) and one warm repeat visit of "/".
//
// Usage:
//   node scripts/perf/ux.mjs --dir=build --label=baseline-cra          # CRA build
//   node scripts/perf/ux.mjs --dir=dist/client --label=after-vite      # Vite build, Cloudflare-like routing
//   node scripts/perf/ux.mjs --url=http://localhost:4173 --label=after-preview   # already-running server
// Options:
//   --runs=3  --profiles=desktop,mobile  --routes=/,/robo-hi,...  --preview-routes=...
//   --net=slow4g|slow4g-raw|fast4g   --no-warm  --no-preview  --no-pageload  --headed
//   --out=scripts/perf/results/<label>.json  (a .md report is written next to it)
//   --render=<result.json>   only re-render the .md report from a saved result
//   --keep-requests          keep per-request timelines for every run (default: run 1 + warm)
//   --retries=2              re-measure a visit that had network failures (fresh context)
//   --third-party=live|block  block all third-party (https) requests: first-party-only, low-noise numbers
//   --merge=<existing.json>  keep profiles / link preview not measured in this run from an earlier result
// Output: JSON + Markdown report; progress on stderr.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CDP, launchChrome, sleep } from './lib/cdp.mjs';
import { parseArgs, resolveTarget, gitInfo, ROOT, CDP_PORT_DEFAULT } from './lib/target.mjs';
import { makeProfiles, measureVisit, aggregate, userAgents, BENCHMARK_EXPR } from './lib/pageload.mjs';
import { linkPreview } from './lib/linkpreview.mjs';
import { toMarkdown } from './lib/report.mjs';

const DEFAULT_ROUTES = ['/', '/robo-hi', '/team/leads', '/team/software', '/does-not-exist'];
const DEFAULT_PREVIEW_ROUTES = ['/', '/robo-hi', '/team/leads', '/team/electrical', '/team/mechanical', '/team/software', '/does-not-exist'];

const args = parseArgs();
const label = typeof args.label === 'string' ? args.label : `ux-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '')}`;
const runs = parseInt(args.runs, 10) || 3;
const profileNames = (typeof args.profiles === 'string' ? args.profiles : 'desktop,mobile').split(',').filter(Boolean);
const routes = typeof args.routes === 'string' ? args.routes.split(',') : DEFAULT_ROUTES;
const previewRoutes = typeof args['preview-routes'] === 'string' ? args['preview-routes'].split(',') : DEFAULT_PREVIEW_ROUTES;
const outJson = path.resolve(ROOT, typeof args.out === 'string' ? args.out : `scripts/perf/results/${label}.json`);
const outMd = outJson.replace(/\.json$/i, '') + '.md';
const cdpPort = parseInt(args['cdp-port'], 10) || CDP_PORT_DEFAULT;
const profiles = makeProfiles(typeof args.net === 'string' ? args.net : 'slow4g');
for (const p of profileNames) if (!profiles[p]) throw new Error(`unknown profile ${p}`);
for (const r of [...routes, ...previewRoutes]) {
  if (!r.startsWith('/')) {
    throw new Error(`route "${r}" must start with "/". Git Bash rewrites "/x" arguments into Windows paths: run with MSYS_NO_PATHCONV=1, or from PowerShell/cmd.`);
  }
}

const say = (s) => process.stderr.write(s + '\n');
const fmtMs = (v) => (v == null ? '  n/a' : `${(v / 1000).toFixed(2)}s`);
const fmtKB = (v) => (v == null ? 'n/a' : `${(v / 1024).toFixed(0)}KB`);

// Host-load gate: other processes (builds, other browsers) distort timings,
// especially under CPU throttling. Before each visit wait (bounded) until the
// host's CPU busy share over 1 s is below --idle-threshold (default 50%).
const IDLE_THRESHOLD = parseFloat(args['idle-threshold'] ?? 50);
const IDLE_WAIT_MS = parseFloat(args['idle-wait'] ?? 30) * 1000;
const RETRIES = parseInt(args.retries ?? 2, 10);
const THIRD_PARTY = args['third-party'] === 'block' ? 'block' : 'live';
function hostBusyPct(ms = 1000) {
  const snap = () => { let idle = 0, total = 0; for (const c of os.cpus()) { for (const v of Object.values(c.times)) total += v; idle += c.times.idle; } return { idle, total }; };
  const a = snap();
  return sleep(ms).then(() => { const b = snap(); return (1 - (b.idle - a.idle) / Math.max(1, b.total - a.total)) * 100; });
}
async function waitForHostIdle() {
  const t0 = Date.now();
  let busy = await hostBusyPct();
  while (busy > IDLE_THRESHOLD && Date.now() - t0 < IDLE_WAIT_MS) busy = await hostBusyPct();
  return { busyBefore: +busy.toFixed(1), waitedMs: Date.now() - t0 - 1000 };
}

async function benchmark(cdp) {
  const { browserContextId } = await cdp.send('Target.createBrowserContext', { disposeOnDetach: true });
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank', browserContextId });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  try {
    const { result } = await cdp.send('Runtime.evaluate', { expression: BENCHMARK_EXPR, returnByValue: true }, sessionId);
    return result.value;
  } finally {
    await cdp.send('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
  }
}

async function main() {
  // --render=<result.json>: re-render the Markdown report from saved JSON.
  if (typeof args.render === 'string') {
    const file = path.resolve(ROOT, args.render);
    const md = file.replace(/\.json$/i, '') + '.md';
    fs.writeFileSync(md, toMarkdown(JSON.parse(fs.readFileSync(file, 'utf8'))));
    say(`wrote ${path.relative(ROOT, md)}`);
    return;
  }
  const target = await resolveTarget(args);
  say(`target: ${target.origin} (${target.mode}${target.mode === 'dir' ? ` ${target.describe.dir}, 404=${target.describe.notFoundHandling}, _headers=${target.describe.headersFile}` : ''})`);
  const result = {
    schema: 'genesis-ux/1',
    label,
    createdAt: new Date().toISOString(),
    source: target.describe,
    git: gitInfo(),
    env: {
      os: `${os.type()} ${os.release()} ${os.arch()}`,
      cpu: os.cpus()[0]?.model?.trim(),
      logicalCores: os.cpus().length,
      ramGB: +(os.totalmem() / 1073741824).toFixed(1),
      node: process.version,
      headless: !args.headed,
    },
    config: { runs, routes, previewRoutes, hostIdleGate: { thresholdPct: IDLE_THRESHOLD, maxWaitS: IDLE_WAIT_MS / 1000 }, retriesOnNetworkFailure: RETRIES, thirdParty: THIRD_PARTY, profiles: Object.fromEntries(profileNames.map((p) => [p, profiles[p]])) },
    linkPreview: null,
    pageLoad: {},
  };

  try {
    if (!args['no-preview']) {
      say('\n== link preview (raw HTML, no JS) ==');
      result.linkPreview = await linkPreview(target.origin, previewRoutes);
      for (const r of result.linkPreview) say(`  ${String(r.status).padEnd(4)} ${r.route.padEnd(18)} ${r.title ?? r.error}`);
    }

    if (!args['no-pageload']) {
      const chrome = await launchChrome({ cdpPort, headed: !!args.headed, marker: `genesisux-${process.pid}` });
      const cdp = await CDP.connect(chrome.version.webSocketDebuggerUrl);
      try {
        result.env.chrome = chrome.version.Browser;
        const uas = userAgents(chrome.version['User-Agent'], chrome.version.Browser);
        result.env.benchmarkIndexBefore = await benchmark(cdp);
        say(`\nchrome ${chrome.version.Browser}, benchmarkIndex ${result.env.benchmarkIndexBefore}`);

        for (const pname of profileNames) {
          const profile = profiles[pname];
          say(`\n== ${pname}: ${profile.description} ==`);
          const perRoute = Object.fromEntries(routes.map((r) => [r, []]));
          let warm = null;
          for (let i = 0; i < runs; i++) {
            for (const route of routes) {
              const isLanding = route === '/';
              const wantWarm = isLanding && i === 0 && !args['no-warm'];
              // A visit with network failures (host network blip, flaky third
              // party) is not representative: retry it in a fresh context.
              for (let attempt = 1; attempt <= 1 + RETRIES; attempt++) {
                const idle = await waitForHostIdle();
                const { browserContextId } = await cdp.send('Target.createBrowserContext', { disposeOnDetach: true });
                try {
                  const m = await measureVisit(cdp, { contextId: browserContextId, origin: target.origin, route, profile, uas, isLanding, thirdParty: THIRD_PARTY });
                  m.run = i + 1;
                  m.cache = 'cold';
                  m.attempts = attempt;
                  m.hostCpuBusyBeforePct = idle.busyBefore;
                  if (m.failedReq > 0 && attempt <= RETRIES) {
                    say(`  run ${i + 1} ${route.padEnd(16)} retry: ${m.failedReq} failed request(s) (${m.failedErrors})`);
                    continue;
                  }
                  perRoute[route].push(m);
                  say(`  run ${i + 1} ${route.padEnd(16)} ${m.docStatus} fcp=${fmtMs(m.fcp)} lcp=${fmtMs(m.lcp)} cls=${m.cls} tbt=${m.tbt}ms load=${fmtMs(m.load)}${isLanding ? ` ready=${fmtMs(m.ready)}` : ''} req=${m.reqTotal} ${fmtKB(m.bytesTotal)}${m.timedOut ? ' TIMEOUT' : ''}${m.failedReq ? ` FAILED=${m.failedReq}` : ''} hostCpu=${m.hostCpuBusyPct}%`);
                  // Repeat visit: same browser context (warm HTTP cache), new tab.
                  if (wantWarm) {
                    await waitForHostIdle();
                    const w = await measureVisit(cdp, { contextId: browserContextId, origin: target.origin, route, profile, uas, isLanding, thirdParty: THIRD_PARTY });
                    w.run = 1;
                    w.cache = 'warm';
                    warm = w;
                    say(`  warm  ${route.padEnd(16)} ${w.docStatus} fcp=${fmtMs(w.fcp)} lcp=${fmtMs(w.lcp)} load=${fmtMs(w.load)} ready=${fmtMs(w.ready)} req=${w.reqTotal} ${fmtKB(w.bytesTotal)} cached=${w.cachedReq} 304=${w.revalidated304}${w.failedReq ? ` FAILED=${w.failedReq}` : ''}`);
                  }
                  break;
                } catch (e) {
                  say(`  run ${i + 1} ${route.padEnd(16)} ERROR ${e.message}`);
                  // Keep going: one failed visit should not lose a long run.
                  if (attempt > RETRIES) perRoute[route].push({ route, profile: pname, run: i + 1, cache: 'cold', error: String(e.message || e) });
                } finally {
                  await cdp.send('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
                }
              }
            }
          }
          result.pageLoad[pname] = {};
          for (const route of routes) {
            result.pageLoad[pname][route] = { runs: perRoute[route], ...aggregate(perRoute[route]) };
          }
          if (warm) result.pageLoad[pname]['/'].warm = warm;
        }
        result.env.benchmarkIndexAfter = await benchmark(cdp);
      } finally {
        await chrome.close(cdp);
        cdp.close();
      }
    }
  } finally {
    await target.close();
  }

  // --merge=<existing.json>: keep the profiles (and link preview) this run did
  // not measure from an earlier result, e.g. to re-measure only one profile.
  if (typeof args.merge === 'string') {
    const prev = JSON.parse(fs.readFileSync(path.resolve(ROOT, args.merge), 'utf8'));
    const kept = Object.keys(prev.pageLoad || {}).filter((p) => !result.pageLoad[p]);
    for (const p of kept) {
      result.pageLoad[p] = prev.pageLoad[p];
      result.config.profiles[p] = prev.config?.profiles?.[p];
    }
    if (!result.linkPreview && prev.linkPreview) result.linkPreview = prev.linkPreview;
    result.config.runsByProfile = Object.fromEntries(Object.keys(result.pageLoad).map((p) => [p, kept.includes(p) ? prev.config?.runs : runs]));
    result.mergedFrom = { file: path.relative(ROOT, path.resolve(ROOT, args.merge)), createdAt: prev.createdAt, profiles: kept, env: prev.env, linkPreview: !!(args['no-preview'] && prev.linkPreview) };
    if (Array.isArray(prev.notes) && !result.notes) result.notes = prev.notes;
  }

  // Per-request timelines are kept for run 1 (+ warm) only, unless --keep-requests.
  if (!args['keep-requests']) {
    for (const byRoute of Object.values(result.pageLoad)) {
      for (const r of Object.values(byRoute)) for (const run of r.runs.slice(1)) delete run.requests;
    }
  }
  fs.mkdirSync(path.dirname(outJson), { recursive: true });
  fs.writeFileSync(outJson, JSON.stringify(result, null, 2) + '\n');
  fs.writeFileSync(outMd, toMarkdown(result));
  say(`\nwrote ${path.relative(ROOT, outJson)}\nwrote ${path.relative(ROOT, outMd)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
