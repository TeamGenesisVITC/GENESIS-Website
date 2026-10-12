// GSAP + ScrollTrigger, loaded only by the fallbacks that still need them (browsers without CSS
// scroll-driven animations, or a ScrollCanvas used without a parent tracking its progress).
//
// On the landing page in current browsers nothing uses them, and merely registering ScrollTrigger
// installs global scroll and wheel listeners plus a requestAnimationFrame loop that runs for as
// long as the page is scrolling: main-thread work on every frame of every scroll, anywhere on the
// page. Loading them on demand also keeps ~110 kB of script out of the initial bundle.
let pending = null;

export default function loadScrollTrigger() {
  if (!pending) {
    pending = Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(
      ([{ gsap }, { ScrollTrigger }]) => {
        gsap.registerPlugin(ScrollTrigger);
        // Scrubbed animations follow the scroll position exactly, even after a long frame.
        gsap.ticker.lagSmoothing(0);
        return { gsap, ScrollTrigger };
      },
      (error) => {
        pending = null; // let a later caller try again (e.g. after a network hiccup)
        throw error;
      },
    );
  }
  return pending;
}
