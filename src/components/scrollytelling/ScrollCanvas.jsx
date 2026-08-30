"use client";

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const TOTAL_FRAMES = 931;

function getFramePath(index) {
  const num = String(index + 1).padStart(4, '0');
  return `/frames/frame_${num}.webp`;
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
 * - Eliminates competing double-draw calls for zero glitch/lag
 * - Optical sub-frame cross-blending for silky 120Hz motion
 * - Instant zero-flicker frame cache lookup
 */
export default function ScrollCanvas({ 
  containerSelector = "#flagship-section",
  targetProgressRef,
  onProgressUpdate 
}) {
  const canvasRef = useRef(null);
  const imagesRef = useRef(new Array(TOTAL_FRAMES));
  const currentFrameRef = useRef(0);
  const targetFrameRef = useRef(0);
  const currentOffsetXRef = useRef(0);
  const dimensionsRef = useRef({ w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1 });
  const [loadPercent, setLoadPercent] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const triggerRef = useRef(null);

  // Fast nearest-loaded frame fallback to guarantee zero black flickers
  const findNearestLoaded = useCallback((targetIdx) => {
    const images = imagesRef.current;
    const clamped = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(targetIdx)));
    if (images[clamped] && images[clamped].complete && images[clamped].naturalWidth > 0) {
      return images[clamped];
    }
    for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
      const down = images[clamped - offset];
      if (down && down.complete && down.naturalWidth > 0) return down;
      const up = images[clamped + offset];
      if (up && up.complete && up.naturalWidth > 0) return up;
    }
    return null;
  }, []);

  // Frame draw routine
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

    const imgA = findNearestLoaded(idxA);
    const imgB = alphaB > 0.01 ? findNearestLoaded(idxB) : null;

    if (!imgA) return;

    const imgW = imgA.naturalWidth || 1920;
    const imgH = imgA.naturalHeight || 1080;

    const scale = Math.max(w / imgW, h / imgH) * 0.90;
    const drawW = Math.round(imgW * scale);
    const drawH = Math.round(imgH * scale);
    const x = Math.round((w / 2) - (drawW / 2) + offsetX);
    const y = Math.round((h / 2) - (drawH / 2));

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, w, h);

    // Draw base frame A
    ctx.globalAlpha = 1.0;
    ctx.drawImage(imgA, x, y, drawW, drawH);

    // Optical sub-frame cross-blend
    if (alphaB > 0.01 && imgB && imgB !== imgA) {
      ctx.globalAlpha = alphaB;
      ctx.drawImage(imgB, x, y, drawW, drawH);
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
  }, [findNearestLoaded]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      dimensionsRef.current = { w, h, dpr };

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
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

  // High-performance asynchronous frame loader
  useEffect(() => {
    const isCancelledRef = { current: false };
    const images = imagesRef.current;

    // Priority 1: Key anchor frames
    const anchorFrames = [0, 50, 100, 180, 270, 360, 450, 540, 630, 720, 810, 930];
    anchorFrames.forEach((idx) => {
      if (idx >= TOTAL_FRAMES) return;
      const img = new Image();
      img.decoding = 'async';
      img.src = getFramePath(idx);
      img.onload = () => {
        if (isCancelledRef.current) return;
        images[idx] = img;
        if (idx === 0) {
          setIsReady(true);
          drawFrame(0, getTargetOffsetX(0, window.innerWidth));
        }
      };
    });

    // Priority 2: Progressive background preloading
    const loadAllFrames = async () => {
      const batchSize = 25;
      for (let i = 0; i < TOTAL_FRAMES; i += batchSize) {
        if (isCancelledRef.current) break;
        const promises = [];
        for (let j = i; j < Math.min(i + batchSize, TOTAL_FRAMES); j++) {
          if (images[j]) continue;
          const targetIndex = j;
          promises.push(
            new Promise((resolve) => {
              const img = new Image();
              img.decoding = 'async';
              img.src = getFramePath(targetIndex);
              img.onload = () => {
                if (!isCancelledRef.current) images[targetIndex] = img;
                resolve();
              };
              img.onerror = () => resolve();
            })
          );
        }
        await Promise.all(promises);
        if (!isCancelledRef.current) {
          setLoadPercent(Math.round(((i + batchSize) / TOTAL_FRAMES) * 100));
        }
        await new Promise((r) => setTimeout(r, 4));
      }
    };

    const timer = setTimeout(loadAllFrames, 50);
    return () => {
      isCancelledRef.current = true;
      clearTimeout(timer);
    };
  }, [drawFrame]);

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
  }, [containerSelector, onProgressUpdate]);

  // Single Unified 120Hz RAF Render Loop (Zero Glitch / Zero Double-Draw)
  useEffect(() => {
    let animId;
    let lastDrawnFrame = -1;
    let lastDrawnOffset = -99999;

    const render = () => {
      // Determine active target frame
      let targetProgress = 0;
      if (targetProgressRef && typeof targetProgressRef.current === 'number') {
        targetProgress = targetProgressRef.current;
      } else if (triggerRef.current) {
        targetProgress = triggerRef.current.progress;
      }

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

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [targetProgressRef, drawFrame]);

  return (
    <>
      {/* Preload HUD indicator */}
      <div className={`preload-hud ${isReady || loadPercent > 15 ? 'preload-hud--hidden' : ''}`}>
        <div className="preload-content">
          <div className="preload-logo font-cabinet">TEAM GENESIS / ROBOTICS</div>
          <div className="preload-bar-container">
            <div className="preload-bar-fill" style={{ width: `${Math.max(5, loadPercent)}%` }} />
          </div>
          <div className="preload-text font-mono">
            INITIALIZING OPTICAL MATRIX // {loadPercent}%
          </div>
        </div>
      </div>

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
    </>
  );
}