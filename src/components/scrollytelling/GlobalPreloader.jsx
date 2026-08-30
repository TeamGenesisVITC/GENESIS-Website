import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Global Whole-Website Preloader
 * Covers entire website, prevents early scrolling, and smoothly unlocks
 * the moment critical frames and site assets are ready.
 */
export default function GlobalPreloader({ progress = 0, isReady = false, onDismiss }) {
  const [displayPercent, setDisplayPercent] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);

  // Smooth number interpolation for buttery smooth 0 -> 100% count-up
  useEffect(() => {
    let animId;
    const target = Math.min(100, Math.max(0, progress));

    const step = () => {
      setDisplayPercent((prev) => {
        if (prev < target) {
          const delta = target - prev;
          const next = Math.min(target, prev + Math.max(1, Math.ceil(delta * 0.25)));
          return next;
        }
        return prev;
      });
      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [progress]);

  // Handle dismissal after ready
  useEffect(() => {
    if (isReady && displayPercent >= 98) {
      const timer = setTimeout(() => {
        setIsDismissed(true);
        if (onDismiss) onDismiss();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isReady, displayPercent, onDismiss]);

  // Lock body scroll while preloading
  useEffect(() => {
    if (!isDismissed) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDismissed]);

  return (
    <AnimatePresence>
      {!isDismissed && (
        <motion.div
          key="global-preloader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[999999] flex flex-col justify-between p-8 sm:p-14 bg-[#060608] text-white"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: 'clamp(24px, 5vw, 56px)',
            backgroundColor: '#060608',
            color: '#FFFFFF',
          }}
        >
          {/* Ambient Purple Optical Glow */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'min(600px, 90vw)',
              height: 'min(600px, 90vw)',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(168, 85, 247, 0.18) 0%, rgba(0, 0, 0, 0) 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* Top Bar */}
          <div className="flex items-center justify-between font-mono text-[11px] tracking-[0.2em] text-zinc-400 uppercase" style={{ position: 'relative', zIndex: 2 }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#A855F7' }} />
              <span>TEAM GENESIS · VIT CHENNAI</span>
            </div>
            <div className="hidden sm:block text-zinc-500">
              CORE HARDWARE &amp; EMBODIED AI LAB
            </div>
          </div>

          {/* Center Stage: Percentage & Bar */}
          <div className="flex flex-col items-center justify-center my-auto" style={{ position: 'relative', zIndex: 2 }}>
            <div className="font-mono text-[11px] sm:text-xs tracking-[0.25em] text-purple-300 uppercase mb-4 sm:mb-6">
              INITIALIZING PLATFORM TELEMETRY // 931 FRAMES
            </div>

            <div className="flex items-baseline gap-2 mb-6 sm:mb-8">
              <span
                className="font-cabinet font-black text-white"
                style={{ fontSize: 'clamp(5rem, 14vw, 10rem)', fontWeight: 900, lineHeight: 0.9, letterSpacing: '-0.04em' }}
              >
                {displayPercent}
              </span>
              <span
                className="font-mono font-bold text-purple-400"
                style={{ fontSize: 'clamp(1.75rem, 4vw, 3rem)', color: '#C084FC' }}
              >
                %
              </span>
            </div>

            {/* Neon Progress Bar */}
            <div
              style={{
                width: 'min(320px, 80vw)',
                height: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                borderRadius: '999px',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${displayPercent}%`,
                  background: 'linear-gradient(90deg, #7C3AED, #A855F7, #F3E8FF)',
                  boxShadow: '0 0 16px rgba(168, 85, 247, 0.9)',
                  transition: 'width 0.1s linear',
                  borderRadius: '999px',
                }}
              />
            </div>
          </div>

          {/* Bottom Telemetry Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-[10px] sm:text-[11px] tracking-[0.16em] text-zinc-500" style={{ position: 'relative', zIndex: 2 }}>
            <div>[ STATUS: CALIBRATING OPTICAL SENSORS ]</div>
            <div>AUTONOMOUS BIPED PLATFORM // 2026 FLEET</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
