import React from 'react';
import './Leads.css';
import leadsBg from '../assets/images/leads-bg.png';
import leadsBgAvif from '../assets/images/leads-bg.avif';
import leadsBgWebp from '../assets/images/leads-bg.webp';
import { TeamBackdrop, BackToTeamLink } from './TeamPageChrome';
import DepartmentPathway from '../components/DepartmentPathway';
import { leadsMembers } from '../data/leadsMembers';

function Leads() {
  return (
    <div className="leads-page">
      <TeamBackdrop avif={leadsBgAvif} webp={leadsBgWebp} png={leadsBg} width={1440} height={1024} />

      <BackToTeamLink />

      {/* Main Content */}
      <main id="main-content" tabIndex={-1} className="department-layout">
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
      </main>
    </div>
  );
}

export default Leads;