import React, { useState, useEffect } from 'react';
import { Activity, Cpu, Eye, Radio, Terminal } from 'lucide-react';

export default function HeaderNav({ wireframe, onToggleWireframe }) {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toISOString().substring(11, 19) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      padding: '16px 28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'linear-gradient(180deg, rgba(6,7,10,0.85) 0%, rgba(6,7,10,0.3) 100%)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
    }}>
      {/* Brand & System Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            background: 'var(--accent-cyan-dim)',
            border: '1px solid var(--accent-cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
          }}>
            <Cpu size={16} color="var(--accent-cyan)" />
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: '1.05rem',
              letterSpacing: '0.15em',
              color: '#ffffff',
            }}>
              GENESIS<span style={{ color: 'var(--accent-cyan)' }}>{'//'}</span>ROBOTICS
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.65rem',
              color: 'var(--text-muted)',
              letterSpacing: '0.05em',
            }}>
              BIPEDAL HUMANOID PLATFORM // MK-1
            </div>
          </div>
        </div>

        <div className="telemetry-badge" style={{ display: 'none', md: 'inline-flex' }}>
          <span className="status-dot"></span>
          SYS.ONLINE: 100%
        </div>
      </div>

      {/* Center Readout */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Radio size={13} color="var(--accent-green)" />
          <span>LINK: ACTIVE</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity size={13} color="var(--accent-cyan)" />
          <span>TIME: {timeStr}</span>
        </div>
      </div>

      {/* Right Actions: Wireframe Toggle + CTA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <button
          onClick={onToggleWireframe}
          className={`tech-btn ${wireframe ? '' : 'tech-btn-secondary'}`}
          style={{ padding: '7px 14px', fontSize: '0.75rem' }}
          title="Toggle X-Ray / Wireframe inspection mode"
        >
          <Eye size={13} />
          <span>{wireframe ? 'X-RAY: ACTIVE' : 'X-RAY MODE'}</span>
        </button>

        <a
          href="#inquiries"
          className="tech-btn"
          style={{ padding: '7px 18px', fontSize: '0.75rem', textDecoration: 'none' }}
        >
          <Terminal size={13} />
          <span>CONTACT / B2B</span>
        </a>
      </div>
    </header>
  );
}
