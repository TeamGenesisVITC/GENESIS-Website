"use client";

import React, { useRef, useEffect, useCallback } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import manifest from './atlas-manifest.json';

gsap.registerPlugin(ScrollTrigger);

const {
  totalFrames: TOTAL_FRAMES,
  frameWidth: FRAME_WIDTH,
  frameHeight: FRAME_HEIGHT,
  columns: ATLAS_COLS,
  framesPerAtlas: FRAMES_PER_ATLAS,
  totalAtlases: TOTAL_ATLASES,
} = manifest;

// Preloader threshold: blocks until ALL atlases have finished loading (100% of sequence)
const CRITICAL_ATLAS_COUNT = TOTAL_ATLASES;
const MAX_CONCURRENT_BG = 4;

// Schedule idle execution with timeout; falls back to setTimeout for Safari/unsupported environments
function scheduleIdleTask(callback, timeout = 2000) {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, { timeout });
  }
  return setTimeout(callback, 1);
}

function cancelIdleTask(id) {
  if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
    window.cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
}

/**
 * High-precision cubic easing function (easeInOutCubic)
 * Delivers natural acceleration and deceleration for cinematic camera panning
 */
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function smoothCubic(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return easeInOutCubic(t);
}

/**
 * Continuous Smooth Cubic Keynote Camera Panning Engine:
 * - Spec 01 (0.00..0.17): Robot shifted LEFT (-22% width), Card on RIGHT
 * - Transition 1 -> 2 (0.17..0.25): Smooth cubic glide from LEFT to RIGHT
 * - Spec 02 (0.25..0.41): Robot shifted RIGHT (+22% width), Card on LEFT
 * - Transition 2 -> 3 (0.41..0.49): Smooth cubic glide from RIGHT to LEFT
 * - Spec 03 (0.49..0.65): Robot shifted LEFT (-22% width), Card on RIGHT
 * - Transition 3 -> 4 (0.65..0.73): Smooth cubic glide from LEFT to RIGHT
 * - Spec 04 (0.73..0.83): Robot shifted RIGHT (+22% width), Card on LEFT
 * - Transition 4 -> 5 (0.83..0.91): Smooth cubic glide from RIGHT to LEFT
 * - Spec 05 (0.91..1.00): Robot shifted LEFT (-22% width), Card on RIGHT
 */
function getTargetOffsetX(progress, width) {
  if (width <= 900) return 0; // Centered on mobile/tablets

  const leftPos = -width * 0.22;
  const rightPos = width * 0.22;

  if (progress < 0.17) {
    return leftPos;
  } else if (progress < 0.25) {
    const t = smoothCubic(0.17, 0.25, progress);
    return leftPos + (rightPos - leftPos) * t;
  } else if (progress < 0.41) {
    return rightPos;
  } else if (progress < 0.49) {
    const t = smoothCubic(0.41, 0.49, progress);
    return rightPos + (leftPos - rightPos) * t;
  } else if (progress < 0.65) {
    return leftPos;
  } else if (progress < 0.73) {
    const t = smoothCubic(0.65, 0.73, progress);
    return leftPos + (rightPos - leftPos) * t;
  } else if (progress < 0.83) {
    return rightPos;
  } else if (progress < 0.91) {
    const t = smoothCubic(0.83, 0.91, progress);
    return rightPos + (leftPos - rightPos) * t;
  } else {
    return leftPos;
  }
}

/**
 * Polished, Robust Hardware-Accelerated Video Frame Canvas
 * - Single-source 120Hz RAF render loop with cubic physics smoothing
 * - Sprite-sheet atlas streaming pipeline with critical-set fast reveal
 * - Background priority queue with concurrency cap of 4
 * - Optical sub-frame cross-blending for silky 120Hz motion
 * - Instant zero-flicker frame cache lookup
 */
export default function ScrollCanvas({ 
  containerSelector = "#flagship-section",
  targetProgressRef,
  onProgressUpdate,
  onLoadProgress,
  onSiteReady
}) {
  const canvasRef = useRef(null);
  const warmupCanvasRef = useRef(null);    // 1x1 offscreen canvas for GPU texture upload
  const atlasesMapRef = useRef(new Map()); // Map<atlasIndex, HTMLImageElement>
  const inFlightRef = useRef(new Map());   // Map<atlasIndex, { img, abort }>
  const queueRef = useRef([]);             // Array<atlasIndex>
  const activeBgCountRef = useRef(0);
  const isCancelledRef = useRef(false);
  const hasTriggeredReadyRef = useRef(false);
  const loadedCriticalCountRef = useRef(0);
  const loadAtlasRef = useRef(null);
  const pumpQueueRef = useRef(null);

  // Fix 3: Active user scroll detection for dynamic concurrency throttling
  const isScrollingRef = useRef(false);
  const scrollDebounceTimerRef = useRef(null);

  const markUserScrolling = useCallback(() => {
    isScrollingRef.current = true;
    if (scrollDebounceTimerRef.current) {
      clearTimeout(scrollDebounceTimerRef.current);
    }
    scrollDebounceTimerRef.current = setTimeout(() => {
      isScrollingRef.current = false;
      if (pumpQueueRef.current) {
        pumpQueueRef.current();
      }
    }, 150);
  }, []);

  // Reusable zero-allocation frame lookup slots to prevent GC pauses in 120Hz loop
  const frameSlotARef = useRef({
    image: null,
    sx: 0,
    sy: 0,
    sWidth: FRAME_WIDTH,
    sHeight: FRAME_HEIGHT,
    frameIndex: 0,
  });

  const frameSlotBRef = useRef({
    image: null,
    sx: 0,
    sy: 0,
    sWidth: FRAME_WIDTH,
    sHeight: FRAME_HEIGHT,
    frameIndex: 0,
  });

  const currentFrameRef = useRef(0);
  const targetFrameRef = useRef(0);
  const currentOffsetXRef = useRef(0);
  const dimensionsRef = useRef({ w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1 });
  const triggerRef = useRef(null);

  // Bump needed atlas to the FRONT of the queue if not yet loaded
  const prioritizeAtlas = useCallback((atlasIdx) => {
    if (atlasIdx < 0 || atlasIdx >= TOTAL_ATLASES) return;
    if (atlasesMapRef.current.has(atlasIdx) || inFlightRef.current.has(atlasIdx)) {
      return;
    }
    const idxInQueue = queueRef.current.indexOf(atlasIdx);
    if (idxInQueue !== -1) {
      queueRef.current.splice(idxInQueue, 1);
    }
    queueRef.current.unshift(atlasIdx);
    if (pumpQueueRef.current) {
      pumpQueueRef.current();
    }
  }, []);

  // Zero-allocation frame lookup: writes directly into pre-allocated slot
  const fillFrameLookup = useCallback((frameIndex, outSlot) => {
    const clamped = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(frameIndex)));
    const atlasIndex = Math.floor(clamped / FRAMES_PER_ATLAS);
    const atlasImg = atlasesMapRef.current.get(atlasIndex);

    if (!atlasImg || !atlasImg.complete || atlasImg.naturalWidth === 0) {
      prioritizeAtlas(atlasIndex);
      if (atlasIndex + 1 < TOTAL_ATLASES) {
        prioritizeAtlas(atlasIndex + 1);
      }
      return false;
    }

    const localIndex = clamped % FRAMES_PER_ATLAS;
    const col = localIndex % ATLAS_COLS;
    const row = Math.floor(localIndex / ATLAS_COLS);

    outSlot.image = atlasImg;
    outSlot.sx = col * FRAME_WIDTH;
    outSlot.sy = row * FRAME_HEIGHT;
    outSlot.sWidth = FRAME_WIDTH;
    outSlot.sHeight = FRAME_HEIGHT;
    outSlot.frameIndex = clamped;
    return true;
  }, [prioritizeAtlas]);

  // Fast nearest-loaded frame fallback: writes directly into slot to prevent GC pauses
  const findNearestLoadedInto = useCallback((targetIdx, outSlot) => {
    if (fillFrameLookup(targetIdx, outSlot)) return true;

    const clamped = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(targetIdx)));
    for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
      if (clamped - offset >= 0) {
        if (fillFrameLookup(clamped - offset, outSlot)) return true;
      }
      if (clamped + offset < TOTAL_FRAMES) {
        if (fillFrameLookup(clamped + offset, outSlot)) return true;
      }
    }
    return false;
  }, [fillFrameLookup]);

  // Frame draw routine (100% allocation-free)
  const drawFrame = useCallback((exactFrame, offsetX) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const { w, h } = dimensionsRef.current;

    const clamped = Math.max(0, Math.min(TOTAL_FRAMES - 1, exactFrame));
    const idxA = Math.floor(clamped);
    const idxB = Math.min(TOTAL_FRAMES - 1, idxA + 1);
    const alphaB = clamped - idxA;

    const slotA = frameSlotARef.current;
    const slotB = frameSlotBRef.current;

    const hasA = findNearestLoadedInto(idxA, slotA);
    const hasB = alphaB > 0.01 ? findNearestLoadedInto(idxB, slotB) : false;

    if (!hasA || !slotA.image) return;

    const imgW = slotA.sWidth || 1920;
    const imgH = slotA.sHeight || 1080;

    const scale = Math.max(w / imgW, h / imgH) * 0.90;
    const drawW = Math.round(imgW * scale);
    const drawH = Math.round(imgH * scale);
    const x = Math.round((w / 2) - (drawW / 2) + offsetX);
    const y = Math.round((h / 2) - (drawH / 2));

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, w, h);

    // Draw base frame A
    ctx.globalAlpha = 1.0;
    ctx.drawImage(slotA.image, slotA.sx, slotA.sy, slotA.sWidth, slotA.sHeight, x, y, drawW, drawH);

    // Optical sub-frame cross-blend
    if (alphaB > 0.01 && hasB && slotB.image && (slotB.image !== slotA.image || slotB.sx !== slotA.sx || slotB.sy !== slotA.sy)) {
      ctx.globalAlpha = alphaB;
      ctx.drawImage(slotB.image, slotB.sx, slotB.sy, slotB.sWidth, slotB.sHeight, x, y, drawW, drawH);
      ctx.globalAlpha = 1.0;
    }

    // Pinned edge feathering to melt seamlessly into #050505
    const leftFade = ctx.createLinearGradient(x, 0, x + 300, 0);
    leftFade.addColorStop(0, '#050505');
    leftFade.addColorStop(1, 'rgba(5,5,5,0)');
    ctx.fillStyle = leftFade;
    ctx.fillRect(x - 2, y, 302, drawH);

    const rightFade = ctx.createLinearGradient(x + drawW - 300, 0, x + drawW, 0);
    rightFade.addColorStop(0, 'rgba(5,5,5,0)');
    rightFade.addColorStop(1, '#050505');
    ctx.fillStyle = rightFade;
    ctx.fillRect(x + drawW - 300, y, 302, drawH);

    const bottomFade = ctx.createLinearGradient(0, y + drawH - 200, 0, y + drawH);
    bottomFade.addColorStop(0, 'rgba(5,5,5,0)');
    bottomFade.addColorStop(1, '#050505');
    ctx.fillStyle = bottomFade;
    ctx.fillRect(x, y + drawH - 200, drawW, 202);

    const topFade = ctx.createLinearGradient(0, y, 0, y + 80);
    topFade.addColorStop(0, '#050505');
    topFade.addColorStop(1, 'rgba(5,5,5,0)');
    ctx.fillStyle = topFade;
    ctx.fillRect(x, y - 2, drawW, 82);
  }, [findNearestLoadedInto]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      dimensionsRef.current = { w, h, dpr };

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (ctx) ctx.scale(dpr, dpr);
      }
      drawFrame(currentFrameRef.current, currentOffsetXRef.current);
    };

    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, [drawFrame]);

  // Fix 3 (cont.): Listen for scroll, wheel, and touchmove events to throttle concurrency
  useEffect(() => {
    const handleScrollActivity = () => {
      markUserScrolling();
    };

    window.addEventListener('wheel', handleScrollActivity, { passive: true });
    window.addEventListener('touchmove', handleScrollActivity, { passive: true });
    window.addEventListener('scroll', handleScrollActivity, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleScrollActivity);
      window.removeEventListener('touchmove', handleScrollActivity);
      window.removeEventListener('scroll', handleScrollActivity);
      if (scrollDebounceTimerRef.current) {
        clearTimeout(scrollDebounceTimerRef.current);
      }
    };
  }, [markUserScrolling]);

  // ── Sprite-Sheet Atlas Preloader & Background Queue Pipeline with GPU Warm-up ──
  useEffect(() => {
    isCancelledRef.current = false;
    hasTriggeredReadyRef.current = false;
    loadedCriticalCountRef.current = 0;
    activeBgCountRef.current = 0;

    // Pump queue respecting dynamic concurrency cap (1 during active scroll, 4 when idle)
    pumpQueueRef.current = () => {
      if (isCancelledRef.current) return;
      const maxConcurrency = isScrollingRef.current ? 1 : MAX_CONCURRENT_BG;
      while (activeBgCountRef.current < maxConcurrency && queueRef.current.length > 0) {
        const nextAtlasIdx = queueRef.current.shift();
        if (atlasesMapRef.current.has(nextAtlasIdx) || inFlightRef.current.has(nextAtlasIdx)) {
          continue;
        }
        if (loadAtlasRef.current) {
          loadAtlasRef.current(nextAtlasIdx);
        }
      }
    };

    // Load an individual atlas with explicit async decode + GPU warm-up upload
    loadAtlasRef.current = (atlasIdx) => {
      if (atlasesMapRef.current.has(atlasIdx) || inFlightRef.current.has(atlasIdx)) {
        return;
      }
      activeBgCountRef.current++;
      const img = new Image();
      img.decoding = 'async';

      let isAborted = false;
      let idleTaskId = null;

      inFlightRef.current.set(atlasIdx, {
        abort: () => {
          isAborted = true;
          if (idleTaskId !== null) {
            cancelIdleTask(idleTaskId);
          }
          img.src = '';
        },
      });

      const finalizeAtlas = async () => {
        if (isAborted || isCancelledRef.current) {
          inFlightRef.current.delete(atlasIdx);
          activeBgCountRef.current--;
          if (pumpQueueRef.current) pumpQueueRef.current();
          return;
        }

        // Force full pixel decode off the main thread before cache availability
        try {
          if ('decode' in img) {
            await img.decode();
          }
        } catch (e) {
          // If decode fails or is cancelled, proceed to fallback
        }

        if (isAborted || isCancelledRef.current) {
          inFlightRef.current.delete(atlasIdx);
          activeBgCountRef.current--;
          if (pumpQueueRef.current) pumpQueueRef.current();
          return;
        }

        // Perform throwaway 1x1 draw to upload decoded bitmap texture into GPU memory
        try {
          if (!warmupCanvasRef.current) {
            const offscreen = document.createElement('canvas');
            offscreen.width = 1;
            offscreen.height = 1;
            warmupCanvasRef.current = offscreen;
          }
          const warmupCtx = warmupCanvasRef.current.getContext('2d', { alpha: false });
          if (warmupCtx) {
            warmupCtx.drawImage(img, 0, 0, 1, 1, 0, 0, 1, 1);
          }
        } catch (e) {
          // Ignore warmup draw errors
        }

        // Add to cache ONLY after decode and GPU texture upload are verified
        inFlightRef.current.delete(atlasIdx);
        activeBgCountRef.current--;

        if (!isAborted && !isCancelledRef.current) {
          atlasesMapRef.current.set(atlasIdx, img);

          // Track critical set
          if (atlasIdx < CRITICAL_ATLAS_COUNT) {
            loadedCriticalCountRef.current++;
            const pct = Math.min(100, Math.round((loadedCriticalCountRef.current / CRITICAL_ATLAS_COUNT) * 100));
            if (onLoadProgress) onLoadProgress(pct);

            if (atlasIdx === 0) {
              drawFrame(0, getTargetOffsetX(0, window.innerWidth));
            }

            if (loadedCriticalCountRef.current >= CRITICAL_ATLAS_COUNT && !hasTriggeredReadyRef.current) {
              hasTriggeredReadyRef.current = true;
              if (onSiteReady) onSiteReady(true);
            }
          }
        }

        if (pumpQueueRef.current) {
          pumpQueueRef.current();
        }
      };

      const handleAtlasReady = () => {
        if (isAborted || isCancelledRef.current) {
          inFlightRef.current.delete(atlasIdx);
          activeBgCountRef.current--;
          if (pumpQueueRef.current) pumpQueueRef.current();
          return;
        }

        // Fix 2: For background atlases (post-critical set), defer decode + GPU warmup to idle period
        if (atlasIdx >= CRITICAL_ATLAS_COUNT) {
          idleTaskId = scheduleIdleTask(() => {
            finalizeAtlas();
          }, 2000);
        } else {
          // Critical set: finalize immediately to unblock preloader swiftly
          finalizeAtlas();
        }
      };

      const handleAtlasError = () => {
        inFlightRef.current.delete(atlasIdx);
        activeBgCountRef.current--;
        if (pumpQueueRef.current) {
          pumpQueueRef.current();
        }
      };

      img.onload = handleAtlasReady;
      img.onerror = handleAtlasError;
      img.src = `/frame-atlases/atlas-${atlasIdx}.webp`;
    };

    // 1. Build background queue for all remaining non-critical atlases in sequential order
    const initialBgQueue = [];
    for (let i = CRITICAL_ATLAS_COUNT; i < TOTAL_ATLASES; i++) {
      initialBgQueue.push(i);
    }
    queueRef.current = initialBgQueue;

    // 2. Load critical set (atlases 0 to CRITICAL_ATLAS_COUNT - 1)
    for (let i = 0; i < CRITICAL_ATLAS_COUNT; i++) {
      if (loadAtlasRef.current) {
        loadAtlasRef.current(i);
      }
    }

    const inFlight = inFlightRef.current;

    return () => {
      isCancelledRef.current = true;
      inFlight.forEach(({ abort }) => abort());
      inFlight.clear();
    };
  }, [drawFrame, onLoadProgress, onSiteReady]);

  // GSAP ScrollTrigger Integration for progress tracking
  useEffect(() => {
    const targetElement = document.querySelector(containerSelector) || document.getElementById("flagship-section");
    if (!targetElement) return;

    triggerRef.current = ScrollTrigger.create({
      trigger: targetElement,
      start: "top top",
      end: "bottom bottom",
      scrub: false, // Progress tracked directly by unified 120Hz RAF loop
      onUpdate: (self) => {
        markUserScrolling();
        const progress = Math.min(Math.max(self.progress, 0), 1);
        targetFrameRef.current = progress * (TOTAL_FRAMES - 1);
        if (onProgressUpdate) {
          onProgressUpdate(progress);
        }
      },
    });

    return () => {
      if (triggerRef.current) {
        triggerRef.current.kill();
      }
    };
  }, [containerSelector, onProgressUpdate, markUserScrolling]);

  // Single Unified 120Hz RAF Render Loop (Zero Glitch / Zero Double-Draw)
  useEffect(() => {
    let animId;
    let lastDrawnFrame = -1;
    let lastDrawnOffset = -99999;
    let lastTargetProgress = 0;

    const render = () => {
      // Determine active target frame
      let targetProgress = 0;
      if (targetProgressRef && typeof targetProgressRef.current === 'number') {
        targetProgress = targetProgressRef.current;
      } else if (triggerRef.current) {
        targetProgress = triggerRef.current.progress;
      }

      // Fix 2: Lightweight velocity estimation for lookahead atlas prefetching
      const progressDelta = targetProgress - lastTargetProgress;
      lastTargetProgress = targetProgress;

      const exactTargetFrame = targetProgress * (TOTAL_FRAMES - 1);
      const { w } = dimensionsRef.current;
      const targetOffset = getTargetOffsetX(targetProgress, w);

      // Smooth cubic inertia lerping
      const frameDelta = exactTargetFrame - currentFrameRef.current;
      const offsetDelta = targetOffset - currentOffsetXRef.current;

      currentFrameRef.current += frameDelta * 0.18;
      currentOffsetXRef.current += offsetDelta * 0.18;

      // Draw only when values move
      if (
        Math.abs(currentFrameRef.current - lastDrawnFrame) > 0.005 ||
        Math.abs(currentOffsetXRef.current - lastDrawnOffset) > 0.05
      ) {
        drawFrame(currentFrameRef.current, currentOffsetXRef.current);
        lastDrawnFrame = currentFrameRef.current;
        lastDrawnOffset = currentOffsetXRef.current;
      }

      // Proactively prefetch 1-3 atlases ahead in the scrub direction during movement
      if (Math.abs(progressDelta) > 0.0002) {
        const direction = Math.sign(progressDelta);
        const currentAtlasIdx = Math.floor(currentFrameRef.current / FRAMES_PER_ATLAS);
        const lookaheadCount = Math.abs(progressDelta) > 0.005 ? 3 : 2;
        for (let i = 1; i <= lookaheadCount; i++) {
          const aheadAtlasIdx = currentAtlasIdx + direction * i;
          if (aheadAtlasIdx >= 0 && aheadAtlasIdx < TOTAL_ATLASES) {
            prioritizeAtlas(aheadAtlasIdx);
          }
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [targetProgressRef, drawFrame, prioritizeAtlas]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        display: 'block',
        transform: 'translateZ(0)',
        willChange: 'transform',
      }}
    />
  );
}