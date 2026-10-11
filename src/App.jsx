import React, { Suspense, lazy, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigationType } from 'react-router-dom';
import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion';
import GenesisLanding from './components/scrollytelling/GenesisLanding';
import { RouteFallback, RouteErrorBoundary } from './components/RouteStatus';
import { loadTeamRoutes, loadNotFound } from './pages/routeLoaders';
import { usePageMeta } from './utils/pageMeta';
import './App.css';

// The landing page stays in the main bundle (it is the first paint for most visitors).
// Everything else is split out and only downloaded when visited or prefetched on intent.
const Robohi = lazy(() => loadTeamRoutes().then((m) => ({ default: m.Robohi })));
const Leads = lazy(() => loadTeamRoutes().then((m) => ({ default: m.Leads })));
const Electrical = lazy(() => loadTeamRoutes().then((m) => ({ default: m.Electrical })));
const Mechanical = lazy(() => loadTeamRoutes().then((m) => ({ default: m.Mechanical })));
const SoftwareAI = lazy(() => loadTeamRoutes().then((m) => ({ default: m.SoftwareAI })));
const NotFound = lazy(loadNotFound);

function PageMeta() {
  usePageMeta();
  return null;
}

/**
 * After an in-app navigation: start the new page at the top and move keyboard /
 * screen-reader focus to its <main> (it may still be loading, so wait for it briefly).
 * Back/forward (POP) is left to the browser's own scroll restoration.
 */
function ScrollManager() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return undefined;
    }
    if (navigationType === 'POP') return undefined;

    let frame = 0;
    let tries = 0;
    const focusMain = () => {
      const mains = document.querySelectorAll('#main-content');
      const main = mains.length === 1 ? mains[0] : null;
      // While a lazy route resolves, React can briefly keep the new tree display:none
      // (and the old page on screen); focus() is a no-op until it is actually rendered,
      // so keep polling, and reset the scroll position at the same moment.
      if (main && main.getClientRects().length > 0) {
        window.scrollTo(0, 0);
        main.focus({ preventScroll: true });
      } else if (tries++ < 300) {
        frame = requestAnimationFrame(focusMain);
      } else {
        window.scrollTo(0, 0);
      }
    };
    frame = requestAnimationFrame(focusMain);
    return () => cancelAnimationFrame(frame);
  }, [pathname, navigationType]);

  return null;
}

/** First focusable element on every page: jumps keyboard users past the navigation. */
function SkipLink() {
  const handleClick = (e) => {
    const target = document.getElementById('main-content');
    if (!target) return;
    e.preventDefault();
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'start' });
  };

  return (
    <a className="skip-link" href="#main-content" onClick={handleClick}>
      Skip to main content
    </a>
  );
}

function LazyRoute({ tone, children }) {
  return <Suspense fallback={<RouteFallback tone={tone} />}>{children}</Suspense>;
}

function AppRoutes() {
  const { pathname } = useLocation();
  const tone = /^\/(robo-hi|team\/)/.test(pathname) ? 'dark' : 'light';

  return (
    <RouteErrorBoundary resetKey={pathname} tone={tone}>
      <Routes>
        <Route path="/" element={<GenesisLanding />} />
        <Route path="/robo-hi" element={<LazyRoute tone="dark"><Robohi /></LazyRoute>} />
        <Route path="/team/leads" element={<LazyRoute tone="dark"><Leads /></LazyRoute>} />
        <Route path="/team/electrical" element={<LazyRoute tone="dark"><Electrical /></LazyRoute>} />
        <Route path="/team/mechanical" element={<LazyRoute tone="dark"><Mechanical /></LazyRoute>} />
        <Route path="/team/software" element={<LazyRoute tone="dark"><SoftwareAI /></LazyRoute>} />
        <Route path="*" element={<LazyRoute tone="light"><NotFound /></LazyRoute>} />
      </Routes>
    </RouteErrorBoundary>
  );
}

function App() {
  return (
    <BrowserRouter>
      {/* LazyMotion + the `m` components load only framer-motion's DOM animation
          features (no drag/pan/layout projection), which keeps the main bundle smaller.
          `strict` makes an accidental full `motion.*` component fail loudly in dev. */}
      <LazyMotion features={domAnimation} strict>
        {/* Honors the OS "reduce motion" setting for every framer-motion animation. */}
        <MotionConfig reducedMotion="user">
          <PageMeta />
          <ScrollManager />
          <SkipLink />
          <AppRoutes />
        </MotionConfig>
      </LazyMotion>
    </BrowserRouter>
  );
}

export default App;
