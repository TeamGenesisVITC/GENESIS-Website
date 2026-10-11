import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';
import prerenderRoutes from './scripts/prerender-routes.mjs';

// Vite + React SPA deployed as a Cloudflare Worker with static assets.
//
// - `npm run dev`: dev server; worker/index.js runs in workerd, so /api/* works locally.
// - `npm run build`: browser bundle -> dist/client, Worker -> dist/genesis_website (plus the
//   generated wrangler.json that `wrangler deploy` picks up automatically).
// - `npm run preview`: serves the build output in the local Cloudflare runtime, with the same
//   html_handling / not_found_handling / _headers behaviour as production.
export default defineConfig(({ command, isPreview }) => {
  const isDevServer = command === 'serve' && !isPreview;

  return {
    plugins: [
      react(),
      // Reads wrangler.jsonc. The Worker debugger listens on 9229 (cloudflare({ inspectorPort })).
      cloudflare({
        // Per-route HTML and 404.html only exist in the build output, so in the dev server fall
        // back to index.html for every page (deep links work; unknown paths render NotFound
        // with HTTP 200 in dev only). Production keeps "404-page" from wrangler.jsonc.
        config: isDevServer
          ? (workerConfig) => {
              workerConfig.assets = {
                ...workerConfig.assets,
                not_found_handling: 'single-page-application',
              };
            }
          : undefined,
      }),
      // Writes one HTML file per route (+ 404.html) with its <head> metadata baked in.
      prerenderRoutes(),
    ],
    server: {
      port: 5173,
      strictPort: true,
    },
    preview: {
      port: 4173,
      strictPort: true,
    },
    build: {
      // Vite's hashed JS/CSS/images go to /assets/* (cached as immutable, see public/_headers).
      assetsDir: 'assets',
      // AVIF/WebP files are <picture> alternatives: inlining them would put every format into
      // the JS chunk even though the browser only uses one. Keep them as separate files.
      assetsInlineLimit: (filePath) => (/\.(avif|webp)$/i.test(filePath) ? false : undefined),
      rolldownOptions: {
        output: {
          // Keep rarely-changing libraries in their own long-cached chunks so an app-only
          // deploy doesn't make returning visitors re-download React and friends.
          codeSplitting: {
            groups: [
              {
                name: 'react-vendor',
                test: /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|@remix-run[\\/]router|scheduler)[\\/]/,
                priority: 20,
              },
              {
                name: 'vendor',
                test: /[\\/]node_modules[\\/]/,
                priority: 10,
              },
            ],
          },
        },
      },
    },
  };
});
