// scripts/perf/lib/static-server.test.mjs — self-test for the _headers semantics.
// Run: node scripts/perf/lib/static-server.test.mjs   (exit code 0 = all pass)
//
// Cloudflare applies every matching _headers rule in file order; inside a rule the
// "! Name" removals run before that rule's "Name: value" lines. The repo's public/_headers
// relies on that for /frame-atlases/manifest.json and /assets/*.mp4 (they first match an
// "immutable" rule, then remove and replace its Cache-Control).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHeadersFile, applyHeaderRules, startStaticServer } from './static-server.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const HEADERS_FILE = path.join(ROOT, 'public', '_headers');
const DEFAULT_CC = 'public, max-age=0, must-revalidate';
const IMMUTABLE = 'public, max-age=31536000, immutable';
const DAY_SWR = 'public, max-age=86400, stale-while-revalidate=604800';

const resolveHeaders = (rulesText, urlPath) => {
  const headers = { 'cache-control': DEFAULT_CC, 'content-type': 'x/test' };
  applyHeaderRules(parseHeadersFile(rulesText), urlPath, headers);
  return headers;
};

test('a rule\'s removals run before its own sets (and drop earlier rules\' values)', () => {
  const h = resolveHeaders('/a/*\n  Cache-Control: immutable\n/a/x.json\n  ! Cache-Control\n  Cache-Control: max-age=0\n', '/a/x.json');
  assert.equal(h['cache-control'], 'max-age=0');
});

test('values set by several matching rules are joined with ", "', () => {
  const h = resolveHeaders('/*\n  X-Test: one\n/a/*\n  X-Test: two\n', '/a/b');
  assert.equal(h['x-test'], 'one, two');
});

test('a removal only affects what was set before it; a later rule can set the header again', () => {
  const h = resolveHeaders('/*\n  X-Test: one\n/a/*\n  ! X-Test\n/a/b\n  X-Test: three\n', '/a/b');
  assert.equal(h['x-test'], 'three');
});

test('a removal without a later set drops the default header too', () => {
  const h = resolveHeaders('/a/*\n  ! Cache-Control\n', '/a/b');
  assert.equal(h['cache-control'], undefined);
  assert.equal(h['content-type'], 'x/test');
});

test('non-matching rules change nothing', () => {
  const h = resolveHeaders('/a/*\n  ! Cache-Control\n  X-Test: one\n', '/b/c');
  assert.equal(h['cache-control'], DEFAULT_CC);
  assert.equal(h['x-test'], undefined);
});

test('public/_headers served end to end', { skip: !fs.existsSync(HEADERS_FILE) && 'public/_headers not found' }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'static-server-test-'));
  const put = (p, body = 'x') => { const f = path.join(dir, p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, body); };
  fs.copyFileSync(HEADERS_FILE, path.join(dir, '_headers'));
  put('index.html', '<!doctype html><title>t</title>');
  put('frame-atlases/manifest.json', '{"atlases":[]}');
  put('frame-atlases/atlas-0.0123abcd.webp');
  put('assets/genesis-sequence.mp4');
  put('assets/genesis-sequence.webm');
  put('assets/index-abc123.js', 'console.log(1)');
  put('og-image.jpg');
  put('frames/frame-0001.webp');
  const srv = await startStaticServer({ dir, port: 0, notFoundHandling: '404-page' });
  try {
    const cc = async (p) => {
      const res = await fetch(srv.origin + p);
      await res.arrayBuffer();
      assert.equal(res.status, 200, `${p} status`);
      return { cc: res.headers.get('cache-control'), nosniff: res.headers.get('x-content-type-options') };
    };
    // The two cases the old "all sets, then all removals" order got wrong:
    assert.deepEqual(await cc('/frame-atlases/manifest.json'), { cc: DEFAULT_CC, nosniff: 'nosniff' });
    assert.deepEqual(await cc('/assets/genesis-sequence.mp4'), { cc: DAY_SWR, nosniff: 'nosniff' });
    assert.deepEqual(await cc('/assets/genesis-sequence.webm'), { cc: DAY_SWR, nosniff: 'nosniff' });
    // Unchanged cases.
    assert.equal((await cc('/frame-atlases/atlas-0.0123abcd.webp')).cc, IMMUTABLE);
    assert.equal((await cc('/assets/index-abc123.js')).cc, IMMUTABLE);
    assert.equal((await cc('/og-image.jpg')).cc, DAY_SWR);
    assert.equal((await cc('/frames/frame-0001.webp')).cc, 'public, max-age=604800, stale-while-revalidate=86400');
    assert.equal((await cc('/')).cc, DEFAULT_CC);
  } finally {
    await srv.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
