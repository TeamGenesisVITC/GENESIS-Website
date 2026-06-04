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

      {/* Projects Section */}
      <section id="projects" className="section projects-section">
        <div className="section-container">
          <h2 className="section-title">Our Projects</h2>
          <p className="projects-placeholder">
            Projects currently under development
          </p>
        </div>
      </section>
    </div>
  );
}

export default LandingHero;