import React, { useState } from 'react';
import { Wrench, Cpu, Code2, Users, ChevronRight, X, Sparkles } from 'lucide-react';
import { leadsMembers } from '../../data/leadsMembers';
import { electricalMembers } from '../../data/electricalMembers';
import { mechanicalMembers } from '../../data/mechanicalMembers';
import { softwareMembers } from '../../data/softwareMembers';

export default function SubsystemsSection() {
  const [activeDept, setActiveDept] = useState('leads');
  const [selectedMember, setSelectedMember] = useState(null);

  const departments = [
    {
      id: 'leads',
      name: 'TEAM LEADERSHIP',
      icon: Users,
      color: 'var(--accent-cyan)',
      count: leadsMembers.length,
      desc: 'Command architecture, operational strategy, systems engineering, and inter-department synchronization.',
      members: leadsMembers,
    },
    {
      id: 'mechanical',
      name: 'MECHANICAL & CHASSIS',
      icon: Wrench,
      color: 'var(--accent-amber)',
      count: mechanicalMembers.length,
      desc: 'Structural FEA analysis, carbon-titanium topology optimization, kinematics, and harmonic gearbox rigging.',
      members: mechanicalMembers,
    },
    {
      id: 'electrical',
      name: 'ELECTRICAL & EMBEDDED',
      icon: Cpu,
      color: 'var(--accent-purple)',
      count: electricalMembers.length,
      desc: 'High-voltage BMS distribution, BLDC motor drivers, low-noise CAN-FD harness, and safety SIL-3 interlocks.',
      members: electricalMembers,
    },
    {
      id: 'software',
      name: 'SOFTWARE & AI BRAIN',
      icon: Code2,
      color: 'var(--accent-green)',
      count: softwareMembers.length,
      desc: 'Vision-Language-Action policies, real-time SLAM, ROS2 micro-architecture, and simulation-to-reality reinforcement learning.',
      members: softwareMembers,
    },
  ];

  const currentDept = departments.find(d => d.id === activeDept);

  return (
    <section style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      padding: '40px 8vw',
      position: 'relative',
      boxSizing: 'border-box',
    }}>
      <div style={{ width: '100%', maxWidth: '1100px', zIndex: 10 }}>
        {/* Section Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span className="telemetry-badge">
            <Users size={12} />
            SECTION 04 // ENGINEERING DEPARTMENTS & TEAM
          </span>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
              fontWeight: 800,
              textTransform: 'uppercase',
            }}>
              SUBSYSTEM <span style={{ color: 'var(--accent-cyan)' }}>DIVISIONS</span>
            </h2>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Multidisciplinary engineering teams powering the Genesis Humanoid Architecture.
            </p>
          </div>

          {/* Department Filter Buttons */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {departments.map((dept) => {
              const Icon = dept.icon;
              const isActive = activeDept === dept.id;
              return (
                <button
                  key={dept.id}
                  onClick={() => setActiveDept(dept.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    background: isActive ? dept.color : 'rgba(255,255,255,0.03)',
                    color: isActive ? '#000000' : 'var(--text-muted)',
                    border: '1px solid',
                    borderColor: isActive ? dept.color : 'var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Icon size={13} />
                  <span>{dept.name}</span>
                  <span style={{
                    padding: '1px 5px',
                    borderRadius: '2px',
                    fontSize: '0.62rem',
                    background: isActive ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.08)',
                  }}>
                    {dept.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Department Info Banner */}
        <div className="hud-panel" style={{ padding: '16px 20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: currentDept.color, letterSpacing: '0.1em' }}>
                DIVISION OVERVIEW //
              </span>
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', color: 'var(--text-white)', marginTop: '4px' }}>
                {currentDept.desc}
              </p>
            </div>
            <div className="telemetry-badge" style={{ borderColor: currentDept.color, color: currentDept.color }}>
              ACTIVE PERSONNEL: {currentDept.count}
            </div>
          </div>
        </div>

        {/* Member Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '14px',
          maxHeight: '380px',
          overflowY: 'auto',
          paddingRight: '6px',
        }}>
          {currentDept.members.map((member) => (
            <div
              key={member.id}
              onClick={() => setSelectedMember(member)}
              className="hud-panel"
              style={{
                padding: '14px 16px',
                cursor: 'pointer',
                background: 'rgba(12, 14, 20, 0.85)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: '#ffffff',
                  }}>
                    {member.name}
                  </div>
                  {member.role && (
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.7rem',
                      color: currentDept.color,
                      marginTop: '3px',
                    }}>
                      {member.role}
                    </div>
                  )}
                </div>
                <ChevronRight size={14} color="var(--text-dim)" />
              </div>

              {member.quote && member.quote.trim() && (
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.72rem',
                  fontStyle: 'italic',
                  color: 'var(--text-muted)',
                  marginTop: '10px',
                  borderLeft: `2px solid ${currentDept.color}`,
                  paddingLeft: '8px',
                }}>
                  "{member.quote.trim()}"
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Member Detail Modal / Popup */}
      {selectedMember && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}>
          <div className="hud-panel" style={{ maxWidth: '440px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span className="telemetry-badge">
                  OPERATIVE PROFILE
                </span>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginTop: '6px' }}>
                  {selectedMember.name}
                </h3>
                {selectedMember.role && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>
                    {selectedMember.role}
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedMember(null)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-white)',
                  cursor: 'pointer',
                  padding: '6px',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {selectedMember.quote && selectedMember.quote.trim() && (
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                padding: '14px',
                borderLeft: '3px solid var(--accent-cyan)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                fontStyle: 'italic',
                marginBottom: '20px',
              }}>
                "{selectedMember.quote.trim()}"
              </div>
            )}

            <button
              onClick={() => setSelectedMember(null)}
              className="tech-btn"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              CLOSE TERMINAL
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
