// scripts/perf/lib/calibration.mjs
// The calibration page: a plain, long text page with nothing on it that costs anything to
// scroll (no images, fixed layers, filters, blend modes, scroll listeners, web fonts or JS).
// Scrolling it measures the machine + browser + measurement ceiling of this session; landing
// sections are judged against it, never against an absolute 165 fps.

import http from 'node:http';

const PARA = 'Calibration text. This page has no images, no fixed or sticky layers, no filters, no blend modes, no web fonts, no scroll listeners and no JavaScript, so scrolling it only costs the browser its own compositor work. ';

export function calibrationHtml({ sections = 260 } = {}) {
  const body = [];
  for (let i = 0; i < sections; i++) {
    body.push(`<h2>Section ${i + 1}</h2><p>${PARA.repeat(5)}</p>`);
  }
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>scroll calibration</title>
<style>html{scroll-behavior:auto}body{margin:0 auto;max-width:860px;padding:24px;font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif;color:#222;background:#fff}h2{font-size:20px;margin:28px 0 8px}</style>
</head><body>${body.join('\n')}</body></html>`;
}

// Serves the calibration page at "/" on an OS-assigned port. Returns { origin, url, close }.
export async function startCalibrationServer({ host = '127.0.0.1' } = {}) {
  const html = Buffer.from(calibrationHtml());
  const server = http.createServer((req, res) => {
    if (new URL(req.url, 'http://x').pathname !== '/') { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'content-length': html.length, 'cache-control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : html);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, host, resolve); });
  const origin = `http://${host}:${server.address().port}`;
  return {
    origin,
    url: `${origin}/`,
    close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(() => r()); }),
  };
}
