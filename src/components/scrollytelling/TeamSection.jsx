import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { leadsMembers, coFounders, legacyLeads, legacyMembers } from '../../data/leadsMembers';
import { managementMembers } from '../../data/managementMembers';
import { mechanicalMembers } from '../../data/mechanicalMembers';
import { electricalMembers } from '../../data/electricalMembers';
import { softwareMembers } from '../../data/softwareMembers';
import loadScrollTrigger from './loadScrollTrigger';

// Where CSS scroll-driven animations exist, GenesisLanding.css moves the track ("team-hscroll"
// keyframes on a view timeline): the compositor applies it in the same frame as the scroll, with
// no main-thread work per frame. GSAP drives the track only where they are unsupported.
// Keep this test identical to the @supports condition in the CSS.
const CSS_SCROLL_TIMELINE =
  typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('animation-timeline: view()');

export default function TeamSection() {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const [hoveredMember, setHoveredMember] = useState(null);

  // The CSS sizes the scroll distance (and the track's travel) from the slide count.
  useLayoutEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (section && track) section.style.setProperty('--team-slides', String(track.children.length));
  }, []);

  // GSAP Pinned Horizontal Scroll (tablet/desktop, motion allowed). On phones the slides are
  // taller than the viewport, so pinning them clipped most of the roster; there, and for
  // visitors who asked for reduced motion, the CSS stacks the slides vertically instead.
  // gsap.matchMedia reverts and re-applies automatically when either condition changes.
  // The track follows the scroll position 1:1 (scrub: true): a catch-up delay made the
  // slides trail the page.
  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track || CSS_SCROLL_TIMELINE) return undefined;

    let cancelled = false;
    let mm = null;
    loadScrollTrigger().then(({ gsap }) => {
      if (cancelled) return;
      mm = gsap.matchMedia();
      mm.add('(min-width: 769px) and (prefers-reduced-motion: no-preference)', () => {
        const getScrollAmount = () => -(track.scrollWidth - window.innerWidth);

        gsap.to(track, {
          x: getScrollAmount,
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: () => `+=${track.scrollWidth - window.innerWidth}`,
            scrub: true,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });
      });
    }).catch((error) => {
      // The first slide stays visible; the rest of the roster is on the department pages.
      console.warn('[TeamSection] horizontal scroll unavailable:', error);
    });

    return () => {
      cancelled = true;
      if (mm) mm.revert();
    };
  }, []);

  // Run the decorative hint animation only while the section is on screen; an endless CSS
  // animation otherwise keeps the browser rendering a frame every vsync for the whole visit.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver !== 'function') return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      section.classList.toggle('is-onscreen', entry.isIntersecting);
    });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  // Filter department leads
  const executiveRoles = ['Captain', 'Vice Captain', 'Head of Operations', 'Internal Strategy Lead'];
  const executiveLeads = leadsMembers
    .filter((m) => executiveRoles.includes(m.role))
    .sort((a, b) => executiveRoles.indexOf(a.role) - executiveRoles.indexOf(b.role));
  const mechLeads = leadsMembers.filter((m) => m.role === 'Mechanical and Design Lead');
  const elecLeads = leadsMembers.filter((m) => m.role === 'Electrical and Control Systems Lead');
  const softLeads = leadsMembers.filter((m) => m.role === 'Software and AI Lead');

  // Group legacy members by department for the Hall of Legacy roster
  const legacyDepartments = [...new Set(legacyMembers.map((m) => m.department))];

  return (
    <div id="team-section" className="team-hscroll-wrapper" ref={sectionRef}>
      <div className="team-hscroll-stage">

        {/* ── Horizontal Track (7 Slides × 100vw) ── */}
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

              {/* Right Column: Framed Full-Team Photo */}
              <div className="overview-media-pane">
                <div className="media-photo-frame">
                  <img
                    src="/team-genesis-all-55-members.webp"
                    srcSet="/team-genesis-all-55-members-t.webp 640w, /team-genesis-all-55-members.webp 800w"
                    sizes="(max-width: 1024px) 100vw, 560px"
                    alt="The full Team Genesis roster at VIT Chennai"
                    className="media-photo-img media-photo-img--team"
                    width="800"
                    height="600"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="media-photo-overlay" />
                  <div className="media-photo-caption font-mono">
                    <span>TEAM GENESIS · FULL ROSTER · VIT CHENNAI</span>
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
                    Leadership in Genesis is about harmony rather than hierarchy: bridging disciplines, eliminating bottlenecks, and maintaining velocity.
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
                    {lead.link && (
                      <a
                        className="tile-link font-mono"
                        href={lead.link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {lead.link.replace(/^https?:\/\//, '')} ↗
                      </a>
                    )}
                  </div>
                ))}
              </div>

              <div className="leadership-footer">
                <div className="cofounders-block">
                  <div className="sidebar-section-title font-mono">CO-FOUNDERS · EST. 2024</div>
                  <div className="cofounders-grid">
                    {coFounders.map((founder) => (
                      <div key={founder.id} className="lead-tile lead-tile--compact">
                        <div className="tile-top">
                          <span className="tile-role font-mono">{founder.role}</span>
                          <span className="tile-badge font-mono">CO-FOUNDER</span>
                        </div>
                        <h4 className="tile-name font-cabinet">{founder.name}</h4>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="management-block">
                  <div className="sidebar-section-title font-mono">MANAGEMENT [{managementMembers.length}]</div>
                  <div className="roster-chips-grid">
                    {managementMembers.map((member) => (
                      <div key={member.id} className="engineer-chip">
                        <span className="chip-avatar font-mono">{member.name.charAt(0)}</span>
                        <span className="chip-name font-satoshi">{member.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
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
                    The kinetic heartbeat, powering every joint with custom GaN field-oriented motor drivers, 48V isolated power buses, and sub-millisecond CAN-FD.
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
                    The neural cognition core: deterministic sub-millisecond balance loops, sim-to-real reinforcement learning policies, and spatial 360° LiDAR perception.
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

          {/* ══════════════════════════════════════════════════════════
             SLIDE 5: 05 // HALL OF LEGACY · GENERATION 01
             ══════════════════════════════════════════════════════════ */}
          <div className="team-hslide team-hslide--legacy">
            <div className="hslide-inner">

              <div className="slide-header-bar">
                <div className="header-meta">
                  <span className="slide-tag font-mono">05 // LEGACY ROSTER · GENERATION 01</span>
                  <h3 className="slide-heading font-cabinet">Hall of Legacy</h3>
                  <p className="slide-lead-copy font-satoshi">
                    The leads who built the first Genesis. Every joint we machine, every board we spin, and every line we ship today runs on groundwork they laid.
                  </p>
                </div>
                <div className="header-badge-group font-mono">
                  <div className="hbadge"><span>GENERATION:</span> 01</div>
                  <div className="hbadge"><span>STATUS:</span> HONOURED</div>
                </div>
              </div>

              <div className="legacy-cards-grid">
                {legacyLeads.map((lead) => (
                  <div key={lead.id} className="lead-tile lead-tile--legacy">
                    <div className="tile-top">
                      <span className="tile-role font-mono">Former {lead.role}</span>
                      <span className="tile-badge font-mono">GEN 01</span>
                    </div>
                    <h4 className="tile-name font-cabinet">{lead.name}</h4>
                    {lead.quote && lead.quote.trim() && (
                      <p className="tile-quote font-satoshi">"{lead.quote.trim()}"</p>
                    )}
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════
             SLIDE 6: 06 // HALL OF LEGACY · MEMBERS
             ══════════════════════════════════════════════════════════ */}
          <div className="team-hslide team-hslide--legacy-members">
            <div className="hslide-inner">

              <div className="slide-header-bar">
                <div className="header-meta">
                  <span className="slide-tag font-mono">06 // LEGACY ROSTER · GENERATION 01 MEMBERS</span>
                  <h3 className="slide-heading font-cabinet">The Engineers Who Came Before</h3>
                  <p className="slide-lead-copy font-satoshi">
                    Builders, solderers, and coders who poured their hours into the first platforms. Their names stay on the machine.
                  </p>
                </div>
                <div className="header-badge-group font-mono">
                  <div className="hbadge"><span>ALUMNI:</span> {legacyMembers.length}</div>
                  <div className="hbadge"><span>STATUS:</span> HONOURED</div>
                </div>
              </div>

              <div className="legacy-members-groups">
                {legacyDepartments.map((dept) => (
                  <div key={dept} className="legacy-dept-group">
                    <div className="sidebar-section-title font-mono">
                      {dept} [{legacyMembers.filter((m) => m.department === dept).length}]
                    </div>
                    <div className="roster-chips-grid">
                      {legacyMembers.filter((m) => m.department === dept).map((member) => (
                        <div
                          key={member.id}
                          className="engineer-chip engineer-chip--legacy"
                          onMouseEnter={() => setHoveredMember(member)}
                          onMouseLeave={() => setHoveredMember(null)}
                        >
                          <span className="chip-avatar font-mono">{member.name.charAt(0)}</span>
                          <span className="chip-name font-satoshi">{member.name}</span>
                        </div>
                      ))}
                    </div>
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
                    HOVER OVER A NAME TO READ THEIR MOTTO
                  </span>
                )}
              </div>

            </div>
          </div>

        </div>{/* end team-hscroll-track */}
      </div>
    </div>
  );
}
