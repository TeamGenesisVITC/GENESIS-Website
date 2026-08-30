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
  const frameFiles = fs
    .readdirSync(FRAMES_DIR)
    .filter((file) => /^frame_\d+\.webp$/i.test(file))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  const totalFrames = frameFiles.length;
  if (totalFrames === 0) {
    console.error('Error: No frame images found in', FRAMES_DIR);
    process.exit(1);
  }

  console.log(`Found ${totalFrames} frames. Reading dimensions from first frame (${frameFiles[0]})...`);

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

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
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
