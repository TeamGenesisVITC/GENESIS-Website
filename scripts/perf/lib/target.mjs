// scripts/perf/lib/target.mjs
// Shared CLI parsing + "what are we measuring" resolution for the harness.
//   --url=<origin>   measure an already-running server (vite preview, wrangler dev, ...)
//   --dir=<path>     serve a static directory with Cloudflare-like semantics
//                    (default: dist/client if built, else build)
//   --port=<n>       HTTP port for --dir mode (default 8123)
//   --cdp-port=<n>   Chrome remote-debugging port (default 9333)
//   --html-handling=auto-trailing-slash|none
//   --not-found=auto|404-page|single-page-application|none

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { startStaticServer, describeStaticServer, readWranglerAssetsConfig } from './static-server.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..', '..', '..');

export function parseArgs(argv = process.argv.slice(2)) {
  const args = { _: [] };
  for (const a of argv) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
    if (!m) { args._.push(a); continue; }
    args[m[1]] = m[2] === undefined ? true : m[2];
  }
  return args;
}

export const HTTP_PORT_DEFAULT = 8123;
export const CDP_PORT_DEFAULT = 9333;

// Returns { origin, mode, describe, close }.
export async function resolveTarget(args, { legacyNoStore = false } = {}) {
  if (args.url) {
    const origin = String(args.url).replace(/\/+$/, '');
    return { origin, mode: 'url', describe: { mode: 'url', origin }, close: async () => {} };
  }
  // Default: the Vite output (dist/client) when it has been built, else the CRA build/.
  const defaultDir = fs.existsSync(path.join(ROOT, 'dist', 'client', 'index.html')) ? 'dist/client' : 'build';
  const dir = path.resolve(ROOT, typeof args.dir === 'string' ? args.dir : defaultDir);
  if (!fs.existsSync(path.join(dir, 'index.html'))) {
    throw new Error(`--dir ${dir} has no index.html (build first: npm run build)`);
  }
  const wrangler = readWranglerAssetsConfig([ROOT, dir, path.dirname(dir)]);
  const opts = {
    dir,
    port: parseInt(args.port, 10) || HTTP_PORT_DEFAULT,
    noStore: legacyNoStore && !args['cf-cache'],
    htmlHandling: args['html-handling'] || wrangler?.htmlHandling,
    notFoundHandling: args['not-found'] || wrangler?.notFoundHandling,
    compress: args['no-compress'] ? false : undefined,
  };
  const srv = await startStaticServer(opts);
  const describe = { mode: 'dir', origin: srv.origin, ...describeStaticServer(opts), dir: path.relative(ROOT, dir) || '.', wranglerConfig: wrangler ? path.relative(ROOT, wrangler.file) : null };
  return { origin: srv.origin, mode: 'dir', describe, close: srv.close };
}

export function gitInfo() {
  const run = (...a) => { try { return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { return null; } };
  const status = run('status', '--porcelain', '--', '.', ':!scripts', ':!build', ':!dist');
  return {
    commit: run('rev-parse', '--short', 'HEAD'),
    branch: run('rev-parse', '--abbrev-ref', 'HEAD'),
    subject: run('log', '-1', '--format=%s'),
    dirty: status == null ? null : status.length > 0,
  };
}
