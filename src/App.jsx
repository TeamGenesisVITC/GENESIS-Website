import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import GenesisLanding from './components/scrollytelling/GenesisLanding';
import Robohi from './components/robohi';
import Leads from './pages/Leads';
import Electrical from './pages/Electrical';
import Mechanical from './pages/Mechanical';
import SoftwareAI from './pages/SoftwareAI';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GenesisLanding />} />
        <Route path="/robo-hi" element={<Robohi />} />
        <Route path="/team/leads" element={<Leads />} />
        <Route path="/team/electrical" element={<Electrical />} />
        <Route path="/team/mechanical" element={<Mechanical />} />
        <Route path="/team/software" element={<SoftwareAI />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;