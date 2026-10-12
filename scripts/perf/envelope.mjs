// scripts/perf/envelope.mjs
// Regression lock for the scrollytelling resource envelope.
// Runs the local harness (baseline scenario) or reads a saved PERF_RESULT JSON,
// and fails if any frozen budget is exceeded.
//
// Usage:
//   node scripts/perf/envelope.mjs                 # measure, then assert
//   node scripts/perf/envelope.mjs --dir=dist/client            # Vite build
//   node scripts/perf/envelope.mjs --url=http://localhost:4173  # running server
//   node scripts/perf/envelope.mjs --file out.json # assert against saved JSON
//   --budgets=cra|vite      budget preset (default: from the atlas-manifest.json
//                           version: v1 = CRA build, 42 atlases; v2+ = Vite build, 9)
//   --max-<budgetKey>=N     override one budget, e.g. --max-atlasTransferMB=8
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readAtlasManifest } from './lib/image-dims.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

// Frozen budgets. Values are chosen from measured optimized runs with generous
// headroom; they are ~2x the observed optimized cost and well below the original.
const COMMON_BUDGETS = {
  pageResidentMB: 700,        // steady-state page residency after load
  rssSettledDeltaMB: 1300,    // browser RSS growth after a full down/up scrub
  longtaskTotalMs: 600,       // summed main-thread long-task time during scrub
  cpuScriptMs: 1000,          // main-thread script time during scrub
};
export const BUDGET_PRESETS = {
  // CRA build: 42 atlases of 3840x3240 WebP, 20.1 MB in total.
  cra: { ...COMMON_BUDGETS, atlasTransferMB: 22 },  // total atlas bytes fetched over a full scrub
  // Vite build: 9 content-hashed atlases of 3840x3780 (28 frames of 960x540), ~4.64 MiB.
  vite: { ...COMMON_BUDGETS, atlasTransferMB: 6 },
};

const argv = process.argv.slice(2);
const presetArg = (argv.find((a) => a.startsWith('--budgets=')) || '').split('=')[1];
const manifest = readAtlasManifest(ROOT);
const PRESET = presetArg || ((manifest?.version ?? 1) >= 2 ? 'vite' : 'cra');
if (!BUDGET_PRESETS[PRESET]) {
  console.error(`envelope: unknown --budgets=${PRESET} (use cra or vite)`);
  process.exit(2);
}
export const BUDGETS = { ...BUDGET_PRESETS[PRESET] };
for (const a of argv) {
  const m = /^--max-(\w+)=([\d.]+)$/.exec(a);
  if (m && m[1] in BUDGETS) BUDGETS[m[1]] = parseFloat(m[2]);
}

function loadResult() {
  const fileArg = process.argv.indexOf('--file');
  if (fileArg !== -1) {
    return JSON.parse(fs.readFileSync(process.argv[fileArg + 1], 'utf8'));
  }
  // Pass target/browser options through (--dir=, --url=, --port=, --cdp-port=, --headed, --cycles=).
  const passthrough = argv.filter((a) => /^--(dir|url|port|cdp-port|headed|cycles|cf-cache|no-scstats)(=|$)/.test(a));
  const res = spawnSync(
    process.execPath,
    [path.join(__dirname, 'measure.mjs'), '--scenarios=baseline', ...passthrough],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
  );
  const line = (res.stdout || '').split('\n').find((l) => l.startsWith('PERF_RESULT '));
  if (!line) {
    console.error('envelope: no PERF_RESULT from harness');
    console.error(res.stderr || '');
    process.exit(2);
  }
  return JSON.parse(line.slice('PERF_RESULT '.length));
}

const results = loadResult();
const r = Array.isArray(results) ? results[0] : results;

const checks = [
  ['pageResidentMB', r.pageResidentMB, BUDGETS.pageResidentMB],
  ['rssSettledDeltaMB', r.rssSettledMB != null ? r.rssSettledMB - r.rssIdleMB : null, BUDGETS.rssSettledDeltaMB],
  ['longtaskTotalMs', r.longtaskTotal, BUDGETS.longtaskTotalMs],
  ['cpuScriptMs', r.cpuScriptMs, BUDGETS.cpuScriptMs],
  ['atlasTransferMB', r.atlasMB, BUDGETS.atlasTransferMB],
];

let failed = false;
const presetSource = presetArg ? '--budgets' : `atlas-manifest v${manifest?.version ?? 1}`;
console.log(`scrollytelling resource envelope (budgets: ${PRESET}, from ${presetSource})`);
console.log('--------------------------------');
for (const [key, value, budget] of checks) {
  const ok = value != null && value <= budget;
  if (!ok) failed = true;
  const shown = value == null ? 'n/a' : Math.round(value);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${key.padEnd(20)} ${String(shown).padStart(6)}  (budget <= ${budget})`);
}
console.log('--------------------------------');
console.log(failed ? 'ENVELOPE VIOLATED' : 'ENVELOPE OK');
process.exit(failed ? 1 : 0);
