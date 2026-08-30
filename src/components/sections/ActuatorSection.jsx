import React, { useState } from 'react';
import { Zap } from 'lucide-react';

export default function ActuatorSection() {
  const [selectedJoint, setSelectedJoint] = useState('arm');

  const jointSpecs = {
    arm: {
      name: 'QDD-70 ARM ACTUATOR',
      torque: '165 Nm Peak',
      reduction: '100:1 Harmonic Drive',
      encoder: '20-bit Absolute Dual',
      response: '0.8 ms Delay',
      dof: '7 DOF per Arm',
      desc: 'Quasi-direct drive actuators delivering zero-backlash force feedback for micro-precision assembly and high-impact damping.',
    },
    leg: {
      name: 'HIP & KNEE HIGH-TORQUE MOTOR',
      torque: '380 Nm Peak',
      reduction: '120:1 Cycloidal Gearing',
      encoder: '22-bit Optical Encoder',
      response: '0.5 ms Delay',
      dof: '6 DOF per Leg',
      desc: 'High-power-density planetary cycloidal drives with regenerative braking and titanium cooling casings.',
    },
    torso: {
      name: 'PELVIC 3-AXIS GIMBAL CORE',
      torque: '240 Nm Continuous',
      reduction: '80:1 Planetary Reducer',
      encoder: '19-bit Magnetic',
      response: '1.2 ms Delay',
      dof: '3 DOF Core',
      desc: 'Multi-axis dynamic balance stabilizer maintaining center-of-mass stability across 3.5 m/s bipedal locomotion.',
    },
  };

  const current = jointSpecs[selectedJoint];

  return (
    <section style={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      padding: '0 8vw',
      position: 'relative',
      boxSizing: 'border-box',
    }}>
      {/* Narrative Panel Right-Aligned */}
      <div style={{ maxWidth: '600px', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span className="telemetry-badge">
            <Zap size={12} />
            SECTION 03 // ACTUATION & KINEMATICS
          </span>
        </div>

        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2rem, 3.5vw, 3rem)',
          fontWeight: 800,
          textTransform: 'uppercase',
          marginBottom: '16px',
        }}>
          HARMONIC <br />
          <span style={{ color: 'var(--accent-purple)' }}>HIGH-TORQUE</span> <br />
          ACTUATION
        </h2>

        <p style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '1.05rem',
          color: 'var(--text-muted)',
          lineHeight: 1.6,
          marginBottom: '24px',
        }}>
          Proprietary quasi-direct drive harmonic motors engineered for high power-to-weight ratio, zero-backlash positioning, and compliance torque sensing.
        </p>

        {/* Joint Selector Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {Object.keys(jointSpecs).map((key) => (
            <button
              key={key}
              onClick={() => setSelectedJoint(key)}
              style={{
                background: selectedJoint === key ? 'var(--accent-purple)' : 'rgba(255,255,255,0.05)',
                color: selectedJoint === key ? '#ffffff' : 'var(--text-muted)',
                border: '1px solid',
                borderColor: selectedJoint === key ? 'var(--accent-purple)' : 'var(--border-subtle)',
                padding: '8px 14px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {key.toUpperCase()} ACTUATOR
            </button>
          ))}
        </div>

        {/* Interactive Actuator Spec Card */}
        <div className="hud-panel" style={{ padding: '20px', marginBottom: '24px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '10px',
            marginBottom: '14px',
          }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--text-white)',
            }}>
              {current.name}
            </div>
            <span className="telemetry-badge" style={{ borderColor: 'var(--accent-purple)', color: 'var(--accent-purple)' }}>
              {current.dof}
            </span>
          </div>

          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            {current.desc}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderLeft: '2px solid var(--accent-purple)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>MAX TORQUE</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>{current.torque}</div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderLeft: '2px solid var(--accent-cyan)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>REDUCTION RATIO</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>{current.reduction}</div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderLeft: '2px solid var(--accent-amber)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>ENCODER FEEDBACK</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>{current.encoder}</div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderLeft: '2px solid var(--accent-green)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>LOOP RESPONSE</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>{current.response}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
