// scripts/serve.mjs — local static server for testing a production build.
// Usage:
//   node scripts/serve.mjs [port]                    # serves dist/client (if built) or ./build on 4180
//   node scripts/serve.mjs 4180 --dir=dist/client    # Vite / Cloudflare build output
//   node scripts/serve.mjs --no-store                # original minimal SPA server (no caching)
// Options: --dir=<path>  --not-found=auto|404-page|single-page-application|none
//          --html-handling=auto-trailing-slash|none  --no-compress  --log
//
// Default semantics approximate Cloudflare Workers static assets (see
// scripts/perf/README.md): .html / folder index resolution, 404.html with
// HTTP 404 when present (else SPA fallback to index.html with 200, like
// today), _headers / _redirects, ETag + revalidation, br/gzip compression.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticHandler, describeStaticServer } from './perf/lib/static-server.mjs';
import { parseArgs } from './perf/lib/target.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = parseArgs();
const PORT = parseInt(args._[0], 10) || parseInt(args.port, 10) || 4180;
// Default: the Vite output (dist/client) when it has been built, else the CRA build/.
const ROOT = path.resolve(__dirname, '..');
const defaultDir = fs.existsSync(path.join(ROOT, 'dist', 'client', 'index.html')) ? 'dist/client' : 'build';
const opts = {
  dir: path.resolve(ROOT, typeof args.dir === 'string' ? args.dir : defaultDir),
  noStore: !!args['no-store'],
  notFoundHandling: args['not-found'],
  htmlHandling: args['html-handling'],
  compress: args['no-compress'] ? false : undefined,
};
const handler = createStaticHandler(opts);

const server = http.createServer((req, res) => {
  if (args.log) {
    const t0 = Date.now();
    res.on('finish', () => console.log(`${res.statusCode} ${req.method} ${req.url} ${Date.now() - t0}ms`));
  }
  handler(req, res);
});

server.listen(PORT, '127.0.0.1', () => {
  const d = describeStaticServer(opts);
  console.log(`Genesis build serving at http://localhost:${PORT}/  (${path.relative(process.cwd(), d.dir) || '.'})`);
  console.log(`  not-found: ${d.notFoundHandling}  html: ${d.htmlHandling}  _headers: ${d.headersFile}  cache: ${d.defaultCacheControl}  compression: ${d.compression}`);
  console.log(`  experiments:  ?noCanvasDraw=1   ?atlasScale=0.5`);
});
