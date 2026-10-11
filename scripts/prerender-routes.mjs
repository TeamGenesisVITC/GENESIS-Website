// Vite plugin: bake per-route <head> metadata into static HTML files at build time.
//
// The app is a client-rendered SPA, so without this every URL would be served the same
// index.html and link-preview bots (WhatsApp, LinkedIn, X, Slack, ...) that don't run
// JavaScript would show the homepage title/description for every shared link.
//
// For each route in src/routes/meta.js this writes a copy of the built index.html with the
// route's title, description, canonical, og:* and twitter:* tags filled in:
//
//   /                 -> index.html
//   /robo-hi          -> robo-hi.html
//   /team/leads       -> team/leads.html          (etc.)
//   (anything else)   -> 404.html  (NOT_FOUND meta, robots noindex, no canonical)
//
// Cloudflare serves these with assets.html_handling = "auto-trailing-slash" (/team/leads -> 200
// team/leads.html, /team/leads/ -> 307 /team/leads) and assets.not_found_handling = "404-page"
// (unknown paths -> 404.html with HTTP 404). 404.html still loads the SPA bundle, so React
// Router renders the NotFound route. See wrangler.jsonc.
//
// Only <head> metadata is generated; page content is still rendered by React in the browser.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runnerImport } from 'vite';

const PLUGIN_NAME = 'genesis:prerender-routes';
const META_MODULE = 'src/routes/meta.js';

// src/routes/meta.js is an ES module in a package without "type": "module" (scripts/ still has
// CommonJS files), so load it through Vite's module runner instead of a static import.
async function loadRouteMeta(root) {
  const { module } = await runnerImport(resolve(root, META_MODULE), {
    root,
    configFile: false,
    logLevel: 'error',
  });
  return module;
}

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Output file name for a route path: "/" -> "index.html", "/team/leads" -> "team/leads.html". */
export function routeToFileName(path) {
  return path === '/' ? 'index.html' : `${path.slice(1)}.html`;
}

function replaceRequired(html, pattern, replacement, what) {
  if (!pattern.test(html)) {
    throw new Error(`[${PLUGIN_NAME}] index.html is missing ${what}; cannot bake route metadata.`);
  }
  return html.replace(pattern, replacement);
}

/** Replace (or remove, when value is null) the content of <meta {attr}="{key}" content="...">. */
function setMeta(html, attr, key, value) {
  const pattern = new RegExp(
    `[ \\t]*<meta\\s+${attr}="${escapeRegExp(key)}"\\s+content="[^"]*"\\s*/?>(\\r?\\n)?`,
  );
  const replacement = (match) => {
    if (value == null) return '';
    return match.replace(/content="[^"]*"/, () => `content="${escapeHtml(value)}"`);
  };
  return replaceRequired(html, pattern, replacement, `<meta ${attr}="${key}">`);
}

/** Replace (or remove, when href is null) <link rel="canonical" href="...">. */
function setCanonical(html, href) {
  const pattern = /[ \t]*<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>(\r?\n)?/;
  const replacement = (match) =>
    href == null ? '' : match.replace(/href="[^"]*"/, () => `href="${escapeHtml(href)}"`);
  return replaceRequired(html, pattern, replacement, '<link rel="canonical">');
}

/** <link data-home-only> tags (e.g. the hero font preload) are kept only on "/". */
function applyHomeOnly(html, isHome) {
  if (isHome) return html.replace(/(<link\b[^>]*?)\s+data-home-only\b/g, '$1');
  return html.replace(/[ \t]*<link\b[^>]*\sdata-home-only\b[^>]*>(\r?\n)?/g, '');
}

/** Drop HTML comments (authoring notes in index.html) from the shipped pages. */
function stripComments(html) {
  return html.replace(/[ \t]*<!--[\s\S]*?-->(\r?\n)?/g, '');
}

/**
 * Return a copy of the built index.html with metadata for one route.
 * @param {string} html built index.html
 * @param {{ title: string, description: string, robots?: string }} meta
 * @param {{ url: string | null, isHome: boolean }} options url null = no canonical/og:url
 */
export function renderRouteHtml(html, meta, { url, isHome }) {
  let out = stripComments(html);
  out = replaceRequired(
    out,
    /<title>[^<]*<\/title>/,
    () => `<title>${escapeHtml(meta.title)}</title>`,
    '<title>',
  );
  out = setMeta(out, 'name', 'description', meta.description);
  if (meta.robots) out = setMeta(out, 'name', 'robots', meta.robots);
  out = setCanonical(out, url);
  out = setMeta(out, 'property', 'og:title', meta.title);
  out = setMeta(out, 'property', 'og:description', meta.description);
  out = setMeta(out, 'property', 'og:url', url);
  out = setMeta(out, 'name', 'twitter:title', meta.title);
  out = setMeta(out, 'name', 'twitter:description', meta.description);
  out = applyHomeOnly(out, isHome);
  return out;
}

/** Paths listed in public/sitemap.xml, e.g. ["/", "/team/leads"]. */
function readSitemapPaths(root, siteUrl) {
  let xml;
  try {
    xml = readFileSync(resolve(root, 'public/sitemap.xml'), 'utf8');
  } catch {
    return null;
  }
  const prefix = new RegExp(`^${escapeRegExp(siteUrl)}`);
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(
    ([, loc]) => loc.replace(prefix, '') || '/',
  );
}

export default function prerenderRoutes() {
  let root = process.cwd();
  let routeMeta;

  return {
    name: PLUGIN_NAME,
    apply: 'build',
    enforce: 'post',
    // Only the browser bundle has an index.html; skip the Worker environment.
    applyToEnvironment: (environment) => environment.name === 'client',

    configResolved(config) {
      root = config.root;
    },

    async buildStart() {
      routeMeta = await loadRouteMeta(root);
      this.addWatchFile(resolve(root, META_MODULE));
    },

    generateBundle(_options, bundle) {
      const { ROUTE_META, NOT_FOUND_META, SITE_URL, canonicalUrl } = routeMeta;
      const indexAsset = bundle['index.html'];
      if (!indexAsset || indexAsset.type !== 'asset') {
        this.error('index.html was not found in the client bundle');
      }
      const template = String(indexAsset.source);

      // Every sitemap URL must have route metadata, otherwise it would be served as a 404.
      const sitemapPaths = readSitemapPaths(root, SITE_URL);
      if (sitemapPaths) {
        const missing = sitemapPaths.filter((path) => !(path in ROUTE_META));
        if (missing.length) {
          this.error(
            `public/sitemap.xml lists paths without an entry in src/routes/meta.js: ${missing.join(', ')}`,
          );
        }
        const unlisted = Object.keys(ROUTE_META).filter((path) => !sitemapPaths.includes(path));
        if (unlisted.length) {
          this.warn(`routes missing from public/sitemap.xml: ${unlisted.join(', ')}`);
        }
      }

      for (const [path, meta] of Object.entries(ROUTE_META)) {
        const html = renderRouteHtml(template, meta, {
          url: canonicalUrl(path),
          isHome: path === '/',
        });
        const fileName = routeToFileName(path);
        if (fileName === 'index.html') {
          indexAsset.source = html;
        } else {
          this.emitFile({ type: 'asset', fileName, source: html });
        }
      }

      this.emitFile({
        type: 'asset',
        fileName: '404.html',
        source: renderRouteHtml(template, NOT_FOUND_META, { url: null, isHome: false }),
      });
    },
  };
}
