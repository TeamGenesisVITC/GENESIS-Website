import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';
import { applyLiteClass } from './utils/deviceProfile';

applyLiteClass();

const container = document.getElementById('root');

// "/" ships prerendered markup (scripts/ssg.mjs): attach to it instead of rebuilding it, so
// the page is visible before this script has even downloaded. Other routes render from scratch.
if (container.hasChildNodes()) {
  hydrateRoot(container, <App />, {
    // A mismatch makes React re-render from scratch; record it so the perf harness and
    // scripts/ssg.mjs checks can catch a page that silently lost its prerender.
    onRecoverableError(error) {
      (window.__hydrationErrors = window.__hydrationErrors || []).push(String(error && error.message));
      if (import.meta.env.DEV) console.error(error);
    },
  });
} else {
  createRoot(container).render(<App />);
}

// Sections below the first screen arrive with content-visibility: auto (GenesisLanding.css,
// [data-deferred-render]), so the first paint lays out only the hero. Render them for real
// one per idle moment afterwards, so that scrolling into a section never has to lay it out.
function renderDeferredSections() {
  const pending = [...document.querySelectorAll('[data-deferred-render]')];
  const idle = (fn) => (typeof window.requestIdleCallback === 'function'
    ? window.requestIdleCallback(fn, { timeout: 1500 })
    : window.setTimeout(fn, 60));
  const next = () => {
    const section = pending.shift();
    if (!section) return;
    section.style.contentVisibility = 'visible';
    idle(next);
  };
  idle(next);
}
if (document.readyState === 'complete') renderDeferredSections();
else window.addEventListener('load', renderDeferredSections, { once: true });
