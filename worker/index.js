// Cloudflare Worker for the Team Genesis website.
//
// Static assets (the SPA, per-route HTML, images, ...) are served by Cloudflare directly; this
// Worker only runs for /api/* (assets.run_worker_first in wrangler.jsonc). The members-only hub
// API (D1) will be added here later.

const JSON_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};

function json(body, init = {}) {
  return Response.json(body, {
    ...init,
    headers: { ...JSON_HEADERS, ...init.headers },
  });
}

export default {
  /**
   * @param {Request} request
   * @param {{ ASSETS: Fetcher }} env
   */
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return json(
          { error: 'Method not allowed' },
          { status: 405, headers: { Allow: 'GET, HEAD' } },
        );
      }
      return json({ status: 'ok' });
    }

    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      return json({ error: 'Not found' }, { status: 404 });
    }

    // Not expected to be reached (only /api/* runs the Worker first), but if a request does end
    // up here, let the asset layer answer so html_handling and the 404 page still apply.
    return env.ASSETS.fetch(request);
  },
};
