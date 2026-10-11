// ESLint flat config (replaces CRA's built-in "react-app" config). Run with `npm run lint`.
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import { reactRefresh } from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores([
    'build/', // old CRA output, kept in git for now
    'dist/',
    '.wrangler/',
    // TypeScript files are not part of the app build (no TS tooling configured).
    '**/*.ts',
    '**/*.tsx',
  ]),

  // Browser app
  {
    files: ['src/**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite(),
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // The automatic JSX runtime doesn't need `import React`, but it is harmless.
      'no-unused-vars': ['error', { varsIgnorePattern: '^React$' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },

  // Cloudflare Worker
  {
    files: ['worker/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      sourceType: 'module',
      globals: globals.serviceworker,
    },
  },

  // Node: config files and build scripts
  {
    files: ['*.{js,mjs}', 'scripts/**/*.mjs'],
    extends: [js.configs.recommended],
    languageOptions: { sourceType: 'module', globals: globals.node },
    // Best-effort cleanup (closing sockets, killing Chrome) intentionally ignores errors.
    rules: { 'no-empty': ['error', { allowEmptyCatch: true }] },
  },
  {
    files: ['scripts/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
  },
]);
