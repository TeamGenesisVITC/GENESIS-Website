// Dynamic-import loaders shared by the router (React.lazy) and link prefetching.
// Plain `import()` keeps this bundler-agnostic (works with CRA/webpack and Vite).

function memoizedLoader(load) {
  let promise = null;
  return () => {
    if (!promise) {
      promise = load().catch((error) => {
        // Allow a retry (e.g. after a flaky network) instead of caching the failure.
        promise = null;
        throw error;
      });
    }
    return promise;
  };
}

export const loadTeamRoutes = memoizedLoader(() => import('./teamRoutes'));
export const loadNotFound = memoizedLoader(() => import('./NotFound'));

const TEAM_PATH = /^\/(robo-hi|team\/(leads|electrical|mechanical|software))\/?$/;

/**
 * Warm the code chunk for an internal path (call on hover / focus / touchstart).
 * Safe to call repeatedly; failures are swallowed because this is only a hint.
 */
export function prefetchRoute(path) {
  if (typeof path !== 'string' || !TEAM_PATH.test(path)) return;
  loadTeamRoutes().catch(() => {});
}
