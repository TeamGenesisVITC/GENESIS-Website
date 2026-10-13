import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { applyLiteClass } from './utils/deviceProfile';

applyLiteClass();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
