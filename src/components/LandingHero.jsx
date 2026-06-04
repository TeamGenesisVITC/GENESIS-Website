import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingHero.css';
import robotImage from '../assets/images/robot.png';

function LandingHero() {
  const navigate = useNavigate();

  const handleRobotClick = () => {
    navigate('/robo-hi');
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <div className="landing-hero">
        <div className="hero-content">
          <div className="text-section">
            <h1 className="main-title">
              <span className="welcome-text">WELCOME TO</span>
              <span className="team-name">GENESIS</span>
            </h1>
            <p className="tagline">
              <span className="breathing-text">breathing life into</span>
              <span className="humanoids-text">Humanoids</span>
            </p>
            
            {/* CTA Buttons */}
            <div className="cta-container">
              {/* Primary CTA */}
              <a
                href="/robo-hi"
                className="cta-primary"
                onClick={(e) => { e.preventDefault(); handleRobotClick(); }}
              >
                Explore Genesis
                <span className="cta-arrow">→</span>
              </a>

              {/* Secondary CTAs */}
              <div className="cta-secondary-group">
                <a
                  href="#sponsors"
                  className="cta-secondary"
                  onClick={(e) => { e.preventDefault(); scrollToSection('sponsors'); }}
                >
                  Our Sponsors
                </a>
                <span className="cta-divider">|</span>
                <a
                  href="#projects"
                  className="cta-secondary"
                  onClick={(e) => { e.preventDefault(); scrollToSection('projects'); }}
                >
                  Projects
                </a>
              </div>
            </div>
          </div>
          
          <div className="robot-section" onClick={handleRobotClick}>
            <img src={robotImage} alt="Genesis Robot" className="robot-image" />
            <div className="click-hint">Click to explore →</div>
          </div>
        </div>
      </div>

      {/* Marquee Strip */}
      <div className="marquee-strip">
        <div className="marquee-track">
          {[0, 1].map((_, copy) => (
            <div key={copy} className="marquee-content" aria-hidden={copy === 1}>
              {[
                'Humanoids',
                'Artificial Intelligence',
                'Robotics',
                'Innovation',
                'VIT Chennai',
                'Mechanical Engineering',
                'Computer Vision',
                'Human-Robot Interaction',
                'Embedded Systems',
                'Deep Learning',
              ].map((item, i) => (
                <span key={i} className="marquee-item">
                  {item}
                  <span className="marquee-dot">◆</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Sponsors Section */}
      <section id="sponsors" className="section sponsors-section">
        <div className="section-container">
          <h2 className="section-title">Our Sponsors</h2>
          <p className="section-description">
            Team Genesis thrives with the support of our incredible sponsors. 
            Together, we're shaping the future of humanoid robotics.
          </p>
          
          <div className="sponsor-split">
            {/* Left: Principles */}
            <div className="sponsor-principles">
              <p className="sponsor-eyebrow">WHY PARTNER WITH US</p>
              <div className="sponsor-rule" aria-hidden="true" />
              <div className="principle-list">
                <div className="principle-item">
                  <span className="principle-number">01</span>
                  <div className="principle-content">
                    <h4 className="principle-title">Real Research Impact</h4>
                    <p className="principle-desc">Your support directly funds hardware, components, and competitions — not overhead.</p>
                  </div>
                </div>
                <div className="principle-item">
                  <span className="principle-number">02</span>
                  <div className="principle-content">
                    <h4 className="principle-title">Brand Visibility</h4>
                    <p className="principle-desc">Logo placement on our robot, website, competition jerseys, and social media presence.</p>
                  </div>
                </div>
                <div className="principle-item">
                  <span className="principle-number">03</span>
                  <div className="principle-content">
                    <h4 className="principle-title">Talent Pipeline</h4>
                    <p className="principle-desc">Direct access to VIT Chennai's brightest engineering minds working in AI and robotics.</p>
                  </div>
                </div>
                <div className="principle-item">
                  <span className="principle-number">04</span>
                  <div className="principle-content">
                    <h4 className="principle-title">Innovation Partnership</h4>
                    <p className="principle-desc">Collaborate on projects, test use cases, and co-develop solutions in humanoid robotics.</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Right: Logo wall */}
            <div className="sponsor-logo-right">
              <p className="sponsor-eyebrow">CURRENT SPONSORS</p>
              <div className="sponsor-logo-wall">
                <div className="sponsor-logo-slot">
                  <span className="sponsor-logo-placeholder">Your Logo</span>
                </div>
                <div className="sponsor-logo-slot">
                  <span className="sponsor-logo-placeholder">Your Logo</span>
                </div>
                <div className="sponsor-logo-slot">
                  <span className="sponsor-logo-placeholder">Your Logo</span>
                </div>
                <div className="sponsor-logo-slot">
                  <span className="sponsor-logo-placeholder">Your Logo</span>
                </div>
              </div>
              <p className="sponsor-logo-sublabel">Be the first to partner with Genesis</p>
            </div>
          </div>

          <div className="sponsor-cta-redesign">
            <div className="sponsor-cta-inner">
              <span className="cta-bracket-tr" aria-hidden="true" />
              <div className="sponsor-cta-left">
                <p className="sponsor-cta-eyebrow">GET IN TOUCH</p>
                <h3 className="sponsor-cta-heading">Interested in<br/><span className="sponsor-cta-highlight">Sponsoring?</span></h3>
                <p className="sponsor-cta-sub">We'd love to discuss partnership opportunities tailored to your goals.</p>
              </div>
              <div className="sponsor-cta-right">
                <a href="mailto:genesisatvitc@gmail.com" className="sponsor-cta-button">
                  <span>Write to Us</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </a>
                <p className="sponsor-cta-email">genesisatvitc@gmail.com</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="diagonal-divider" aria-hidden="true">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" className="diagonal-divider-svg">
          {/* Background fill — matches page bg */}
          <polygon points="0,0 1440,0 1440,20 0,80" fill="rgba(10, 6, 18, 0)"/>
          {/* Main slash line */}
          <line x1="0" y1="80" x2="1440" y2="20" stroke="rgba(147, 51, 234, 0.4)" strokeWidth="1"/>
          {/* Parallel ghost line above */}
          <line x1="0" y1="72" x2="1440" y2="12" stroke="rgba(147, 51, 234, 0.12)" strokeWidth="1"/>
          {/* Center diamond marker */}
          <polygon points="720,38 726,44 720,50 714,44" fill="#9333ea" opacity="0.8"/>
          {/* Small tick marks along the slash */}
          <line x1="240" y1="65" x2="240" y2="58" stroke="rgba(147, 51, 234, 0.3)" strokeWidth="1"/>
          <line x1="480" y1="57" x2="480" y2="50" stroke="rgba(147, 51, 234, 0.3)" strokeWidth="1"/>
          <line x1="960" y1="41" x2="960" y2="34" stroke="rgba(147, 51, 234, 0.3)" strokeWidth="1"/>
          <line x1="1200" y1="33" x2="1200" y2="26" stroke="rgba(147, 51, 234, 0.3)" strokeWidth="1"/>
        </svg>
      </div>

      {/* Projects Section */}
      <section id="projects" className="projects-section">
        <p className="projects-eyebrow">WHAT WE'RE BUILDING</p>
        <h2 className="projects-heading">In Development</h2>
        <div className="projects-status-bar">
          <div className="projects-bar-track">
            <div className="projects-bar-fill" />
          </div>
          <span className="projects-bar-label">ACTIVE BUILD CYCLE</span>
        </div>
        <div className="projects-grid">
          <div className="project-card">
            <div className="project-card-top">
              <span className="project-dept">Mechanical</span>
              <span className="project-status">● ACTIVE</span>
            </div>
            <h3 className="project-name">PROJECT ████</h3>
            <p className="project-desc">Structural systems and joint kinematics for bipedal locomotion.</p>
            <div className="project-footer">
              <span className="project-clearance">CLEARANCE REQUIRED</span>
            </div>
          </div>
          <div className="project-card project-card--center">
            <div className="project-card-top">
              <span className="project-dept">AI / Software</span>
              <span className="project-status">● ACTIVE</span>
            </div>
            <h3 className="project-name">PROJECT ████</h3>
            <p className="project-desc">Neural inference pipeline for real-time environment perception and decision making.</p>
            <div className="project-footer">
              <span className="project-clearance">CLEARANCE REQUIRED</span>
            </div>
          </div>
          <div className="project-card">
            <div className="project-card-top">
              <span className="project-dept">Electrical</span>
              <span className="project-status project-status--soon">○ SOON</span>
            </div>
            <h3 className="project-name">PROJECT ████</h3>
            <p className="project-desc">Power distribution and embedded control systems for autonomous operation.</p>
            <div className="project-footer">
              <span className="project-clearance">CLASSIFIED</span>
            </div>
          </div>
        </div>
        <p className="projects-footnote">Full reveal scheduled for next competition cycle</p>
      </section>
    </div>
  );
}

export default LandingHero;