import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Build of src/entry-server.jsx for the build-time prerender (scripts/ssg.mjs runs it after the
// browser build). Not deployed: it only exists to render "/" to HTML once per build.
//
// Asset handling must match vite.config.mjs exactly, so every image URL (or inlined data URI)
// in the prerendered HTML is the one the browser bundle uses; otherwise hydration would keep
// the server's attribute values and point at files that do not exist.
export default defineConfig({
  plugins: [react()],
  logLevel: 'warn',
  build: {
    ssr: 'src/entry-server.jsx',
    outDir: 'dist/ssr',
    emptyOutDir: true,
    assetsDir: 'assets',
    assetsInlineLimit: (filePath) => (/\.(avif|webp)$/i.test(filePath) ? false : undefined),
    // Asset files are already in dist/client from the browser build.
    ssrEmitAssets: false,
    copyPublicDir: false,
  },
});
