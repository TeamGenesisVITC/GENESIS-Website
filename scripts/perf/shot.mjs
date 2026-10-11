// scripts/perf/shot.mjs — capture canvas screenshots to verify visual integrity.
// Usage: node scripts/perf/shot.mjs out-prefix [--dir=build | --dir=dist/client | --url=http://localhost:4173]
//        [--port=8123] [--cdp-port=9333]
// Writes <prefix>-30.png, <prefix>-50.png, <prefix>-70.png (scroll positions
// inside #flagship-section reached with real wheel events, so Lenis advances).
import fs from 'node:fs';
import { CDP, launchChrome, httpJson, sleep } from './lib/cdp.mjs';
import { parseArgs, resolveTarget, CDP_PORT_DEFAULT } from './lib/target.mjs';

async function main() {
  const args = parseArgs();
  const prefix = args._[0] || 'shot';
  const cdpPort = parseInt(args['cdp-port'], 10) || CDP_PORT_DEFAULT;
  const target = await resolveTarget(args, { legacyNoStore: true });
  const chrome = await launchChrome({ cdpPort, headed: !!args.headed, marker: `genesis-shot-${process.pid}`, extraArgs: ['--force-device-scale-factor=1'] });
  let cdp = null;
  try {
    const list = await httpJson(`http://127.0.0.1:${cdpPort}/json/list`);
    const page = list.find((t) => t.type === 'page');
    cdp = await CDP.connect(page.webSocketDebuggerUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Page.navigate', { url: `${target.origin}/` });
    await sleep(6000);
    // Scroll into the flagship canvas via real wheel events, capture 3 frames.
    const positions = [0.3, 0.5, 0.7];
    for (const frac of positions) {
      await cdp.send('Runtime.evaluate', { expression: `(async () => {
        const sec = document.getElementById('flagship-section');
        const targetY = sec.offsetTop + (sec.offsetHeight - window.innerHeight) * ${frac};
        const t0 = performance.now();
        await new Promise((resolve) => {
          const step = () => {
            const y = window.scrollY, diff = targetY - y;
            if (Math.abs(diff) < 8 || performance.now() - t0 > 6000) { resolve(); return; }
            window.dispatchEvent(new WheelEvent('wheel', { deltaY: Math.sign(diff) * 120, bubbles: true, cancelable: true }));
            requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        });
        await new Promise((r) => setTimeout(r, 1500));
      })()`, awaitPromise: true });
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
      const file = `${prefix}-${Math.round(frac * 100)}.png`;
      fs.writeFileSync(file, Buffer.from(data, 'base64'));
      console.log('wrote', file);
    }
  } finally {
    if (cdp) cdp.close();
    await chrome.close();
    await target.close();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
