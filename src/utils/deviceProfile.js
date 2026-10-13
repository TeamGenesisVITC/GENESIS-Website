// What the visitor's device and connection can comfortably afford.
//
// "Lite" means: skip the heavy, purely decorative work (streaming and decoding the frame atlases
// of the scroll sequence) and show lighter equivalents instead. It is decided once per page load:
//   - the browser's Data Saver / "reduce data" preference (navigator.connection.saveData,
//     prefers-reduced-data), which is an explicit request from the visitor;
//   - a device with <= 2 GB of RAM (navigator.deviceMemory, Chromium only), where ~60 MB per
//     decoded atlas risks the tab being killed;
//   - a slow connection: effectiveType 2G/3G-class or a measured downlink under 1 Mbps
//     (navigator.connection), where the ~5 MB sequence takes 30 s or more to arrive.
// Browsers without these APIs (Safari, Firefox) report nothing and get the full experience.

let cached = null;

export function isLiteDevice() {
  if (cached !== null) return cached;
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  // ?lite / ?full in the URL force either mode (testing on real phones, perf harness).
  const query = window.location.search;
  if (/[?&]lite\b/.test(query)) return (cached = true);
  if (/[?&]full\b/.test(query)) return (cached = false);

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const saveData = !!(connection && connection.saveData);
  const reducedData = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-data: reduce)').matches;
  const lowMemory = typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 2;
  const slowNetwork = !!connection && (
    /^(slow-2g|2g|3g)$/.test(connection.effectiveType || '') ||
    (typeof connection.downlink === 'number' && connection.downlink > 0 && connection.downlink < 1)
  );
  cached = saveData || reducedData || lowMemory || slowNetwork;
  return cached;
}

// Marks the document (<html class="is-lite">) so the CSS can drop decorative GPU work too:
// the header's backdrop blur and the story cards' blur transitions.
export function applyLiteClass() {
  if (isLiteDevice() && typeof document !== 'undefined') document.documentElement.classList.add('is-lite');
}
