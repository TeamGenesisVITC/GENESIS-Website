// scripts/perf/linkpreview.mjs — what link-preview bots see (raw HTML, no JS).
// Usage: node scripts/perf/linkpreview.mjs [--dir=build | --url=http://localhost:4173]
//        [--routes=/,/robo-hi,...] [--json]
// Prints a Markdown table (or JSON with --json). Exit code 1 if any known
// route is not HTTP 200 or the unknown route is not HTTP 404 — useful as a
// quick check after prerendering / 404 handling changes.
import { parseArgs, resolveTarget } from './lib/target.mjs';
import { linkPreview } from './lib/linkpreview.mjs';
import { toMarkdown } from './lib/report.mjs';

const DEFAULT = ['/', '/robo-hi', '/team/leads', '/team/electrical', '/team/mechanical', '/team/software', '/does-not-exist'];
const args = parseArgs();
const routes = typeof args.routes === 'string' ? args.routes.split(',') : DEFAULT;
if (routes.some((r) => !r.startsWith('/'))) {
  console.error('routes must start with "/" (in Git Bash run with MSYS_NO_PATHCONV=1)');
  process.exit(2);
}
const target = await resolveTarget(args);
try {
  const rows = await linkPreview(target.origin, routes);
  if (args.json) {
    console.log(JSON.stringify(rows, null, 2));
  } else {
    const md = toMarkdown({ label: 'link preview', createdAt: new Date().toISOString(), source: target.describe, env: {}, config: {}, pageLoad: {}, linkPreview: rows });
    // Keep only the link-preview section.
    process.stdout.write(md.slice(md.indexOf('## Link previews')));
  }
  const bad = rows.filter((r) => (r.route === '/does-not-exist' ? r.status !== 404 : r.status !== 200));
  if (bad.length) {
    console.error(`\nunexpected status: ${bad.map((r) => `${r.route}=${r.status ?? r.error}`).join(', ')} (want 200 for routes, 404 for /does-not-exist)`);
    process.exitCode = 1;
  }
} finally {
  await target.close();
}
