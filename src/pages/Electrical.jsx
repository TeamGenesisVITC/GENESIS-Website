import React from 'react';
import './Electrical.css';
import electricalBg from '../assets/images/electrical-bg.png';
import electricalBgAvif from '../assets/images/electrical-bg.avif';
import electricalBgWebp from '../assets/images/electrical-bg.webp';
import { TeamBackdrop, BackToTeamLink } from './TeamPageChrome';
import DepartmentPathway from '../components/DepartmentPathway';
import { electricalMembers } from '../data/electricalMembers';

function Electrical() {
  return (
    <div className="electrical-page">
      <TeamBackdrop avif={electricalBgAvif} webp={electricalBgWebp} png={electricalBg} width={1440} height={1024} />

      <BackToTeamLink />

      {/* Main Content */}
      <main id="main-content" tabIndex={-1} className="department-layout">
        {/* Header Section - Full Width */}
        <div className="header-section">
          <div className="title-badge">
            <h1 className="electrical-title">ELECTRICAL AND CONTROL SYSTEMS</h1>
          </div>
          <p className="electrical-subtitle">
            Every action our robots take is powered, connected, and managed by the Electrical & Control Systems division, which keeps Genesis running.
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
                <p>Every Genesis robot's heartbeat is powered by us.</p>
                
                <p>Our team works on everything from power management and control systems to PCB design and sensor integration.</p>
                
                <p>We ensure that every motor turns, every sensor communicates, and every spark is accurate and safe.</p>
                
                <p>The best electrical systems, in our opinion, are smooth, effective, and brimming with energy that flows in all directions, much like a team.</p>
              </div>
            </div>
          </div>

          {/* Right Side - Pathway Component */}
          <div className="department-pathway-container">
            <DepartmentPathway members={electricalMembers} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default Electrical;