import React from 'react';
import { Gauge, Zap, Thermometer, Compass, Layers } from 'lucide-react';

export default function TelemetrySidebar({ telemetry }) {
  const {
    progress = 0,
    yaw = '0.0',
    torque = '145',
    temp = '38.4',
    voltage = '48.2',
    dof = 32,
  } = telemetry || {};

  const currentStageName = 
    progress < 0.22 ? '01 // CHASSIS OVERVIEW' :
    progress < 0.48 ? '02 // PERCEPTION & AI CORE' :
    progress < 0.74 ? '03 // ACTUATOR KINEMATICS' :
    '04 // DEPLOYMENT TERMINAL';

  return (
    <aside style={{
      position: 'fixed',
      left: '24px',
      bottom: '24px',
      zIndex: 90,
      width: '270px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      pointerEvents: 'none',
    }}>
      {/* Active Stage Indicator */}
      <div className="hud-panel" style={{ padding: '12px 14px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '6px',
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.68rem',
            color: 'var(--text-muted)',
            letterSpacing: '0.1em',
          }}>
            CURRENT RIG STAGE
          </span>
          <span className="telemetry-badge" style={{ padding: '1px 5px', fontSize: '0.62rem' }}>
            {((progress || 0) * 100).toFixed(0)}%
          </span>
        </div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.78rem',
          fontWeight: 700,
          color: 'var(--accent-cyan)',
        }}>
          {currentStageName}
        </div>
      </div>

      {/* Real-Time Live Telemetry Metrics */}
      <div className="hud-panel" style={{ padding: '12px 14px' }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.68rem',
          color: 'var(--text-muted)',
          letterSpacing: '0.1em',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <Layers size={12} color="var(--accent-cyan)" />
          <span>REAL-TIME TELEMETRY</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {/* Degrees of Freedom */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 8px', borderLeft: '2px solid var(--accent-cyan)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.62rem', fontFamily: 'var(--font-mono)' }}>
              <Gauge size={11} />
              <span>DOF</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
              {dof} AXES
            </div>
          </div>

          {/* Actuator Torque */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 8px', borderLeft: '2px solid var(--accent-purple)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.62rem', fontFamily: 'var(--font-mono)' }}>
              <Zap size={11} />
              <span>TORQUE</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
              {torque} Nm
            </div>
          </div>

          {/* Core Temperature */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 8px', borderLeft: '2px solid var(--accent-green)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.62rem', fontFamily: 'var(--font-mono)' }}>
              <Thermometer size={11} />
              <span>CORE TEMP</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
              {temp} °C
            </div>
          </div>

          {/* Gimbal Yaw / Voltage */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 8px', borderLeft: '2px solid var(--accent-amber)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.62rem', fontFamily: 'var(--font-mono)' }}>
              <Compass size={11} />
              <span>BUS RAIL</span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
              {voltage}V ({yaw}°)
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
