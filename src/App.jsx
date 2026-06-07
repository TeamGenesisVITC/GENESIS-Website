import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingHero from './components/LandingHero';
import Robohi from './components/robohi';
import IntroSequence from './components/IntroSequence';
import Leads from './pages/Leads';
import Electrical from './pages/Electrical';
import Mechanical from './pages/Mechanical';
import SoftwareAI from './pages/SoftwareAI';

function App() {
  const [introComplete, setIntroComplete] = useState(false);

  return (
    <>
      {!introComplete && (
        <IntroSequence onComplete={() => setIntroComplete(true)} />
      )}

      <div
        aria-hidden={!introComplete}
        style={{
          opacity: introComplete ? 1 : 0,
          pointerEvents: introComplete ? 'auto' : 'none',
          transition: 'opacity 0.5s ease',
        }}
      >
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingHero />} />
            <Route path="/robo-hi" element={<Robohi />} />
            <Route path="/team/leads" element={<Leads />} />
            <Route path="/team/electrical" element={<Electrical />} />
            <Route path="/team/mechanical" element={<Mechanical />} />
            <Route path="/team/software" element={<SoftwareAI />} />
          </Routes>
        </BrowserRouter>
      </div>
    </>
  );
}

export default App;