"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { m, useScroll, useSpring, useReducedMotion } from 'framer-motion';
// 80x80 palette PNG (3.5 KB, smaller than AVIF/WebP + <picture> overhead at this size);
// small enough that the bundler inlines it, so the logo costs no extra request.
import logoPng from '../../assets/images/genesis-logo-80.png';

/**
 * Editorial Interactive Scramble Link Component
 * [FIX 5]: Uses uppercase JetBrains Mono with 0.12em tracking aligned with the design system.
 * The scramble is skipped when the user prefers reduced motion, and the accessible
 * name stays the real label while the glyphs animate.
 */
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_';

function ScrambleLink({ label, href, onClick, reduceMotion }) {
  const [displayText, setDisplayText] = useState(label);
  const intervalRef = useRef(null);

  // Never leave an interval running after unmount.
  useEffect(() => () => clearInterval(intervalRef.current), []);

  const handleMouseEnter = useCallback(() => {
    if (reduceMotion) return;
    let iteration = 0;
    clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setDisplayText(
        label
          .split('')
          .map((char, index) => {
            if (char === ' ') return ' ';
            if (index < iteration) return label[index];
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          })
          .join('')
      );

      if (iteration >= label.length) {
        clearInterval(intervalRef.current);
      }
      iteration += 1 / 2;
    }, 28);
  }, [label, reduceMotion]);

  const handleMouseLeave = useCallback(() => {
    clearInterval(intervalRef.current);
    setDisplayText(label);
  }, [label]);

  return (
    <a
      href={href}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="nav-link-item"
      aria-label={label}
    >
      {/* [FIX 5]: Tracked uppercase mono text matching eyebrow/telemetry system */}
      <span className="nav-link-text font-mono uppercase tracking-[0.12em] text-xs" aria-hidden="true">
        {displayText}
      </span>
    </a>
  );
}

/**
 * Magnetic CTA Button Component
 * [FIX 1]: Ghost/outline style with transparent fill so Hero's black pill is the only solid CTA.
 * The magnetic pull is disabled when the user prefers reduced motion.
 */
function MagneticButton({ children, href, onClick, className = '', reduceMotion }) {
  const btnRef = useRef(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (reduceMotion || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = (e.clientX - centerX) * 0.22;
    const dy = (e.clientY - centerY) * 0.22;
    setOffset({ x: dx, y: dy });
  };

  const handleMouseLeave = () => {
    setOffset({ x: 0, y: 0 });
  };

  return (
    <a
      ref={btnRef}
      href={href}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
        transition: offset.x === 0 ? 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)' : 'transform 0.08s linear',
      }}
      className={`editorial-cta-btn ${className}`}
    >
      {children}
    </a>
  );
}

/**
 * Top Navigation Bar with Persistent High-Tech Purple Scroll Progress Bar
 */
export default function Navbar({ onNavigateToSection }) {
  const [scrolled, setScrolled] = useState(false);
  const reduceMotion = useReducedMotion();

  // Dynamic Scroll Progress Bar using Framer Motion Spring (raw progress when reducing motion)
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 240,
    damping: 30,
    restDelta: 0.001,
  });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (e, sectionId) => {
    e.preventDefault();
    if (onNavigateToSection) {
      onNavigateToSection(sectionId);
    }
  };

  return (
    <header className={`genesis-header ${scrolled ? 'genesis-header--scrolled' : ''}`}>
      <div className="header-inner">
        {/* Left: Brand Identity & Lab Origin */}
        <a
          href="#hero-section"
          className="brand-anchor"
          onClick={(e) => handleNavClick(e, 'hero-section')}
        >
          {/* 80px logo (was the 1024px, 546 KB /genesis-logo.png) rendered at 26px;
              decorative because the wordmark next to it already names the link. */}
          <img
            src={logoPng}
            alt=""
            width="26"
            height="26"
            className="brand-icon"
          />
          <div className="brand-copy">
            <span className="brand-title font-cabinet">TEAM GENESIS</span>
            <span className="brand-subtitle font-mono">HUMANOID ROBOTICS LAB · VIT CHENNAI</span>
          </div>
        </a>

        {/* Center: Editorial Interactive Navigation Links [FIX 5: font-mono container] */}
        <nav className="nav-editorial-menu font-mono" aria-label="Primary">
          <ScrambleLink
            label="Origins"
            href="#origins-section"
            onClick={(e) => handleNavClick(e, 'origins-section')}
            reduceMotion={reduceMotion}
          />
          <ScrambleLink
            label="Thesis"
            href="#vision-section"
            onClick={(e) => handleNavClick(e, 'vision-section')}
            reduceMotion={reduceMotion}
          />
          <ScrambleLink
            label="Platform"
            href="#flagship-section"
            onClick={(e) => handleNavClick(e, 'flagship-section')}
            reduceMotion={reduceMotion}
          />
          <ScrambleLink
            label="Dossier"
            href="#invest-section"
            onClick={(e) => handleNavClick(e, 'invest-section')}
            reduceMotion={reduceMotion}
          />
        </nav>

        {/* Right: Ghost/Outline Action [FIX 1: Stays in font-satoshi sans, outline style] */}
        <div className="header-actions">
          <MagneticButton
            href="#invest-section"
            onClick={(e) => handleNavClick(e, 'invest-section')}
            className="font-satoshi"
            reduceMotion={reduceMotion}
          >
            Partner With Us
          </MagneticButton>
        </div>
      </div>

      {/* ── HIGH-TECH PURPLE SCROLL PROGRESS BAR (UNDER NAVBAR) ── */}
      <div className="nav-progress-track">
        <m.div
          aria-hidden="true"
          className="nav-purple-progress-bar"
          style={{ scaleX: reduceMotion ? scrollYProgress : scaleX }}
        />
      </div>
    </header>
  );
}
