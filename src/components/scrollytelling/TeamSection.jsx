import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { leadsMembers } from '../../data/leadsMembers';
import { mechanicalMembers } from '../../data/mechanicalMembers';
import { electricalMembers } from '../../data/electricalMembers';
import { softwareMembers } from '../../data/softwareMembers';

gsap.registerPlugin(ScrollTrigger);

export default function TeamSection() {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const [hoveredMember, setHoveredMember] = useState(null);

  // GSAP Pinned Horizontal Scroll
  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    const ctx = gsap.context(() => {
      const getScrollAmount = () => -(track.scrollWidth - window.innerWidth);

      gsap.to(track, {
        x: getScrollAmount,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${track.scrollWidth - window.innerWidth}`,
          scrub: 0.8,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  // Filter department leads
  const executiveLeads = leadsMembers.filter((m) =>
    ['Captain', 'Vice Captain', 'Head of Operations', 'Internal Strategy Lead', 'Project Management Lead', 'Treasurer'].includes(m.role)
  );
  const mechLeads = leadsMembers.filter((m) => m.role === 'Mechanical Lead');
  const elecLeads = leadsMembers.filter((m) => m.role === 'Electrical Lead');
  const softLeads = leadsMembers.filter((m) => m.role === 'Software Lead');

  return (
    <div id="team-section" className="team-hscroll-wrapper" ref={sectionRef}>
      <div className="team-hscroll-stage">

        {/* ── Horizontal Track (5 Slides × 100vw) ── */}
        <div className="team-hscroll-track" ref={trackRef}>

          {/* ══════════════════════════════════════════════════════════
             SLIDE 0: OVERVIEW · IIT BOMBAY TECHFEST HERO BANNER
             ══════════════════════════════════════════════════════════ */}
          <div className="team-hslide team-hslide--overview">
            <div className="hslide-inner overview-layout">
              
              {/* Left Column: Mission & Typography */}
              <div className="overview-info-pane">
                <span className="eyebrow-accent font-mono">BATTLE-TESTED COLLECTIVE · IIT BOMBAY TECHFEST</span>
                <h2 className="overview-title font-cabinet">
                  Meet the engineers<br />
                  <span className="gradient-text">behind the machine.</span>
                </h2>
                <p className="overview-subtitle font-satoshi">
                  We are an independent collective of engineering students pooling our own resources to build hardware that typically requires corporate backing. Every subsystem is manufactured, soldered, and coded in-house.
                </p>

                <div className="overview-stats-row font-mono">
                  <div className="stat-pill">
                    <span className="stat-val font-cabinet">40+</span>
                    <span className="stat-lbl">Active Engineers</span>
                  </div>
                  <div className="stat-pill">
                    <span className="stat-val font-cabinet">04</span>
                    <span className="stat-lbl">Disciplines Synced</span>
                  </div>
                  <div className="stat-pill">
                    <span className="stat-val font-cabinet">100%</span>
                    <span className="stat-lbl">Student Engineered</span>
                  </div>
                </div>

                <div className="scroll-hint-bar font-mono">
                  <span className="hint-arrow">↓</span> SCROLL DOWN TO EXPLORE DEPARTMENTS
                </div>
              </div>

              {/* Right Column: Framed Techfest Photo */}
              <div className="overview-media-pane">
                <div className="media-photo-frame">
                  <img
                    src="/team-techfest.jpg"
                    alt="Team Genesis at IIT Bombay Techfest"
                    className="media-photo-img"
                  />
                  <div className="media-photo-overlay" />
                  <div className="media-photo-caption font-mono">
                    <span>TEAM GENESIS · IIT BOMBAY TECHFEST VENTURE</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════
             SLIDE 1: 01 // EXECUTIVE LEADERSHIP & OPERATIONS
             ══════════════════════════════════════════════════════════ */}
          <div className="team-hslide team-hslide--leadership">
            <div className="hslide-inner">
              
              <div className="slide-header-bar">
                <div className="header-meta">
                  <span className="slide-tag font-mono">01 // GOVERNANCE &amp; PLATFORM STRATEGY</span>
                  <h3 className="slide-heading font-cabinet">Executive Leadership</h3>
                  <p className="slide-lead-copy font-satoshi">
                    Leadership in Genesis is about harmony rather than hierarchy — bridging disciplines, eliminating bottlenecks, and maintaining velocity.
                  </p>
                </div>
                <div className="header-badge-group font-mono">
                  <div className="hbadge"><span>DIRECTIVE:</span> AUTONOMOUS BIPED</div>
                  <div className="hbadge"><span>FOUNDED:</span> 2024 (VIT CHENNAI)</div>
                </div>
              </div>

              <div className="leadership-cards-grid">
                {executiveLeads.map((lead) => (
                  <div key={lead.id} className="lead-tile">
                    <div className="tile-top">
                      <span className="tile-role font-mono">{lead.role}</span>
                      <span className="tile-badge font-mono">OFFICER</span>
                    </div>
                    <h4 className="tile-name font-cabinet">{lead.name}</h4>
                    <p className="tile-quote font-satoshi">
                      {lead.quote && lead.quote.trim() ? `"${lead.quote.trim()}"` : 'Directing platform integration and cross-domain engineering sprints.'}
                    </p>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════
             SLIDE 2: 02 // MECHANICAL & STRUCTURAL DESIGN
             ══════════════════════════════════════════════════════════ */}
          <div className="team-hslide team-hslide--mech">
            <div className="hslide-inner">
              
              <div className="slide-header-bar">
                <div className="header-meta">
                  <span className="slide-tag font-mono">02 // 7075-T6 KINEMATICS &amp; CAD/FEA</span>
                  <h3 className="slide-heading font-cabinet">Mechanical &amp; Design</h3>
                  <p className="slide-lead-copy font-satoshi">
                    Designing, stress-analyzing, and CNC-machining the 17-DOF aerospace skeleton, custom harmonic joint cartridges, and lightweight composite trusses.
                  </p>
                </div>
                <div className="header-badge-group font-mono">
                  <div className="hbadge"><span>ALLOY:</span> 7075-T6 CNC</div>
                  <div className="hbadge"><span>JOINTS:</span> 17 ACTUATED DOFS</div>
                </div>
              </div>

              <div className="dept-content-split">
                {/* Left: Leads & Competencies */}
                <div className="dept-sidebar">
                  <div className="sidebar-section-title font-mono">DEPARTMENT LEADS [02]</div>
                  <div className="leads-mini-stack">
                    {mechLeads.map((lead) => (
                      <div key={lead.id} className="lead-tile lead-tile--compact">
                        <div className="tile-top">
                          <span className="tile-role font-mono">{lead.role}</span>
                        </div>
                        <h4 className="tile-name font-cabinet">{lead.name}</h4>
                        {lead.quote && lead.quote.trim() && (
                          <p className="tile-quote font-satoshi">"{lead.quote.trim()}"</p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="sidebar-section-title font-mono">CORE TECHNICAL MATRIX</div>
                  <div className="matrix-tags font-mono">
                    <span>CNC 7075-T6 Milling</span>
                    <span>FEA Topology Optimization</span>
                    <span>Harmonic Joint Cartridges</span>
                    <span>Kinematic Compliance</span>
                  </div>
                </div>

                {/* Right: 16 Members Roster Grid */}
                <div className="dept-roster-main">
                  <div className="roster-header font-mono">
                    <span>ACTIVE ENGINEERING ROSTER</span>
                    <span className="roster-count">[{mechanicalMembers.length} ACTIVE ENGINEERS]</span>
                  </div>

                  <div className="roster-chips-grid">
                    {mechanicalMembers.map((member) => (
                      <div
                        key={member.id}
                        className="engineer-chip"
                        onMouseEnter={() => setHoveredMember(member)}
                        onMouseLeave={() => setHoveredMember(null)}
                      >
                        <span className="chip-avatar font-mono">{member.name.charAt(0)}</span>
                        <span className="chip-name font-satoshi">{member.name}</span>
                      </div>
                    ))}
                  </div>

                  <div className="roster-quote-callout font-satoshi">
                    {hoveredMember && hoveredMember.quote && hoveredMember.quote.trim() ? (
                      <div className="live-quote">
                        <strong className="font-mono">{hoveredMember.name}:</strong> "{hoveredMember.quote.trim()}"
                      </div>
                    ) : (
                      <span className="idle-quote font-mono">
                        HOVER OVER AN ENGINEER TO INSPECT SPECIALIZATION &amp; MOTTO
                      </span>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════
             SLIDE 3: 03 // ELECTRICAL & CONTROL SYSTEMS
             ══════════════════════════════════════════════════════════ */}
          <div className="team-hslide team-hslide--elec">
            <div className="hslide-inner">
              
              <div className="slide-header-bar">
                <div className="header-meta">
                  <span className="slide-tag font-mono">03 // GaN FOC &amp; 48V SPLIT-BUS POWER</span>
                  <h3 className="slide-heading font-cabinet">Electrical &amp; Control Systems</h3>
                  <p className="slide-lead-copy font-satoshi">
                    The kinetic heartbeat — powering every joint with custom GaN field-oriented motor drivers, 48V isolated power buses, and sub-millisecond CAN-FD.
                  </p>
                </div>
                <div className="header-badge-group font-mono">
                  <div className="hbadge"><span>BUS:</span> 48V SPLIT-BUS</div>
                  <div className="hbadge"><span>STAGE:</span> GaN FOC INVERTERS</div>
                </div>
              </div>

              <div className="dept-content-split">
                {/* Left: Leads & Competencies */}
                <div className="dept-sidebar">
                  <div className="sidebar-section-title font-mono">DEPARTMENT LEADS [02]</div>
                  <div className="leads-mini-stack">
                    {elecLeads.map((lead) => (
                      <div key={lead.id} className="lead-tile lead-tile--compact">
                        <div className="tile-top">
                          <span className="tile-role font-mono">{lead.role}</span>
                        </div>
                        <h4 className="tile-name font-cabinet">{lead.name}</h4>
                        {lead.quote && lead.quote.trim() && (
                          <p className="tile-quote font-satoshi">"{lead.quote.trim()}"</p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="sidebar-section-title font-mono">CORE TECHNICAL MATRIX</div>
                  <div className="matrix-tags font-mono">
                    <span>GaN FOC Drivers</span>
                    <span>Isolated CAN-FD Bus</span>
                    <span>48V Split-Bus BMS</span>
                    <span>Custom Multi-Layer PCBs</span>
                  </div>
                </div>

                {/* Right: 7 Members Roster Grid */}
                <div className="dept-roster-main">
                  <div className="roster-header font-mono">
                    <span>ACTIVE ENGINEERING ROSTER</span>
                    <span className="roster-count">[{electricalMembers.length} ACTIVE ENGINEERS]</span>
                  </div>

                  <div className="roster-chips-grid">
                    {electricalMembers.map((member) => (
                      <div
                        key={member.id}
                        className="engineer-chip"
                        onMouseEnter={() => setHoveredMember(member)}
                        onMouseLeave={() => setHoveredMember(null)}
                      >
                        <span className="chip-avatar font-mono">{member.name.charAt(0)}</span>
                        <span className="chip-name font-satoshi">{member.name}</span>
                      </div>
                    ))}
                  </div>

                  <div className="roster-quote-callout font-satoshi">
                    {hoveredMember && hoveredMember.quote && hoveredMember.quote.trim() ? (
                      <div className="live-quote">
                        <strong className="font-mono">{hoveredMember.name}:</strong> "{hoveredMember.quote.trim()}"
                      </div>
                    ) : (
                      <span className="idle-quote font-mono">
                        HOVER OVER AN ENGINEER TO INSPECT SPECIALIZATION &amp; MOTTO
                      </span>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════
             SLIDE 4: 04 // SOFTWARE & EMBODIED AI
             ══════════════════════════════════════════════════════════ */}
          <div className="team-hslide team-hslide--software">
            <div className="hslide-inner">
              
              <div className="slide-header-bar">
                <div className="header-meta">
                  <span className="slide-tag font-mono">04 // 1,000 HZ DETERMINISTIC CONTROL &amp; RL</span>
                  <h3 className="slide-heading font-cabinet">Software &amp; Embodied AI</h3>
                  <p className="slide-lead-copy font-satoshi">
                    The neural cognition core — deterministic sub-millisecond balance loops, sim-to-real reinforcement learning policies, and spatial 360° LiDAR perception.
                  </p>
                </div>
                <div className="header-badge-group font-mono">
                  <div className="hbadge"><span>LOOP:</span> 1,000 HZ ZMP</div>
                  <div className="hbadge"><span>PERCEPTION:</span> 360° LiDAR + NPU</div>
                </div>
              </div>

              <div className="dept-content-split">
                {/* Left: Leads & Competencies */}
                <div className="dept-sidebar">
                  <div className="sidebar-section-title font-mono">DEPARTMENT LEADS [02]</div>
                  <div className="leads-mini-stack">
                    {softLeads.map((lead) => (
                      <div key={lead.id} className="lead-tile lead-tile--compact">
                        <div className="tile-top">
                          <span className="tile-role font-mono">{lead.role}</span>
                        </div>
                        <h4 className="tile-name font-cabinet">{lead.name}</h4>
                        {lead.quote && lead.quote.trim() && (
                          <p className="tile-quote font-satoshi">"{lead.quote.trim()}"</p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="sidebar-section-title font-mono">CORE TECHNICAL MATRIX</div>
                  <div className="matrix-tags font-mono">
                    <span>1,000 Hz Deterministic Loop</span>
                    <span>Sim-to-Real RL Policy</span>
                    <span>360° LiDAR SLAM</span>
                    <span>ROS2 Real-Time Stack</span>
                  </div>
                </div>

                {/* Right: 10 Members Roster Grid */}
                <div className="dept-roster-main">
                  <div className="roster-header font-mono">
                    <span>ACTIVE ENGINEERING ROSTER</span>
                    <span className="roster-count">[{softwareMembers.length} ACTIVE ENGINEERS]</span>
                  </div>

                  <div className="roster-chips-grid">
                    {softwareMembers.map((member) => (
                      <div
                        key={member.id}
                        className="engineer-chip"
                        onMouseEnter={() => setHoveredMember(member)}
                        onMouseLeave={() => setHoveredMember(null)}
                      >
                        <span className="chip-avatar font-mono">{member.name.charAt(0)}</span>
                        <span className="chip-name font-satoshi">{member.name}</span>
                      </div>
                    ))}
                  </div>

                  <div className="roster-quote-callout font-satoshi">
                    {hoveredMember && hoveredMember.quote && hoveredMember.quote.trim() ? (
                      <div className="live-quote">
                        <strong className="font-mono">{hoveredMember.name}:</strong> "{hoveredMember.quote.trim()}"
                      </div>
                    ) : (
                      <span className="idle-quote font-mono">
                        HOVER OVER AN ENGINEER TO INSPECT SPECIALIZATION &amp; MOTTO
                      </span>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>{/* end team-hscroll-track */}
      </div>
    </div>
  );
}
