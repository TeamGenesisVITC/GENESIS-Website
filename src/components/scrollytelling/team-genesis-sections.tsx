"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HeroHeadline from "./HeroHeadline";
import { Activity, Zap, Cpu } from "lucide-react";

/**
 * ============================================================================
 * SQUINT TEST & VISUAL HIERARCHY AUDIT (RULE 6)
 * ============================================================================
 * When this layout is blurred / squinted at, the single most visually dominant
 * element per section remains strictly calibrated as follows:
 *
 * 1. HERO SECTION:
 *    - Dominant Element: The massive H1 display headline "TEAM GENESIS".
 *    - Secondary Elements: The 1px hairline action buttons and telemetry stats
 *      sit subordinate with controlled font-size and relaxed line-heights.
 *
 * 2. MISSION / ORIGINS SECTION:
 *    - Dominant Element: The H2 editorial headline "Born at VIT Chennai.
 *      Engineered without compromise." (leading-[1.05], tracking-tight).
 *    - Secondary Elements: The two-column body text is constrained to max-w-[65ch]
 *      with leading-[1.5] body rhythm and hairline table borders.
 *
 * 3. PILLARS / THESIS SECTION:
 *    - Dominant Element: The H2 section title "Core Engineering Theses".
 *    - Secondary Elements: The 4 pillar items use rhythmic 8-point vertical
 *      spacing (gap-6 / gap-8) with mono step numbers (01-04) anchored to hairlines.
 *
 * 4. CTA / FOOTER BAND:
 *    - Dominant Element: The solid, high-contrast "Partner With Us" / "Request Dossier"
 *      primary action button set against the deep monochrome ground.
 *    - Secondary Elements: Multi-column sitemap links and academic charter meta.
 * ============================================================================
 */

// ── 1. HERO SECTION ──────────────────────────────────────────────────────────
interface HeroProps {
  onExploreClick?: () => void;
  onPartnerClick?: () => void;
}

export function Hero({ onExploreClick, onPartnerClick }: HeroProps) {
  return (
    /* [RULE 2]: Section padding aligned to 8-point grid: py-24 (96px) on mobile, py-32 (128px) on desktop */
    <section className="relative w-full pt-12 pb-24 md:pt-16 md:pb-32 px-4 sm:px-8 max-w-7xl mx-auto flex flex-col justify-center">
      
      {/* Eyebrow Label */}
      {/* [RULE 4]: Mono metadata keeps wide tracking (tracking-[0.12em]). [RULE 2]: mb-4 (16px) internal gap */}
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-zinc-500 mb-4 select-none">
        Humanoid Robotics Research Laboratory · VIT Chennai
      </div>

      {/* Main Display Headline */}
      {/* [RULE 3]: Display H1 ratio 1:0.95 (leading-none). [RULE 4]: Negative tracking (tracking-[-0.04em]). [RULE 2]: mb-8 (32px) */}
      <div className="mb-8 block">
        <HeroHeadline text="TEAM GENESIS" />
      </div>

      {/* Monochrome Lucide Bullet List with 8-pt Grid Spacing */}
      <ul className="hero-points-list list-none p-0 m-0 mt-8 mb-12 flex max-w-2xl flex-col gap-4">
        <li className="hero-point-item list-none flex items-start gap-4">
          <Activity className="hero-point-icon mt-1 h-[18px] w-[18px] shrink-0 text-zinc-500" strokeWidth={1.75} aria-hidden="true" />
          <span className="hero-point-text font-sans text-base leading-relaxed text-zinc-700">
            Full-scale bipedal humanoid platforms engineered at VIT Chennai
          </span>
        </li>
        <li className="hero-point-item list-none flex items-start gap-4">
          <Zap className="hero-point-icon mt-1 h-[18px] w-[18px] shrink-0 text-zinc-500" strokeWidth={1.75} aria-hidden="true" />
          <span className="hero-point-text font-sans text-base leading-relaxed text-zinc-700">
            High-torque cycloidal actuation &amp; custom GaN power stages
          </span>
        </li>
        <li className="hero-point-item list-none flex items-start gap-4">
          <Cpu className="hero-point-icon mt-1 h-[18px] w-[18px] shrink-0 text-zinc-500" strokeWidth={1.75} aria-hidden="true" />
          <span className="hero-point-text font-sans text-base leading-relaxed text-zinc-700">
            1,000 Hz real-time deterministic control &amp; embodied intelligence
          </span>
        </li>
      </ul>

      {/* Action Row */}
      {/* [RULE 2]: Button row gap-4 (16px). [RULE 2]: mb-16 (64px) space before metric stats */}
      <div className="flex flex-wrap items-center gap-4 mb-16">
        {/* [RULE 4]: CTA buttons use subtle positive tracking-[0.02em] for deliberate clickability. [RULE 2]: px-6 (24px), py-3 (12px rounded to 8-pt touch target ~48px) */}
        <button
          onClick={onExploreClick}
          className="px-6 py-3 bg-zinc-950 text-white font-sans text-sm font-medium tracking-[0.02em] hover:bg-zinc-800 transition-colors duration-200"
        >
          Explore Platform Telemetry
        </button>
        <button
          onClick={onPartnerClick}
          className="px-6 py-3 border border-zinc-300 text-zinc-900 font-sans text-sm font-medium tracking-[0.02em] hover:border-zinc-950 transition-colors duration-200"
        >
          Partner With Us →
        </button>
      </div>

      {/* Typographic Stats Grid */}
      {/* [RULE 2]: Grid gap-8 (32px), pt-8 (32px). [RULE 5]: Hairline border-t border-zinc-300 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-8 border-t border-zinc-300/80">
        {/* Metric One: Foundation */}
        <div className="flex flex-col gap-2">
          <div className="font-display text-3xl sm:text-4xl font-bold text-zinc-950 leading-none tracking-tight">
            2024
          </div>
          <div className="font-sans text-xs sm:text-sm text-zinc-500 leading-[1.5] tracking-normal">
            Year Established
          </div>
        </div>

        {/* Metric Two: Talent Scale */}
        <div className="flex flex-col gap-2">
          <div className="font-display text-3xl sm:text-4xl font-bold text-zinc-950 leading-none tracking-tight">
            15+
          </div>
          <div className="font-sans text-xs sm:text-sm text-zinc-500 leading-[1.5] tracking-normal">
            Active Engineers
          </div>
        </div>

        {/* Metric Three: Execution */}
        <div className="flex flex-col gap-2">
          <div className="font-display text-3xl sm:text-4xl font-bold text-zinc-950 leading-none tracking-tight">
            02
          </div>
          <div className="font-sans text-xs sm:text-sm text-zinc-500 leading-[1.5] tracking-normal">
            National Techfest Ventures
          </div>
        </div>
      </div>
    </section>
  );
}

// ── 2. MISSION / ORIGINS SECTION ─────────────────────────────────────────────
export function Mission() {
  return (
    /* [RULE 2]: Section padding py-24 (96px). [RULE 5]: Hairline border-t border-zinc-300 */
    <section className="w-full py-24 px-4 sm:px-8 max-w-7xl mx-auto border-t border-zinc-300/80">
      
      {/* Section Eyebrow */}
      {/* [RULE 4]: Metadata tracking-[0.12em]. [RULE 2]: mb-8 (32px) */}
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-zinc-500 mb-8 select-none">
        01 · Origins &amp; Directive
      </div>

      {/* 2-Column Editorial Grid */}
      {/* [RULE 2]: Grid gap-12 (48px) on mobile, gap-16 (64px) on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
        
        {/* Left Column: Heading & Meta */}
        <div className="lg:col-span-5 flex flex-col gap-8">
          {/* [RULE 3]: H2 ratio 1:1.05 (leading-[1.05]). [RULE 4]: Negative tracking (tracking-tight) */}
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-zinc-950 leading-[1.05] tracking-tight">
            Born at VIT Chennai.<br />
            Engineered without compromise.
          </h2>

          {/* [RULE 2]: Metadata list internal gap-2 (8px). [RULE 3]: 1:1.5 ratio (leading-[1.5]) */}
          <div className="flex flex-col gap-2 font-sans text-xs text-zinc-500 leading-[1.5] tracking-normal border-l border-zinc-300 pl-4">
            <div>Founded at VIT Chennai Campus</div>
            <div>Disciplines: Mechanical · Embedded · A.I.</div>
            <div>Objective: Indigenous Bipedal Humanoid</div>
          </div>
        </div>

        {/* Right Column: Narrative & Technical Scope Table */}
        {/* [RULE 2]: Content column gap-8 (32px) */}
        <div className="lg:col-span-7 flex flex-col gap-8">
          {/* [RULE 1]: Body copy constrained to max-w-[65ch]. [RULE 3]: 1:1.5 ratio (leading-[1.5]). [RULE 4]: tracking-normal */}
          <p className="font-sans text-base text-zinc-700 max-w-[65ch] leading-[1.5] tracking-normal">
            Founded within the research ecosystem of Vellore Institute of Technology (VIT) Chennai, <strong className="font-semibold text-zinc-950">Team Genesis</strong> was formed to solve the hard physical engineering challenges of bipedal robotics.
          </p>
          <p className="font-sans text-base text-zinc-700 max-w-[65ch] leading-[1.5] tracking-normal">
            Unlike software-only robotics research, Team Genesis designs, machines, solders, and flashes every subsystem in-house. Our lab brings together mechanical specialists, high-power electronics engineers, real-time control theoreticians, and machine learning researchers operating as a unified deep-tech engineering team.
          </p>

          {/* Technical Capability Table */}
          {/* [RULE 5]: Hairline border-zinc-200. [RULE 2]: mt-4 (16px) */}
          <div className="mt-4 border border-zinc-300/80 bg-zinc-50/50 p-6 flex flex-col gap-4">
            <div className="font-mono text-xs uppercase tracking-[0.12em] text-zinc-500">
              Lab Capability &amp; Engineering Scope
            </div>
            
            <div className="divide-y divide-zinc-200 text-sm font-sans">
              {/* [RULE 2]: py-3 (12px) table row padding. [RULE 3]: 1:1.5 ratio (leading-[1.5]) */}
              <div className="py-3 flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4">
                <span className="font-medium text-zinc-950 sm:w-1/3">Mechanical CAD/FEA</span>
                <span className="text-zinc-600 sm:w-2/3 leading-[1.5]">Topological stress analysis, high-strength CNC 7075-T6 milling, custom harmonic joints</span>
              </div>
              <div className="py-3 flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4">
                <span className="font-medium text-zinc-950 sm:w-1/3">Power &amp; Hardware</span>
                <span className="text-zinc-600 sm:w-2/3 leading-[1.5]">Proprietary GaN field-oriented motor drivers, 48V split-bus architecture, isolated CAN-FD</span>
              </div>
              <div className="py-3 flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4">
                <span className="font-medium text-zinc-950 sm:w-1/3">Real-Time Control</span>
                <span className="text-zinc-600 sm:w-2/3 leading-[1.5]">1,000 Hz Zero-Moment Point (ZMP) stability, whole-body inverse kinematics, push recovery</span>
              </div>
              <div className="py-3 flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4">
                <span className="font-medium text-zinc-950 sm:w-1/3">Embodied A.I.</span>
                <span className="text-zinc-600 sm:w-2/3 leading-[1.5]">End-to-end reinforcement learning policies, 360° LiDAR mapping, spatial depth processing</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

// ── 3. PILLARS / THESIS SECTION ──────────────────────────────────────────────
export function Pillars() {
  return (
    /* [RULE 2]: Section padding py-24 (96px). [RULE 5]: Hairline border-t border-zinc-300 */
    <section className="w-full py-24 px-4 sm:px-8 max-w-7xl mx-auto border-t border-zinc-300/80">
      
      {/* Section Eyebrow */}
      {/* [RULE 4]: Metadata tracking-[0.12em]. [RULE 2]: mb-4 (16px) */}
      <div className="font-mono text-xs uppercase tracking-[0.12em] text-zinc-500 mb-4 select-none">
        02 · Research Thesis &amp; Objectives
      </div>

      {/* Section Title */}
      {/* [RULE 3]: H2 ratio 1:1.05 (leading-[1.05]). [RULE 4]: Negative tracking (tracking-tight). [RULE 2]: mb-16 (64px) */}
      <h2 className="font-display text-3xl sm:text-4xl font-bold text-zinc-950 leading-[1.05] tracking-tight mb-16">
        Core engineering theses
      </h2>

      {/* 4 Pillars Grid */}
      {/* [RULE 2]: 2x2 grid gap-8 (32px) on mobile, gap-12 (48px) on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        
        {/* Pillar Item 01 */}
        {/* [RULE 2]: Pillar card padding p-8 (32px). [RULE 5]: Hairline border border-zinc-200 */}
        <div className="border border-zinc-300/80 p-8 flex flex-col justify-between gap-6 bg-zinc-50/30">
          <div className="flex flex-col gap-4">
            {/* [RULE 4]: Mono index tracking-[0.12em] */}
            <div className="font-mono text-xs font-bold text-zinc-400 tracking-[0.12em]">
              01 // KINEMATICS
            </div>
            {/* [RULE 3]: H3 ratio 1:1.1 (leading-tight). [RULE 4]: tracking-tight */}
            <h3 className="font-display text-xl font-bold text-zinc-950 leading-tight tracking-tight">
              Bio-Inspired Kinematic Compliance
            </h3>
            {/* [RULE 1]: Text width max-w-[65ch]. [RULE 3]: 1:1.5 ratio (leading-[1.5]). [RULE 4]: tracking-normal */}
            <p className="font-sans text-sm text-zinc-600 max-w-[65ch] leading-[1.5] tracking-normal">
              Human gait requires passive and active elasticity. We develop joint mechanics that emulate biological tendon dynamics, drastically reducing energy consumption during continuous locomotion while protecting actuators from ground impact spikes.
            </p>
          </div>
          {/* [RULE 4]: Metric metadata tracking-normal. [RULE 2]: pt-4 (16px) border-t */}
          <div className="pt-4 border-t border-zinc-200 font-mono text-xs text-zinc-500">
            Target: 1.8 m/s continuous cruise at &lt; 350 W
          </div>
        </div>

        {/* Pillar Item 02 */}
        <div className="border border-zinc-300/80 p-8 flex flex-col justify-between gap-6 bg-zinc-50/30">
          <div className="flex flex-col gap-4">
            <div className="font-mono text-xs font-bold text-zinc-400 tracking-[0.12em]">
              02 // DETERMINISM
            </div>
            <h3 className="font-display text-xl font-bold text-zinc-950 leading-tight tracking-tight">
              Deterministic 1,000 Hz Real-Time Loop
            </h3>
            <p className="font-sans text-sm text-zinc-600 max-w-[65ch] leading-[1.5] tracking-normal">
              Physical stability in unstructured environments cannot tolerate non-deterministic compute delays. Our motor telemetry and dynamic balance estimation execute across a dedicated sub-millisecond CAN-FD bus.
            </p>
          </div>
          <div className="pt-4 border-t border-zinc-200 font-mono text-xs text-zinc-500">
            Latency: &lt; 0.2 ms sensor-to-inverter control loop
          </div>
        </div>

        {/* Pillar Item 03 */}
        <div className="border border-zinc-300/80 p-8 flex flex-col justify-between gap-6 bg-zinc-50/30">
          <div className="flex flex-col gap-4">
            <div className="font-mono text-xs font-bold text-zinc-400 tracking-[0.12em]">
              03 // EMBODIMENT
            </div>
            <h3 className="font-display text-xl font-bold text-zinc-950 leading-tight tracking-tight">
              Embodied Neural Edge Policies
            </h3>
            <p className="font-sans text-sm text-zinc-600 max-w-[65ch] leading-[1.5] tracking-normal">
              Sim-to-real reinforcement learning policies trained in physics simulators are deployed on low-power edge tensor silicon for real-time push-recovery, uneven terrain traversal, and adaptive payload stabilization.
            </p>
          </div>
          <div className="pt-4 border-t border-zinc-200 font-mono text-xs text-zinc-500">
            Inference: 100 Hz sim-to-real policy execution on NPU
          </div>
        </div>

        {/* Pillar Item 04 */}
        <div className="border border-zinc-300/80 p-8 flex flex-col justify-between gap-6 bg-zinc-50/30">
          <div className="flex flex-col gap-4">
            <div className="font-mono text-xs font-bold text-zinc-400 tracking-[0.12em]">
              04 // MODULARITY
            </div>
            <h3 className="font-display text-xl font-bold text-zinc-950 leading-tight tracking-tight">
              Modular Industrial Serviceability
            </h3>
            <p className="font-sans text-sm text-zinc-600 max-w-[65ch] leading-[1.5] tracking-normal">
              Every joint module, actuator cartridge, and PCB inverter is engineered for rapid field-swappability with standardized blind-mate connectors, allowing complete sub-assembly turnaround in under 15 minutes.
            </p>
          </div>
          <div className="pt-4 border-t border-zinc-200 font-mono text-xs text-zinc-500">
            Service Time: &lt; 15 min modular joint replacement
          </div>
        </div>

      </div>
    </section>
  );
}

// ── 4. CTA & INSTITUTIONAL FOOTER SECTION ────────────────────────────────────
export function CTAFooter() {
  const [legalModal, setLegalModal] = useState<string | null>(null);

  return (
    /* [RULE 2]: Outer container full width. [RULE 5]: Black CTA grounding band */
    <footer className="w-full bg-zinc-950 text-white pt-24 pb-16 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-24">
        
        {/* Top CTA Partnership Banner */}
        {/* [RULE 2]: Grid gap-12 (48px) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pb-16 border-b border-zinc-800">
          
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* [RULE 4]: Metadata tracking-[0.12em] */}
            <div className="font-mono text-xs uppercase tracking-[0.12em] text-zinc-400 select-none">
              Collaborate
            </div>
            {/* [RULE 3]: H2 ratio 1:1.05 (leading-[1.05]). [RULE 4]: Negative tracking (tracking-tight) */}
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-[1.05] tracking-tight">
              Partner with Team Genesis
            </h2>
            {/* [RULE 1]: Text width max-w-[65ch]. [RULE 3]: 1:1.5 ratio (leading-[1.5]). [RULE 4]: tracking-normal */}
            <p className="font-sans text-base text-zinc-400 max-w-[65ch] leading-[1.5] tracking-normal">
              We collaborate with deep-tech venture funds, aerospace manufacturers, semiconductor enterprises, and defense technology organizations seeking to advance full-scale humanoid physical intelligence.
            </p>
          </div>

          <div className="lg:col-span-5 flex flex-col justify-end items-start lg:items-end gap-4">
            {/* [RULE 4]: CTA button tracking-[0.02em]. [RULE 2]: px-8 (32px), py-4 (16px) */}
            <a
              href="mailto:genesis.vitc@gmail.com?subject=Team%20Genesis%20Technical%20Dossier%20Request"
              className="px-8 py-4 bg-white text-zinc-950 font-sans text-sm font-semibold tracking-[0.02em] hover:bg-zinc-200 transition-colors duration-200"
            >
              Partner With Us / Request Dossier →
            </a>
            <span className="font-mono text-xs text-zinc-500">
              Confidential 28-Page Hardware White Paper Available
            </span>
          </div>

        </div>

        {/* Footer Navigation Columns */}
        {/* [RULE 2]: 4-col grid gap-12 (48px) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12 text-sm font-sans">
          
          <div className="flex flex-col gap-4">
            <div className="font-display text-base font-bold text-white leading-none">
              Team Genesis
            </div>
            <p className="text-zinc-400 text-xs leading-[1.5]">
              Humanoid Robotics Research Laboratory<br />
              Vellore Institute of Technology, Chennai Campus<br />
              Vandalur-Kelambakkam Road, Chennai, TN 600127, India
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <span className="font-mono text-xs uppercase tracking-[0.12em] text-zinc-500">Navigation</span>
            <a href="#hero-section" className="text-zinc-400 hover:text-white transition-colors duration-150">Overview</a>
            <a href="#origins-section" className="text-zinc-400 hover:text-white transition-colors duration-150">Origins</a>
            <a href="#vision-section" className="text-zinc-400 hover:text-white transition-colors duration-150">Research Theses</a>
            <a href="#flagship-section" className="text-zinc-400 hover:text-white transition-colors duration-150">Platform Telemetry</a>
          </div>

          <div className="flex flex-col gap-3">
            <span className="font-mono text-xs uppercase tracking-[0.12em] text-zinc-500">Disciplines</span>
            <span className="text-zinc-400">Mechanical &amp; Structures</span>
            <span className="text-zinc-400">Power &amp; Embedded Bus</span>
            <span className="text-zinc-400">Embodied AI &amp; Controls</span>
            <span className="text-zinc-400">Executive Leadership</span>
          </div>

          <div className="flex flex-col gap-3">
            <span className="font-mono text-xs uppercase tracking-[0.12em] text-zinc-500">Contact &amp; Lab</span>
            <a href="mailto:genesis.vitc@gmail.com" className="text-zinc-400 hover:text-white transition-colors duration-150">genesis.vitc@gmail.com</a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors duration-150">LinkedIn ↗</a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors duration-150">GitHub ↗</a>
          </div>

        </div>

        {/* Bottom Legal Hairline Bar */}
        {/* [RULE 2]: pt-8 (32px). [RULE 5]: Hairline border-t border-zinc-900 */}
        <div className="pt-8 border-t border-zinc-900 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-sans text-zinc-500">
          <span>
            © {new Date().getFullYear()} Team Genesis, VIT Chennai. All rights reserved.
          </span>
          <div className="flex items-center gap-4">
            <button onClick={() => setLegalModal("tos")} className="hover:text-zinc-300 transition-colors">
              Terms of Service
            </button>
            <span>/</span>
            <button onClick={() => setLegalModal("privacy")} className="hover:text-zinc-300 transition-colors">
              Privacy Policy
            </button>
            <span>/</span>
            <button onClick={() => setLegalModal("charter")} className="hover:text-zinc-300 transition-colors">
              Academic Charter
            </button>
          </div>
        </div>

      </div>

      {/* Legal Modal */}
      <AnimatePresence>
        {legalModal && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setLegalModal(null)}
          >
            <div
              className="bg-zinc-900 border border-zinc-800 p-8 max-w-xl w-full text-zinc-300 font-mono text-xs flex flex-col gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
                <span className="text-white font-bold uppercase">Legal // {legalModal}</span>
                <button onClick={() => setLegalModal(null)} className="text-zinc-400 hover:text-white">
                  [X] Close
                </button>
              </div>
              <p className="leading-[1.5]">
                {legalModal === "tos" && "By accessing the Team Genesis portal or requesting confidential hardware specifications, you agree to comply with all applicable academic, intellectual property, and export regulations."}
                {legalModal === "privacy" && "Team Genesis collects communication data submitted solely for the purpose of enterprise evaluation, technical dossier distribution, and sponsorship inquiries."}
                {legalModal === "charter" && "Team Genesis operates under the research auspices of Vellore Institute of Technology (VIT) Chennai to pioneer advancements in humanoid robotics."}
              </p>
            </div>
          </div>
        )}
      </AnimatePresence>
    </footer>
  );
}

// ── DEFAULT UNIFIED EXPORT ───────────────────────────────────────────────────
export default function TeamGenesisSections() {
  return (
    <div className="w-full flex flex-col bg-[#EAEAEF] text-zinc-950 font-sans antialiased selection:bg-zinc-900 selection:text-white">
      <Hero />
      <Mission />
      <Pillars />
      <CTAFooter />
    </div>
  );
}