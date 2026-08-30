const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const FRAMES_DIR = path.join(__dirname, '..', 'public', 'frames');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'frame-atlases');
const MAX_TEXTURE_SIZE = 4096;
const WEBP_QUALITY = 90;
const CONCURRENCY_LIMIT = 4;

async function generateAtlases() {
  console.log('--- Starting Atlas Generation ---');

  if (!fs.existsSync(FRAMES_DIR)) {
    console.error(`Error: Source frames directory not found at ${FRAMES_DIR}`);
    process.exit(1);
  }

  // 1. Read and sort all frame files (specifically frame_XXXX.webp sequence)
  const rawFrameFiles = fs
    .readdirSync(FRAMES_DIR)
    .filter((file) => /^frame_\d+\.webp$/i.test(file))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  const rawTotalFrames = rawFrameFiles.length;
  if (rawTotalFrames === 0) {
    console.error('Error: No frame images found in', FRAMES_DIR);
    process.exit(1);
  }

  console.log(`Found ${rawTotalFrames} raw source frames in working pool.`);

  // 1b. Adaptive Perceptual-Difference Frame Selection
  console.log('Downscaling frames to 64x64 grayscale buffers for perceptual diffing...');
  const t0 = Date.now();
  const thumbs = [];
  const BATCH_SIZE = 32;

  for (let i = 0; i < rawTotalFrames; i += BATCH_SIZE) {
    const batch = rawFrameFiles.slice(i, i + BATCH_SIZE);
    const batchBuffers = await Promise.all(
      batch.map((f) =>
        sharp(path.join(FRAMES_DIR, f))
          .resize(64, 64, { fit: 'fill' })
          .grayscale()
          .raw()
          .toBuffer()
      )
    );
    thumbs.push(...batchBuffers);
  }
  console.log(`Perceptual buffers generated in ${((Date.now() - t0) / 1000).toFixed(2)}s`);

  // Mean absolute pixel difference between frame i and frame j (0 to 255)
  function calcDifference(i, j) {
    const bufA = thumbs[i];
    const bufB = thumbs[j];
    let sum = 0;
    const len = bufA.length;
    for (let k = 0; k < len; k++) {
      sum += Math.abs(bufA[k] - bufB[k]);
    }
    return sum / len;
  }

  // Doubly linked list for surviving frames
  class FrameNode {
    constructor(idx) {
      this.idx = idx;
      this.prev = null;
      this.next = null;
      this.removalCost = Infinity;
    }
  }

  const nodes = [];
  for (let i = 0; i < rawTotalFrames; i++) {
    nodes.push(new FrameNode(i));
  }
  for (let i = 0; i < rawTotalFrames; i++) {
    if (i > 0) nodes[i].prev = nodes[i - 1];
    if (i < rawTotalFrames - 1) nodes[i].next = nodes[i + 1];
  }

  function computeCost(node) {
    if (!node.prev || !node.next) {
      node.removalCost = Infinity;
    } else {
      // Perceptual jump introduced if node is removed
      node.removalCost = calcDifference(node.prev.idx, node.next.idx);
    }
  }

  for (let i = 1; i < rawTotalFrames - 1; i++) {
    computeCost(nodes[i]);
  }

  // Target budget ceiling: 250 frames
  const TARGET_BUDGET = 250;
  const MIN_REMOVAL_THRESHOLD = 5.0; // Stop if removing a frame introduces jump > threshold

  let survivingCount = rawTotalFrames;

  while (survivingCount > TARGET_BUDGET) {
    let minNode = null;
    let minCost = Infinity;

    let curr = nodes[0].next;
    while (curr && curr.next) {
      if (curr.removalCost < minCost) {
        minCost = curr.removalCost;
        minNode = curr;
      }
      curr = curr.next;
    }

    if (!minNode) break;

    // Stop if remaining candidate removal costs exceed threshold when budget reached
    if (minCost > MIN_REMOVAL_THRESHOLD && survivingCount <= TARGET_BUDGET) {
      break;
    }

    // Remove minNode (always preserving first node[0] and last node[rawTotalFrames - 1])
    const p = minNode.prev;
    const n = minNode.next;
    p.next = n;
    n.prev = p;
    survivingCount--;

    if (p.prev) computeCost(p);
    if (n.next) computeCost(n);
  }

  // Extract surviving frame files
  const survivingIndices = [];
  let currNode = nodes[0];
  while (currNode) {
    survivingIndices.push(currNode.idx);
    currNode = currNode.next;
  }

  const frameFiles = survivingIndices.map((idx) => rawFrameFiles[idx]);
  const totalFrames = frameFiles.length;

  console.log(`\nAdaptive selection complete: Selected ${totalFrames} frames from ${rawTotalFrames} raw frames.`);
  console.log(`Preserved start frame: index ${survivingIndices[0]} (${frameFiles[0]})`);
  console.log(`Preserved end frame: index ${survivingIndices[survivingIndices.length - 1]} (${frameFiles[frameFiles.length - 1]})`);

  // Density mapping across original sequence
  const segmentSize = 100;
  console.log('\n--- Frame Density Distribution Across Original Sequence ---');
  for (let start = 0; start < rawTotalFrames; start += segmentSize) {
    const end = Math.min(start + segmentSize - 1, rawTotalFrames - 1);
    const countInSegment = survivingIndices.filter((idx) => idx >= start && idx <= end).length;
    const totalInSegment = end - start + 1;
    const pct = ((countInSegment / totalInSegment) * 100).toFixed(1);
    const density = countInSegment > 32 ? 'HIGH (Fast Motion)' : countInSegment > 20 ? 'MEDIUM' : 'LOW (Slow/Static Motion)';
    console.log(`- frames ${start.toString().padStart(3, '0')}–${end.toString().padStart(3, '0')}: ${countInSegment.toString().padStart(2, ' ')} frames kept (${pct.padStart(5, ' ')}%) [${density}]`);
  }
  console.log('----------------------------------------------------------\n');

  console.log(`Reading dimensions from first frame (${frameFiles[0]})...`);

  // 2. Determine frame dimensions automatically from first frame
  const firstFramePath = path.join(FRAMES_DIR, frameFiles[0]);
  const firstMetadata = await sharp(firstFramePath).metadata();
  const frameWidth = firstMetadata.width;
  const frameHeight = firstMetadata.height;

  if (!frameWidth || !frameHeight) {
    console.error('Error: Could not determine frame dimensions.');
    process.exit(1);
  }

  console.log(`Frame dimensions: ${frameWidth}x${frameHeight}px`);

  // 3. Compute optimal grid size under 4096x4096px
  const columns = Math.max(1, Math.floor(MAX_TEXTURE_SIZE / frameWidth));
  const rows = Math.max(1, Math.floor(MAX_TEXTURE_SIZE / frameHeight));
  const framesPerAtlas = columns * rows;
  const atlasWidth = columns * frameWidth;
  const atlasHeight = rows * frameHeight;
  const totalAtlases = Math.ceil(totalFrames / framesPerAtlas);

  console.log(`Atlas grid configuration:`);
  console.log(`- Grid: ${columns} columns x ${rows} rows`);
  console.log(`- Frames per atlas: ${framesPerAtlas}`);
  console.log(`- Atlas dimensions: ${atlasWidth}x${atlasHeight}px (Max safe texture: ${MAX_TEXTURE_SIZE}x${MAX_TEXTURE_SIZE}px)`);
  console.log(`- Total atlases to generate: ${totalAtlases}`);

  // Ensure output directory exists and clean out stale atlas files
  if (fs.existsSync(OUTPUT_DIR)) {
    const existing = fs.readdirSync(OUTPUT_DIR);
    for (const f of existing) {
      if (/^atlas-.*\.webp$/i.test(f) || f === 'manifest.json') {
        fs.unlinkSync(path.join(OUTPUT_DIR, f));
      }
    }
  } else {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // 4. Composite and write atlases
  let oversizedAtlases = [];

  const atlasIndices = Array.from({ length: totalAtlases }, (_, i) => i);

  async function processAtlas(atlasIndex) {
    const startIndex = atlasIndex * framesPerAtlas;
    const endIndex = Math.min(startIndex + framesPerAtlas, totalFrames);
    const atlasFrames = frameFiles.slice(startIndex, endIndex);

    const composites = atlasFrames.map((filename, i) => {
      const col = i % columns;
      const row = Math.floor(i / columns);
      return {
        input: path.join(FRAMES_DIR, filename),
        left: col * frameWidth,
        top: row * frameHeight,
      };
    });

    const outputFilename = `atlas-${atlasIndex}.webp`;
    const outputPath = path.join(OUTPUT_DIR, outputFilename);

    const atlasBuffer = await sharp({
      create: {
        width: atlasWidth,
        height: atlasHeight,
        channels: 3,
        background: { r: 5, g: 5, b: 5 }, // Match background color #050505
      },
    })
      .composite(composites)
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    fs.writeFileSync(outputPath, atlasBuffer);

    const sizeInMB = atlasBuffer.length / (1024 * 1024);
    if (sizeInMB > 2.0) {
      oversizedAtlases.push({ atlasIndex, sizeInMB });
    }

    process.stdout.write(`\rGenerated atlas ${atlasIndex + 1}/${totalAtlases} (${outputFilename}) - ${sizeInMB.toFixed(2)} MB`);
  }

  for (let i = 0; i < totalAtlases; i += CONCURRENCY_LIMIT) {
    const batch = atlasIndices.slice(i, i + CONCURRENCY_LIMIT);
    await Promise.all(batch.map(processAtlas));
  }

  console.log('\nAll atlas sheets successfully generated.');

  if (oversizedAtlases.length > 0) {
    console.warn(`\n[WARNING] ${oversizedAtlases.length} atlas sheets exceeded 2MB:`);
    oversizedAtlases.forEach(({ atlasIndex, sizeInMB }) => {
      console.warn(`- atlas-${atlasIndex}.webp: ${sizeInMB.toFixed(2)} MB`);
    });
  }

  // 5. Generate manifest.json
  const manifest = {
    totalFrames,
    frameWidth,
    frameHeight,
    columns,
    rows,
    framesPerAtlas,
    atlasWidth,
    atlasHeight,
    totalAtlases,
    generatedAt: new Date().toISOString(),
  };

  const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`Manifest written to ${manifestPath}`);

  const srcManifestPath = path.join(__dirname, '..', 'src', 'components', 'scrollytelling', 'atlas-manifest.json');
  fs.writeFileSync(srcManifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`Source manifest written to ${srcManifestPath}`);
  console.log('--- Atlas Generation Complete ---');
}

generateAtlases().catch((err) => {
  console.error('Atlas generation failed:', err);
  process.exit(1);
});
