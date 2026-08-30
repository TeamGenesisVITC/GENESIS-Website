import React from 'react';
import { Cpu, Eye, Radio, Server, Shield, CheckCircle2 } from 'lucide-react';

export default function SpecsSection() {
  return (
    <section style={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '0 8vw',
      position: 'relative',
      boxSizing: 'border-box',
    }}>
      {/* Narrative Panel Left-Aligned */}
      <div style={{ maxWidth: '580px', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span className="telemetry-badge">
            <Cpu size={12} />
            SECTION 02 // SENSORY & COMPUTE RIG
          </span>
        </div>

        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2rem, 3.5vw, 3rem)',
          fontWeight: 800,
          textTransform: 'uppercase',
          marginBottom: '16px',
        }}>
          REAL-TIME <br />
          <span style={{ color: 'var(--accent-cyan)' }}>PERCEPTION & AI</span> <br />
          EDGE COMPUTE
        </h2>

        <p style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '1.05rem',
          color: 'var(--text-muted)',
          lineHeight: 1.6,
          marginBottom: '24px',
        }}>
          Dual on-board neural processing units power end-to-end visuomotor policies, sub-10ms inverse kinematics, and full spatial SLAM in dynamic human environments.
        </p>

        {/* Feature Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '28px' }}>
          <div className="hud-panel" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--accent-cyan)' }}>
              <Eye size={16} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700 }}>
                SOLID-STATE LIDAR
              </span>
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              360° point-cloud generation with 100m detection range and sub-millimeter depth accuracy.
            </p>
          </div>

          <div className="hud-panel" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--accent-purple)' }}>
              <Server size={16} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700 }}>
                275 TOPS NPU
              </span>
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              High-throughput transformer models for vision-language-action (VLA) manipulation policies.
            </p>
          </div>

          <div className="hud-panel" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--accent-amber)' }}>
              <Radio size={16} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700 }}>
                CAN-FD BUS LINK
              </span>
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              1 kHz deterministic joint control loop with redundant fail-safe isolation channels.
            </p>
          </div>

          <div className="hud-panel" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--accent-green)' }}>
              <Shield size={16} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700 }}>
                SAFETY SIL-3
              </span>
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Hardware-enforced torque cutoffs and ISO 13849 human collaborative safety certification.
            </p>
          </div>
        </div>

        {/* Readout Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          color: 'var(--accent-cyan)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={14} />
            <span>SENSOR FUSION: SYNCHRONIZED</span>
          </div>
          <div style={{ color: 'var(--border-medium)' }}>|</div>
          <div>INFERENCE LATENCY: 4.2ms</div>
        </div>
      </div>
    </section>
  );
}
