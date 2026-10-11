// Single source of truth for per-route page metadata.
//
// Used in two places:
//   1. At runtime by src/utils/pageMeta.js, which updates <head> on client-side navigation.
//   2. At build time by scripts/prerender-routes.mjs, which writes one HTML file per route
//      (dist/client/team/leads.html, ...) and dist/client/404.html with this metadata baked
//      in, so link-preview bots (WhatsApp, LinkedIn, X, Slack) that don't run JavaScript
//      still see the right title, description and canonical URL.
//
// Keep this file free of browser-only and React imports: it is also loaded by Node at build time.
// When adding a route: add it here, in src/App.jsx and in public/sitemap.xml.

export const SITE_URL = 'https://www.teamgenesisvitc.in';

export const DEFAULT_META = {
  title: 'Team Genesis | Humanoid Robotics Team of VIT Chennai',
  description:
    'Team Genesis is the student humanoid robotics team of VIT Chennai, designing and building bipedal humanoid robots across mechanical, electrical, and software and AI disciplines.',
};

// Paths have no trailing slash (except "/"), matching public/sitemap.xml and the
// canonical URLs served by Cloudflare (html_handling "auto-trailing-slash").
export const ROUTE_META = {
  '/': DEFAULT_META,
  '/robo-hi': {
    title: 'Meet the Team | Team Genesis VIT Chennai',
    description:
      'Meet the people behind Team Genesis, the humanoid robotics team of VIT Chennai, and explore our mechanical, electrical, software and AI, and leadership departments.',
  },
  '/team/leads': {
    title: 'Leads | Team Genesis VIT Chennai',
    description:
      'The leads of Team Genesis, VIT Chennai, who connect ideas, people, and departments to drive humanoid robot development.',
  },
  '/team/mechanical': {
    title: 'Mechanical and Design | Team Genesis VIT Chennai',
    description:
      'The Mechanical and Design department of Team Genesis, VIT Chennai, building the structure, actuation, and CAD of our humanoid robots.',
  },
  '/team/electrical': {
    title: 'Electrical and Control Systems | Team Genesis VIT Chennai',
    description:
      'The Electrical and Control Systems department of Team Genesis, VIT Chennai, designing power, embedded electronics, and motor control for our humanoid robots.',
  },
  '/team/software': {
    title: 'Software and AI | Team Genesis VIT Chennai',
    description:
      'The Software and AI department of Team Genesis, VIT Chennai, developing perception, locomotion control, and embodied AI for our humanoid robots.',
  },
};

// Served (with HTTP 404) for any path that is not in ROUTE_META and is not a static file.
// Not indexable and has no canonical URL.
export const NOT_FOUND_META = {
  title: 'Page not found | Team Genesis VIT Chennai',
  description:
    'This page does not exist. Explore Team Genesis, the student humanoid robotics team of VIT Chennai.',
  robots: 'noindex',
};

// Default robots directive for indexable routes (matches index.html).
export const DEFAULT_ROBOTS = 'index, follow, max-image-preview:large';

/** Strip trailing slashes so "/team/leads/" and "/team/leads" resolve to the same route. */
export function normalizePath(pathname) {
  if (!pathname || pathname === '/') return '/';
  return pathname.replace(/\/+$/, '') || '/';
}

/** Absolute canonical URL for a known route path. */
export function canonicalUrl(path) {
  return `${SITE_URL}${path === '/' ? '/' : path}`;
}

/** Metadata for a pathname, or null if the path is not a known route. */
export function getRouteMeta(pathname) {
  return ROUTE_META[normalizePath(pathname)] ?? null;
}
