import React from 'react';
import { ArrowDown, Crosshair } from 'lucide-react';

export default function HeroSection() {
  return (
    <section style={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      padding: '0 8vw',
      position: 'relative',
      boxSizing: 'border-box',
    }}>
      {/* Left-Aligned Industrial Hero Narrative */}
      <div style={{ maxWidth: '640px', zIndex: 10 }}>
        {/* Designation Tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <span className="telemetry-badge">
            <Crosshair size={12} />
            AUTONOMOUS BIPEDAL CHASSIS // GENESIS-01
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            [REV 2026.4]
          </span>
        </div>

        {/* Main Title */}
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
          fontWeight: 900,
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
          textTransform: 'uppercase',
          marginBottom: '20px',
        }}>
          NEXT-GEN <br />
          <span style={{
            background: 'linear-gradient(135deg, #ffffff 30%, var(--accent-cyan) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            HUMANOID
          </span> <br />
          ARCHITECTURE
        </h1>

        {/* Subtitle / Value Prop */}
        <p style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '1.1rem',
          color: 'var(--text-muted)',
          lineHeight: 1.6,
          marginBottom: '32px',
          maxWidth: '520px',
        }}>
          Engineered for high-payload industrial automation, unstructured facility navigation, and millisecond-latency reinforcement learning control.
        </p>

        {/* Core KPI Matrix Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          marginBottom: '36px',
        }}>
          <div className="hud-panel" style={{ padding: '12px 16px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--accent-cyan)' }}>
              PAYLOAD CAPACITY
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800 }}>
              25 <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>KG</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-dim)' }}>
              DUAL ARM RATED
            </div>
          </div>

          <div className="hud-panel" style={{ padding: '12px 16px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--accent-purple)' }}>
              TOTAL DOF
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800 }}>
              32 <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>AXES</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-dim)' }}>
              HARMONIC RIG
            </div>
          </div>

          <div className="hud-panel" style={{ padding: '12px 16px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--accent-green)' }}>
              BATTERY RUNTIME
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800 }}>
              5.5 <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>HRS</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-dim)' }}>
              HOT-SWAP CELL
            </div>
          </div>
        </div>

        {/* Action CTAs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="tech-btn">
            EXPLORE TELEMETRY
            <ArrowDown size={14} />
          </button>
          <a
            href="#inquiries"
            className="tech-btn tech-btn-secondary"
            style={{ textDecoration: 'none' }}
          >
            TECHNICAL SPECS
          </a>
        </div>
      </div>

      {/* Scroll indicator prompt */}
      <div style={{
        position: 'absolute',
        bottom: '30px',
        right: '8vw',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
      }}>
        <span>SCROLL TO INITIALIZE TELEMETRY</span>
        <div style={{
          width: '20px',
          height: '32px',
          border: '1px solid var(--border-medium)',
          borderRadius: '10px',
          display: 'flex',
          justifyContent: 'center',
          paddingTop: '6px',
        }}>
          <div style={{
            width: '3px',
            height: '6px',
            background: 'var(--accent-cyan)',
            borderRadius: '2px',
            animation: 'scroll-bounce 1.5s infinite',
          }} />
        </div>
      </div>

      <style>{`
        @keyframes scroll-bounce {
          0%, 100% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(8px); opacity: 0.3; }
        }
      `}</style>
    </section>
  );
}
