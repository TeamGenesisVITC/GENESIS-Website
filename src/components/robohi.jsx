import React from 'react';
import { useNavigate } from 'react-router-dom';
import './robohi.css';

import mechanicalImg from '../assets/images/mechanical.png';
import electricalImg from '../assets/images/electrical.png';
import softwareImg from '../assets/images/software.png';
import leadsImg from '../assets/images/leads.png';

function Robohi() {
  const navigate = useNavigate();

  return (
    <div className="robo-hi">
      {/* Neon Grid */}
      <div className="neon-grid"></div>

      {/* Hero Section - Clean & Professional */}
      <section className="hero-intro">
        <div className="hero-content">
          <h1 className="hero-main-title">GENESIS</h1>
          <p className="hero-tagline">Where Innovation Meets Intelligence</p>
          <div className="scroll-indicator">
            <span>Explore Our Disciplines</span>
            <div className="scroll-arrow">↓</div>
          </div>
        </div>
      </section>

      {/* Departments Section - Vertical Neural Flow */}
      <div className="departments-section">
        <h2 className="departments-title glowy-title">Engineering the Intelligence</h2>
        
        <div className="neural-spine">
          {/* Leads Node */}
          <div className="neural-node" onClick={() => navigate('/team/leads')}>
            <div className="node-connector top"></div>
            <div className="node-glow">
              <div className="node-ring ring-1"></div>
              <div className="node-ring ring-2"></div>
              <div className="node-ring ring-3"></div>
              <div className="node-core">
                <img src={leadsImg} alt="Leads" className="node-icon" />
              </div>
            </div>
            <div className="node-content">
              <h3 className="node-title">Leads</h3>
              <p className="node-description">Guiding the vision forward</p>
            </div>
            <div className="node-connector bottom"></div>
          </div>

          {/* Mechanical & Design Node */}
          <div className="neural-node" onClick={() => navigate('/team/mechanical')}>
            <div className="node-connector top"></div>
            <div className="node-glow">
              <div className="node-ring ring-1"></div>
              <div className="node-ring ring-2"></div>
              <div className="node-ring ring-3"></div>
              <div className="node-core">
                <img src={mechanicalImg} alt="Mechanical" className="node-icon" />
              </div>
            </div>
            <div className="node-content">
              <h3 className="node-title">Mechanical & Design</h3>
              <p className="node-description">Building the physical foundation</p>
            </div>
            <div className="node-connector bottom"></div>
          </div>

          {/* Electrical & Controls Node */}
          <div className="neural-node" onClick={() => navigate('/team/electrical')}>
            <div className="node-connector top"></div>
            <div className="node-glow">
              <div className="node-ring ring-1"></div>
              <div className="node-ring ring-2"></div>
              <div className="node-ring ring-3"></div>
              <div className="node-core">
                <img src={electricalImg} alt="Electrical" className="node-icon" />
              </div>
            </div>
            <div className="node-content">
              <h3 className="node-title">Electrical & Controls</h3>
              <p className="node-description">Powering innovation with precision</p>
            </div>
            <div className="node-connector bottom"></div>
          </div>

          {/* Software & AI Node */}
          <div className="neural-node last-node" onClick={() => navigate('/team/software')}>
            <div className="node-connector top"></div>
            <div className="node-glow">
              <div className="node-ring ring-1"></div>
              <div className="node-ring ring-2"></div>
              <div className="node-ring ring-3"></div>
              <div className="node-core">
                <img src={softwareImg} alt="Software" className="node-icon" />
              </div>
            </div>
            <div className="node-content">
              <h3 className="node-title">Software & A.I.</h3>
              <p className="node-description">Intelligence meets automation</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="contact-section">
        <div className="contact-container">
          <h2 className="contact-title">Connect With Us</h2>
          <p className="contact-subtitle">Join the Innovation Journey</p>

          <div className="contact-grid">
            {/* Email Card - Primary */}
            <a href="mailto:genesisatvitc@gmail.com" className="contact-card email-card">
              <div className="icon-wrapper">
                <svg className="contact-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 6L12 13L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>Email</h3>
              <p>genesisatvitc@gmail.com</p>
              <div className="hover-text">Drop us a message</div>
            </a>

            {/* LinkedIn Card - Secondary */}
            <a href="https://linkedin.com/company/genesisvitc" target="_blank" rel="noopener noreferrer" className="contact-card linkedin-card">
              <div className="icon-wrapper">
                <svg className="contact-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 8C17.5913 8 19.1174 8.63214 20.2426 9.75736C21.3679 10.8826 22 12.4087 22 14V21H18V14C18 13.4696 17.7893 12.9609 17.4142 12.5858C17.0391 12.2107 16.5304 12 16 12C15.4696 12 14.9609 12.2107 14.5858 12.5858C14.2107 12.9609 14 13.4696 14 14V21H10V14C10 12.4087 10.6321 10.8826 11.7574 9.75736C12.8826 8.63214 14.4087 8 16 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 9H2V21H6V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4 6C5.10457 6 6 5.10457 6 4C6 2.89543 5.10457 2 4 2C2.89543 2 2 2.89543 2 4C2 5.10457 2.89543 6 4 6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>LinkedIn</h3>
              <p>@genesisvitc</p>
              <div className="hover-text">Connect professionally</div>
            </a>

            {/* Instagram Card - Tertiary */}
            <a href="https://www.instagram.com/genesis.vitc" target="_blank" rel="noopener noreferrer" className="contact-card instagram-card">
              <div className="icon-wrapper">
                <svg className="contact-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 11.37C16.1234 12.2022 15.9813 13.0522 15.5938 13.799C15.2063 14.5458 14.5931 15.1514 13.8416 15.5297C13.0901 15.9079 12.2384 16.0396 11.4078 15.9059C10.5771 15.7723 9.80976 15.3801 9.21484 14.7852C8.61992 14.1902 8.22773 13.4229 8.09407 12.5922C7.9604 11.7615 8.09207 10.9099 8.47033 10.1584C8.84859 9.40685 9.45419 8.79374 10.201 8.40624C10.9478 8.01874 11.7978 7.87658 12.63 8C13.4789 8.12588 14.2649 8.52146 14.8717 9.1283C15.4785 9.73515 15.8741 10.5211 16 11.37Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M17.5 6.5H17.51" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>Instagram</h3>
              <p>@genesis.vitc</p>
              <div className="hover-text">Keep up with us</div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Robohi;
