import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Mechanical.css';
import mechanicalBg from '../assets/images/mechanical-and-design-bg.png';
import DepartmentPathway from '../components/DepartmentPathway';
import { mechanicalMembers } from '../data/mechanicalMembers';

function Mechanical() {
  const navigate = useNavigate();

  return (
    <div className="mechanical-page">
      {/* Neon Grid Background */}
      <div className="neon-grid"></div>

      {/* Background Image */}
      <div className="hero-background">
        <img src={mechanicalBg} alt="" />
      </div>

      {/* Back to original */}
      <button className="back-button" onClick={() => navigate('/robo-hi')}>
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back
      </button>

      {/* Main Content */}
      <div className="department-layout">
        {/* Header Section - Full Width */}
        <div className="header-section">
          <div className="title-badge">
            <h1 className="mechanical-title">MECHANICAL AND DESIGN</h1>
          </div>
          <p className="mechanical-subtitle">
            Concepts are turned into concrete reality by the Mechanical & Design division. Every Genesis bot is given its shape, soul, and strength by us, from structure to aesthetics.
          </p>
        </div>

        {/* Content Row - Info and Pathway Side by Side */}
        <div className="department-content-row">
          {/* Left Side - Department Info */}
          <div className="department-info">
            {/* Who Are We Card */}
            <div className="who-card">
              <h2 className="who-title">WHO ARE WE ?</h2>
              
              <div className="who-content">
                <p>We are the brains and hands that make the motion happen.</p>
                
                <p>In order to create frames, joints, and mechanisms that transform abstract concepts into robots that move, lift, and carry out specific tasks, the Mechanical & Design team combines engineering and creativity.</p>
                
                <p>Each nut, gear, and CAD model is a tiny fragment of a larger narrative that we create together.</p>
                
                <p>Our guiding principles are straightforward: Never sacrifice creativity, build with purpose, and design with empathy.</p>
              </div>
            </div>
          </div>

          {/* Right Side - Pathway Component */}
          <div className="department-pathway-container">
            <DepartmentPathway members={mechanicalMembers} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Mechanical;