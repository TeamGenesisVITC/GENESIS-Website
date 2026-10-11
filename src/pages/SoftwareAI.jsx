import React from 'react';
import './SoftwareAI.css';
import aiBg from '../assets/images/ai-bg.png';
import aiBgAvif from '../assets/images/ai-bg.avif';
import aiBgWebp from '../assets/images/ai-bg.webp';
import { TeamBackdrop, BackToTeamLink } from './TeamPageChrome';
import DepartmentPathway from '../components/DepartmentPathway';
import { softwareMembers } from '../data/softwareMembers';

function SoftwareAI() {
  return (
    <div className="software-ai-page">
      <TeamBackdrop avif={aiBgAvif} webp={aiBgWebp} png={aiBg} width={1426} height={1024} />

      <BackToTeamLink />

      {/* Main Content */}
      <main id="main-content" tabIndex={-1} className="department-layout">
        {/* Header Section - Full Width */}
        <div className="header-section">
          <div className="title-badge">
            <h1 className="software-ai-title">SOFTWARE AND AI</h1>
          </div>
          <p className="software-ai-subtitle">
            Every robot we create is programmed with accuracy, perception, and purpose by the Software & AI division, which functions as Genesis' brain.
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
                <p>We are problem solvers, coders, and thinkers who transform circuits and metal into living systems.</p>
                
                <p>Our task involves creating machine learning models and control algorithms to help Genesis robots comprehend, respond, and change.</p>
                
                <p>We write motion, behavior, and occasionally even personality in addition to code.</p>
                
                <p>Every department benefits from our work, which translates electronics and mechanics into seamless, intelligent performance.</p>
                
                <p>We think that code is narrative for machines, not just syntax.</p>
              </div>
            </div>
          </div>

          {/* Right Side - Pathway Component */}
          <div className="department-pathway-container">
            <DepartmentPathway members={softwareMembers} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default SoftwareAI;