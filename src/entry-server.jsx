// Build-time prerender entry (scripts/ssg.mjs): renders a route's markup with the same tree as
// the browser (App.jsx AppContent), inside a StaticRouter instead of a BrowserRouter. The
// browser then hydrates it (main.jsx) rather than rendering the page from scratch.
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { AppContent } from './App';

export function render(url) {
  return renderToString(
    <StaticRouter location={url}>
      <AppContent />
    </StaticRouter>,
  );
}
