import React from 'react';
import './Mechanical.css';
import mechanicalBg from '../assets/images/mechanical-and-design-bg.png';
import mechanicalBgAvif from '../assets/images/mechanical-and-design-bg.avif';
import mechanicalBgWebp from '../assets/images/mechanical-and-design-bg.webp';
import { TeamBackdrop, BackToTeamLink } from './TeamPageChrome';
import DepartmentPathway from '../components/DepartmentPathway';
import { mechanicalMembers } from '../data/mechanicalMembers';

function Mechanical() {
  return (
    <div className="mechanical-page">
      <TeamBackdrop avif={mechanicalBgAvif} webp={mechanicalBgWebp} png={mechanicalBg} width={1440} height={1024} />

      <BackToTeamLink />

      {/* Main Content */}
      <main id="main-content" tabIndex={-1} className="department-layout">
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
      </main>
    </div>
  );
}

export default Mechanical;