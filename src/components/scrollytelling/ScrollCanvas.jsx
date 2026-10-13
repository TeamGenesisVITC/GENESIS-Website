"use client";

import React, { useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import manifest from './atlas-manifest.json';
import stillsManifest from './beat-stills.json';
import loadScrollTrigger from './loadScrollTrigger';
import { isLiteDevice } from '../../utils/deviceProfile';

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
// A download that receives no bytes for this long is aborted and retried, so one stalled
// request can never hold up the rest of the sequence.
const STALL_TIMEOUT_MS = 10000;
// Residency window. A decoded atlas is ~55 MB (3840x3780 RGBA); keeping all nine resident cost
// ~0.5 GB plus GPU copies, enough to get a phone tab killed. Only atlases around the current
// position stay decoded; the compressed files (~0.5 MB each) are kept, so re-entering the
// window costs one off-main-thread decode (~80 ms).
const LOW_MEMORY =
  typeof navigator !== 'undefined' &&
  ((navigator.deviceMemory && navigator.deviceMemory <= 4) ||
    (typeof window !== 'undefined' && window.innerWidth < 768));
const RESIDENT_AHEAD = LOW_MEMORY ? 1 : 2;
const RESIDENT_BEHIND = 1;
// Atlases beyond the initial view are fetched and decoded only once the sequence is this close.
const NEAR_MARGIN = '150% 0px';
// Reduced motion: one still frame per story beat (same thresholds as GenesisLanding's beats),
// no scrubbing and no camera glide.
const BEAT_THRESHOLDS = [0.21, 0.45, 0.69, 0.87];
const BEAT_STILLS = stillsManifest.progress; // [0.1, 0.33, 0.57, 0.78, 0.94]
function reducedMotionStill(progress) {
  let beat = 0;
  while (beat < BEAT_THRESHOLDS.length && progress >= BEAT_THRESHOLDS[beat]) beat++;
  return BEAT_STILLS[beat];
}
// Lite mode (constrained devices, see utils/deviceProfile.js): the atlases are never fetched.
// Each story beat shows one small still (scripts/generate-stills.mjs: ~80 KB for all five as
// AVIF) of the same frame reduced motion rests on, and the sequence steps from still to still.
const LITE = isLiteDevice();
const STILLS = stillsManifest.stills;
const STILLS_BASE_PATH = stillsManifest.basePath || '/frame-stills/';
const STILL_FRAMES = STILLS.map((still) => still.frame);

// Loads one still, preferring AVIF and falling back to WebP where AVIF does not decode.
async function loadStillImage(still) {
  for (const format of ['avif', 'webp']) {
    if (!still[format]) continue;
    const img = new Image();
    img.decoding = 'async';
    img.src = STILLS_BASE_PATH + still[format].file;
    try {
      await img.decode();
      return img;
    } catch {
      // Unsupported format or a failed request: try the next format.
    }
  }
  throw new Error(`could not load the still for frame ${still.frame}`);
}

// Canvas backing resolution. Atlas frames are only FRAME_WIDTH (960px) wide and get upscaled to
// cover the viewport, so backing pixels beyond the frame's own resolution add GPU fill cost (each
// frame is ~3.5 full-canvas passes) without adding detail; the compositor stretches the canvas
// with the same bilinear filtering. At 1600x900 @1.5x this is 1067x600 instead of 2400x1350
// (5x fewer pixels per pass); on an Intel UHD iGPU the median scroll frame dropped from ~30 ms
// to the same ~18 ms as with the canvas disabled.
const MAX_CANVAS_DPR = 1.5;
// Only a sanity floor: on very large viewports the native-resolution cap is far below 0.5.
const MIN_CANVAS_SCALE = 0.2;

const STATUS_IDLE = 0;       // not downloaded
const STATUS_LOADING = 1;    // downloading
const STATUS_READY = 2;      // decoded and drawable
const STATUS_RETRY_WAIT = 3;
const STATUS_FAILED = 4;
const STATUS_STORED = 5;     // compressed file kept, not decoded (outside the window)
const STATUS_DECODING = 6;

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

// Reads a response body while reporting received bytes (progress and stall detection).
async function readBlob(response, onBytes) {
  if (!response.body || typeof response.body.getReader !== 'function') {
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
    } catch {
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

// Source rectangles of an atlas's frames, in frame order.
function frameRects(atlasIdx) {
  const count = Math.min(FRAMES_PER_ATLAS, TOTAL_FRAMES - atlasIdx * FRAMES_PER_ATLAS);
  const rects = [];
  for (let local = 0; local < count; local++) {
    rects.push([
      (local % ATLAS_COLS) * FRAME_WIDTH,
      Math.floor(local / ATLAS_COLS) * FRAME_HEIGHT,
      FRAME_WIDTH,
      FRAME_HEIGHT,
    ]);
  }
  return rects;
}

// Decodes atlases into per-frame bitmaps in a worker (see atlasDecoder.worker.js for why).
// decode(blob, atlasIdx) resolves to an array of frame bitmaps, or to null when the worker path
// is unavailable in this browser (the caller then decodes the whole atlas on its own).
function createFrameSlicer() {
  let worker = null;
  let unavailable = typeof Worker !== 'function' || typeof createImageBitmap !== 'function';
  let nextId = 1;
  const pending = new Map(); // id -> { resolve }

  const disable = () => {
    unavailable = true;
    if (worker) worker.terminate();
    worker = null;
    pending.forEach(({ resolve }) => resolve(null));
    pending.clear();
  };

  const getWorker = () => {
    if (unavailable) return null;
    if (!worker) {
      try {
        worker = new Worker(new URL('./atlasDecoder.worker.js', import.meta.url), { type: 'module' });
      } catch {
        disable();
        return null;
      }
      worker.onmessage = ({ data }) => {
        const job = pending.get(data.id);
        if (!job) {
          // Nobody is waiting any more (disposed): free the pixels right away.
          if (data.frames) data.frames.forEach((frame) => frame.close());
          return;
        }
        pending.delete(data.id);
        // A failure inside the worker may be a corrupt file or an engine without worker-side
        // decoding: answer null so the caller retries on the main thread, which tells them apart.
        job.resolve(data.error ? null : data.frames);
      };
      worker.onerror = disable;
    }
    return worker;
  };

  return {
    decode(blob, atlasIdx) {
      const w = getWorker();
      if (!w) return Promise.resolve(null);
      const id = nextId++;
      return new Promise((resolve) => {
        pending.set(id, { resolve });
        w.postMessage({ id, blob, rects: frameRects(atlasIdx) });
      });
    },
    dispose: disable,
  };
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

// Portrait screens (phones, upright tablets): the story card sits at the bottom of the screen
// (GenesisLanding.css, "Portrait sequence"), so the frame is cover-fit into the band above it,
// from the top of the screen (behind the translucent header) to PORTRAIT_STAGE_BOTTOM, and
// centred: the robot is centred in the frames. Elsewhere the frame covers 90% of the viewport and
// glides left/right beside the card (getTargetOffsetX).
const PORTRAIT_STAGE_BOTTOM = 0.58; // fraction of the viewport height
// How far the bottom feather reaches up into the portrait stage (fraction of the frame height).
const PORTRAIT_BOTTOM_FADE = 0.42;

function isPortraitLayout(w, h) {
  return w <= 900 && h > w;
}

// Where a frame is drawn, in CSS pixels, before the horizontal camera offset.
function frameLayout(w, h) {
  if (isPortraitLayout(w, h)) {
    const stageH = Math.max(1, Math.round(h * PORTRAIT_STAGE_BOTTOM));
    const scale = Math.max(w / DISPLAY_WIDTH, stageH / DISPLAY_HEIGHT);
    const drawW = Math.round(DISPLAY_WIDTH * scale);
    const drawH = Math.round(DISPLAY_HEIGHT * scale);
    return {
      portrait: true,
      drawW,
      drawH,
      x: Math.round((w - drawW) / 2),
      y: Math.round((stageH - drawH) / 2),
      bottomFade: Math.round(drawH * PORTRAIT_BOTTOM_FADE),
    };
  }
  const scale = Math.max(w / DISPLAY_WIDTH, h / DISPLAY_HEIGHT) * 0.90;
  const drawW = Math.round(DISPLAY_WIDTH * scale);
  const drawH = Math.round(DISPLAY_HEIGHT * scale);
  return {
    portrait: false,
    drawW,
    drawH,
    x: Math.round((w / 2) - (drawW / 2)),
    y: Math.round((h / 2) - (drawH / 2)),
    bottomFade: 200,
  };
}

// Whether an element is within NEAR_MARGIN (1.5 viewport heights) of the viewport right now.
function isNearViewport(el) {
  if (!el) return true;
  const rect = el.getBoundingClientRect();
  const margin = window.innerHeight * 1.5;
  return rect.top < window.innerHeight + margin && rect.bottom > -margin;
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
 *   current scroll position and direction with bounded concurrency; only a small window of
 *   atlases around the current position stays decoded
 * - Site is reported ready once the initial view plus a short lead-in is decoded
 * - Decode off the main thread (createImageBitmap); misses draw the nearest decoded frame
 * - On-demand draws that follow the scroll position exactly, with a sub-frame cross-blend
 */
export default function ScrollCanvas({
  containerSelector = "#flagship-section",
  targetProgressRef,
  onProgressUpdate,
  onLoadProgress,
  onSiteReady,
  reducedMotion = false,
}) {
  const canvasRef = useRef(null);
  // Lets the render loop tell the atlas loader that the position or direction changed.
  const loaderTickRef = useRef(() => {});
  // Per-frame draw sources: { image, sx, sy } once its atlas is decoded, else null.
  const framesRef = useRef(new Array(TOTAL_FRAMES).fill(null));
  const needsRedrawRef = useRef(false);
  // Schedules a draw in the next animation frame (set by the render effect).
  const requestRenderRef = useRef(() => {});
  const lastDrawExactRef = useRef(true);
  // Where the user is heading (target frame) and the last scroll direction, for load priority.
  const focusFrameRef = useRef(0);
  const scrollDirRef = useRef(1);

  // Latest callbacks, so the loader effect runs once even if the parent passes inline functions.
  const onLoadProgressRef = useRef(onLoadProgress);
  const onSiteReadyRef = useRef(onSiteReady);
  const reducedMotionRef = useRef(reducedMotion);
  // Sync after commit rather than during render; layout effects run before the next draw.
  useLayoutEffect(() => {
    onLoadProgressRef.current = onLoadProgress;
    onSiteReadyRef.current = onSiteReady;
    if (reducedMotionRef.current !== reducedMotion) {
      reducedMotionRef.current = reducedMotion;
      needsRedrawRef.current = true;
      requestRenderRef.current();
    }
  });

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

    const layout = frameLayout(w, h);
    const { drawW, drawH, y, bottomFade: bottomFadeH } = layout;
    const x = Math.round(layout.x + offsetX);

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
    if (fadeCache.ctx !== ctx || fadeCache.drawW !== drawW || fadeCache.drawH !== drawH || fadeCache.bottomFadeH !== bottomFadeH) {
      const leftFade = ctx.createLinearGradient(0, 0, 300, 0);
      leftFade.addColorStop(0, '#050505');
      leftFade.addColorStop(1, 'rgba(5,5,5,0)');

      const rightFade = ctx.createLinearGradient(drawW - 300, 0, drawW, 0);
      rightFade.addColorStop(0, 'rgba(5,5,5,0)');
      rightFade.addColorStop(1, '#050505');

      const bottomFade = ctx.createLinearGradient(0, drawH - bottomFadeH, 0, drawH);
      bottomFade.addColorStop(0, 'rgba(5,5,5,0)');
      bottomFade.addColorStop(1, '#050505');

      const topFade = ctx.createLinearGradient(0, 0, 0, 80);
      topFade.addColorStop(0, '#050505');
      topFade.addColorStop(1, 'rgba(5,5,5,0)');

      fadeCache.ctx = ctx;
      fadeCache.drawW = drawW;
      fadeCache.drawH = drawH;
      fadeCache.bottomFadeH = bottomFadeH;
      fadeCache.gradients = { leftFade, rightFade, bottomFade, topFade };
    }
    const { leftFade, rightFade, bottomFade, topFade } = fadeCache.gradients;

    ctx.save();
    ctx.translate(x, y);
    // In portrait the frame is wider than the screen, so its side edges are never visible.
    if (!layout.portrait) {
      ctx.fillStyle = leftFade;
      ctx.fillRect(-2, 0, 302, drawH);
      ctx.fillStyle = rightFade;
      ctx.fillRect(drawW - 300, 0, 302, drawH);
    }
    ctx.fillStyle = bottomFade;
    ctx.fillRect(0, drawH - bottomFadeH, drawW, bottomFadeH + 2);
    ctx.fillStyle = topFade;
    ctx.fillRect(0, -2, drawW, 82);
    ctx.restore();
  }, [findNearestLoaded]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Match the backing store to the frame's native pixels at its drawn (cover-fit) size.
      const sourceScale = FRAME_WIDTH / frameLayout(w, h).drawW;
      const dpr = Math.max(
        MIN_CANVAS_SCALE,
        Math.min(window.devicePixelRatio || 1, MAX_CANVAS_DPR, sourceScale),
      );
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
      // Resizing clears the canvas: repaint the last frame now (no black flash), then redraw
      // through the normal path next frame, after the page's own resize handler has recomputed
      // the scroll progress (frame and horizontal offset both depend on it and on the width).
      drawFrame(currentFrameRef.current, currentOffsetXRef.current);
      needsRedrawRef.current = true;
      requestRenderRef.current();
    };

    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, [drawFrame]);

  // ── Atlas streaming ─────────────────────────────────────────────────────────────────────
  // 1. The atlas holding the initial view (plus a short lead-in) is fetched and decoded first;
  //    the site is reported ready when it is drawable (or after READY_TIMEOUT_MS regardless).
  // 2. Everything else waits until the sequence is near the viewport (NEAR_MARGIN). Then the
  //    compressed atlases download in priority order around the scroll position and direction,
  //    and only the residency window around the current position is decoded. Atlases that leave
  //    the window are released (their compressed file is kept for a quick re-decode).
  // (Lite mode loads the beat stills instead: see the next effect.)
  useEffect(() => {
    if (LITE) return undefined;

    let cancelled = false;
    const frames = framesRef.current;
    const status = new Uint8Array(TOTAL_ATLASES);
    const attempts = new Uint8Array(TOTAL_ATLASES);
    const controllers = new Map(); // atlasIdx -> AbortController (download in progress)
    const blobs = new Map();       // atlasIdx -> compressed Blob, kept for re-decoding
    const decoded = new Map();     // atlasIdx -> release() for its decoded pixels
    const timers = new Set();
    const slicer = createFrameSlicer(); // per-frame decoding off the main thread
    let activeFetches = 0;
    let activeDecodes = 0;
    let readySignalled = false;
    let near = false;

    // Critical set: atlases holding the initial frame and the lead-in after it.
    const initialFrame = Math.round(readInitialProgress(containerSelector, targetProgressRef) * (TOTAL_FRAMES - 1));
    focusFrameRef.current = initialFrame;
    const critical = new Set();
    for (let f = initialFrame; f <= Math.min(TOTAL_FRAMES - 1, initialFrame + LEAD_IN_FRAMES); f++) {
      critical.add(atlasOfFrame(f));
    }
    let criticalUnsettled = critical.size;   // not yet decoded or permanently failed
    // When the page opens away from the sequence (normally: at the hero, several screens above
    // it), nothing the sequence needs may compete with the first paint. Its first atlas then waits
    // for the page's load event and an idle moment, or for the visitor to approach, and the site
    // is ready at once: there is nothing on screen to wait for.
    const startedNear = isNearViewport(document.querySelector(containerSelector) || document.getElementById('flagship-section'));
    let warm = startedNear;
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
      // Lets the perf harness (scripts/perf/ux.mjs) time "usable" the same way on every build.
      if (typeof performance !== 'undefined' && performance.mark) performance.mark('genesis:ready');
      if (STATS) {
        STATS.readyAt = performance.now();
        const entries = performance.getEntriesByType('resource').filter((e) => e.name.includes(ATLAS_BASE_PATH));
        STATS.readyRequests = entries.length;
        STATS.readyBytes = entries.reduce((sum, e) => sum + (e.transferSize || e.encodedBodySize || 0), 0);
      }
      const cb = onSiteReadyRef.current;
      if (cb) cb(true);
      pump(); // the critical gate is open now, whatever its atlases are doing
    };

    const settleCritical = (atlasIdx) => {
      if (!critical.has(atlasIdx)) return;
      critical.delete(atlasIdx);
      criticalUnsettled--;
      if (criticalUnsettled === 0) signalReady();
    };

    const schedule = (fn, ms) => {
      const id = setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
      return id;
    };
    const unschedule = (id) => {
      clearTimeout(id);
      timers.delete(id);
    };

    const focusAtlas = () => atlasOfFrame(Math.round(focusFrameRef.current));

    // Lower score = sooner. Atlases ahead in the scroll direction cost half as much as behind.
    const priorityOf = (atlasIdx) => {
      const d = (atlasIdx - focusAtlas()) * scrollDirRef.current;
      return d >= 0 ? d : -2 * d + 0.5;
    };

    const inWindow = (atlasIdx) => {
      const focus = focusAtlas();
      const forward = scrollDirRef.current >= 0;
      const ahead = forward ? RESIDENT_AHEAD : RESIDENT_BEHIND;
      const behind = forward ? RESIDENT_BEHIND : RESIDENT_AHEAD;
      return atlasIdx >= focus - behind && atlasIdx <= focus + ahead;
    };
    // Atlases that should be decoded right now.
    const wanted = (atlasIdx) => (!readySignalled && critical.has(atlasIdx)) || (near && inWindow(atlasIdx));

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

    // Until the initial view is ready, its atlases get the connection and the decoder alone.
    const criticalGateOpen = () => readySignalled || criticalUnsettled === 0;
    const canFetch = (i) => status[i] === STATUS_IDLE && (
      critical.has(i) ? (warm || near) : (near && criticalGateOpen())
    );
    const canDecode = (i) => status[i] === STATUS_STORED && wanted(i) && (critical.has(i) || criticalGateOpen());

    const clearFrames = (atlasIdx) => {
      const first = atlasIdx * FRAMES_PER_ATLAS;
      const count = Math.min(FRAMES_PER_ATLAS, TOTAL_FRAMES - first);
      for (let local = 0; local < count; local++) frames[first + local] = null;
    };

    const evict = () => {
      decoded.forEach((release, atlasIdx) => {
        if (wanted(atlasIdx)) return;
        clearFrames(atlasIdx);
        release();
        decoded.delete(atlasIdx);
        status[atlasIdx] = STATUS_STORED;
      });
    };

    const pump = () => {
      if (cancelled) return;
      evict();
      while (activeFetches < MAX_CONCURRENT_FETCHES) {
        const next = pickBest(canFetch);
        if (next < 0) break;
        loadAtlas(next);
      }
      while (activeDecodes < MAX_CONCURRENT_DECODES) {
        const next = pickBest(canDecode);
        if (next < 0) break;
        decodeAndRegister(next);
      }
      if (STATS) {
        STATS.current = decoded.size;
        STATS.resident = Math.max(STATS.resident || 0, decoded.size);
        STATS.downloaded = blobs.size;
      }
    };

    // `sources` is either one bitmap per frame (worker path) or the whole atlas image.
    const registerAtlas = (atlasIdx, sources) => {
      const first = atlasIdx * FRAMES_PER_ATLAS;
      const count = Math.min(FRAMES_PER_ATLAS, TOTAL_FRAMES - first);
      const perFrame = Array.isArray(sources);
      for (let local = 0; local < count; local++) {
        frames[first + local] = perFrame
          ? { image: sources[local], sx: 0, sy: 0 }
          : {
              image: sources,
              sx: (local % ATLAS_COLS) * FRAME_WIDTH,
              sy: Math.floor(local / ATLAS_COLS) * FRAME_HEIGHT,
            };
      }
      // Repaint if the last draw had to stand in for a missing frame (or drew nothing).
      if (!lastDrawExactRef.current) {
        needsRedrawRef.current = true;
        requestRenderRef.current();
      }
    };

    const decodeAndRegister = async (atlasIdx) => {
      status[atlasIdx] = STATUS_DECODING;
      activeDecodes++;
      try {
        const blob = blobs.get(atlasIdx);
        let result = null;
        const frameBitmaps = await slicer.decode(blob, atlasIdx);
        if (frameBitmaps) {
          result = { source: frameBitmaps, release: () => frameBitmaps.forEach((frame) => frame.close()) };
        } else if (!cancelled) {
          result = await decodeAtlas(blob);
          // The file decodes here, so the worker path is what failed: stop using it.
          slicer.dispose();
        } else {
          return;
        }
        if (cancelled || !wanted(atlasIdx)) {
          // Unmounted, or scrolled out of the window while decoding.
          result.release();
          if (!cancelled) status[atlasIdx] = STATUS_STORED;
          return;
        }
        decoded.set(atlasIdx, result.release);
        registerAtlas(atlasIdx, result.source);
        status[atlasIdx] = STATUS_READY;
        if (STATS) STATS.loaded = decoded.size;
        settleCritical(atlasIdx);
      } catch (error) {
        if (!cancelled) {
          // Corrupt or undecodable file: drop it and download again.
          blobs.delete(atlasIdx);
          handleFailure(atlasIdx, error);
        }
      } finally {
        activeDecodes--;
        pump();
      }
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
      // Abort (and retry) a download that stops receiving bytes.
      let stalled = false;
      let stallTimer = null;
      const armStallTimer = () => {
        if (stallTimer !== null) unschedule(stallTimer);
        stallTimer = schedule(() => {
          stalled = true;
          if (controller) controller.abort();
        }, STALL_TIMEOUT_MS);
      };
      armStallTimer();

      try {
        const response = await fetch(atlasUrl(atlasIdx), controller ? { signal: controller.signal } : undefined);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await readBlob(response, (n) => {
          armStallTimer();
          // Critical downloads report byte progress (0-90%); the last 10% is decode.
          if (isCritical && criticalTotalBytes > 0) {
            criticalReceivedBytes += n;
            reportProgress((criticalReceivedBytes / criticalTotalBytes) * 90);
          }
        });
        if (cancelled) return;
        blobs.set(atlasIdx, blob);
        status[atlasIdx] = STATUS_STORED;
        if (STATS && blobs.size === TOTAL_ATLASES) STATS.allLoadedAt = performance.now();
      } catch (error) {
        if (cancelled) return;
        if (error && error.name === 'AbortError' && !stalled) return;
        handleFailure(atlasIdx, stalled ? new Error(`stalled for ${STALL_TIMEOUT_MS} ms`) : error);
      } finally {
        if (stallTimer !== null) unschedule(stallTimer);
        controllers.delete(atlasIdx);
        activeFetches--;
        if (!cancelled) pump();
      }
    };

    // Retry everything that gave up once the connection comes back.
    const handleOnline = () => {
      for (let i = 0; i < TOTAL_ATLASES; i++) {
        if (status[i] === STATUS_FAILED) {
          status[i] = blobs.has(i) ? STATUS_STORED : STATUS_IDLE;
          attempts[i] = 0;
        }
      }
      pump();
    };
    window.addEventListener('online', handleOnline);

    // Start background work only when the sequence is close to the viewport; release it all
    // again once the visitor is far away (only compressed files stay in memory).
    const section = document.querySelector(containerSelector) || document.getElementById('flagship-section');
    let nearObserver = null;
    if (section && typeof IntersectionObserver === 'function') {
      nearObserver = new IntersectionObserver(([entry]) => {
        near = entry.isIntersecting;
        pump();
      }, { rootMargin: NEAR_MARGIN });
      nearObserver.observe(section);
    } else {
      near = true;
    }

    // The render loop calls this when the focus atlas or the scroll direction changes.
    loaderTickRef.current = pump;

    reportProgress(0);
    schedule(signalReady, READY_TIMEOUT_MS);
    let idleId = null;
    const warmUp = () => {
      idleId = null;
      warm = true;
      pump();
    };
    const onLoaded = () => {
      if (typeof window.requestIdleCallback === 'function') idleId = window.requestIdleCallback(warmUp, { timeout: 2000 });
      else idleId = window.setTimeout(warmUp, 300);
    };
    if (!startedNear) {
      signalReady();
      if (document.readyState === 'complete') onLoaded();
      else window.addEventListener('load', onLoaded, { once: true });
    }
    pump();

    return () => {
      cancelled = true;
      loaderTickRef.current = () => {};
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('load', onLoaded);
      if (idleId !== null) {
        if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleId);
        window.clearTimeout(idleId);
      }
      if (nearObserver) nearObserver.disconnect();
      timers.forEach((id) => clearTimeout(id));
      timers.clear();
      controllers.forEach((c) => c && c.abort());
      controllers.clear();
      frames.fill(null);
      decoded.forEach((release) => release());
      decoded.clear();
      slicer.dispose();
      blobs.clear();
    };
  }, [containerSelector, targetProgressRef]);

  // ── Lite mode: beat stills ──────────────────────────────────────────────────────────────
  // The still for the initial view loads at once and reports the site ready (a failure does
  // too: a missing still must never hold the page); the other four wait until the sequence is
  // near the viewport. A still that fails is retried the next time the sequence comes near.
  useEffect(() => {
    if (!LITE) return undefined;
    let cancelled = false;
    let readySignalled = false;
    const frames = framesRef.current;
    const loading = new Set();

    const signalReady = () => {
      if (readySignalled || cancelled) return;
      readySignalled = true;
      if (typeof performance !== 'undefined' && performance.mark) performance.mark('genesis:ready');
      if (STATS) STATS.readyAt = performance.now();
      const progressCb = onLoadProgressRef.current;
      if (progressCb) progressCb(100);
      const readyCb = onSiteReadyRef.current;
      if (readyCb) readyCb(true);
    };

    const load = async (n) => {
      if (loading.has(n) || frames[STILL_FRAMES[n]]) return;
      loading.add(n);
      try {
        const image = await loadStillImage(STILLS[n]);
        if (cancelled) return;
        frames[STILL_FRAMES[n]] = { image, sx: 0, sy: 0 };
        if (STATS) STATS.loaded = frames.filter(Boolean).length;
        if (!lastDrawExactRef.current) {
          needsRedrawRef.current = true;
          requestRenderRef.current();
        }
      } catch (error) {
        if (!cancelled) console.warn('[ScrollCanvas]', error.message);
      } finally {
        loading.delete(n);
      }
    };

    const initialProgress = readInitialProgress(containerSelector, targetProgressRef);
    const initial = BEAT_STILLS.indexOf(reducedMotionStill(initialProgress));
    load(initial).finally(signalReady);

    const section = document.querySelector(containerSelector) || document.getElementById('flagship-section');
    let nearObserver = null;
    if (section && typeof IntersectionObserver === 'function') {
      nearObserver = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) STILLS.forEach((_, n) => load(n));
      }, { rootMargin: NEAR_MARGIN });
      nearObserver.observe(section);
    } else {
      STILLS.forEach((_, n) => load(n));
    }

    return () => {
      cancelled = true;
      if (nearObserver) nearObserver.disconnect();
      frames.fill(null);
    };
  }, [containerSelector, targetProgressRef]);

  // GSAP ScrollTrigger Integration for progress tracking
  useEffect(() => {
    const targetElement = document.querySelector(containerSelector) || document.getElementById("flagship-section");
    if (!targetElement) return;
    // Only needed when the parent does not track progress itself (it does on the landing page).
    if (targetProgressRef && !onProgressUpdate) return;

    let cancelled = false;
    loadScrollTrigger().then(({ ScrollTrigger }) => {
      if (cancelled) return;
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
      requestRenderRef.current();
    }).catch((error) => {
      console.warn('[ScrollCanvas] scroll tracking unavailable:', error);
    });

    return () => {
      cancelled = true;
      if (triggerRef.current) {
        triggerRef.current.kill();
        triggerRef.current = null;
      }
    };
  }, [containerSelector, onProgressUpdate, targetProgressRef]);

  // On-demand rendering: draw in the next animation frame only when the scroll position
  // changes, an atlas arrives, or the sequence comes into view. A permanent ticker made the
  // main thread produce a frame on every vsync, even with the sequence off screen, so the
  // page never scrolled purely on the compositor.
  useEffect(() => {
    let lastDrawnFrame = -1;
    let lastDrawnOffset = -99999;
    let lastTargetProgress = null;
    let rafId = 0;
    let inView = false;
    let lastFocusAtlas = -1;
    let lastDir = 0;

    const render = () => {
      rafId = 0;
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

      // Reduced motion and lite mode: hold one still per story beat instead of scrubbing and
      // gliding (lite mode on the whole frame its still was made from).
      const shownProgress = reducedMotionRef.current || LITE ? reducedMotionStill(targetProgress) : targetProgress;
      const exactTargetFrame = LITE
        ? Math.round(shownProgress * (TOTAL_FRAMES - 1))
        : shownProgress * (TOTAL_FRAMES - 1);
      focusFrameRef.current = exactTargetFrame;
      const { w } = dimensionsRef.current;
      const targetOffset = getTargetOffsetX(shownProgress, w);

      // Let the loader move its residency window when the position crosses into another atlas.
      const focusAtlas = atlasOfFrame(Math.round(exactTargetFrame));
      if (focusAtlas !== lastFocusAtlas || scrollDirRef.current !== lastDir) {
        lastFocusAtlas = focusAtlas;
        lastDir = scrollDirRef.current;
        loaderTickRef.current();
      }

      // Follow the scroll position exactly. The browser already animates wheel and trackpad
      // scrolling natively; easing again here only made the sequence trail the page.
      currentFrameRef.current = exactTargetFrame;
      currentOffsetXRef.current = targetOffset;

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

    const requestRender = () => {
      if (!inView || rafId) return;
      rafId = requestAnimationFrame(render);
    };
    requestRenderRef.current = requestRender;

    const section = document.querySelector(containerSelector) || document.getElementById('flagship-section');
    let observer = null;
    if (section && typeof IntersectionObserver === 'function') {
      observer = new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        if (inView) {
          needsRedrawRef.current = true;
          requestRender();
        }
      }, { rootMargin: '50% 0px' });
      observer.observe(section);
    } else {
      inView = true;
    }

    window.addEventListener('scroll', requestRender, { passive: true });
    requestRender();
    return () => {
      window.removeEventListener('scroll', requestRender);
      if (observer) observer.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
      requestRenderRef.current = () => {};
    };
  }, [targetProgressRef, drawFrame, containerSelector]);

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
