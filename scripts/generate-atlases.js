#!/usr/bin/env node
/**
 * Frame-atlas generator for the landing page's scroll-scrubbed sequence (ScrollCanvas.jsx).
 *
 * Packs the source frames (public/frames/frame_XXXX.webp) into sprite-sheet atlases that the
 * canvas scrubs through. Output:
 *   public/frame-atlases/atlas-<i>.<hash8>.webp      content-hashed, safe to cache immutably
 *   public/frame-atlases/manifest.json               full manifest (+ selected source frames)
 *   src/components/scrollytelling/atlas-manifest.json runtime manifest bundled into the app
 *
 * Usage:
 *   node scripts/generate-atlases.js [--scale=0.5] [--quality=80] [--effort=6] [--concurrency=2]
 *
 *   --scale    linear scale of each frame relative to the source (0 < scale <= 1, default 1).
 *              The site ships scale=0.5 (960x540 frames, 9 atlases): the whole sequence then
 *              fits in ~0.5 GB of decoded bitmaps and can stay fully resident while scrubbing.
 *   --quality  WebP quality (default 80), --effort WebP effort 0-6 (default 6).
 *
 * The output directory is cleaned of stale atlas-*.webp files only. Archived atlas sets live in
 * media/archive/ and are never touched: the script refuses to write anywhere under it.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const FRAMES_DIR = path.join(ROOT, 'public', 'frames');
const OUTPUT_DIR = path.join(ROOT, 'public', 'frame-atlases');
const SRC_MANIFEST_PATH = path.join(ROOT, 'src', 'components', 'scrollytelling', 'atlas-manifest.json');
const ARCHIVE_DIR = path.join(ROOT, 'media', 'archive');
const PUBLIC_BASE_PATH = '/frame-atlases/';

const MAX_TEXTURE_SIZE = 4096; // safe max texture edge on mobile GPUs
const BACKGROUND = { r: 5, g: 5, b: 5 }; // page background #050505
const HASH_LENGTH = 8;
const STALE_ATLAS_RE = /^atlas-\d+(\.[0-9a-f]+)?\.webp$/i;

// Adaptive frame selection: keep the TARGET_BUDGET most perceptually distinct frames.
const TARGET_BUDGET = 250;
const THUMB_SIZE = 64;

const DEFAULTS = { scale: 1, quality: 80, effort: 6, concurrency: 2 };

function parseArgs(argv) {
  const opts = { ...DEFAULTS };
  for (const arg of argv) {
    const m = /^--([a-z-]+)=(.+)$/.exec(arg);
    if (!m || !(m[1] in DEFAULTS)) {
      throw new Error(`Unknown argument "${arg}". Expected --scale=, --quality=, --effort= or --concurrency=.`);
    }
    opts[m[1]] = Number(m[2]);
  }
  if (!(opts.scale > 0 && opts.scale <= 1)) throw new Error(`--scale must be in (0, 1], got ${opts.scale}`);
  if (!(opts.quality >= 1 && opts.quality <= 100)) throw new Error(`--quality must be in [1, 100], got ${opts.quality}`);
  if (!(Number.isInteger(opts.effort) && opts.effort >= 0 && opts.effort <= 6)) throw new Error(`--effort must be an integer 0-6, got ${opts.effort}`);
  if (!(Number.isInteger(opts.concurrency) && opts.concurrency >= 1)) throw new Error(`--concurrency must be a positive integer`);
  return opts;
}

function assertOutsideArchive(dir) {
  const rel = path.relative(ARCHIVE_DIR, path.resolve(dir));
  if (rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))) {
    throw new Error(`Refusing to write into the archive folder: ${dir}`);
  }
}

function listSourceFrames() {
  if (!fs.existsSync(FRAMES_DIR)) throw new Error(`Source frames directory not found at ${FRAMES_DIR}`);
  const files = fs
    .readdirSync(FRAMES_DIR)
    .filter((file) => /^frame_\d+\.webp$/i.test(file))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  if (files.length === 0) throw new Error(`No frame_XXXX.webp images found in ${FRAMES_DIR}`);
  return files;
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * Greedy perceptual-difference decimation: repeatedly drop the interior frame whose removal
 * introduces the smallest jump (mean abs difference of 64x64 grayscale thumbnails between its
 * neighbours) until TARGET_BUDGET frames remain. First and last frames are always kept.
 * Returns the indices (into `files`) of the surviving frames, in order.
 */
async function selectFrames(files) {
  const thumbs = await mapLimit(files, 32, (f) =>
    sharp(path.join(FRAMES_DIR, f)).resize(THUMB_SIZE, THUMB_SIZE, { fit: 'fill' }).grayscale().raw().toBuffer()
  );
  const n = files.length;
  if (n <= TARGET_BUDGET) return files.map((_, i) => i);

  const diff = (i, j) => {
    const a = thumbs[i];
    const b = thumbs[j];
    let sum = 0;
    for (let k = 0; k < a.length; k++) sum += Math.abs(a[k] - b[k]);
    return sum / a.length;
  };

  const prev = new Int32Array(n);
  const next = new Int32Array(n);
  const cost = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    prev[i] = i - 1;
    next[i] = i + 1 < n ? i + 1 : -1;
  }
  const updateCost = (i) => {
    cost[i] = prev[i] < 0 || next[i] < 0 ? Infinity : diff(prev[i], next[i]);
  };
  for (let i = 0; i < n; i++) updateCost(i);

  let surviving = n;
  while (surviving > TARGET_BUDGET) {
    let best = -1;
    let bestCost = Infinity;
    for (let i = next[0]; i !== -1 && next[i] !== -1; i = next[i]) {
      if (cost[i] < bestCost) {
        bestCost = cost[i];
        best = i;
      }
    }
    if (best < 0) break;
    const p = prev[best];
    const q = next[best];
    next[p] = q;
    prev[q] = p;
    surviving--;
    updateCost(p);
    updateCost(q);
  }

  const kept = [];
  for (let i = 0; i !== -1; i = next[i]) kept.push(i);
  return kept;
}

/** Atlas grid for a given frame size, bounded by MAX_TEXTURE_SIZE on both edges. */
function computeGeometry(frameWidth, frameHeight, totalFrames) {
  const columns = Math.max(1, Math.floor(MAX_TEXTURE_SIZE / frameWidth));
  const rows = Math.max(1, Math.floor(MAX_TEXTURE_SIZE / frameHeight));
  const framesPerAtlas = columns * rows;
  return {
    columns,
    rows,
    framesPerAtlas,
    atlasWidth: columns * frameWidth,
    atlasHeight: rows * frameHeight,
    totalAtlases: Math.ceil(totalFrames / framesPerAtlas),
  };
}

/** Composites one atlas (frames resized to frameWidth x frameHeight) into a raw RGB buffer. */
async function composeAtlas(frameFiles, atlasIndex, geo, frameWidth, frameHeight) {
  const start = atlasIndex * geo.framesPerAtlas;
  const atlasFrames = frameFiles.slice(start, start + geo.framesPerAtlas);
  // The last atlas only gets as many rows as it needs.
  const usedRows = Math.ceil(atlasFrames.length / geo.columns);
  const width = geo.atlasWidth;
  const height = usedRows * frameHeight;

  const tiles = await Promise.all(
    atlasFrames.map((file) =>
      sharp(path.join(FRAMES_DIR, file))
        .resize(frameWidth, frameHeight, { fit: 'fill', kernel: 'lanczos3' })
        .removeAlpha()
        .raw()
        .toBuffer()
    )
  );

  // Compositing always yields RGBA; strip the (fully opaque) alpha in a second pass so the
  // encoder gets plain RGB and the atlas decodes as an opaque image.
  const rgba = await sharp({ create: { width, height, channels: 3, background: BACKGROUND } })
    .composite(
      tiles.map((input, i) => ({
        input,
        raw: { width: frameWidth, height: frameHeight, channels: 3 },
        left: (i % geo.columns) * frameWidth,
        top: Math.floor(i / geo.columns) * frameHeight,
      }))
    )
    .raw()
    .toBuffer({ resolveWithObject: true });
  const raw =
    rgba.info.channels === 3
      ? rgba.data
      : await sharp(rgba.data, { raw: { width, height, channels: rgba.info.channels } }).removeAlpha().raw().toBuffer();

  return { raw, width, height, frames: atlasFrames.length };
}

function encodeWebp(raw, width, height, { quality, effort }) {
  return sharp(raw, { raw: { width, height, channels: 3 } })
    .webp({ quality, effort, smartSubsample: true })
    .toBuffer();
}

function contentHash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex').slice(0, HASH_LENGTH);
}

async function generateAtlases(opts) {
  const t0 = Date.now();
  assertOutsideArchive(OUTPUT_DIR);
  console.log(`--- Atlas generation (scale=${opts.scale}, webp q=${opts.quality} effort=${opts.effort}) ---`);

  const rawFiles = listSourceFrames();
  console.log(`Found ${rawFiles.length} source frames.`);

  const keptIndices = await selectFrames(rawFiles);
  const frameFiles = keptIndices.map((i) => rawFiles[i]);
  const totalFrames = frameFiles.length;
  console.log(`Adaptive selection kept ${totalFrames} frames (${frameFiles[0]} .. ${frameFiles[totalFrames - 1]}).`);

  const meta = await sharp(path.join(FRAMES_DIR, frameFiles[0])).metadata();
  const sourceWidth = meta.width;
  const sourceHeight = meta.height;
  if (!sourceWidth || !sourceHeight) throw new Error('Could not determine source frame dimensions.');
  const frameWidth = Math.round(sourceWidth * opts.scale);
  const frameHeight = Math.round(sourceHeight * opts.scale);
  const geo = computeGeometry(frameWidth, frameHeight, totalFrames);

  console.log(`Source ${sourceWidth}x${sourceHeight} -> frames ${frameWidth}x${frameHeight}`);
  console.log(
    `Grid ${geo.columns}x${geo.rows} (${geo.framesPerAtlas} frames/atlas), atlas ${geo.atlasWidth}x${geo.atlasHeight}, ` +
      `${geo.totalAtlases} atlases`
  );

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const atlases = await mapLimit(
    Array.from({ length: geo.totalAtlases }, (_, i) => i),
    opts.concurrency,
    async (atlasIndex) => {
      const { raw, width, height, frames } = await composeAtlas(frameFiles, atlasIndex, geo, frameWidth, frameHeight);
      const buffer = await encodeWebp(raw, width, height, opts);
      const file = `atlas-${atlasIndex}.${contentHash(buffer)}.webp`;
      fs.writeFileSync(path.join(OUTPUT_DIR, file), buffer);
      console.log(`  ${file}  ${width}x${height}  ${frames} frames  ${(buffer.length / 1024).toFixed(0)} KiB`);
      return { file, bytes: buffer.length, frames, width, height };
    }
  );

  // Remove stale atlases from previous runs (only generator-owned files in OUTPUT_DIR).
  const current = new Set(atlases.map((a) => a.file));
  for (const f of fs.readdirSync(OUTPUT_DIR)) {
    if (STALE_ATLAS_RE.test(f) && !current.has(f)) fs.unlinkSync(path.join(OUTPUT_DIR, f));
  }

  const totalBytes = atlases.reduce((sum, a) => sum + a.bytes, 0);
  const decodedBytes = atlases.reduce((sum, a) => sum + a.width * a.height * 4, 0);

  // Deterministic content (no timestamps) so an unchanged sequence yields an unchanged bundle.
  const manifest = {
    version: 2,
    totalFrames,
    sourceWidth,
    sourceHeight,
    scale: opts.scale,
    frameWidth,
    frameHeight,
    columns: geo.columns,
    rows: geo.rows,
    framesPerAtlas: geo.framesPerAtlas,
    atlasWidth: geo.atlasWidth,
    atlasHeight: geo.atlasHeight,
    totalAtlases: geo.totalAtlases,
    totalBytes,
    format: 'webp',
    encoder: { quality: opts.quality, effort: opts.effort, smartSubsample: true },
    basePath: PUBLIC_BASE_PATH,
    atlases,
  };

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'manifest.json'),
    JSON.stringify({ ...manifest, sourceFrames: frameFiles }, null, 2) + '\n',
    'utf-8'
  );
  fs.writeFileSync(SRC_MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');

  console.log(
    `Wrote ${geo.totalAtlases} atlases: ${(totalBytes / 1048576).toFixed(2)} MiB on disk, ` +
      `${(decodedBytes / 1048576).toFixed(0)} MiB decoded (RGBA), in ${((Date.now() - t0) / 1000).toFixed(1)}s`
  );
  console.log(`Manifests: ${path.relative(ROOT, path.join(OUTPUT_DIR, 'manifest.json'))}, ${path.relative(ROOT, SRC_MANIFEST_PATH)}`);
}

module.exports = { listSourceFrames, selectFrames, computeGeometry, composeAtlas, encodeWebp, FRAMES_DIR };

if (require.main === module) {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }
  generateAtlases(opts).catch((err) => {
    console.error('Atlas generation failed:', err);
    process.exit(1);
  });
}
