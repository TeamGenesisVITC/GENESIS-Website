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
          
          <div className="sponsors-grid">
            <div className="sponsor-card">
              <div className="sponsor-icon">🤝</div>
              <h3>Partner With Us</h3>
              <p>Help us push the boundaries of robotics and AI innovation</p>
            </div>
            <div className="sponsor-card">
              <div className="sponsor-icon">💡</div>
              <h3>Support Innovation</h3>
              <p>Enable cutting-edge research and development in humanoid technology</p>
            </div>
            <div className="sponsor-card">
              <div className="sponsor-icon">🌟</div>
              <h3>Join Our Journey</h3>
              <p>Be part of breakthrough achievements in robotics</p>
            </div>
          </div>

          <div className="contact-info">
            <h3>Interested in Sponsoring?</h3>
            <p className="contact-text">
              We'd love to discuss partnership opportunities with you.
            </p>
            <a href="mailto:genesisatvitc@gmail.com" className="contact-link">
              genesisatvitc@gmail.com
            </a>
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