// scripts/perf/compare.mjs — before/after delta table for two ux.mjs results.
// Usage: node scripts/perf/compare.mjs <before.json> <after.json> [--out=report.md]
// Prints Markdown to stdout (and writes it to --out when given).
import fs from 'node:fs';
import path from 'node:path';
import { compareMarkdown } from './lib/report.mjs';
import { parseArgs } from './lib/target.mjs';

const args = parseArgs();
const [beforePath, afterPath] = args._;
if (!beforePath || !afterPath) {
  console.error('usage: node scripts/perf/compare.mjs <before.json> <after.json> [--out=report.md]');
  process.exit(2);
}
const load = (p) => {
  const r = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (r.schema !== 'genesis-ux/1') throw new Error(`${p}: not a scripts/perf/ux.mjs result (schema ${r.schema})`);
  return r;
};
const md = compareMarkdown(load(beforePath), load(afterPath));
if (typeof args.out === 'string') {
  fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
  fs.writeFileSync(args.out, md);
  console.error(`wrote ${args.out}`);
}
process.stdout.write(md);
