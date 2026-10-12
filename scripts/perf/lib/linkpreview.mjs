// scripts/perf/lib/linkpreview.mjs
// What link-preview bots (WhatsApp, LinkedIn, Slack, X, Facebook) see: they
// fetch the raw HTML and never run JavaScript. For each route we record the
// HTTP status (after following redirects), <title>, description, Open Graph,
// canonical and Twitter tags, and check that og:image is fetchable.

import { imageDims } from './image-dims.mjs';

export const BOT_USER_AGENT = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php) WhatsApp/2.24 LinkedInBot/1.0';
// Hosts whose absolute URLs in meta tags are mapped onto the local origin
// (the production domain; og:image etc. are absolute there).
export const PROD_HOSTS = ['www.teamgenesisvitc.in', 'teamgenesisvitc.in'];

function decodeEntities(s) {
  if (s == null) return s;
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim();
}

function attrs(tag) {
  const out = {};
  const re = /([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let m;
  while ((m = re.exec(tag))) out[m[1].toLowerCase()] = m[3] ?? m[4] ?? m[5] ?? '';
  return out;
}

export function parseHead(html) {
  // Only the document head matters for previews; tolerate a missing </head>.
  const headEnd = html.search(/<\/head>/i);
  const head = headEnd === -1 ? html.slice(0, 200000) : html.slice(0, headEnd);
  const titleM = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(head);
  const meta = {};
  for (const m of head.matchAll(/<meta\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    const key = (a.property || a.name || '').toLowerCase();
    if (key && a.content != null && !(key in meta)) meta[key] = decodeEntities(a.content);
  }
  let canonical = null;
  for (const m of head.matchAll(/<link\b[^>]*>/gi)) {
    const a = attrs(m[0]);
    if ((a.rel || '').toLowerCase().split(/\s+/).includes('canonical')) { canonical = a.href; break; }
  }
  const bodyText = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const h1 = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html.replace(/<noscript[\s\S]*?<\/noscript>/gi, ''));
  return {
    title: titleM ? decodeEntities(titleM[1]) : null,
    description: meta.description ?? null,
    ogTitle: meta['og:title'] ?? null,
    ogDescription: meta['og:description'] ?? null,
    ogImage: meta['og:image'] ?? null,
    ogUrl: meta['og:url'] ?? null,
    ogType: meta['og:type'] ?? null,
    canonical: canonical ? decodeEntities(canonical) : null,
    twitterCard: meta['twitter:card'] ?? null,
    twitterImage: meta['twitter:image'] ?? null,
    robots: meta.robots ?? null,
    // Visible text without JS (rough; excludes <noscript>): shows whether content is prerendered.
    h1: h1 ? decodeEntities(h1[1].replace(/<[^>]+>/g, ' ')) : null,
    textChars: bodyText.length - (titleM ? decodeEntities(titleM[1]).length : 0),
  };
}

async function fetchFollow(url, headers, maxHops = 5) {
  const hops = [];
  let cur = url;
  for (let i = 0; i <= maxHops; i++) {
    const res = await fetch(cur, { redirect: 'manual', headers });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      hops.push({ status: res.status, url: cur });
      await res.arrayBuffer().catch(() => {});
      cur = new URL(res.headers.get('location'), cur).href;
      continue;
    }
    return { res, finalUrl: cur, hops };
  }
  throw new Error(`too many redirects for ${url}`);
}

// Map an absolute production URL onto the local origin so the asset is checked
// against the build being measured.
export function localize(url, origin, pageUrl) {
  if (!url) return null;
  try {
    const u = new URL(url, pageUrl);
    if (PROD_HOSTS.includes(u.hostname)) return { url: origin + u.pathname + u.search, mapped: true };
    return { url: u.href, mapped: false };
  } catch { return null; }
}

export async function linkPreview(origin, routes) {
  const headers = { 'User-Agent': BOT_USER_AGENT, Accept: 'text/html,application/xhtml+xml', 'Accept-Encoding': 'gzip, br' };
  const rows = [];
  const imageCache = new Map();
  for (const route of routes) {
    const row = { route };
    try {
      const { res, finalUrl, hops } = await fetchFollow(origin + route, headers);
      const html = await res.text();
      Object.assign(row, {
        status: res.status,
        redirects: hops.map((h) => `${h.status} ${new URL(h.url).pathname}`),
        finalPath: new URL(finalUrl).pathname,
        contentType: res.headers.get('content-type'),
        cacheControl: res.headers.get('cache-control'),
        htmlBytes: Buffer.byteLength(html),
        ...parseHead(html),
      });
      const img = localize(row.ogImage, origin, finalUrl);
      if (img) {
        if (!imageCache.has(img.url)) {
          try {
            const r = await fetch(img.url, { headers: { 'User-Agent': BOT_USER_AGENT } });
            const buf = Buffer.from(await r.arrayBuffer());
            imageCache.set(img.url, { status: r.status, type: r.headers.get('content-type'), bytes: buf.length, dims: r.ok ? imageDims(buf) : null });
          } catch (e) {
            imageCache.set(img.url, { status: null, error: String(e.message || e) });
          }
        }
        row.ogImageCheck = { checkedUrl: img.url, mappedToLocal: img.mapped, ...imageCache.get(img.url) };
      }
    } catch (e) {
      row.error = String(e.message || e);
    }
    rows.push(row);
  }
  // Flag routes whose preview is identical to the homepage's (SPA symptom).
  const home = rows.find((r) => r.route === '/');
  for (const r of rows) {
    if (r === home || !home) continue;
    r.sameTitleAsHome = r.title != null && r.title === home.title;
    r.sameOgAsHome = r.ogTitle != null && r.ogTitle === home.ogTitle && r.ogDescription === home.ogDescription;
  }
  return rows;
}
