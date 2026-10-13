#!/usr/bin/env node
/**
 * Beat stills for the landing page's scroll sequence (ScrollCanvas.jsx, "lite" mode).
 *
 * On constrained devices (Data Saver, <= 2 GB RAM, 2G-class connections) the sequence shows one
 * still per story beat instead of streaming and decoding the frame atlases: ~0.2 MB of images
 * instead of ~5 MB, and ~10 MB of decoded pixels instead of ~60 MB per atlas. The stills are the
 * same source frames the atlases hold, at the same 960x540 size, so the look is unchanged.
 *
 * Reads public/frame-atlases/manifest.json (written by generate-atlases.js) to find which source
 * frame each sequence frame is, and src/components/scrollytelling/beat-stills.json for the beats.
 * Output:
 *   public/frame-stills/still-<n>.<hash8>.avif and .webp   content-hashed, cacheable immutably
 *   src/components/scrollytelling/beat-stills.json          (rewritten with the file names)
 *
 * Usage: node scripts/generate-stills.mjs [--quality-avif=55] [--quality-webp=78]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FRAMES_DIR = path.join(ROOT, 'public', 'frames');
const OUT_DIR = path.join(ROOT, 'public', 'frame-stills');
const ATLAS_MANIFEST = path.join(ROOT, 'public', 'frame-atlases', 'manifest.json');
const STILLS_MANIFEST = path.join(ROOT, 'src', 'components', 'scrollytelling', 'beat-stills.json');

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split('=')[1]) : fallback;
};
const AVIF_QUALITY = arg('quality-avif', 55);
const WEBP_QUALITY = arg('quality-webp', 78);

const atlas = JSON.parse(fs.readFileSync(ATLAS_MANIFEST, 'utf8'));
const stills = JSON.parse(fs.readFileSync(STILLS_MANIFEST, 'utf8'));
const { totalFrames, frameWidth, frameHeight, sourceFrames } = atlas;
if (!Array.isArray(sourceFrames) || sourceFrames.length !== totalFrames) {
  throw new Error('manifest.json has no sourceFrames list matching totalFrames: rerun generate-atlases.js');
}

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const f of fs.readdirSync(OUT_DIR)) {
  if (/^still-\d+\.[0-9a-f]{8}\.(avif|webp)$/.test(f)) fs.unlinkSync(path.join(OUT_DIR, f));
}

const hash8 = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 8);
let total = 0;
stills.stills = await Promise.all(stills.progress.map(async (progress, n) => {
  // Same frame the reduced-motion path rests on: the nearest whole frame to the beat's progress.
  const frame = Math.round(progress * (totalFrames - 1));
  const src = path.join(FRAMES_DIR, sourceFrames[frame]);
  const resized = sharp(src).resize(frameWidth, frameHeight, { fit: 'cover' });
  const [avif, webp] = await Promise.all([
    resized.clone().avif({ quality: AVIF_QUALITY, effort: 6 }).toBuffer(),
    resized.clone().webp({ quality: WEBP_QUALITY, effort: 6, smartSubsample: true }).toBuffer(),
  ]);
  const files = {};
  for (const [ext, buf] of [['avif', avif], ['webp', webp]]) {
    const name = `still-${n}.${hash8(buf)}.${ext}`;
    fs.writeFileSync(path.join(OUT_DIR, name), buf);
    files[ext] = { file: name, bytes: buf.length };
    total += ext === 'avif' ? buf.length : 0;
  }
  return { progress, frame, source: sourceFrames[frame], ...files };
}));
stills.width = frameWidth;
stills.height = frameHeight;
fs.writeFileSync(STILLS_MANIFEST, JSON.stringify(stills, null, 2) + '\n');
console.log(`${stills.stills.length} stills -> public/frame-stills/ (${(total / 1024).toFixed(0)} KB as AVIF)`);
for (const s of stills.stills) console.log(`  beat at ${s.progress}: frame ${s.frame} (${s.source}) avif ${(s.avif.bytes / 1024).toFixed(1)} KB, webp ${(s.webp.bytes / 1024).toFixed(1)} KB`);
