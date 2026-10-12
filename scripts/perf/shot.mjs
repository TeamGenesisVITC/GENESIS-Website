// scripts/perf/shot.mjs — capture canvas screenshots to verify visual integrity.
// Usage: node scripts/perf/shot.mjs out-prefix [--dir=build | --dir=dist/client | --url=http://localhost:4173]
//        [--port=8123] [--cdp-port=9333] [--headed]
//        [--section=flagship-section] [--fractions=0.3,0.5,0.7]
//        [--scroll=instant|gesture]   (window.scrollTo({behavior:'instant'}) or a real
//                                      Input.synthesizeScrollGesture from the current position)
// Writes <prefix>-30.png, <prefix>-50.png, <prefix>-70.png: positions at that fraction of the
// section's scroll range (section top -> section bottom - viewport height).
// Before every capture it asserts that the page is at the requested scroll position and that
// the section covers the viewport centre, then waits for the network to go idle and for the
// section's canvas to stop changing and not be blank. Any failed assertion exits with code 1.
import fs from 'node:fs';
import { CDP, launchChrome, httpJson, sleep } from './lib/cdp.mjs';
import { parseArgs, resolveTarget, CDP_PORT_DEFAULT } from './lib/target.mjs';
import { scrollGesture } from './lib/scroll-trace.mjs';

const evaluate = async (cdp, expression, awaitPromise = false) => {
  const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise });
  if (r.exceptionDetails) throw new Error(`page evaluate failed: ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
  return r.result.value;
};

function trackNetwork(cdp) {
  const inflight = new Set();
  let last = Date.now();
  cdp.on('Network.requestWillBeSent', (p) => { if (!p.request.url.startsWith('data:')) { inflight.add(p.requestId); last = Date.now(); } });
  cdp.on('Network.loadingFinished', (p) => { if (inflight.delete(p.requestId)) last = Date.now(); });
  cdp.on('Network.loadingFailed', (p) => { if (inflight.delete(p.requestId)) last = Date.now(); });
  return async (quietMs = 500, timeoutMs = 15000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      if (!inflight.size && Date.now() - last >= quietMs) return true;
      await sleep(100);
    }
    return false;
  };
}

// Signature of the section's canvas, downscaled to 32x18: changes whenever a new frame is drawn.
const canvasSignature = (sectionId) => `(() => {
  const c = document.querySelector('#${sectionId} canvas');
  if (!c || !c.width || !c.height) return { missing: true };
  const s = document.createElement('canvas'); s.width = 32; s.height = 18;
  const x = s.getContext('2d', { willReadFrequently: true });
  x.drawImage(c, 0, 0, 32, 18);
  const d = x.getImageData(0, 0, 32, 18).data;
  let h = 0, min = 255, max = 0;
  for (let i = 0; i < d.length; i += 4) { const v = (d[i] + d[i + 1] + d[i + 2]) / 3; h = (h * 31 + d[i] * 7 + d[i + 1] * 3 + d[i + 2]) >>> 0; min = Math.min(min, v); max = Math.max(max, v); }
  return { sig: h, range: max - min };
})()`;

async function main() {
  const args = parseArgs();
  const prefix = args._[0] || 'shot';
  const sectionId = typeof args.section === 'string' ? args.section : 'flagship-section';
  const fractions = (typeof args.fractions === 'string' ? args.fractions : '0.3,0.5,0.7').split(',').map(Number);
  const mode = args.scroll === 'gesture' ? 'gesture' : 'instant';
  const cdpPort = parseInt(args['cdp-port'], 10) || CDP_PORT_DEFAULT;
  const target = await resolveTarget(args, { legacyNoStore: true });
  const chrome = await launchChrome({ cdpPort, headed: !!args.headed, marker: `genesis-shot-${process.pid}`, extraArgs: ['--force-device-scale-factor=1'] });
  let cdp = null;
  let failed = false;
  try {
    const list = await httpJson(`http://127.0.0.1:${cdpPort}/json/list`);
    const page = list.find((t) => t.type === 'page');
    cdp = await CDP.connect(page.webSocketDebuggerUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');
    const networkIdle = trackNetwork(cdp);
    const loaded = cdp.once('Page.loadEventFired');
    await cdp.send('Page.navigate', { url: `${target.origin}/` });
    await Promise.race([loaded, sleep(30000)]);
    await networkIdle(800, 20000);

    for (const frac of fractions) {
      const geo = await evaluate(cdp, `(() => {
        const sec = document.getElementById(${JSON.stringify(sectionId)});
        if (!sec) return null;
        // GSAP-pinned sections scroll for the length of their pin-spacer.
        const box = sec.parentElement && sec.parentElement.classList.contains('pin-spacer') ? sec.parentElement : sec;
        const r = box.getBoundingClientRect();
        const top = r.top + scrollY;
        const maxScroll = document.documentElement.scrollHeight - innerHeight;
        const targetY = Math.round(Math.min(maxScroll, top + Math.max(0, r.height - innerHeight) * ${frac}));
        return { top: Math.round(top), height: Math.round(r.height), targetY, y: scrollY, vw: innerWidth, vh: innerHeight };
      })()`);
      if (!geo) throw new Error(`#${sectionId} not found`);

      if (mode === 'gesture') {
        const dy = geo.targetY - geo.y;
        if (Math.abs(dy) > 1) await scrollGesture(cdp, { x: geo.vw / 2, y: geo.vh / 2, dy, speed: 3000 });
      } else {
        await evaluate(cdp, `window.scrollTo({ top: ${geo.targetY}, behavior: 'instant' }), true`);
      }
      await evaluate(cdp, 'new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))', true);

      // Assert the position and the section before waiting for pixels.
      const at = await evaluate(cdp, `(() => {
        const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
        const sec = document.getElementById(${JSON.stringify(sectionId)});
        return { y: Math.round(scrollY), inSection: !!(el && sec && sec.contains(el)), hit: el ? el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').join('.') : '') : null };
      })()`);
      const label = `${Math.round(frac * 100)}%`;
      if (Math.abs(at.y - geo.targetY) > 2) throw new Error(`${label}: scrollY is ${at.y}, expected ${geo.targetY} (${mode} scroll did not get there)`);
      if (!at.inSection) throw new Error(`${label}: the viewport centre shows ${at.hit}, not #${sectionId} (scrollY ${at.y})`);

      // Wait for the atlases near this frame and for the canvas to settle on a non-blank frame.
      const idle = await networkIdle(500, 15000);
      let prev = null;
      let stable = 0;
      let sig = null;
      const t0 = Date.now();
      while (Date.now() - t0 < 10000) {
        sig = await evaluate(cdp, canvasSignature(sectionId));
        if (sig.missing) break;
        stable = prev && prev.sig === sig.sig ? stable + 1 : 0;
        prev = sig;
        if (stable >= 4 && sig.range > 8) break;
        await sleep(150);
      }
      if (sig?.missing) {
        // Sections without a canvas: network idle + a short settle is all there is to wait for.
        console.warn(`${label}: no sized <canvas> inside #${sectionId}; not waiting for canvas pixels`);
        await sleep(500);
      } else {
        if (!(sig.range > 8)) throw new Error(`${label}: the canvas is blank (luminance range ${sig.range?.toFixed(1)})`);
        if (stable < 4) { console.warn(`${label}: canvas still changing after 10 s; capturing anyway (exit code 1)`); failed = true; }
      }
      if (!idle) console.warn(`${label}: network not idle after 15 s`);

      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
      const file = `${prefix}-${Math.round(frac * 100)}.png`;
      fs.writeFileSync(file, Buffer.from(data, 'base64'));
      console.log(`wrote ${file}  (scrollY ${at.y} in #${sectionId} ${geo.top}+${geo.height}, ${mode} scroll, canvas settled in ${Date.now() - t0} ms)`);
    }
  } finally {
    if (cdp) cdp.close();
    await chrome.close();
    await target.close();
  }
  if (failed) process.exit(1);
}
main().catch((e) => { console.error(`shot.mjs FAILED: ${e.message}`); process.exit(1); });
