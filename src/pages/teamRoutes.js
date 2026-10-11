// Lazy-loaded bundle for the dark "team" routes (/robo-hi and /team/*).
//
// These five pages are loaded together as ONE chunk on purpose: their stylesheets
// define overlapping global class names (.neon-grid, .title-badge, .hero-background img,
// @keyframes gridPulse / titleGlow, ...). Before code splitting every stylesheet was
// always present, so the cascade was decided by import order. Keeping the original
// order here (robohi -> Leads -> Electrical -> Mechanical -> SoftwareAI) reproduces that
// exact cascade in the emitted CSS chunk, so the pages look the same no matter which
// one is opened first. Do not reorder these exports.
export { default as Robohi } from '../components/robohi';
export { default as Leads } from './Leads';
export { default as Electrical } from './Electrical';
export { default as Mechanical } from './Mechanical';
export { default as SoftwareAI } from './SoftwareAI';
