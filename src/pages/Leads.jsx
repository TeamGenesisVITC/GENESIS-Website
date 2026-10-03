import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Leads.css';
import leadsBg from '../assets/images/leads-bg.png';
import DepartmentPathway from '../components/DepartmentPathway';
import { leadsMembers } from '../data/leadsMembers';

function Leads() {
  const navigate = useNavigate();

  return (
    <div className="leads-page">
      {/* Neon Grid Background */}
      <div className="neon-grid"></div>

      {/* Background Image */}
      <div className="hero-background">
        <img src={leadsBg} alt="" />
      </div>

      {/* Back Button */}
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
            <h1 className="leads-title">LEADS</h1>
          </div>
          <p className="leads-subtitle">
            The Leads are the connectors of Genesis, bridging ideas, people, and departments with empathy and energy.
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
                <p>Leadership in Genesis is about harmony rather than hierarchy.</p>
                
                <p>We think that every member has a voice, that every success is shared, and that every idea counts.</p>
                
                <p>The Leads division merely maintains the rhythm by coordinating objectives, eliminating obstacles, and ensuring</p>
                
                <p>that innovation is allowed to freely circulate among all departments.</p>
                
                <p>Together, we grow, laugh, and learn, side by side.</p>
              </div>
            </div>
          </div>

          {/* Right Side - Pathway Component */}
          <div className="department-pathway-container">
            <DepartmentPathway members={leadsMembers} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Leads;