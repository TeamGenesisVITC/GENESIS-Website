import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PROJECTS = [
  {
    id: 'rkp',
    num: '01',
    category: 'HUMANOID ROBOTICS',
    badge: 'ROBOCUP@HOME 2027',
    name: 'Project RKP',
    subtitle: 'Low-Cost Competition Humanoid Platform',
    desc: 'Engineering an accessible, competition-grade service humanoid designed for dynamic manipulation, spatial navigation, and household task autonomy in RoboCup@Home 2027.',
    milestone: 'Target: Complete major technical hurdles & full mechanical assembly before December 31st.',
    status: 'R&D & Kinematics Stage',
    statusType: 'rnd',
    lineage: ['Berkeley Humanoid Lite', 'HECTOR', 'M-HUBO'],
    specs: [
      { label: 'Target Event', val: 'RoboCup@Home 2027' },
      { label: 'Architecture', val: 'Compliant Service Biped' },
      { label: 'Actuation', val: 'Harmonic & Planetary Hybrid' },
      { label: 'Key Focus', val: 'Vision-Language-Action (VLA)' },
    ],
    highlights: [
      'Cost-optimized bipedal design inspired by leading open-source humanoid architectures',
      'Integrated dual-arm spatial manipulation for precision object pick-and-place',
      'Edge compute pipeline executing real-time spatial SLAM and semantic grounding',
    ],
  },
  {
    id: 'lfr',
    num: '02',
    category: 'HIGH-FREQUENCY CONTROL',
    badge: 'NATIONAL COMPETITIONS',
    name: 'Competitive LFR',
    subtitle: 'Ultra-High-Speed Line Follower',
    desc: 'A competition-grade autonomous line following robot engineered for extreme trajectory tracking, cornering acceleration, and sub-millisecond PID response.',
    milestone: 'Active deployments at IIT Bombay Meshmerize (Dec) & IIT Madras Shaastra (Jan).',
    status: 'Active Prototyping & Tuning',
    statusType: 'deploying',
    deployments: [
      { event: 'IIT Bombay Techfest (Meshmerize)', date: 'December 2024' },
      { event: 'IIT Madras Shaastra (LFR Event)', date: 'January 2025' },
    ],
    specs: [
      { label: 'Sensor Array', val: 'High-Density IR / Photodiode' },
      { label: 'Control Loop', val: 'High-Frequency State-Space PID' },
      { label: 'Drivetrain', val: 'Coreless High-RPM DC Motors' },
      { label: 'Structure', val: 'CNC Carbon Fiber Chassis' },
    ],
    highlights: [
      'Custom tuned closed-loop trajectory predictive algorithms for sharp switchbacks',
      'Ultra-low center of mass chassis designed for maximum tire adhesion during apex turns',
      'High-throughput optical reflectance matrix sampling at kilohertz frequencies',
    ],
  },
  {
    id: 'sandbox',
    num: '03',
    category: 'RAPID EXPERIMENTATION',
    badge: 'MEMBER-DRIVEN SANDBOX',
    name: 'Scalable Robotics Testbed',
    subtitle: 'Fast-Learning & Sensor R&D Platform',
    desc: 'A modular, high-turnaround test bench for the team to rapidly experiment with, benchmark, and deploy bleeding-edge robotics hardware before integration onto full-scale humanoids.',
    milestone: 'Continuous multi-sensor exploration sprints driven by member research interest.',
    status: 'Open Lab Testbed',
    statusType: 'sandbox',
    technologies: [
      { name: '3D Spatial LiDAR', desc: 'Point-cloud mapping & spatial SLAM algorithms' },
      { name: 'Digital Smart Servos', desc: 'Multi-turn CAN/RS485 closed-loop diagnostics' },
      { name: 'Stereo Depth Cameras', desc: 'Spatial depth perception & real-time visual odometry' },
      { name: 'Sim-to-Real RL', desc: 'Rapid physical deployment of learned locomotion policies' },
    ],
    specs: [
      { label: 'Platform Type', val: 'Modular Multi-Sensor Rig' },
      { label: 'Bus Standard', val: 'CAN-FD / High-Speed UART' },
      { label: 'Compute Unit', val: 'Edge NPU + Real-Time MCU' },
      { label: 'Driver Basis', val: 'Member Interest & Open R&D' },
    ],
    highlights: [
      'Fast onboarding pipeline giving new members immediate hands-on hardware exposure',
      'Zero-risk validation sandbox for unproven algorithms and high-voltage actuators',
      'Cross-disciplinary testing playground spanning mechanical, electrical, and AI sprints',
    ],
  },
];

export default function ProjectsSection() {
  const [activeProject, setActiveProject] = useState(PROJECTS[0].id);

  const selectedProj = PROJECTS.find((p) => p.id === activeProject) || PROJECTS[0];

  return (
    <section id="projects-pipeline" className="projects-light-section">
      <div className="projects-light-container">
        
        {/* ── Section Eyebrow & Headline ── */}
        <div className="projects-light-header">
          <div className="projects-eyebrow-row font-mono">
            <span className="proj-badge">04 // ACTIVE R&amp;D PIPELINES</span>
            <span className="proj-divider">·</span>
            <span className="proj-subtag">BEYOND KP-17 FLAGSHIP</span>
          </div>

          <div className="projects-title-grid">
            <div>
              <h2 className="projects-main-heading font-cabinet">
                Next-Gen Platforms &amp;<br />
                <span className="proj-gradient-accent">Competition Pipelines.</span>
              </h2>
            </div>
            <div>
              <p className="projects-lead-text font-satoshi">
                While <strong>KP-17</strong> serves as our core flagship humanoid undergoing active self-balancing control and sensor feedback integration, Team Genesis operates parallel engineering pipelines spanning international competition entries, high-speed autonomous racers, and modular sensor testbeds.
              </p>
              
              {/* Flagship KP-17 Callout Card */}
              <div className="flagship-callout-pill font-mono">
                <span className="flagship-tag">FLAGSHIP · KP-17</span>
                <span className="flagship-status">Active Sensor Feedback Architecture &amp; Autonomous Bipedal Balancing Sprint</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Project Cards Grid ── */}
        <div className="projects-cards-grid">
          {PROJECTS.map((proj) => {
            const isSelected = activeProject === proj.id;
            return (
              <div
                key={proj.id}
                className={`project-card ${isSelected ? 'project-card--active' : ''}`}
                onClick={() => setActiveProject(proj.id)}
              >
                <div className="pcard-top">
                  <div className="pcard-badge-row font-mono">
                    <span className="pcard-num">{proj.num}</span>
                    <span className="pcard-category">{proj.category}</span>
                  </div>
                  <span className="pcard-event-badge font-mono">{proj.badge}</span>
                </div>

                <div className="pcard-body">
                  <h3 className="pcard-title font-cabinet">{proj.name}</h3>
                  <div className="pcard-subtitle font-satoshi">{proj.subtitle}</div>
                  <p className="pcard-desc font-satoshi">{proj.desc}</p>
                </div>

                <div className="pcard-meta-box font-mono">
                  <div className="meta-label">KEY MILESTONE:</div>
                  <div className="meta-val font-satoshi">{proj.milestone}</div>
                </div>

                <div className="pcard-specs-row font-mono">
                  {proj.specs.slice(0, 2).map((s, idx) => (
                    <div key={idx} className="pspec-chip">
                      <span className="pspec-lbl">{s.label}:</span>
                      <span className="pspec-val">{s.val}</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className={`pcard-action-btn font-mono ${isSelected ? 'pcard-action-btn--selected' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveProject(proj.id);
                  }}
                >
                  {isSelected ? 'INSPECTING DETAILS ▾' : 'EXPLORE ARCHITECTURE →'}
                </button>
              </div>
            );
          })}
        </div>

        {/* ── Deep-Dive Interactive Specification Panel ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedProj.id}
            className="project-deep-panel"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
          >
            <div className="deep-panel-header">
              <div>
                <span className="deep-panel-tag font-mono">SYSTEM DOSSIER · {selectedProj.num}</span>
                <h4 className="deep-panel-title font-cabinet">{selectedProj.name} — Technical Architecture</h4>
              </div>
              <div className="deep-panel-status-pill font-mono">
                <span className="status-indicator-dot" />
                <span>{selectedProj.status}</span>
              </div>
            </div>

            <div className="deep-panel-content-grid">
              
              {/* Left Column: Full Specifications Matrix */}
              <div className="deep-col-specs">
                <div className="deep-block-heading font-mono">CORE SPECIFICATION MATRIX</div>
                <div className="deep-specs-table font-mono">
                  {selectedProj.specs.map((s, idx) => (
                    <div key={idx} className="spec-row">
                      <span className="spec-key">{s.label}</span>
                      <span className="spec-value font-satoshi">{s.val}</span>
                    </div>
                  ))}
                </div>

                {/* Architecture Lineage if RKP */}
                {selectedProj.lineage && (
                  <div className="deep-lineage-box font-mono">
                    <span className="lineage-label">RESEARCH LINEAGE &amp; REFERENCES:</span>
                    <div className="lineage-tags">
                      {selectedProj.lineage.map((item, idx) => (
                        <span key={idx} className="lineage-pill">{item}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Deployments if LFR */}
                {selectedProj.deployments && (
                  <div className="deep-deployments-box font-mono">
                    <span className="lineage-label">CONFIRMED DEPLOYMENT SCHEDULE:</span>
                    <div className="deployments-list">
                      {selectedProj.deployments.map((d, idx) => (
                        <div key={idx} className="deploy-item">
                          <span className="deploy-dot">▪</span>
                          <span className="deploy-name font-satoshi">{d.event}</span>
                          <span className="deploy-date">({d.date})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tech Sandbox items if Sandbox */}
                {selectedProj.technologies && (
                  <div className="deep-tech-box font-mono">
                    <span className="lineage-label">ACTIVE SENSOR &amp; ALGORITHM MODULES:</span>
                    <div className="sandbox-tech-grid font-satoshi">
                      {selectedProj.technologies.map((t, idx) => (
                        <div key={idx} className="sandbox-tech-item">
                          <strong>{t.name}:</strong> <span>{t.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Architectural Highlights */}
              <div className="deep-col-highlights">
                <div className="deep-block-heading font-mono">ENGINEERING OBJECTIVES &amp; DELIVERABLES</div>
                <ul className="deep-highlights-list font-satoshi">
                  {selectedProj.highlights.map((h, idx) => (
                    <li key={idx} className="highlight-item">
                      <span className="highlight-bullet font-mono">0{idx + 1}</span>
                      <p>{h}</p>
                    </li>
                  ))}
                </ul>

                <div className="deep-footer-notice font-mono">
                  <span>PROJECT REPO &amp; LAB BENCH: ACTIVE IN GENESIS LAB (VIT CHENNAI)</span>
                </div>
              </div>

            </div>
          </motion.div>
        </AnimatePresence>

      </div>
    </section>
  );
}
