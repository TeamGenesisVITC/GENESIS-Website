// scripts/perf/compare.mjs — before/after delta table for two ux.mjs results, or for two
// scroll.mjs results (same as `node scripts/perf/scroll.mjs --compare a.json b.json`).
// Usage: node scripts/perf/compare.mjs <before.json> <after.json> [--out=report.md]
// Prints Markdown to stdout (and writes it to --out when given).
import fs from 'node:fs';
import path from 'node:path';
import { compareMarkdown } from './lib/report.mjs';
import { SCROLL_SCHEMA, compareScrollMarkdown } from './lib/scroll-report.mjs';
import { parseArgs } from './lib/target.mjs';

const args = parseArgs();
const [beforePath, afterPath] = args._;
if (!beforePath || !afterPath) {
  console.error('usage: node scripts/perf/compare.mjs <before.json> <after.json> [--out=report.md]');
  process.exit(2);
}
const load = (p) => {
  const r = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (r.schema !== 'genesis-ux/1' && r.schema !== SCROLL_SCHEMA) throw new Error(`${p}: not a scripts/perf/ux.mjs or scroll.mjs result (schema ${r.schema})`);
  return r;
};
const before = load(beforePath);
const after = load(afterPath);
if (before.schema !== after.schema) throw new Error(`cannot compare ${before.schema} with ${after.schema}`);
// scroll.mjs results get the IQR-based table (differences inside the run-to-run IQR = ~noise).
const md = before.schema === SCROLL_SCHEMA ? compareScrollMarkdown(before, after) : compareMarkdown(before, after);
if (typeof args.out === 'string') {
  fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
  fs.writeFileSync(args.out, md);
  console.error(`wrote ${args.out}`);
}
process.stdout.write(md);
