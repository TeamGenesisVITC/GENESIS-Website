"use client";

import React, { useRef, useEffect } from "react";
import ScrollyVideo from "scrolly-video/dist/ScrollyVideo.esm.jsx";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface ScrollyVideoEngineProps {
  src?: string;
  containerSelector?: string;
  scrub?: number | boolean;
  className?: string;
  onProgressUpdate?: (progress: number) => void;
}

/**
 * Hardware-Accelerated Video Scrubbing Engine (Next.js 14 / React)
 * Powered by @scrolly-video/react and GSAP ScrollTrigger
 * 
 * - Replaces manual requestAnimationFrame / HTML5 canvas draw loops
 * - Direct GPU texture streaming via ScrollyVideo videoDecoder
 * - GSAP ScrollTrigger numeric scrub (scrub: 0.8) absorbs mouse-wheel stutter at 120Hz
 * - Strict lifecycle cleanup to prevent memory leaks during client-side navigation
 */
export default function ScrollyVideoEngine({
  src = "/assets/genesis-sequence.mp4",
  containerSelector = "#flagship-section",
  scrub = 0.8,
  className = "",
  onProgressUpdate,
}: ScrollyVideoEngineProps) {
  const scrollyVideoRef = useRef<any>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);

  useEffect(() => {
    // 1. Target the dedicated scroll container element
    const targetElement = document.querySelector(containerSelector);
    if (!targetElement) return;

    // 2. Initialize GSAP ScrollTrigger with physics-smoothed numeric scrub
    triggerRef.current = ScrollTrigger.create({
      trigger: targetElement,
      start: "top top",
      end: "bottom bottom",
      scrub: scrub, // Smooths mousewheel stutter natively on the compositor thread
      onUpdate: (self) => {
        const progress = Math.min(Math.max(self.progress, 0), 1);

        // Imperatively update ScrollyVideo playback percentage
        if (
          scrollyVideoRef.current &&
          typeof scrollyVideoRef.current.setTargetTimePercent === "function"
        ) {
          scrollyVideoRef.current.setTargetTimePercent(progress, { jump: true });
        } else if (
          scrollyVideoRef.current &&
          typeof scrollyVideoRef.current.setVideoPercentage === "function"
        ) {
          scrollyVideoRef.current.setVideoPercentage(progress);
        }

        if (onProgressUpdate) {
          onProgressUpdate(progress);
        }
      },
    });

    // 3. Strict React Lifecycle Cleanup
    return () => {
      if (triggerRef.current) {
        triggerRef.current.kill();
      }
    };
  }, [containerSelector, scrub, onProgressUpdate]);

  return (
    <div
      className={`scrolly-video-container fixed inset-0 w-full h-full pointer-events-none -z-10 overflow-hidden ${className}`}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <ScrollyVideo
        ref={scrollyVideoRef}
        src={src}
        trackScroll={false}
        cover={true}
        sticky={false}
        full={false}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    </div>
  );
}