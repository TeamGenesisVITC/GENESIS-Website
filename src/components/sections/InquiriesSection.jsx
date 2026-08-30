import React, { useState } from 'react';
import { Send, Download, Terminal, Mail, MapPin, CheckCircle, ShieldAlert } from 'lucide-react';

export default function InquiriesSection() {
  const [formData, setFormData] = useState({
    name: '',
    org: '',
    email: '',
    useCase: 'industrial-automation',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      // simulated submission reset
    }, 4000);
  };

  return (
    <section id="inquiries" style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      padding: '60px 8vw 40px 8vw',
      position: 'relative',
      boxSizing: 'border-box',
    }}>
      <div style={{ width: '100%', maxWidth: '1100px', zIndex: 10 }}>
        {/* Section Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span className="telemetry-badge">
            <Terminal size={12} />
            SECTION 05 // DEPLOYMENT & INQUIRIES
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
          {/* Left Column: B2B Overview & Technical Datasheets */}
          <div>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 3.5vw, 3rem)',
              fontWeight: 800,
              textTransform: 'uppercase',
              marginBottom: '16px',
            }}>
              DEPLOY <br />
              <span style={{ color: 'var(--accent-cyan)' }}>GENESIS MK-1</span> <br />
              INTO PRODUCTION
            </h2>

            <p style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1rem',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              marginBottom: '28px',
            }}>
              Custom hardware configurations, ROS2 middleware integration, and fleet orchestration software tailored for manufacturing, aerospace, and logistics facilities.
            </p>

            {/* Technical Document Downloads */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              <div className="hud-panel" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700 }}>
                    GENESIS-MK1_SYSTEM_DATASHEET.PDF
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    REV 4.2 // 24 PAGES // 12.4 MB
                  </div>
                </div>
                <button className="tech-btn" style={{ padding: '6px 12px', fontSize: '0.72rem' }}>
                  <Download size={13} />
                  GET SPEC
                </button>
              </div>

              <div className="hud-panel" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700 }}>
                    ROS2_SDK_INTEGRATION_GUIDE.PDF
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    C++ & PYTHON API // 18 PAGES // 8.1 MB
                  </div>
                </div>
                <button className="tech-btn tech-btn-secondary" style={{ padding: '6px 12px', fontSize: '0.72rem' }}>
                  <Download size={13} />
                  GET SDK
                </button>
              </div>
            </div>

            {/* Location & Organization */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={14} color="var(--accent-cyan)" />
                <span>VIT Chennai, Tamil Nadu, India</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={14} color="var(--accent-cyan)" />
                <span>contact@genesisrobotics.tech // teamgenesisvitc@gmail.com</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive B2B Terminal / Contact Form */}
          <div className="hud-panel" style={{ padding: '28px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: '12px',
              marginBottom: '20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={16} color="var(--accent-cyan)" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700 }}>
                  SECURE INQUIRY TERMINAL
                </span>
              </div>
              <span className="telemetry-badge">ENCRYPTED</span>
            </div>

            {submitted ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                background: 'rgba(0,255,136,0.05)',
                border: '1px solid var(--accent-green)',
              }}>
                <CheckCircle size={36} color="var(--accent-green)" style={{ margin: '0 auto 16px auto' }} />
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginBottom: '8px', color: '#ffffff' }}>
                  TRANSMISSION RECEIVED
                </h3>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Our robotics systems team will initiate contact within 24 operational hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    AUTHORIZED CONTACT NAME
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Dr. Alex Vance"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-medium)',
                      color: '#ffffff',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      ORGANIZATION / COMPANY
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.org}
                      onChange={(e) => setFormData({ ...formData, org: e.target.value })}
                      placeholder="e.g. Apex Robotics Corp"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border-medium)',
                        color: '#ffffff',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.85rem',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      COMMUNICATION EMAIL
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="alex@apexrobotics.com"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border-medium)',
                        color: '#ffffff',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.85rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    DEPLOYMENT DOMAIN
                  </label>
                  <select
                    value={formData.useCase}
                    onChange={(e) => setFormData({ ...formData, useCase: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'rgba(12,14,20,0.95)',
                      border: '1px solid var(--border-medium)',
                      color: '#ffffff',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  >
                    <option value="industrial-automation">Industrial Assembly & Heavy Automation</option>
                    <option value="unstructured-logistics">Unstructured Warehouse Logistics</option>
                    <option value="research-reinforcement-learning">Academic / RL Research Platform</option>
                    <option value="hazardous-inspection">Hazardous Facility Inspection</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    TECHNICAL SCOPE / REQUIREMENTS
                  </label>
                  <textarea
                    rows={3}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Specify payload, operating cycle, or custom payload requirements..."
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-medium)',
                      color: '#ffffff',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.85rem',
                      outline: 'none',
                      resize: 'none',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  className="tech-btn"
                  style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                >
                  <Send size={15} />
                  TRANSMIT B2B DISPATCH
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer info bar */}
        <div style={{
          marginTop: '60px',
          paddingTop: '20px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.72rem',
          color: 'var(--text-dim)',
        }}>
          <div>
            © {new Date().getFullYear()} GENESIS ROBOTICS // TEAM GENESIS VIT CHENNAI. ALL RIGHTS RESERVED.
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span>AUTONOMOUS SYSTEMS DIVISION</span>
            <span>REV 2026.4</span>
          </div>
        </div>
      </div>
    </section>
  );
}
