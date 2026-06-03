import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingHero from './components/LandingHero';
import Robohi from './components/robohi';
import IntroSequence from './components/IntroSequence';

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
            {/* Add team routes later when you create the Team page */}
          </Routes>
        </BrowserRouter>
      </div>
    </>
  );
}

export default App;