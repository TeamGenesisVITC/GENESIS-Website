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
// Layout uses the source frame size, so cover-fit geometry is independent of the atlas scale.
const DISPLAY_WIDTH = manifest.sourceWidth || FRAME_WIDTH;
const DISPLAY_HEIGHT = manifest.sourceHeight || FRAME_HEIGHT;
const ATLAS_BASE_PATH = manifest.basePath || '/frame-atlases/';
const ATLASES = manifest.atlases;

// Frames after the initial one that must be decoded before the site is reported ready.
const LEAD_IN_FRAMES = 12;
// Concurrent atlas downloads once the initial view is ready (critical atlases go first, alone).
const MAX_CONCURRENT_FETCHES = 3;
// Concurrent atlas decodes (each is a ~15 MP image decoded on a browser worker thread).
const MAX_CONCURRENT_DECODES = 2;
// Failed atlas requests are retried with exponential backoff: 0.5s, 1s, 2s, 4s.
const MAX_RETRIES = 4;
const RETRY_BASE_MS = 500;
// Never hold the site hostage to the sequence: report ready after this long regardless.
const READY_TIMEOUT_MS = 12000;
// Atlas frames are 960px wide (1920px sources) and always upscaled, so backing the canvas beyond 1.5x DPR adds fill cost without detail
const MAX_CANVAS_DPR = 1.5;
// Inertia rate (per second); equals the previous 0.18-per-frame lerp at 60 Hz, now refresh-rate independent
const DAMPING_PER_SECOND = 11.9;

const STATUS_IDLE = 0;
const STATUS_LOADING = 1;
const STATUS_READY = 2;
const STATUS_RETRY_WAIT = 3;
const STATUS_FAILED = 4;

// Opt-in counters for the perf harness: load the page with ?scstats to expose window.__sc.
const STATS =
  typeof window !== 'undefined' && /[?&]scstats\b/.test(window.location.search)
    ? (window.__sc = {
        draws: 0, missA: 0, blank: 0, firstDrawAt: null, readyAt: null, readyBytes: null,
        readyRequests: null, allLoadedAt: null, loaded: 0, retries: 0, failed: 0,
      })
    : null;

function atlasUrl(atlasIdx) {
  const entry = ATLASES && ATLASES[atlasIdx];
  return ATLAS_BASE_PATH + (entry ? entry.file : `atlas-${atlasIdx}.webp`);
}

function atlasOfFrame(frameIdx) {
  return Math.floor(frameIdx / FRAMES_PER_ATLAS);
}

// Reads a response body while reporting received bytes (used for the critical atlases' progress).
async function readBlob(response, onBytes) {
  if (!onBytes || !response.body || typeof response.body.getReader !== 'function') {
    return response.blob();
  }
  const reader = response.body.getReader();
  const chunks = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    onBytes(value.byteLength);
  }
  return new Blob(chunks, { type: response.headers.get('Content-Type') || 'image/webp' });
}

// Decodes off the main thread via createImageBitmap; falls back to <img>.decode().
// Returns { source, release } where release() frees the decoded pixels.
async function decodeAtlas(blob) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob);
      return { source: bitmap, release: () => bitmap.close() };
    } catch (e) {
      // Fall through to the <img> path (e.g. engines that cannot decode this type into a bitmap).
    }
  }
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  try {
    await (typeof img.decode === 'function'
      ? img.decode()
      : new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; }));
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
  return { source: img, release: () => { img.src = ''; URL.revokeObjectURL(url); } };
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

function readInitialProgress(containerSelector, targetProgressRef) {
  const el = document.querySelector(containerSelector) || document.getElementById('flagship-section');
  if (el) {
    const scrollable = el.offsetHeight - window.innerHeight;
    if (scrollable > 0) {
      return Math.min(1, Math.max(0, -el.getBoundingClientRect().top / scrollable));
    }
  }
  const p = targetProgressRef && targetProgressRef.current;
  return typeof p === 'number' ? Math.min(1, Math.max(0, p)) : 0;
}

/**
 * Scroll-scrubbed frame sequence on a canvas.
 * - Sprite-sheet atlases (see scripts/generate-atlases.js), streamed by priority around the
 *   current scroll position and direction with bounded concurrency, kept resident once decoded
 * - Site is reported ready once the initial view plus a short lead-in is decoded
 * - Decode off the main thread (createImageBitmap); misses draw the nearest decoded frame
 * - Single gsap.ticker render loop with frame-rate independent inertia and sub-frame cross-blend
 */
export default function ScrollCanvas({
  containerSelector = "#flagship-section",
  targetProgressRef,
  onProgressUpdate,
  onLoadProgress,
  onSiteReady,
  reducedMotion = false // prefers-reduced-motion: snap to the target frame instead of easing
}) {
  const canvasRef = useRef(null);
  // Per-frame draw sources: { image, sx, sy } once its atlas is decoded, else null.
  const framesRef = useRef(new Array(TOTAL_FRAMES).fill(null));
  const needsRedrawRef = useRef(false);
  const lastDrawExactRef = useRef(true);
  // Where the user is heading (target frame) and the last scroll direction, for load priority.
  const focusFrameRef = useRef(0);
  const scrollDirRef = useRef(1);

  // Latest callbacks, so the loader effect runs once even if the parent passes inline functions.
  const onLoadProgressRef = useRef(onLoadProgress);
  const onSiteReadyRef = useRef(onSiteReady);
  onLoadProgressRef.current = onLoadProgress;
  onSiteReadyRef.current = onSiteReady;
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;

  const currentFrameRef = useRef(0);
  const currentOffsetXRef = useRef(0);
  const dimensionsRef = useRef({ w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1 });
  const fadeCacheRef = useRef({ ctx: null, drawW: 0, drawH: 0, gradients: null });
  const triggerRef = useRef(null);

  // Nearest decoded frame to frameIdx (bounded linear scan; only runs on a miss).
  const findNearestLoaded = useCallback((frameIdx) => {
    const frames = framesRef.current;
    for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
      const before = frameIdx - offset;
      const after = frameIdx + offset;
      if (before >= 0 && frames[before]) return frames[before];
      if (after < TOTAL_FRAMES && frames[after]) return frames[after];
      if (before < 0 && after >= TOTAL_FRAMES) break;
    }
    return null;
  }, []);

  // Frame draw routine (allocation-free)
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

    const frames = framesRef.current;
    const exactA = frames[idxA];
    const frameA = exactA || findNearestLoaded(idxA);
    // Only blend towards the true next frame; never towards a stand-in.
    const frameB = alphaB > 0.01 ? frames[idxB] : null;
    lastDrawExactRef.current = !!exactA && (alphaB <= 0.01 || !!frameB);
    if (STATS) {
      STATS.draws++;
      if (!frameA) STATS.blank++;
      else if (!exactA) STATS.missA++;
      if (frameA && STATS.firstDrawAt === null) STATS.firstDrawAt = performance.now();
    }
    if (!frameA) return;

    const scale = Math.max(w / DISPLAY_WIDTH, h / DISPLAY_HEIGHT) * 0.90;
    const drawW = Math.round(DISPLAY_WIDTH * scale);
    const drawH = Math.round(DISPLAY_HEIGHT * scale);
    const x = Math.round((w / 2) - (drawW / 2) + offsetX);
    const y = Math.round((h / 2) - (drawH / 2));

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, w, h);

    // Draw base frame A
    ctx.globalAlpha = 1.0;
    ctx.drawImage(frameA.image, frameA.sx, frameA.sy, FRAME_WIDTH, FRAME_HEIGHT, x, y, drawW, drawH);

    // Optical sub-frame cross-blend
    if (frameB && frameB !== frameA) {
      ctx.globalAlpha = alphaB;
      ctx.drawImage(frameB.image, frameB.sx, frameB.sy, FRAME_WIDTH, FRAME_HEIGHT, x, y, drawW, drawH);
      ctx.globalAlpha = 1.0;
    }

    // Pinned edge feathering to melt seamlessly into #050505.
    // Gradients are built once per size in frame-local coords, then positioned via translate.
    const fadeCache = fadeCacheRef.current;
    if (fadeCache.ctx !== ctx || fadeCache.drawW !== drawW || fadeCache.drawH !== drawH) {
      const leftFade = ctx.createLinearGradient(0, 0, 300, 0);
      leftFade.addColorStop(0, '#050505');
      leftFade.addColorStop(1, 'rgba(5,5,5,0)');

      const rightFade = ctx.createLinearGradient(drawW - 300, 0, drawW, 0);
      rightFade.addColorStop(0, 'rgba(5,5,5,0)');
      rightFade.addColorStop(1, '#050505');

      const bottomFade = ctx.createLinearGradient(0, drawH - 200, 0, drawH);
      bottomFade.addColorStop(0, 'rgba(5,5,5,0)');
      bottomFade.addColorStop(1, '#050505');

      const topFade = ctx.createLinearGradient(0, 0, 0, 80);
      topFade.addColorStop(0, '#050505');
      topFade.addColorStop(1, 'rgba(5,5,5,0)');

      fadeCache.ctx = ctx;
      fadeCache.drawW = drawW;
      fadeCache.drawH = drawH;
      fadeCache.gradients = { leftFade, rightFade, bottomFade, topFade };
    }
    const { leftFade, rightFade, bottomFade, topFade } = fadeCache.gradients;

    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = leftFade;
    ctx.fillRect(-2, 0, 302, drawH);
    ctx.fillStyle = rightFade;
    ctx.fillRect(drawW - 300, 0, 302, drawH);
    ctx.fillStyle = bottomFade;
    ctx.fillRect(0, drawH - 200, drawW, 202);
    ctx.fillStyle = topFade;
    ctx.fillRect(0, -2, drawW, 82);
    ctx.restore();
  }, [findNearestLoaded]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_CANVAS_DPR);
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

  // ── Atlas streaming: critical set first, then priority order around the scroll position ──
  useEffect(() => {
    let cancelled = false;
    const frames = framesRef.current;
    const status = new Uint8Array(TOTAL_ATLASES);
    const attempts = new Uint8Array(TOTAL_ATLASES);
    const controllers = new Map(); // atlasIdx -> AbortController (download in progress)
    const releases = [];           // decoded resources to free on unmount
    const timers = new Set();
    const pendingDecodes = new Map(); // atlasIdx -> downloaded Blob awaiting decode
    let activeFetches = 0;
    let activeDecodes = 0;
    let loadedCount = 0;
    let readySignalled = false;

    // Critical set: atlases holding the initial frame and the lead-in after it.
    const initialFrame = Math.round(readInitialProgress(containerSelector, targetProgressRef) * (TOTAL_FRAMES - 1));
    focusFrameRef.current = initialFrame;
    const critical = new Set();
    for (let f = initialFrame; f <= Math.min(TOTAL_FRAMES - 1, initialFrame + LEAD_IN_FRAMES); f++) {
      critical.add(atlasOfFrame(f));
    }
    let criticalUnsettled = critical.size;   // not yet decoded or permanently failed
    const downloaded = new Uint8Array(TOTAL_ATLASES);
    const criticalTotalBytes = [...critical].reduce((sum, i) => sum + ((ATLASES && ATLASES[i] && ATLASES[i].bytes) || 0), 0);
    let criticalReceivedBytes = 0;
    let lastProgress = -1;

    const reportProgress = (pct) => {
      const value = Math.max(lastProgress, Math.min(100, Math.floor(pct)));
      if (value === lastProgress) return;
      lastProgress = value;
      const cb = onLoadProgressRef.current;
      if (cb) cb(value);
    };

    const signalReady = () => {
      if (readySignalled || cancelled) return;
      readySignalled = true;
      reportProgress(100);
      if (STATS) {
        STATS.readyAt = performance.now();
        const entries = performance.getEntriesByType('resource').filter((e) => e.name.includes(ATLAS_BASE_PATH));
        STATS.readyRequests = entries.length;
        STATS.readyBytes = entries.reduce((sum, e) => sum + (e.transferSize || e.encodedBodySize || 0), 0);
      }
      const cb = onSiteReadyRef.current;
      if (cb) cb(true);
    };

    const settleCritical = (atlasIdx) => {
      if (!critical.has(atlasIdx)) return;
      critical.delete(atlasIdx);
      criticalUnsettled--;
      if (criticalUnsettled === 0) signalReady();
    };

    // Lower score = sooner. Atlases ahead in the scroll direction cost half as much as behind.
    const priorityOf = (atlasIdx) => {
      const d = (atlasIdx - atlasOfFrame(Math.round(focusFrameRef.current))) * scrollDirRef.current;
      return d >= 0 ? d : -2 * d + 0.5;
    };

    const pickBest = (isCandidate) => {
      let best = -1;
      let bestScore = Infinity;
      for (let i = 0; i < TOTAL_ATLASES; i++) {
        if (!isCandidate(i)) continue;
        const score = priorityOf(i);
        if (score < bestScore) {
          bestScore = score;
          best = i;
        }
      }
      return best;
    };

    // Downloads: until every critical atlas has arrived, critical ones get the connection alone.
    const criticalDownloadPending = () => {
      let pending = false;
      critical.forEach((i) => { if (!downloaded[i]) pending = true; });
      return pending;
    };
    const canFetch = (i) => status[i] === STATUS_IDLE && (critical.has(i) || !criticalDownloadPending());
    // Decodes: nothing else decodes until the critical set is done, so the initial view never
    // competes with background atlases for decoder threads.
    const canDecode = (i) => pendingDecodes.has(i) && (criticalUnsettled === 0 || critical.has(i));

    const pump = () => {
      if (cancelled) return;
      while (activeFetches < MAX_CONCURRENT_FETCHES) {
        const next = pickBest(canFetch);
        if (next < 0) break;
        loadAtlas(next);
      }
      while (activeDecodes < MAX_CONCURRENT_DECODES) {
        const next = pickBest(canDecode);
        if (next < 0) break;
        const blob = pendingDecodes.get(next);
        pendingDecodes.delete(next);
        decodeAndRegister(next, blob);
      }
    };

    const decodeAndRegister = async (atlasIdx, blob) => {
      activeDecodes++;
      try {
        const decoded = await decodeAtlas(blob);
        if (cancelled) {
          decoded.release();
          return;
        }
        releases.push(decoded.release);
        registerAtlas(atlasIdx, decoded.source);
        status[atlasIdx] = STATUS_READY;
        loadedCount++;
        if (STATS) {
          STATS.loaded = loadedCount;
          if (loadedCount === TOTAL_ATLASES) STATS.allLoadedAt = performance.now();
        }
        settleCritical(atlasIdx);
      } catch (error) {
        if (!cancelled) {
          downloaded[atlasIdx] = 0;
          handleFailure(atlasIdx, error);
        }
      } finally {
        activeDecodes--;
        pump();
      }
    };

    const schedule = (fn, ms) => {
      const id = setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };

    const registerAtlas = (atlasIdx, source) => {
      const first = atlasIdx * FRAMES_PER_ATLAS;
      const count = Math.min(FRAMES_PER_ATLAS, TOTAL_FRAMES - first);
      for (let local = 0; local < count; local++) {
        frames[first + local] = {
          image: source,
          sx: (local % ATLAS_COLS) * FRAME_WIDTH,
          sy: Math.floor(local / ATLAS_COLS) * FRAME_HEIGHT,
        };
      }
      // Repaint if the last draw had to stand in for a missing frame (or drew nothing).
      if (!lastDrawExactRef.current) needsRedrawRef.current = true;
    };

    const handleFailure = (atlasIdx, error) => {
      if (cancelled) return;
      attempts[atlasIdx]++;
      if (attempts[atlasIdx] <= MAX_RETRIES) {
        status[atlasIdx] = STATUS_RETRY_WAIT;
        if (STATS) STATS.retries++;
        schedule(() => {
          if (status[atlasIdx] === STATUS_RETRY_WAIT) status[atlasIdx] = STATUS_IDLE;
          pump();
        }, RETRY_BASE_MS * 2 ** (attempts[atlasIdx] - 1));
      } else {
        status[atlasIdx] = STATUS_FAILED;
        if (STATS) STATS.failed++;
        console.warn(`[ScrollCanvas] giving up on ${atlasUrl(atlasIdx)} until back online:`, error);
        settleCritical(atlasIdx); // degrade gracefully instead of blocking the preloader
      }
    };

    const loadAtlas = async (atlasIdx) => {
      status[atlasIdx] = STATUS_LOADING;
      activeFetches++;
      const controller = typeof AbortController === 'function' ? new AbortController() : null;
      controllers.set(atlasIdx, controller);
      const isCritical = critical.has(atlasIdx);
      let downloading = true;
      const finishDownload = (ok) => {
        if (!downloading) return;
        downloading = false;
        controllers.delete(atlasIdx);
        activeFetches--;
        if (ok) downloaded[atlasIdx] = 1;
      };

      try {
        const response = await fetch(atlasUrl(atlasIdx), controller ? { signal: controller.signal } : undefined);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        // Critical downloads report byte progress (0-90%); the last 10% is decode.
        const blob = await readBlob(
          response,
          isCritical && criticalTotalBytes > 0
            ? (n) => {
                criticalReceivedBytes += n;
                reportProgress((criticalReceivedBytes / criticalTotalBytes) * 90);
              }
            : null
        );
        finishDownload(true);
        if (cancelled) return;
        pendingDecodes.set(atlasIdx, blob);
      } catch (error) {
        // Bytes of a failed attempt stay counted; reportProgress is monotonic anyway.
        finishDownload(false);
        if (cancelled || (error && error.name === 'AbortError')) return;
        handleFailure(atlasIdx, error);
      }
      pump();
    };

    // Retry everything that gave up once the connection comes back.
    const handleOnline = () => {
      for (let i = 0; i < TOTAL_ATLASES; i++) {
        if (status[i] === STATUS_FAILED) {
          status[i] = STATUS_IDLE;
          attempts[i] = 0;
        }
      }
      pump();
    };
    window.addEventListener('online', handleOnline);

    reportProgress(0);
    schedule(signalReady, READY_TIMEOUT_MS);
    pump();

    return () => {
      cancelled = true;
      window.removeEventListener('online', handleOnline);
      timers.forEach((id) => clearTimeout(id));
      timers.clear();
      controllers.forEach((c) => c && c.abort());
      controllers.clear();
      pendingDecodes.clear();
      frames.fill(null);
      releases.forEach((release) => release());
      releases.length = 0;
    };
  }, [containerSelector, targetProgressRef]);

  // GSAP ScrollTrigger Integration for progress tracking
  useEffect(() => {
    const targetElement = document.querySelector(containerSelector) || document.getElementById("flagship-section");
    if (!targetElement) return;

    triggerRef.current = ScrollTrigger.create({
      trigger: targetElement,
      start: "top top",
      end: "bottom bottom",
      scrub: false, // Progress tracked directly by unified render loop
      onUpdate: (self) => {
        if (onProgressUpdate) {
          onProgressUpdate(Math.min(Math.max(self.progress, 0), 1));
        }
      },
    });

    return () => {
      if (triggerRef.current) {
        triggerRef.current.kill();
        triggerRef.current = null;
      }
    };
  }, [containerSelector, onProgressUpdate]);

  // Single unified render loop on gsap.ticker: runs in the same tick as Lenis (registered
  // earlier), so every draw sees this frame's scroll position instead of last frame's
  useEffect(() => {
    let lastDrawnFrame = -1;
    let lastDrawnOffset = -99999;
    let lastTargetProgress = null;

    const render = (time, deltaTime) => {
      // Determine active target frame
      let targetProgress = 0;
      if (targetProgressRef && typeof targetProgressRef.current === 'number') {
        targetProgress = targetProgressRef.current;
      } else if (triggerRef.current) {
        targetProgress = triggerRef.current.progress;
      }

      // Track heading + direction so the loader streams the right atlases next
      if (lastTargetProgress !== null) {
        const progressDelta = targetProgress - lastTargetProgress;
        if (progressDelta > 1e-5) scrollDirRef.current = 1;
        else if (progressDelta < -1e-5) scrollDirRef.current = -1;
      }
      lastTargetProgress = targetProgress;

      const exactTargetFrame = targetProgress * (TOTAL_FRAMES - 1);
      focusFrameRef.current = exactTargetFrame;
      const { w } = dimensionsRef.current;
      const targetOffset = getTargetOffsetX(targetProgress, w);

      // Smooth cubic inertia lerping
      const frameDelta = exactTargetFrame - currentFrameRef.current;
      const offsetDelta = targetOffset - currentOffsetXRef.current;

      // Frame-rate independent exponential smoothing (same feel on 60/120/144 Hz displays);
      // reduced motion snaps straight to the target
      const dt = Math.min(deltaTime || 16.7, 100) / 1000;
      const ease = reducedMotionRef.current ? 1 : 1 - Math.exp(-DAMPING_PER_SECOND * dt);
      currentFrameRef.current += frameDelta * ease;
      currentOffsetXRef.current += offsetDelta * ease;

      // Draw only when values move (or a missing frame just arrived)
      if (
        needsRedrawRef.current ||
        Math.abs(currentFrameRef.current - lastDrawnFrame) > 0.005 ||
        Math.abs(currentOffsetXRef.current - lastDrawnOffset) > 0.05
      ) {
        needsRedrawRef.current = false;
        drawFrame(currentFrameRef.current, currentOffsetXRef.current);
        lastDrawnFrame = currentFrameRef.current;
        lastDrawnOffset = currentOffsetXRef.current;
      }
    };

    gsap.ticker.add(render);
    return () => gsap.ticker.remove(render);
  }, [targetProgressRef, drawFrame]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
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
