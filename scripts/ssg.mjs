#!/usr/bin/env node
/**
 * Build-time prerender of the landing page ("/"), run after `vite build` (package.json "build").
 *
 * Without it a phone shows nothing until ~120 KB of JavaScript has downloaded and run (about
 * 3 s on a slow 4G connection). This writes the rendered page into dist/client/index.html so it
 * paints as soon as the HTML arrives; main.jsx then hydrates it instead of rebuilding it:
 *   1. builds src/entry-server.jsx with vite.ssr.config.mjs into dist/ssr (not deployed),
 *   2. renders "/" into <div id="root">,
 *   3. inlines the entry stylesheet into the page, so the first paint does not wait for a
 *      second request either (other routes keep the <link>; it is the same file).
 * Only "/" is prerendered: the team pages and 404.html keep rendering in the browser.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'vite';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLIENT_DIR = path.join(ROOT, 'dist', 'client');
const SSR_DIR = path.join(ROOT, 'dist', 'ssr');
const INDEX = path.join(CLIENT_DIR, 'index.html');
const ROOT_TAG = '<div id="root"></div>';

process.env.NODE_ENV = 'production';

function fail(message) {
  console.error(`[ssg] ${message}`);
  process.exit(1);
}

await build({ configFile: path.join(ROOT, 'vite.ssr.config.mjs'), root: ROOT, mode: 'production' });

const entry = fs.readdirSync(SSR_DIR).find((f) => /^entry-server\.(m?js)$/.test(f));
if (!entry) fail(`no entry-server bundle in ${SSR_DIR}`);
const { render } = await import(pathToFileURL(path.join(SSR_DIR, entry)).href);

const appHtml = render('/');
// A broken render must fail the build, not ship an empty or partial page.
for (const marker of ['id="main-content"', 'id="hero-section"', 'id="flagship-section"', 'id="team-section"', 'TEAM GENESIS']) {
  if (!appHtml.includes(marker)) fail(`prerendered "/" is missing ${marker}`);
}

let html = fs.readFileSync(INDEX, 'utf8');
if (!html.includes(ROOT_TAG)) fail(`${ROOT_TAG} not found in index.html (already prerendered?)`);
html = html.replace(ROOT_TAG, () => `<div id="root">${appHtml}</div>`);

// The <noscript> summary is for pages that render only in the browser; "/" now carries the
// real content without JavaScript, and the summary would sit above it.
html = html.replace(/[ \t]*<noscript>[\s\S]*?<\/noscript>(\r?\n)?/, '');

// The prerendered page is visible without its JavaScript (which only hydrates it), so on "/"
// the scripts yield to what the first screen shows: the hero image and the headline font.
html = html.replace(/<script type="module" crossorigin src="/g, '<script type="module" crossorigin fetchpriority="low" src="');
html = html.replace(/<link rel="modulepreload" crossorigin href="/g, '<link rel="modulepreload" crossorigin fetchpriority="low" href="');

let inlined = 0;
html = html.replace(/<link rel="stylesheet" crossorigin href="(\/assets\/[^"]+\.css)">/g, (tag, href) => {
  const css = fs.readFileSync(path.join(CLIENT_DIR, href), 'utf8');
  if (css.includes('</style')) fail(`${href} contains "</style"; cannot inline it`);
  inlined++;
  return `<style>${css}</style>`;
});
if (!inlined) fail('no entry stylesheet <link> found to inline');

fs.writeFileSync(INDEX, html);
fs.rmSync(SSR_DIR, { recursive: true, force: true });
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
console.log(`[ssg] prerendered / (${kb(Buffer.byteLength(appHtml))} of markup, ${inlined} stylesheet inlined) -> dist/client/index.html (${kb(Buffer.byteLength(html))})`);
