import React from 'react';
import PrefetchLink from '../components/PrefetchLink';

/**
 * Shared decorative backdrop for the /team/* pages: neon grid + full-bleed artwork.
 * The artwork is served as AVIF (~80-130 KB) or WebP, with the original PNG
 * (1.7-2.4 MB) only as the last-resort fallback.
 */
export function TeamBackdrop({ avif, webp, png, width = 1440, height = 1024 }) {
  return (
    <>
      <div className="neon-grid" aria-hidden="true"></div>
      <div className="hero-background" aria-hidden="true">
        {/* display: contents keeps the <img> sized against .hero-background exactly as before */}
        <picture style={{ display: 'contents' }}>
          <source type="image/avif" srcSet={avif} />
          <source type="image/webp" srcSet={webp} />
          <img
            src={png}
            alt=""
            width={width}
            height={height}
            loading="eager"
            fetchpriority="high"
            decoding="async"
          />
        </picture>
      </div>
    </>
  );
}

/** "Back" control: a real link to /robo-hi (it navigates), styled as the existing pill. */
export function BackToTeamLink() {
  return (
    <PrefetchLink to="/robo-hi" className="back-button" aria-label="Back to team overview">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
        <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Back
    </PrefetchLink>
  );
}
