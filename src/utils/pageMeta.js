import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  DEFAULT_ROBOTS,
  NOT_FOUND_META,
  canonicalUrl,
  getRouteMeta,
  normalizePath,
} from '../routes/meta';

// Route metadata lives in src/routes/meta.js. The build also bakes it into one HTML file per
// route (see scripts/prerender-routes.mjs); this hook keeps <head> correct after client-side
// navigation. Unknown paths get the NOT_FOUND metadata, robots "noindex" and no canonical URL.

/** Set (or create) a <meta> tag; remove it when content is null. */
function setMetaTag(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (content == null) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/** Set (or create) <link rel="canonical">; remove it when href is null. */
function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (href == null) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function usePageMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    const path = normalizePath(pathname);
    const routeMeta = getRouteMeta(path);
    const meta = routeMeta ?? NOT_FOUND_META;
    const url = routeMeta ? canonicalUrl(path) : null;

    document.title = meta.title;
    setMetaTag('name', 'description', meta.description);
    setMetaTag('name', 'robots', routeMeta ? DEFAULT_ROBOTS : NOT_FOUND_META.robots);
    setCanonical(url);
    setMetaTag('property', 'og:title', meta.title);
    setMetaTag('property', 'og:description', meta.description);
    setMetaTag('property', 'og:url', url);
    setMetaTag('name', 'twitter:title', meta.title);
    setMetaTag('name', 'twitter:description', meta.description);
  }, [pathname]);
}
