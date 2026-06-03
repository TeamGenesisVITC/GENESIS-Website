import React, { useEffect, useRef } from 'react';
import Spline from '@splinetool/react-spline';

// ─── Circuit Board Background ─────────────────────────────────────────────────
function CircuitBackground() {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 1,
      overflow: 'hidden',
      opacity: 0.25,
    }}>
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', inset: 0 }}
      >
        <defs>
          <pattern
            id="circuit"
            x="0"
            y="0"
            width="200"
            height="200"
            patternUnits="userSpaceOnUse"
          >
            {/* Main horizontal traces */}
            <line x1="0"   y1="40"  x2="80"  y2="40"  stroke="#9333ea" strokeWidth="1"/>
            <line x1="120" y1="40"  x2="200" y2="40"  stroke="#9333ea" strokeWidth="1"/>
            <line x1="0"   y1="120" x2="60"  y2="120" stroke="#7c3aed" strokeWidth="1"/>
            <line x1="100" y1="120" x2="200" y2="120" stroke="#7c3aed" strokeWidth="1"/>
            <line x1="0"   y1="160" x2="200" y2="160" stroke="#6d28d9" strokeWidth="0.5"/>
            {/* Main vertical traces */}
            <line x1="40"  y1="0"   x2="40"  y2="80"  stroke="#9333ea" strokeWidth="1"/>
            <line x1="40"  y1="100" x2="40"  y2="200" stroke="#9333ea" strokeWidth="1"/>
            <line x1="120" y1="0"   x2="120" y2="60"  stroke="#7c3aed" strokeWidth="1"/>
            <line x1="120" y1="90"  x2="120" y2="200" stroke="#7c3aed" strokeWidth="1"/>
            <line x1="160" y1="0"   x2="160" y2="200" stroke="#6d28d9" strokeWidth="0.5"/>
            {/* Corner connectors - L shapes */}
            <line x1="40"  y1="40"  x2="60"  y2="40"  stroke="#c084fc" strokeWidth="1"/>
            <line x1="60"  y1="40"  x2="60"  y2="60"  stroke="#c084fc" strokeWidth="1"/>
            <line x1="120" y1="120" x2="140" y2="120" stroke="#c084fc" strokeWidth="1"/>
            <line x1="140" y1="120" x2="140" y2="100" stroke="#c084fc" strokeWidth="1"/>
            <line x1="40"  y1="120" x2="40"  y2="100" stroke="#a855f7" strokeWidth="1"/>
            <line x1="40"  y1="100" x2="60"  y2="100" stroke="#a855f7" strokeWidth="1"/>
            {/* Nodes / solder points */}
            <circle cx="40"  cy="40"  r="2.5" fill="#c084fc"/>
            <circle cx="120" cy="40"  r="2"   fill="#9333ea"/>
            <circle cx="40"  cy="120" r="2.5" fill="#c084fc"/>
            <circle cx="120" cy="120" r="2"   fill="#9333ea"/>
            <circle cx="160" cy="160" r="1.5" fill="#7c3aed"/>
            <circle cx="60"  cy="160" r="1.5" fill="#7c3aed"/>
            <circle cx="40"  cy="160" r="2"   fill="#a855f7"/>
            <circle cx="120" cy="160" r="2"   fill="#a855f7"/>
            {/* Small IC chip rectangle */}
            <rect x="70" y="70" width="40" height="24" fill="none" stroke="#7c3aed" strokeWidth="1"/>
            <line x1="74" y1="70" x2="74" y2="65" stroke="#7c3aed" strokeWidth="0.8"/>
            <line x1="82" y1="70" x2="82" y2="65" stroke="#7c3aed" strokeWidth="0.8"/>
            <line x1="90" y1="70" x2="90" y2="65" stroke="#7c3aed" strokeWidth="0.8"/>
            <line x1="98" y1="70" x2="98" y2="65" stroke="#7c3aed" strokeWidth="0.8"/>
            <line x1="74" y1="94" x2="74" y2="99" stroke="#7c3aed" strokeWidth="0.8"/>
            <line x1="82" y1="94" x2="82" y2="99" stroke="#7c3aed" strokeWidth="0.8"/>
            <line x1="90" y1="94" x2="90" y2="99" stroke="#7c3aed" strokeWidth="0.8"/>
            <line x1="98" y1="94" x2="98" y2="99" stroke="#7c3aed" strokeWidth="0.8"/>
            {/* Tiny detail traces */}
            <line x1="160" y1="40" x2="180" y2="40" stroke="#6d28d9" strokeWidth="0.5"/>
            <line x1="180" y1="40" x2="180" y2="80" stroke="#6d28d9" strokeWidth="0.5"/>
            <circle cx="180" cy="80" r="1.5" fill="#6d28d9"/>
          </pattern>

          {/* Pulse animation filter */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.5" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Base circuit pattern */}
        <rect width="100%" height="100%" fill="url(#circuit)"/>
        {/* Overlay glow pass — same pattern, filtered */}
        <rect width="100%" height="100%" fill="url(#circuit)" filter="url(#glow)" opacity="0.4"/>
      </svg>

      {/* Travelling pulse dots — CSS animated */}
      <style>{`
        @keyframes travel-x {
          0%   { left: 0%;   opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
        @keyframes travel-y {
          0%   { top: 0%;   opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .pulse-x {
          position: absolute;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #c084fc;
          box-shadow: 0 0 6px #9333ea;
          animation: travel-x linear infinite;
        }
        .pulse-y {
          position: absolute;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #c084fc;
          box-shadow: 0 0 6px #9333ea;
          animation: travel-y linear infinite;
        }
      `}</style>

      {/* Horizontal pulses at different heights */}
      <div className="pulse-x" style={{ top: '20%', animationDuration: '3s',   animationDelay: '0s'   }}/>
      <div className="pulse-x" style={{ top: '40%', animationDuration: '4s',   animationDelay: '1s'   }}/>
      <div className="pulse-x" style={{ top: '60%', animationDuration: '2.5s', animationDelay: '0.5s' }}/>
      <div className="pulse-x" style={{ top: '75%', animationDuration: '3.5s', animationDelay: '1.5s' }}/>
      {/* Vertical pulses */}
      <div className="pulse-y" style={{ left: '20%', animationDuration: '3s',   animationDelay: '0.2s' }}/>
      <div className="pulse-y" style={{ left: '50%', animationDuration: '4s',   animationDelay: '0.8s' }}/>
      <div className="pulse-y" style={{ left: '75%', animationDuration: '2.8s', animationDelay: '1.2s' }}/>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function IntroSequence({ onComplete }) {
  const containerRef      = useRef();
  const genesisRef        = useRef();
  const splineContainerRef = useRef();
  const done              = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    if (containerRef.current) {
      containerRef.current.style.transition = 'transform 0.5s ease-in';
      containerRef.current.style.transform = 'translateX(100vw)';
      setTimeout(() => onComplete?.(), 500);
    }
  };

  useEffect(() => {
    // 5-second auto-finish timer
    const timer = setTimeout(finish, 5000);

    // ESC to skip
    const onKey = (e) => { if (e.key === 'Escape') finish(); };
    window.addEventListener('keydown', onKey);

    // GENESIS letters stagger in after 0.5s
    setTimeout(() => {
      const spans = genesisRef.current?.querySelectorAll('span');
      if (!spans) return;
      spans.forEach((span, i) => {
        setTimeout(() => {
          span.style.opacity = '1';
        }, i * 120);
      });
    }, 500);

    // Automated cursor sweep across GENESIS letters.
    // Starts at 1500ms — well after all letters have appeared.
    // Dispatches both MouseEvent and PointerEvent to the canvas element
    // (Spline uses pointer events internally) and falls back to window.
    setTimeout(() => {
      const container = genesisRef.current;
      if (!container) return;
      const spans = container.querySelectorAll('span');
      if (!spans.length) return;

      // Capture centre point of each letter
      const positions = Array.from(spans).map(span => {
        const rect = span.getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2,
          y: rect.top  + rect.height / 2,
        };
      });

      // One final position slightly right of the last letter
      positions.push({
        x: positions[positions.length - 1].x + 80,
        y: positions[positions.length - 1].y,
      });

      // Step 1 diagnostic — confirm positions are real
      console.log('Letter positions:', positions);

      positions.forEach((pos, i) => {
        setTimeout(() => {
          // Step 1 diagnostic — confirm each dispatch fires
          console.log('Dispatching mousemove to:', pos.x, pos.y, 'at delay', i * 500);

          // Step 2 — target the canvas directly; fall back to window
          const canvas = splineContainerRef.current?.querySelector('canvas');
          const target = canvas || window;

          // Step 3 — dispatch both MouseEvent and PointerEvent
          target.dispatchEvent(new MouseEvent('mousemove', {
            clientX: pos.x,
            clientY: pos.y,
            bubbles: true,
            cancelable: true,
            view: window,
          }));

          target.dispatchEvent(new PointerEvent('pointermove', {
            clientX: pos.x,
            clientY: pos.y,
            bubbles: true,
            cancelable: true,
            view: window,
            isPrimary: true,
          }));

          // Also fire on window as a fallback in case Spline listens there
          if (target !== window) {
            window.dispatchEvent(new MouseEvent('mousemove', {
              clientX: pos.x,
              clientY: pos.y,
              bubbles: true,
              cancelable: true,
              view: window,
            }));
          }
        }, i * 500); // Step 4 — 500ms between letters
      });
    }, 1500);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div
      ref={el => { if (el) console.log('INTRO DIV MOUNTED'); containerRef.current = el; }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#05010f',
        overflow: 'hidden',
        cursor: 'none',
      }}
    >
      {/* Circuit board background */}
      <CircuitBackground />

      {/* Purple radial glow behind the robot */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 60% 70% at 50% 60%, rgba(147, 51, 234, 0.35) 0%, rgba(0,0,0,0) 70%)',
        zIndex: 1,
        pointerEvents: 'none',
      }} />

      {/* Step 2 — Spline wrapped in a ref'd container div */}
      <div
        ref={splineContainerRef}
        style={{ position: 'absolute', inset: 0, zIndex: 2, maxWidth: '100vw', overflow: 'hidden' }}
      >
        <Spline
          scene="https://prod.spline.design/cwEukIWPXY1Mqjj8/scene.splinecode"
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: '15%',
          }}
        />
      </div>

      {/* GENESIS text — Orbitron, white with soft purple glow */}
      <div
        ref={genesisRef}
        style={{
          position: 'absolute',
          top: '10%',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          gap: '0px',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        {'GENESIS'.split('').map((char, i) => (
          <span
            key={i}
            data-index={i}
            style={{
              color: '#ffffff',
              fontSize: 'clamp(32px, 8vw, 120px)',
              fontFamily: '"Orbitron", monospace',
              fontWeight: 900,
              letterSpacing: '0.2em',
              opacity: 0,
              display: 'inline-block',
              textShadow: '0 0 10px rgba(192, 132, 252, 0.6), 0 0 30px rgba(147, 51, 234, 0.3)',
              transition: 'opacity 0.3s ease',
            }}
          >
            {char}
          </span>
        ))}
      </div>

      {/* ESC hint */}
      <div style={{
        position: 'absolute',
        bottom: 24,
        right: 24,
        color: '#fff',
        fontSize: 12,
        opacity: 0.4,
        fontFamily: 'monospace',
        zIndex: 10,
        pointerEvents: 'none',
      }}>
        ESC to skip
      </div>
    </div>
  );
}
