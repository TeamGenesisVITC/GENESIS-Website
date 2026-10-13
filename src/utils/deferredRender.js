// Landing sections that start with content-visibility: auto ([data-deferred-render],
// GenesisLanding.css): the first paint lays out only the hero, and these helpers render the
// rest for real afterwards.

const SELECTOR = '[data-deferred-render]';

// Fired on window once every deferred section of a landing page has been rendered, i.e. when
// section positions are final (TeamSection's ScrollTrigger fallback refreshes on it).
export const SECTIONS_RENDERED_EVENT = 'genesis:sections-rendered';

function reveal(section) {
  if (section.style.contentVisibility !== 'visible') section.style.contentVisibility = 'visible';
}

/**
 * Renders the deferred sections inside `root` one per idle moment, starting after the page's
 * load event, so scrolling into a section never has to lay it out. Returns a cancel function
 * (the landing page calls this on mount and cancels on unmount).
 */
export function scheduleDeferredRender(root) {
  const pending = [...root.querySelectorAll(SELECTOR)];
  let handle = null;
  let cancelled = false;
  const hasIdle = typeof window.requestIdleCallback === 'function';
  const idle = (fn) => (hasIdle ? window.requestIdleCallback(fn, { timeout: 1500 }) : window.setTimeout(fn, 60));
  const cancelIdle = (id) => (hasIdle ? window.cancelIdleCallback(id) : window.clearTimeout(id));

  const next = () => {
    handle = null;
    if (cancelled) return;
    const section = pending.shift();
    if (!section) {
      window.dispatchEvent(new Event(SECTIONS_RENDERED_EVENT));
      return;
    }
    reveal(section);
    handle = idle(next);
  };
  const start = () => {
    if (!cancelled) handle = idle(next);
  };

  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });

  return () => {
    cancelled = true;
    window.removeEventListener('load', start);
    if (handle !== null) cancelIdle(handle);
  };
}

/**
 * Renders every deferred section before `target` (and the one containing it) right away, so
 * its position is final before a jump to it is measured. Costs one synchronous layout, and
 * only until the idle rendering has caught up.
 */
export function revealDeferredThrough(target) {
  for (const section of document.querySelectorAll(SELECTOR)) {
    reveal(section);
    if (section === target || section.contains(target)) break;
  }
}
