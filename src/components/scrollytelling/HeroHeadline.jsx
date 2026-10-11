"use client";

import React, { useRef, useState } from "react";
import { m, useMotionValue, useSpring, useMotionTemplate, useReducedMotion } from "framer-motion";

/**
 * HeroHeadline - Cursor Spotlight Reveal Component
 * Dual-layer masking technique:
 * - Base Layer: Massive solid carbon black #111113 text
 * - Spotlight Layer: Vibrant purple gradient revealed exclusively within cursor radius
 */
export default function HeroHeadline({
  text = "TEAM GENESIS",
  className = "",
}) {
  const containerRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  // Mouse coordinate motion values relative to the container
  const mouseX = useMotionValue(-1000);
  const mouseY = useMotionValue(-1000);

  // Spring physics for buttery-smooth cursor tracking
  const springConfig = { damping: 25, stiffness: 250, mass: 0.1 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // Reduced motion: the spotlight follows the cursor directly, without spring lag.
  const reduceMotion = useReducedMotion();
  const spotX = reduceMotion ? mouseX : smoothX;
  const spotY = reduceMotion ? mouseY : smoothY;

  // Dynamic radial gradient spotlight mask
  const maskImage = useMotionTemplate`radial-gradient(180px circle at ${spotX}px ${spotY}px, black 0%, transparent 100%)`;

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const handleMouseEnter = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative inline-block cursor-default select-none ${className}`}
    >
      {/* ── BASE LAYER: Massive Solid Carbon Black #111113 Text ── */}
      <h1 className="text-[clamp(4rem,10vw,9rem)] font-black tracking-[-0.04em] text-[#111113] uppercase leading-none font-cabinet">
        {text}
      </h1>

      {/* ── SPOTLIGHT OVERLAY LAYER: Vibrant Purple Gradient Revealed Exclusively Under Cursor ── */}
      <m.div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none select-none"
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        style={{
          maskImage,
          WebkitMaskImage: maskImage,
        }}
      >
        {/* Decorative duplicate of the headline: a div (not a second h1) so the page has a single h1. */}
        <div
          className="text-[clamp(4rem,10vw,9rem)] font-black tracking-[-0.04em] uppercase leading-none font-cabinet bg-clip-text text-transparent"
          style={{
            backgroundImage: "linear-gradient(135deg, #5A189A 0%, #9D4EDD 50%, #C77DFF 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            color: "transparent",
          }}
        >
          {text}
        </div>
      </m.div>
    </div>
  );
}