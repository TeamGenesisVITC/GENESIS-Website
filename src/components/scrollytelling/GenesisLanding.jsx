import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import Navbar from './Navbar';
import ScrollCanvas from './ScrollCanvas';
import StoryBeat, { beatItemVariants } from './StoryBeat';
import HeroHeadline from './HeroHeadline';
import HeroPoints from './HeroPoints';
import ProjectsSection from './ProjectsSection';
import TeamSection from './TeamSection';
import './GenesisLanding.css';

gsap.registerPlugin(ScrollTrigger);


/**
 * Split-Flap Decisive Numeric Counter
 * Decisively animates metrics into whole numbers upon entering viewport.
 */
function AnimatedMetric({ targetValue, suffix = '', label }) {
  const [displayValue, setDisplayValue] = useState(targetValue);
  const elementRef = useRef(null);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimatedRef.current) {
          hasAnimatedRef.current = true;
          observer.disconnect();

          const rawNum = parseFloat(targetValue.toString().replace(/,/g, ''));
          if (isNaN(rawNum)) return;

          const duration = 900;
          const startTime = performance.now();

          const updateCounter = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            const currentVal = Math.round(rawNum * easeProgress);

            setDisplayValue(targetValue.toString().includes(',') ? currentVal.toLocaleString() : currentVal.toString());

            if (progress < 1) {
              requestAnimationFrame(updateCounter);
            } else {
              setDisplayValue(targetValue);
            }
          };

          requestAnimationFrame(updateCounter);
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, [targetValue]);

  return (
    <div ref={elementRef} className="hero-stat-item">
      <div className="hero-stat-value font-cabinet">
        {displayValue}{suffix}
      </div>
      <div className="hero-stat-label font-satoshi">{label}</div>
    </div>
  );
}

export default function GenesisLanding() {
  const containerRef = useRef(null);
  const targetProgressRef = useRef(0);
  const lenisRef = useRef(null);
  const [activeBeat, setActiveBeat] = useState(0);
  const [legalModal, setLegalModal] = useState(null); // 'tos' | 'privacy' | 'charter' | null

  // Initialize Lenis smooth scroll engine
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => 1 - Math.pow(1 - t, 3), // Clean easeOutCubic
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      syncTouch: true,
      wheelMultiplier: 0.6,
      touchMultiplier: 1.0,
    });

    lenisRef.current = lenis;

    const tickerCallback = (time) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tickerCallback);
    gsap.ticker.lagSmoothing(0);
    lenis.on('scroll', ScrollTrigger.update);

    lenis.on('scroll', () => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const scrollableHeight = container.offsetHeight - window.innerHeight;
      if (scrollableHeight <= 0) return;

      const progress = Math.min(1, Math.max(0, -rect.top / scrollableHeight));
      targetProgressRef.current = progress;

      // Determine active storytelling beat in the 5-beat flagship showcase
      let beat = 0;
      if (progress < 0.21) beat = 0;
      else if (progress < 0.45) beat = 1;
      else if (progress < 0.69) beat = 2;
      else if (progress < 0.87) beat = 3;
      else beat = 4;

      setActiveBeat((prev) => (prev !== beat ? beat : prev));
    });

    return () => {
      gsap.ticker.remove(tickerCallback);
      lenis.destroy();
    };
  }, []);

  // Smooth jump to DOM sections
  const scrollToSection = (sectionId) => {
    const el = document.getElementById(sectionId);
    if (!el || !lenisRef.current) return;
    lenisRef.current.scrollTo(el, { duration: 1.4, offset: -50 });
  };

  return (
    <div className="genesis-landing">
      
      {/* ── 1. STUDIO HIGHLIGHT (Soft Overhead Pure White Lighting on Metal) ── */}
      <div 
        aria-hidden="true" 
        className="pointer-events-none fixed inset-0 z-0" 
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0) 70%)',
        }}
      />

      {/* ── 2. PHYSICAL TEXTURE (Sandblasted Anodized Aluminum SVG Grain) ── */}
      <div 
        aria-hidden="true" 
        className="textured-silver-grain pointer-events-none"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          opacity: 0.4,
          mixBlendMode: 'overlay',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* ── 3. INTERACTIVE FOREGROUND & CONTENT CONTAINER ── */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%' }}>
        {/* Fixed Hardware Top Navigation */}
        <Navbar onNavigateToSection={scrollToSection} />

        {/* ══════════════════════════════════════════════════════════
           ACT I: HARDWARE MONOGRAPH & LAB ORIGINS
           ══════════════════════════════════════════════════════════ */}


        {/* ── HERO SECTION ──────────────────────────────────────────── */}
        <section id="hero-section" className="mono-section hero-masthead" style={{ position: 'relative', overflow: 'hidden' }}>
          <div className="mono-container" style={{ position: 'relative', zIndex: 2 }}>

          {/* Eyebrow Label */}
          <motion.div
            className="hero-eyebrow font-mono"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            STUDENT-LED HUMANOID ROBOTICS TEAM · VIT CHENNAI
          </motion.div>

          {/* Main Hero Headline with Interactive Full-Wordmark Hover [FIX 2] */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="mb-8 block"
          >
            <HeroHeadline text="TEAM GENESIS" />
          </motion.div>

          {/* Monochrome Lucide Bullet List with 8-pt Grid Spacing */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            <HeroPoints />
          </motion.div>

          {/* Action Row */}
          <motion.div
            className="hero-action-row"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <button
              className="hero-btn-primary font-satoshi"
              onClick={() => scrollToSection('flagship-section')}
            >
              Inspect Platform Telemetry
            </button>
            <button
              className="hero-btn-secondary font-satoshi"
              onClick={() => scrollToSection('invest-section')}
            >
              Partnership &amp; Dossier&nbsp;→
            </button>
          </motion.div>

          {/* Typographic Stats Grid with Split-Flap Counters — Positioned downward */}
          <motion.div
            className="hero-stats-grid hero-stats-grid--triad"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.38, ease: [0.16, 1, 0.3, 1] }}
            style={{ marginTop: '240px' }}
          >
            <AnimatedMetric targetValue="2024" suffix="" label="Year Established" />
            <div className="hero-stat-divider" />
            <AnimatedMetric targetValue="50" suffix="+" label="Active Engineers" />
            <div className="hero-stat-divider" />
            <div className="hero-stat-item">
              <div className="hero-stat-value font-cabinet">03</div>
              <div className="hero-stat-label font-satoshi">Engineering Disciplines</div>
            </div>
          </motion.div>

          </div>

          {/* ── Robot Illustration — Right Side ── */}
          <motion.div
            className="hero-robot-wrap"
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            aria-hidden="true"
          >
            <img
              src="/robot-hero.png"
              alt="Team Genesis Humanoid Robot"
              className="hero-robot-img"
            />
          </motion.div>

        </section>

      {/* 2. ORIGINS & LAB FOUNDATION */}
      <section id="origins-section" className="mono-section mono-section--bordered">
        <div className="mono-container">
          <div className="section-eyebrow-tag font-mono">01 · ORIGINS &amp; ETHOS</div>

          <div className="monograph-split">
            <div className="monograph-heading-col">
              <h2 className="monograph-title font-cabinet">
                Born at VIT Chennai.<br />
                Built without permission.
              </h2>
              <div className="monograph-meta font-satoshi">
                <div>Founded 2024 · VIT Chennai Campus</div>
                <div>15+ Student Engineers · 3 Disciplines</div>
                <div>Independent · Self-Funded · Shipping Hardware</div>
              </div>
            </div>

            <div className="monograph-content-col">
              <p className="mono-para">
                <strong>Team Genesis</strong> is an independent collective of engineering students at VIT Chennai — no corporate backing, no institutional budget. We pool our own resources, work outside office hours, and machine parts by hand.
              </p>
              <p className="mono-para">
                Hardware that typically requires a funded R&amp;D lab is being designed, machined, soldered, and flashed by students. We are not waiting for permission to build the next generation of humanoid robotics. We are just building it.
              </p>

              {/* Technical Milestone Table */}
              <div className="mono-table-wrapper">
                <div className="table-caption font-mono">FULL-STACK STUDENT ENGINEERING CAPABILITIES</div>
                <table className="mono-table font-satoshi">
                  <tbody>
                    <tr>
                      <td className="td-key">Mechanical CAD/FEA</td>
                      <td className="td-val">Topological stress analysis, high-strength CNC 7075-T6 milling, custom harmonic joints</td>
                    </tr>
                    <tr>
                      <td className="td-key">Power and Hardware</td>
                      <td className="td-val">Proprietary GaN field-oriented motor drivers, 48V split-bus architecture, isolated CAN-FD</td>
                    </tr>
                    <tr>
                      <td className="td-key">Real-Time Control</td>
                      <td className="td-val">1,000 Hz Zero-Moment Point (ZMP) stability, whole-body inverse kinematics, push recovery</td>
                    </tr>
                    <tr>
                      <td className="td-key">Embodied A.I.</td>
                      <td className="td-val">End-to-end reinforcement learning policies, 360° LiDAR mapping, spatial depth processing</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* 3. STRATEGIC VISION & RESEARCH THESIS */}
      <section id="vision-section" className="mono-section mono-section--bordered">
        <div className="mono-container">
          <div className="section-eyebrow-tag font-mono">02 · RESEARCH THESIS &amp; OBJECTIVES</div>
          <h2 className="monograph-title font-cabinet">Core engineering theses</h2>

          {/* 4-Item Research Thesis List */}
          <div className="thesis-ledger">
            <div className="thesis-item">
              <div className="thesis-num font-mono">01</div>
              <div className="thesis-content">
                <h3 className="thesis-heading font-cabinet">Bio-Inspired Kinematic Compliance</h3>
                <p className="thesis-desc">
                  Human gait requires passive and active elasticity. We develop joint mechanics that emulate biological tendon dynamics,
                  drastically reducing energy consumption during continuous locomotion while protecting actuators from ground impact spikes.
                </p>
                <div className="thesis-metric font-mono">Target: 1.8 m/s continuous cruise at &lt; 350 W</div>
              </div>
            </div>

            <div className="thesis-item">
              <div className="thesis-num font-mono">02</div>
              <div className="thesis-content">
                <h3 className="thesis-heading font-cabinet">Deterministic 1,000 Hz Real-Time Loop</h3>
                <p className="thesis-desc">
                  Physical stability in unstructured environments cannot tolerate non-deterministic compute delays.
                  Our motor telemetry and dynamic balance estimation execute across a dedicated sub-millisecond CAN-FD bus.
                </p>
                <div className="thesis-metric font-mono">Latency: &lt; 0.2 ms sensor-to-inverter control loop</div>
              </div>
            </div>

            <div className="thesis-item">
              <div className="thesis-num font-mono">03</div>
              <div className="thesis-content">
                <h3 className="thesis-heading font-cabinet">Embodied Neural Edge Policies</h3>
                <p className="thesis-desc">
                  Sim-to-real reinforcement learning policies trained in physics simulators are deployed on low-power edge tensor silicon
                  for real-time push-recovery, uneven terrain traversal, and adaptive payload stabilization.
                </p>
                <div className="thesis-metric font-mono">Inference: 100 Hz sim-to-real policy execution on NPU</div>
              </div>
            </div>

            <div className="thesis-item">
              <div className="thesis-num font-mono">04</div>
              <div className="thesis-content">
                <h3 className="thesis-heading font-cabinet">Modular Industrial Serviceability</h3>
                <p className="thesis-desc">
                  Every joint module, actuator cartridge, and PCB inverter is engineered for rapid field-swappability with standardized
                  mechanical interfaces and keyed high-current harness connectors.
                </p>
                <div className="thesis-metric font-mono">Serviceability: &lt; 15 min joint module replacement</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FLAGSHIP GATEWAY PROMPT */}
      <section className="gateway-prompt-bar">
        <div className="mono-container">
          <div className="gateway-prompt-inner">
            <span className="prompt-label font-mono">SYSTEM TELEMETRY VIEWPORT</span>
            <span className="prompt-title font-cabinet">The hardware. 931 frames. Engineered by students.</span>
            <span className="prompt-hint font-satoshi">Scroll to inspect every DOF, joint, and system ↓</span>
          </div>
        </div>
      </section>


      {/* ══════════════════════════════════════════════════════════
         ACT II: FLAGSHIP SCROLLYTELLING CANVAS (5-BEAT SEQUENCE)
         ══════════════════════════════════════════════════════════ */}
      <div id="flagship-section" className="canvas-section" ref={containerRef}>
        <div className="canvas-sticky">
          
          {/* Hardware Inspection Scrollytelling Canvas */}
          <ScrollCanvas targetProgressRef={targetProgressRef} />

          {/* ── Beat 01: Platform Introduction & Physical Architecture (0–20% Progress) ── */}
          <StoryBeat id="beat-mechanical" visible={activeBeat === 0} align="right">
            <motion.div className="editorial-eyebrow-row" variants={beatItemVariants}>
              <span className="mono-badge font-mono">FLAGSHIP 01</span>
              <span className="mono-divider font-mono">·</span>
              <span className="mono-subtag font-mono">MEET OUR CURRENT FLAGSHIP · PROJECT KP-17</span>
            </motion.div>

            <motion.h2 className="editorial-section-title font-cabinet" variants={beatItemVariants}>
              Meet KP-17.<br />Our first bipedal platform.
            </motion.h2>

            <motion.p className="editorial-body-text font-satoshi" variants={beatItemVariants}>
              KP-17 is Team Genesis's initial physical research platform. Built upon an accessible 17-DOF humanoid kinematic frame, our engineering objective is bringing the hardware to life — integrating custom sensor feedback architectures, low-latency electronics, and closed-loop self-balancing software.
            </motion.p>

            <motion.div className="editorial-specs-matrix font-satoshi" variants={beatItemVariants}>
              <div className="spec-line-item">
                <span className="spec-bullet-icon">·</span>
                <div className="spec-text">
                  <strong className="spec-title">17 Actuated DOFs:</strong>
                  <span className="spec-desc">Full bipedal morphology featuring 6-DOF lower limbs, dual-axis waist, and compliant joint linkages.</span>
                </div>
              </div>
              <div className="spec-line-item">
                <span className="spec-bullet-icon">·</span>
                <div className="spec-text">
                  <strong className="spec-title">Modular Kinematic Frame:</strong>
                  <span className="spec-desc">An accessible anodized aluminum chassis serving as our testbed for sensor fusion and balance algorithms.</span>
                </div>
              </div>
            </motion.div>
          </StoryBeat>

          {/* ── Beat 02: Powertrain & Joint Actuation (20–45% Progress) ── */}
          <StoryBeat id="beat-actuation" visible={activeBeat === 1} align="left">
            <motion.div className="editorial-eyebrow-row" variants={beatItemVariants}>
              <span className="mono-badge font-mono">FLAGSHIP 02</span>
              <span className="mono-divider font-mono">·</span>
              <span className="mono-subtag font-mono">JOINT POWERTRAIN &amp; ACTUATION</span>
            </motion.div>

            <motion.h2 className="editorial-section-title font-cabinet" variants={beatItemVariants}>
              High-torque joint actuation<br />&amp; position tracking.
            </motion.h2>

            <motion.p className="editorial-body-text font-satoshi" variants={beatItemVariants}>
              Each joint incorporates high-torque digital actuators with precision metal reduction gearing, delivering the requisite joint torque and speed for multi-axis limb positioning and dynamic stance control.
            </motion.p>

            <motion.div className="editorial-specs-matrix font-satoshi" variants={beatItemVariants}>
              <div className="spec-line-item">
                <span className="spec-bullet-icon">·</span>
                <div className="spec-text">
                  <strong className="spec-title">Dynamic Joint Torque:</strong>
                  <span className="spec-desc">High-output digital servos configured for high-frequency command execution and stance support.</span>
                </div>
              </div>
              <div className="spec-line-item">
                <span className="spec-bullet-icon">·</span>
                <div className="spec-text">
                  <strong className="spec-title">High-Resolution Feedback:</strong>
                  <span className="spec-desc">Continuous angular position tracking feeding real-time joint state into the kinematics engine.</span>
                </div>
              </div>
            </motion.div>
          </StoryBeat>

          {/* ── Beat 03: Sensor Feedback Architecture (45–70% Progress) ── */}
          <StoryBeat id="beat-electrical" visible={activeBeat === 2} align="right">
            <motion.div className="editorial-eyebrow-row" variants={beatItemVariants}>
              <span className="mono-badge font-mono">FLAGSHIP 03</span>
              <span className="mono-divider font-mono">·</span>
              <span className="mono-subtag font-mono">SENSOR FEEDBACK &amp; ELECTRONICS</span>
            </motion.div>

            <motion.h2 className="editorial-section-title font-cabinet" variants={beatItemVariants}>
              Sensor feedback architecture<br />&amp; real-time bus.
            </motion.h2>

            <motion.p className="editorial-body-text font-satoshi" variants={beatItemVariants}>
              We are actively developing KP-17's comprehensive sensor feedback architecture — fusing 6-axis IMUs, foot ground-contact sensors, and joint current monitors across a deterministic high-speed CAN-FD communication bus.
            </motion.p>

            <motion.div className="editorial-specs-matrix font-satoshi" variants={beatItemVariants}>
              <div className="spec-line-item">
                <span className="spec-bullet-icon">·</span>
                <div className="spec-text">
                  <strong className="spec-title">Sub-Millisecond Feedback Loop:</strong>
                  <span className="spec-desc">Low-latency IMU state estimation and telemetry streaming to the central kinematics controller.</span>
                </div>
              </div>
              <div className="spec-line-item">
                <span className="spec-bullet-icon">·</span>
                <div className="spec-text">
                  <strong className="spec-title">48V Isolated Split-Bus:</strong>
                  <span className="spec-desc">Dedicated high-current actuator power rails separated from sensitive compute electronics.</span>
                </div>
              </div>
            </motion.div>
          </StoryBeat>

          {/* ── Beat 04: Software & Self-Balancing Control (70–88% Progress) ── */}
          <StoryBeat id="beat-software" visible={activeBeat === 3} align="left">
            <motion.div className="editorial-eyebrow-row" variants={beatItemVariants}>
              <span className="mono-badge font-mono">FLAGSHIP 04</span>
              <span className="mono-divider font-mono">·</span>
              <span className="mono-subtag font-mono">SOFTWARE &amp; SELF-BALANCING CONTROL</span>
            </motion.div>

            <motion.h2 className="editorial-section-title font-cabinet" variants={beatItemVariants}>
              Bringing hardware to life<br />with self-balancing control.
            </motion.h2>

            <motion.p className="editorial-body-text font-satoshi" variants={beatItemVariants}>
              Our primary software sprint focuses on closing the autonomous balance loop. We are implementing dynamic Zero-Moment Point (ZMP) control, whole-body Model Predictive Control (MPC), and sim-to-real reinforcement learning policies to achieve true self-balancing autonomy.
            </motion.p>

            <motion.div className="editorial-specs-matrix font-satoshi" variants={beatItemVariants}>
              <div className="spec-line-item">
                <span className="spec-bullet-icon">·</span>
                <div className="spec-text">
                  <strong className="spec-title">Whole-Body MPC Balance:</strong>
                  <span className="spec-desc">Predictive control algorithms calculating ground reaction forces and active push-recovery in real time.</span>
                </div>
              </div>
              <div className="spec-line-item">
                <span className="spec-bullet-icon">·</span>
                <div className="spec-text">
                  <strong className="spec-title">Sim-to-Real RL Policies:</strong>
                  <span className="spec-desc">Locomotion neural networks trained in physics simulation (Isaac Sim / MuJoCo) before physical transfer.</span>
                </div>
              </div>
            </motion.div>
          </StoryBeat>

          {/* ── Beat 05: Foundation for Scale (88–100% Progress) ── */}
          <StoryBeat id="beat-platform" visible={activeBeat === 4} align="right">
            <motion.div className="editorial-eyebrow-row" variants={beatItemVariants}>
              <span className="mono-badge font-mono">FLAGSHIP 05</span>
              <span className="mono-divider font-mono">·</span>
              <span className="mono-subtag font-mono">THE RESEARCH FOUNDATION</span>
            </motion.div>

            <motion.h2 className="editorial-section-title font-cabinet" variants={beatItemVariants}>
              The physical foundation for<br />all future Genesis bots.
            </motion.h2>

            <motion.p className="editorial-body-text font-satoshi" variants={beatItemVariants}>
              KP-17 is where we test theories, validate electronics, and refine algorithms. The engineering breakthroughs achieved on this platform form the foundation for all upcoming platforms like Project RKP and our competition fleet.
            </motion.p>

            <motion.div className="editorial-specs-matrix font-satoshi" variants={beatItemVariants}>
              <div className="spec-line-item">
                <span className="spec-bullet-icon">·</span>
                <div className="spec-text">
                  <strong className="spec-title">Modular Hardware Sandbox:</strong>
                  <span className="spec-desc">Easily serviceable joint modules and open electronics enabling rapid prototyping sprints.</span>
                </div>
              </div>
              <div className="spec-line-item">
                <span className="spec-bullet-icon">·</span>
                <div className="spec-text">
                  <strong className="spec-title">Reusable Control Architecture:</strong>
                  <span className="spec-desc">A unified software codebase designed to scale across different humanoid morphologies.</span>
                </div>
              </div>
            </motion.div>

            <motion.div className="flagship-exit-hint font-mono" variants={beatItemVariants}>
              <span>SCROLL DOWN · EXPLORE PARALLEL R&amp;D PIPELINES ↓</span>
            </motion.div>
          </StoryBeat>

        </div>
      </div>

      {/* ── ACT II.4: ACTIVE ENGINEERING R&D PIPELINES (LIGHT MODE) ── */}
      <ProjectsSection />

      {/* ── ACT II.5: MULTIDISCIPLINARY ENGINEERING TEAM ROSTER ── */}
      <TeamSection />

      {/* ACT III: ENTERPRISE PARTNERSHIPS & TECHNICAL DOSSIER */}
      <section id="invest-section" className="mono-section mono-section--bordered">
        <div className="mono-container">
          <div className="hero-eyebrow font-satoshi">Sponsorship</div>
          <h2 className="monograph-title font-cabinet">Fuel the next generation<br />of hardware engineers.</h2>
          <p className="section-lead-subtitle">
            You are not just funding a robot. You are getting priority access to a battle-tested pool of mechanical, electrical, and software engineers who have already shipped working hardware under pressure — and who are actively entering the job market.
          </p>

          {/* 2-Column Industrial Collaboration Framework */}
          <div className="partnership-split-grid">
            <div className="partnership-col">
              <div className="col-header-bar font-satoshi">What your sponsorship buys</div>

              <div className="col-block">
                <div className="block-title font-cabinet">Strategic R&D and Prototype Sponsorship</div>
                <p className="block-desc">
                  Directly support prototype manufacturing runs, precision machining tooling, and joint research publications with our laboratory.
                </p>
                <div className="block-meta font-mono">Chassis co-branding · Quarterly technical reports · IP exploration</div>
              </div>

              <div className="col-block">
                <div className="block-title font-cabinet">Live Component Testing</div>
                <p className="block-desc">
                  Deploy your microcontrollers, GaN modules, sensors, or actuators on our active bipedal platform for real-world stress benchmarking. Student-run, honest data — not a marketing demo.
                </p>
                <div className="block-meta font-mono">Benchmark reports · Joint demos · Direct engineering feedback</div>
              </div>

              <div className="col-block">
                <div className="block-title font-cabinet">Priority Talent Pipeline</div>
                <p className="block-desc">
                  Sponsors get first-look recruiting access to our graduating engineers. Mechanical designers, embedded systems engineers, control theorists, and AI specialists — all pressure-tested in competitive environments like IIT Bombay Techfest.
                </p>
                <div className="block-meta font-mono">Pre-graduation recruiting · Internship pipeline · Sponsored roles</div>
              </div>
            </div>

            {/* Dossier Request & Direct Contact */}
            <div className="partnership-col">
              <div className="col-header-bar font-satoshi">Sponsor dossier &amp; direct contact</div>

              <div className="dossier-card">
                <div className="dossier-badge font-mono">Sponsor package · Talent pipeline brief</div>
                <h3 className="dossier-title font-cabinet">Team Genesis Sponsorship & Talent Dossier</h3>
                <p className="dossier-body">
                  Our sponsor brief outlines branding placements, talent pipeline access, live component evaluation opportunities, and our 2025–2026 competition and build milestones. Written for engineering leads and talent acquisition teams alike.
                </p>
                <div className="dossier-btn-group">
                  <a
                    href="mailto:genesis.vitc@gmail.com?subject=Team%20Genesis%20Technical%20Dossier%20Request"
                    className="hero-btn-primary font-satoshi"
                  >
                    Request Sponsor Dossier
                  </a>
                </div>
                <div className="dossier-direct-contact font-satoshi">
                  <span>genesis.vitc@gmail.com</span>
                  <span>VIT Chennai, Tamil Nadu, India</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INSTITUTIONAL FOOTER */}
      <footer className="genesis-footer">
        <div className="mono-container">
          <div className="footer-top-grid font-satoshi">
            <div className="footer-brand-col">
              <div className="footer-logo font-cabinet">Team Genesis</div>
              <p className="footer-meta">
                Student-Led Humanoid Robotics Team<br />
                Vellore Institute of Technology, Chennai Campus<br />
                Vandalur-Kelambakkam Road, Chennai, TN 600127, India
              </p>
            </div>

            <div className="footer-nav-col">
              <span className="footer-col-title">Navigation</span>
              <a href="#hero-section" onClick={(e) => { e.preventDefault(); scrollToSection('hero-section'); }}>Overview</a>
              <a href="#origins-section" onClick={(e) => { e.preventDefault(); scrollToSection('origins-section'); }}>Origins</a>
              <a href="#vision-section" onClick={(e) => { e.preventDefault(); scrollToSection('vision-section'); }}>Research</a>
              <a href="#flagship-section" onClick={(e) => { e.preventDefault(); scrollToSection('flagship-section'); }}>Hardware</a>
              <a href="#invest-section" onClick={(e) => { e.preventDefault(); scrollToSection('invest-section'); }}>Collaborate</a>
            </div>

            <div className="footer-nav-col">
              <span className="footer-col-title">Disciplines</span>
              <a href="/team/mechanical">Mechanical and Structures</a>
              <a href="/team/electrical">Power and Embedded Bus</a>
              <a href="/team/software">Embodied AI and Controls</a>
              <a href="/team/leads">Executive Leadership</a>
            </div>

            <div className="footer-nav-col">
              <span className="footer-col-title">Contact</span>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">Instagram ↗</a>
              <a href="mailto:genesis.vitc@gmail.com">genesis.vitc@gmail.com</a>
            </div>
          </div>

          <div className="footer-bottom-bar font-satoshi">
            <span className="footer-copyright">
              © {new Date().getFullYear()} Team Genesis, VIT Chennai. All rights reserved.
            </span>
            <div className="footer-legal-links">
              <button className="legal-link-btn font-satoshi" onClick={() => setLegalModal('tos')}>
                Terms of Service
              </button>
              <span>/</span>
              <button className="legal-link-btn font-satoshi" onClick={() => setLegalModal('privacy')}>
                Privacy Policy
              </button>
              <span>/</span>
              <button className="legal-link-btn font-satoshi" onClick={() => setLegalModal('charter')}>
                Academic Charter
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* ══════════════════════════════════════════════════════════
         LEGAL MODAL DIALOG (TOS / PRIVACY / CHARTER)
         ══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {legalModal && (
          <motion.div 
            className="legal-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLegalModal(null)}
          >
            <motion.div 
              className="legal-modal-panel"
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header-bar font-mono">
                <span>LEGAL DOCUMENTATION // {legalModal.toUpperCase()}</span>
                <button className="modal-close-btn font-mono" onClick={() => setLegalModal(null)}>
                  [X] CLOSE
                </button>
              </div>

              <div className="modal-body-scroll">
                {legalModal === 'tos' && (
                  <div className="legal-content font-mono">
                    <h3 className="legal-heading font-cabinet">TERMS OF SERVICE</h3>
                    <p>LAST UPDATED: 2026</p>
                    <p>1. ACCEPTANCE OF TERMS</p>
                    <p>By accessing the Team Genesis portal or requesting confidential hardware specifications, you agree to comply with all applicable academic, intellectual property, and defense export regulations.</p>
                    <p>2. INTELLECTUAL PROPERTY</p>
                    <p>All mechanical CAD designs, firmware architectures, PCB schematics, and neural policy models presented on this website are the intellectual property of Team Genesis and Vellore Institute of Technology (VIT) Chennai.</p>
                    <p>3. RESEARCH PARTNERSHIPS</p>
                    <p>All collaborative evaluation agreements are governed by formal Non-Disclosure Agreements (NDA) executed directly with our laboratory administration.</p>
                  </div>
                )}

                {legalModal === 'privacy' && (
                  <div className="legal-content font-mono">
                    <h3 className="legal-heading font-cabinet">PRIVACY POLICY</h3>
                    <p>LAST UPDATED: 2026</p>
                    <p>1. DATA COLLECTION</p>
                    <p>Team Genesis collects communication data submitted solely for the purpose of enterprise evaluation, technical dossier distribution, and sponsorship inquiries.</p>
                    <p>2. DATA USAGE & PROTECTION</p>
                    <p>We do not share, sell, or distribute partner or investor contact information to third parties. All inquiries are securely archived within our institutional domain.</p>
                  </div>
                )}

                {legalModal === 'charter' && (
                  <div className="legal-content font-mono">
                    <h3 className="legal-heading font-cabinet">ACADEMIC RESEARCH CHARTER</h3>
                    <p>TEAM GENESIS OPERATES UNDER THE RESEARCH AUSPICES OF VELLORE INSTITUTE OF TECHNOLOGY (VIT) CHENNAI.</p>
                    <p>Our mandate is to pioneer open and sponsored scientific advancements in autonomous physical intelligence, bio-inspired robotic kinematics, and robust power systems.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}



