import React from 'react';
import { useLocation } from 'react-router-dom';
import PrefetchLink from '../components/PrefetchLink';
import logoPng from '../assets/images/genesis-logo-80.png';
import './NotFound.css';

const TEAM_LINKS = [
  { to: '/robo-hi', label: 'Meet the team' },
  { to: '/team/leads', label: 'Leads' },
  { to: '/team/mechanical', label: 'Mechanical and Design' },
  { to: '/team/electrical', label: 'Electrical and Control Systems' },
  { to: '/team/software', label: 'Software and AI' },
];

export default function NotFound() {
  const { pathname } = useLocation();

  return (
    <div className="nf-page">
      <header className="nf-header">
        <PrefetchLink to="/" className="nf-brand">
          <img src={logoPng} alt="" width="26" height="26" className="nf-brand-icon" />
          <span className="nf-brand-title">TEAM GENESIS</span>
        </PrefetchLink>
      </header>

      <main id="main-content" tabIndex={-1} className="nf-main">
        <p className="nf-eyebrow">Error 404 · Route not found</p>
        <h1 className="nf-title">Page not found.</h1>
        <p className="nf-lead">
          Nothing is mounted at <code className="nf-path">{pathname}</code>. The link may be
          mistyped, or the page may have moved.
        </p>

        <div className="nf-actions">
          <PrefetchLink to="/" className="nf-btn-primary">
            Back to home
          </PrefetchLink>
        </div>

        <nav className="nf-links" aria-labelledby="nf-links-title">
          <h2 id="nf-links-title" className="nf-links-title">
            Explore the team
          </h2>
          <ul className="nf-link-list">
            {TEAM_LINKS.map((link, idx) => (
              <li key={link.to}>
                <PrefetchLink to={link.to} className="nf-link">
                  <span className="nf-link-index" aria-hidden="true">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="nf-link-label">{link.label}</span>
                  <span className="nf-link-arrow" aria-hidden="true">
                    →
                  </span>
                </PrefetchLink>
              </li>
            ))}
          </ul>
        </nav>
      </main>
    </div>
  );
}
