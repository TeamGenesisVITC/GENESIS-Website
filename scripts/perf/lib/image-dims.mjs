// scripts/perf/lib/image-dims.mjs
// Read pixel dimensions from the first bytes of a PNG, JPEG, WebP or AVIF file.
import fs from 'node:fs';
import path from 'node:path';

export function imageDims(buf) {
  try {
    if (buf[0] === 0x89 && buf[1] === 0x50) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), format: 'png' };
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      let i = 2;
      while (i + 9 < buf.length) {
        if (buf[i] !== 0xff) { i++; continue; }
        const marker = buf[i + 1];
        const len = buf.readUInt16BE(i + 2);
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
          return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5), format: 'jpeg' };
        }
        i += 2 + len;
      }
    }
    if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
      const chunk = buf.toString('ascii', 12, 16);
      if (chunk === 'VP8X') return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3), format: 'webp' };
      if (chunk === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff, format: 'webp' };
      if (chunk === 'VP8L') { const b = buf.readUInt32LE(21); return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1, format: 'webp' }; }
    }
    // AVIF / HEIF: ISO-BMFF with an 'ispe' (image spatial extents) property.
    if (buf.toString('ascii', 4, 8) === 'ftyp') {
      const i = buf.indexOf('ispe', 0, 'ascii');
      if (i > 0 && i + 16 <= buf.length) return { w: buf.readUInt32BE(i + 8), h: buf.readUInt32BE(i + 12), format: 'avif' };
    }
  } catch {}
  return null;
}

// Best-effort read of the scrollytelling atlas manifest (v1: totalAtlases /
// atlasWidth / atlasHeight; v2 and later: whatever of count / width / height
// can be found). Returns { count, width, height, version, file } or null.
export function readAtlasManifest(root) {
  const file = path.join(root, 'src', 'components', 'scrollytelling', 'atlas-manifest.json');
  if (!fs.existsSync(file)) return null;
  try {
    const m = JSON.parse(fs.readFileSync(file, 'utf8'));
    const list = Array.isArray(m.atlases) ? m.atlases : Array.isArray(m.files) ? m.files : null;
    const first = list && typeof list[0] === 'object' ? list[0] : null;
    const count = m.totalAtlases ?? m.atlasCount ?? (list ? list.length : null);
    const width = m.atlasWidth ?? m.atlas?.width ?? first?.width ?? (m.frameWidth && m.columns ? m.frameWidth * m.columns : null);
    const height = m.atlasHeight ?? m.atlas?.height ?? first?.height ?? (m.frameHeight && m.rows ? m.frameHeight * m.rows : null);
    return { count: count ?? null, width: width ?? null, height: height ?? null, version: m.version ?? 1, file: path.relative(root, file) };
  } catch {
    return null;
  }
}
