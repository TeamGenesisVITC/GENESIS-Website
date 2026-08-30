import React from 'react';

export default function GridOverlay() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 2,
    }}>
      {/* Blueprint Grid Background */}
      <div className="bg-tech-grid" style={{ position: 'absolute', inset: 0, opacity: 0.4 }} />

      {/* Screen Vignette */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at center, rgba(6,7,10,0.1) 0%, rgba(6,7,10,0.85) 100%)',
      }} />

      {/* 4 Screen Corner Reticle Brackets */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        width: '16px',
        height: '16px',
        borderTop: '2px solid var(--accent-cyan-dim)',
        borderLeft: '2px solid var(--accent-cyan-dim)',
      }} />
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        width: '16px',
        height: '16px',
        borderTop: '2px solid var(--accent-cyan-dim)',
        borderRight: '2px solid var(--accent-cyan-dim)',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        width: '16px',
        height: '16px',
        borderBottom: '2px solid var(--accent-cyan-dim)',
        borderLeft: '2px solid var(--accent-cyan-dim)',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        width: '16px',
        height: '16px',
        borderBottom: '2px solid var(--accent-cyan-dim)',
        borderRight: '2px solid var(--accent-cyan-dim)',
      }} />

      {/* Center Reticle Crosshair (subtle) */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '32px',
        height: '32px',
        opacity: 0.15,
      }}>
        <div style={{ position: 'absolute', top: '15px', left: 0, right: 0, height: '1px', background: 'var(--accent-cyan)' }} />
        <div style={{ position: 'absolute', left: '15px', top: 0, bottom: 0, width: '1px', background: 'var(--accent-cyan)' }} />
      </div>
    </div>
  );
}
