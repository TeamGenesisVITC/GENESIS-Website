# Genesis performance harness

Local, dependency-free measurement rig for the Genesis website. Everything
drives stock Google Chrome over the DevTools protocol (CDP); nothing is
installed and nothing leaves the machine except the site's own third-party
requests (Fontshare / Google Fonts).

The tools share one static server and one CDP client (`lib/`):

| tool | question it answers |
|---|---|
| `scroll.mjs` | **Is scrolling smooth?** Presented frames, missed vsyncs, Chrome's scroll-jank attribution and input latency per landing section, against a calibration page, with repeated randomized runs. The primary scroll benchmark. |
| `ux.mjs` | How fast does each route load for a visitor (desktop and throttled mobile)? What do link-preview bots see? |
| `measure.mjs` (+ `envelope.mjs`, `shot.mjs`) | What does the landing scrollytelling cost while scrubbing the whole page (memory residency, presentation, main-thread work)? Screenshots of the canvas. |

`compare.mjs` turns two `ux.mjs` results — or two `scroll.mjs` results — into a before/after delta table.

## Quick start

```bash
# today's site (Create React App) -> build/
npm ci && npm run build
node scripts/perf/ux.mjs --dir=build --label=baseline-cra --runs=5

# after the Vite + Cloudflare migration -> dist/client
npm run build
node scripts/perf/ux.mjs --dir=dist/client --label=after-vite --runs=5

# or measure the real Cloudflare asset routing through a running server
npx vite preview            # (Cloudflare Vite plugin)   or: npx wrangler dev
node scripts/perf/ux.mjs --url=http://localhost:4173 --label=after-preview --runs=5

# before/after table
node scripts/perf/compare.mjs scripts/perf/results/baseline-cra.json scripts/perf/results/after-vite.json --out=scripts/perf/results/compare.md

# scroll smoothness per landing section (headed Chrome: keep the window visible, hands off)
node scripts/perf/scroll.mjs --dir=dist/client --label=scroll-before
# ... change the site, rebuild ...
node scripts/perf/scroll.mjs --dir=dist/client --label=scroll-after
node scripts/perf/scroll.mjs --compare scripts/perf/results/scroll-before.json scripts/perf/results/scroll-after.json
```

Results land in `scripts/perf/results/<label>.json` plus a readable
`<label>.md`. Committed baselines for commit 8545b6e (CRA):

- [`results/baseline-cra.md`](results/baseline-cra.md) — what visitors get
  (third-party fonts live), 5 runs per route and profile, plus link previews.
- [`results/baseline-cra-1p.md`](results/baseline-cra-1p.md) — the same with
  third-party requests blocked (`--third-party=block`), 3 runs: lower-noise
  first-party numbers. Compare an "after" run in the same mode.

> **Git Bash:** arguments that start with `/` (for example `--routes=/,/robo-hi`)
> are rewritten into Windows paths by MSYS. Prefix the command with
> `MSYS_NO_PATHCONV=1` or run it from PowerShell / cmd. Pass `--out` as a
> relative or `C:/...` path.

Ports: the harness uses HTTP **8123** and CDP **9333** (`--port=`,
`--cdp-port=`), `scripts/serve.mjs` uses **4180**; `scroll.mjs` serves its
calibration page on an OS-assigned port. Run one harness command at a time.

## Choosing the target: `--dir` vs `--url`

| flag | what is measured |
|---|---|
| `--dir=<path>` (default `dist/client` if it has been built, else `build`) | the harness serves the directory itself with Cloudflare-like static routing (below). Good for `build/` (CRA) and `dist/client` (Vite). |
| `--url=<origin>` | an already-running server, e.g. `vite preview` with the Cloudflare plugin or `wrangler dev`: exact Workers static-asset behaviour (routing, 404 page, `_headers`), but whatever compression/caching that dev server applies. |

### Static server semantics (`--dir` mode, `lib/static-server.mjs`)

Approximates Cloudflare Workers static assets so local numbers carry over:

| behaviour | rule |
|---|---|
| html_handling `auto-trailing-slash` (Cloudflare default) | `/about` → `about.html` (200); `/about.html` → 307 `/about`; `/folder` → 307 `/folder/`; `/folder/` → `folder/index.html`; `/folder/index.html` → 307 `/folder/` |
| not_found_handling `auto` (default) | `404-page` if `<dir>/404.html` exists (nearest `404.html`, **HTTP 404**), else `single-page-application` (`/index.html`, HTTP 200 — today's behaviour). Override with `--not-found=404-page\|single-page-application\|none`. |
| `wrangler.json(c)/toml` | if a config in the repo root or next to the dir sets `assets.html_handling` / `not_found_handling`, those values are used. |
| `_headers` | Cloudflare format: path patterns with `*` and `:placeholder`, `Name: value` lines, `! Name` removes. Every matching rule applies **in file order; within a rule its `! Name` removals run first, then its sets** (so `/frame-atlases/manifest.json` and `/assets/*.mp4` first get the `immutable` Cache-Control of the broader rule above them, then remove and replace it, as on Cloudflare). Values set by several matching rules are joined with `, `; custom headers replace the defaults; a removal that is not followed by a set also drops the default header. Host-specific rules are matched on the path only. Self-test: `node scripts/perf/lib/static-server.test.mjs`. |
| `_redirects` | static and splat (`:splat`) rules; status 200 = rewrite. |
| caching | strong ETag, default `Cache-Control: public, max-age=0, must-revalidate`, `304` on `If-None-Match` (so a warm repeat visit revalidates every asset unless `_headers` says `immutable`). |
| compression | brotli q4 (else gzip 6) for text types, as Cloudflare's edge does on the fly; images/media are sent as-is; single `Range` requests → 206. |

Not modelled: HTTP/2/3 multiplexing (the local server is HTTP/1.1, so Chrome
opens at most 6 connections per host — Cloudflare multiplexes all requests on
one connection), edge cache, Early Hints, real RTT to the edge.

`node scripts/serve.mjs [port] [--dir=dist/client] [--log]` serves a build on
4180 with the same semantics for manual testing (`--no-store` restores the
original minimal SPA server).

## Scroll smoothness: `scroll.mjs`

The primary scroll benchmark. It scrolls *inside* each landing section with real
compositor scroll gestures and reads what was actually presented on screen from the
Chrome trace, against a plain calibration page measured in the same session.

```
node scripts/perf/scroll.mjs [--dir=<path> | --url=<origin>] [--label=name] [--runs=5]
  [--sections=hero,theses,canvas,team,footer]     # also available: projects
  [--headless] [--viewport=1440x900] [--dpr=<n>]  # default: headed, native DPR
  [--speed=1500] [--distance=1500|full] [--align=center|start] [--source=mouse|touch]
  [--trace=full|lean] [--seed=<n>] [--settle=800] [--no-warmup] [--no-calibration]
  [--css='<css>' [--css-check='selector|property|expected[;;...]']] [--block='<url glob>[,...]']
  [--path=/] [--query=?x=1] [--no-scstats] [--keep-traces] [--out=path.json]
  [--port=8123] [--cdp-port=9333]
node scripts/perf/scroll.mjs --compare <before.json> <after.json> [--out=report.md]
node scripts/perf/compare.mjs <before.json> <after.json>     # same table
node scripts/perf/scroll.mjs --render=<result.json>           # re-render the .md
```

`--dir` / `--url` work as for the other tools (`--dir` is served with the
Cloudflare-like semantics below, including `wrangler.jsonc`'s
`not_found_handling`, and with Cloudflare caching — not the legacy no-store
server). Results: `results/<label>.json` + `results/<label>.md`. The exit code is
1 only for fatal problems (Chrome failed, a `--css-check` did not hold); a run
that errored or left its section stays in the JSON, is listed in the report's
run log and is excluded from the medians.

### One measurement

1. Navigate the tab to `about:blank`, bring it to the front (`Page.bringToFront`:
   headed, this makes Chrome the OS foreground window, as for a visitor), then
   navigate to the page (fresh document; the landing URL gets `?scstats`, see
   below); wait for `load`, network idle (no request in flight for 500 ms),
   `document.fonts.ready`, the landing's `performance.mark('genesis:ready')`
   (critical atlases decoded; recorded as `readyMarkMs`, a note if it does not
   come within 20 s), and until `<html>`/`<body>` are no longer
   `overflow: hidden` (preloader lock).
2. `--css` (landing only): a `<style>` is appended to `<head>` with
   `Runtime.evaluate` after load. `--css-check='selector|property|expected'`
   (several separated by `;;`) then compares `getComputedStyle()` values and
   aborts the session if one does not match — an ablation that silently did not
   apply is worse than none. Without `--css-check` the report says the CSS was
   parsed but not verified.
3. Find the section in the DOM, jump to the gesture's start with
   `window.scrollTo({behavior: 'instant'})`, wait for network idle again (the
   atlases around that frame) plus `--settle` ms (800).
4. Trace one `Input.synthesizeScrollGesture` (down, `--speed` px/s, mouse-wheel
   source): the browser's input router → renderer compositor thread → viz, the
   path a real wheel/touchpad scroll takes. The page is never scrolled from
   JavaScript.
5. Verify: started where intended (±4 px), moved the requested distance (±3 %),
   and start and end lie inside the section's scroll range (recomputed after the
   gesture). Otherwise the run is flagged `inSection: false` with the reason.
   Right before and after the gesture the page's `window.__sc` counters are
   read (landing only) and `document.visibilityState` / `document.hasFocus()`
   are recorded.

| section | element(s) |
|---|---|
| `hero` | `#hero-section` |
| `theses` | `#origins-section` + `#vision-section` |
| `canvas` | `#flagship-section` (sticky scroll-scrubbed canvas) |
| `projects` (opt-in) | `#projects-pipeline` |
| `team` | the GSAP `.pin-spacer` around `#team-section` (pinned horizontal roster), else `#team-section` |
| `footer` | `#invest-section` + `<footer>` |

Scroll range of a section: when it is at least 600 px taller than the viewport,
the range in which it fills the viewport (`top … bottom − viewport height`);
otherwise the range in which it covers the viewport's centre line
(`top − vh/2 … bottom − vh/2`); clamped to the document. The gesture covers
`min(--distance, range)` px, centred in the range (`--align=start`: from its top;
`--distance=full`: all of it). At 1440×900 the hero offers only ~510 px (a 0.35 s
gesture), so its numbers are the noisiest.

### Run design

- **Warm-up:** one discarded round visits every target in a fixed order (HTTP
  cache, Chrome's GPU shader cache and font cache warm). All measured runs are
  therefore **warm**: every measurement still loads a fresh document, so the
  page decodes the atlases it needs again (from the HTTP cache), and the
  gesture only starts after `genesis:ready`, network idle at the start position
  and `--settle`. So "warm" means: HTTP/shader/font caches warm, page state
  (JS heap, decoded atlases, GPU tiles) fresh but settled. There are no
  cold-cache scroll numbers; page-load costs are `ux.mjs`'s job. With
  `--no-warmup` the first round's first visit of each target is cold, and the
  report's header says so.
- **Rounds:** `--runs` (5) rounds; each round visits every section and the
  calibration page in a shuffled order (seeded: `--seed`, recorded), so drift
  (thermal state, background load, other processes) spreads over all targets
  instead of always hitting the last ones.
- **Statistics:** median and IQR (p25–p75, linear interpolation) over the runs.
  "Relative to the calibration page" takes the ratio (fps) or difference (%)
  against the calibration run *of the same round* and reports their median, so
  slow drift cancels out.
- **One tab:** on the development laptop, headed Chrome 154 launched by the
  harness exited (exit code −1, no crash dump) whenever a second tab or window
  was opened over CDP, so each measurement re-navigates the one tab via
  `about:blank` instead of opening a fresh tab. Same-site navigations may reuse
  the renderer process; the JS heap and decoded images belong to the document.
  If Chrome exits anyway, the session aborts (exit code 1) instead of logging
  an error for every remaining measurement.
- **Window:** headed, the window is sized so that the *viewport* is
  `--viewport` (default 1440×900 CSS px; `Browser.setWindowBounds`, corrected
  until `innerWidth`/`innerHeight` match) and brought to the front before every
  measurement, so the harness takes focus from whatever you are doing.

### Metrics (per gesture; all from the Chrome trace)

| metric | definition |
|---|---|
| presented fps | distinct `Display::FrameDisplayed` timestamps (viz; the presentation time the OS reported, vsync-quantized) between the first and the last *presented scroll update*, ÷ that window. Frames that share a timestamp were replaced before scan-out and count once. Fallbacks (recorded as `presentSource`): `Graphics.Pipeline.DrawAndSwap` end, then `Display::DrawAndSwap` end. |
| refresh rate / vsync | `ScrollJankV4.vsync_interval_us` (Chrome 154 actually writes nanoseconds there — normalized by plausibility), else `EventLatency.vsync_interval_ms`, else viz `DisplayScheduler::BeginFrame` `interval_us`. Recorded as `vsyncSource`. |
| interval p50 / p95 / p99 | presentation-to-presentation intervals inside the window. Perfect at 165 Hz: 6.06 ms everywhere. `intervalHistVsyncs` in the JSON has the histogram in vsyncs (1, 2, … 6+). |
| >1.5×vsync % | share of those intervals longer than 1.5 vsync intervals = at least one vsync without a new frame. |
| vsync hit % | intervals ÷ vsyncs elapsed (100 % = a new frame on every vsync while scrolling). `missedVsyncsPresent` = vsyncs without a frame. |
| janky % (SJv4) | Chrome's own scroll-jank metric (`ScrollJankV4`, one event per presented scroll frame): frames with `is_janky` ÷ scroll frames. A frame is janky when it reached the screen later than Chrome's model of the input stream says it could have. |
| missed vsync/s (SJv4) | Σ over janky frames of the frame's worst `missed_vsyncs_per_jank_reason` (reasons overlap), ÷ seconds from the first scroll input to the last presented scroll frame. Per-reason totals: `sjMissedByReason` in the JSON. |
| input → present p50 / p95 | `EventLatency` slices (input event timestamp → presentation) of `GESTURE_SCROLL_UPDATE` / `FIRST_…` / `INERTIAL_…` events whose end equals a presentation timestamp, i.e. events that drew a frame (coalesced events end at "termination" and are excluded). With synthetic input the timestamp is when the browser synthesized the event, so OS/driver/device latency is not included. |
| main busy % | Σ `RunTask` on the scrolled renderer's `CrRendererMain` thread overlapping [first scroll input, last presented scroll frame] ÷ that window (`--trace=full` only). |
| long tasks | `RunTask`s longer than 50 ms in that window. |
| paints / frame | Blink `Paint` events in the window ÷ presented frames. A compositor-only scroll needs ≈ 0; anything above means the page repaints while it scrolls. |
| rAF / style+layout / paint ms | Σ `FireAnimationFrame` / `UpdateLayoutTree`+`Layout` / `Paint`+`PrePaint`+`Layerize` in the window. |
| drawn fps | viz `Display::DrawAndSwap` per second: frames drawn, including those replaced before they were shown. |
| host CPU busy % | whole-machine CPU busy during the gesture (`os.cpus()`): other load on the laptop. |
| canvas draws, missA, blank, resident | `window.__sc` (ScrollCanvas counters, enabled by `?scstats`; `--no-scstats` drops the parameter) after − before the gesture: canvas redraws, draws that showed the nearest resident frame because the exact atlas was not decoded (`missA`), draws with no atlas at all (`blank`, also a run-log note); `resident` = peak decoded atlases in that page load. "draws / presented frame" ≈ 1 in the canvas section means the canvas redrew for every presented frame. Any other numeric `__sc` field (`current`, `downloaded`) is kept in the JSON. |
| other GPU load | Windows only: the "GPU Engine" 3D utilization per process (`Get-Counter`), sampled before every round outside any trace (`hostGpu` in the JSON). The report flags a session in which a non-browser process used ≥ 10 % of the 3D engine. |
| window state | `focused` / `visibility` per run; the report counts runs where the page was hidden or another window had focus. |

Also recorded per run: start/end scroll position, distance, viewport, DPR,
gesture duration, trace data loss, the renderer pid, and notes. Per session:
Chrome version, the ANGLE renderer string (the GPU Chrome actually renders with),
all GPU adapters (`SystemInfo.getInfo`), refresh rate, DPR, viewport, seed and the
order of every round. `--keep-traces` saves every gesture's trace next to the
result (`<label>-traces/*.json`, loadable in DevTools' Performance panel or
https://ui.perfetto.dev).

### The calibration page

Generated in memory (`lib/calibration.mjs`) and served on an OS-assigned port:
260 headings and paragraphs of system-font text — no images, fixed or sticky
layers, filters, blend modes, web fonts, scroll listeners or JavaScript. It is
measured with the same gesture, trace categories, tab and window, shuffled into
every round like a section. Its numbers are the ceiling that this machine,
this Chrome and this measurement method reach *right now*; a landing section
can at best match it. On the development laptop the ceiling itself moved a lot
with background load (from ~63 to ~139 presented fps within one hour), which is
why sections are judged relative to it within a round and why a comparison
warns when the calibration changed between two sessions. During the validation
session a video player (`mpv`) used ~50 % of the iGPU's 3D engine and the
calibration page reached only 96 [95–100] presented fps of 165 — which the
report's "Other GPU load" line now makes visible.

`--gpu-quiet=<pct>` (Windows) waits before every measured run until all
other processes together, DWM included, use at most `pct` % of the 3D engine
(up to `--gpu-quiet-wait` seconds, default 300; each run records the wait in
`gpuGate`). On the development laptop the Claude desktop app and DWM swung
between ~5 % and ~100 % within minutes, which flipped before/after
comparisons; `--gpu-quiet=12` keeps every run on an otherwise idle GPU.

### Comparing sessions

`--compare a.json b.json` (or `compare.mjs`) prints, per metric and target,
`before → after (Δ)` tagged **better** / **worse**, or `~noise` when either
median lies inside the other session's run-to-run IQR. The "relative to
calibration" rows are compared the same way. It warns when the sessions are not
like for like (headed/headless, DPR, viewport, GPU, gesture parameters, trace
level) and when the calibration page itself changed beyond noise (the machine
was in a different state: trust the relative rows more).

Ablation examples (each a separate session; compare against a baseline session
taken right before):

```bash
node scripts/perf/scroll.mjs --label=baseline
# canvas hidden: what does compositing the canvas cost while scrolling? (the JS still draws)
node scripts/perf/scroll.mjs --label=no-canvas --sections=canvas \
  --css='#flagship-section canvas{visibility:hidden!important}' \
  --css-check='#flagship-section canvas|visibility|hidden'
# atlases blocked: the canvas has nothing to decode or draw
node scripts/perf/scroll.mjs --label=no-atlas --block='*frame-atlases/atlas-*'
node scripts/perf/scroll.mjs --compare scripts/perf/results/baseline.json scripts/perf/results/no-atlas.json
```

### Known limits

- **Synthetic input.** The mouse-source gesture sends precise-delta wheel events
  from a browser-side generator (~300 events/s observed), not from a device.
  On the development laptop ScrollJankV4 attributes most missed vsyncs — on the
  calibration page too — to `MISSED_VSYNC_DUE_TO_DECELERATING_INPUT_FRAME_DELIVERY`
  and `MISSED_VSYNC_DURING_FAST_SCROLL`: input delivery itself is irregular under
  load. Absolute numbers are therefore not what a hand on a touchpad sees; read
  sections against the calibration page. `--source=touch` turns on touch
  emulation (this changes `pointer`/`hover` media queries, so the layout may
  differ). Wheel "notches" sent with `Input.dispatchMouseEvent` jump instantly
  (no smooth-scroll animation) and are not used.
- **Headed vs headless.** Headed (default) presents through DWM to the real
  panel: `Display::FrameDisplayed` is real scan-out time and the vsync is the
  panel's. New headless (`--headless`) on the development laptop still rendered
  on the Intel GPU (ANGLE/D3D11) and reported the 165 Hz vsync, but nothing is
  scanned out, so its "presented" frames are frames produced (headless also
  runs at DPR 1 unless `--dpr` is given). The headed window must stay visible
  and unobstructed for the whole session (don't use the machine; an occluded
  window can be throttled). Even a pure compositor CSS animation on an
  otherwise empty page presented only ~75–115 of 165 frames/s on this laptop
  during testing, with other applications on the same iGPU — the ceiling is
  the machine, not the site.
- **iGPU vs dGPU.** On a hybrid laptop Chrome renders on the adapter that drives
  its display (here the Intel UHD drives the internal 2560×1600 165 Hz panel;
  the RTX 4060 stays idle). The report records the ANGLE renderer string; runs on
  another adapter or display (or a Windows per-app GPU preference) are not
  comparable.
- **DPR.** Native by default (1.33 on the development laptop: Windows display
  scaling), so layers and the canvas are rasterized at physical resolution, as
  for a visitor. `--dpr=N` passes `--force-device-scale-factor=N`, which changes
  raster cost; compare like with like. The viewport is the window's inner size,
  set with `Browser.setWindowBounds` (recorded per run; a warning is printed if
  it could not be matched, e.g. a window larger than the screen). Section
  geometry depends on the viewport.
- **Tracing overhead.** `--trace=full` adds the `devtools.timeline` categories
  for the main-thread metrics; `--trace=lean` records only `viz` +
  `input.scrolling`. On the calibration page, viz-only, scroll-only and full
  traces gave the same presented fps within noise, but pages with heavy
  main-thread work pay more for `devtools.timeline`. The calibration page is
  traced the same way, so the overhead is part of the ceiling.
- **Host load.** Whole-machine CPU busy % is recorded per run (14–60 % during
  validation, from other work on the laptop), and on Windows the GPU 3D load of
  other processes before every round. The iGPU is shared with DWM and every
  other application on the panel: a video player, a game or a camera app in the
  background costs the page presented frames. Close them, re-run the baseline
  right before an "after" session, and never compare against an old result
  without the calibration check.

## Page-load UX: `ux.mjs`

```
node scripts/perf/ux.mjs [--dir=<path> | --url=<origin>] [--label=name] [--runs=3]
  [--profiles=desktop,mobile] [--routes=/,/robo-hi,/team/leads,/team/software,/does-not-exist]
  [--preview-routes=...] [--net=slow4g|slow4g-raw|fast4g] [--no-warm] [--no-preview]
  [--no-pageload] [--headed] [--idle-threshold=50] [--idle-wait=30] [--out=path.json]
  [--keep-requests]                 # keep per-request timelines for every run (default: run 1 + warm)
  [--retries=2]                     # re-measure a visit that had network failures, in a fresh context
  [--third-party=live|block]        # block = first-party-only (all https requests blocked)
  [--merge=<earlier.json>]          # keep profiles / link preview not measured in this run
node scripts/perf/ux.mjs --render=scripts/perf/results/baseline-cra.json   # re-render the .md only
```

`--third-party=block` blocks every `https://` request (the site itself is
served over `http://127.0.0.1`), i.e. Fontshare and Google Fonts. Pages then
render with fallback fonts and FCP is no longer gated by those origins. Use
it for low-noise first-party comparisons (both sides in the same mode —
`compare.mjs` warns otherwise); the default `live` mode is what visitors get.

`--merge` lets you re-measure one profile without redoing the other, e.g.
`--profiles=mobile --no-preview --merge=scripts/perf/results/baseline-cra.json --label=baseline-cra`;
the report states which parts came from which run.

For every profile, `--runs` rounds visit every route (interleaved, so drift
spreads evenly). Each **cold** visit uses a fresh isolated browser context:
empty HTTP cache, no open sockets, no code cache. On the first round, "/" is
also revisited in a new tab of the same context: the **warm** repeat visit
(HTTP cache populated, revalidations visible as 304s).

| profile | emulation |
|---|---|
| `desktop` | 1600×900 @1x, no throttling |
| `mobile` | 412×915 @2.625x, touch, Android Chrome UA + client hints, CPU 4× slowdown (`Emulation.setCPUThrottlingRate`), DevTools **Slow 4G** (`Network.emulateNetworkConditions`): the 1.6 Mbps / 150 ms RTT link that DevTools and Lighthouse model at request level as 1.44 Mbps down, 675 kbps up, 562.5 ms latency. `--net=slow4g-raw` uses literal 1.6 Mbps / 150 ms (optimistic). |

Each visit's observation window ends when the load event has fired, no request
has been in flight for 5 s, no long task happened in the last 5 s (bounded),
and, on "/", no preloader overlay still covers the page — or at the cap (90 s
desktop, 300 s mobile; such runs are flagged `timedOut`).

| metric | definition |
|---|---|
| TTFB | document response received (CDP; includes emulated latency and redirects) |
| FCP, LCP, CLS | PerformanceObserver (`paint`, `largest-contentful-paint`, `layout-shift` with 1 s / 5 s session windows). FCP `n/a` = nothing contentful was painted (blank page). The LCP element is recorded. |
| TBT, TTI | Lighthouse definitions: TTI = end of the last long task before the first 5 s window with no long task and ≤ 2 requests in flight; TBT = Σ(long task − 50 ms) between FCP and TTI. |
| load | `loadEventEnd`. In today's SPA, React renders after `load`, so images and atlases are requested *after* it — "@load" numbers describe the app shell only. |
| ready ("/") | first available of: a `performance.mark` whose name contains `ready`; the moment a preloader overlay (fixed, ≥90 % of the viewport, z-index ≥ 50, opaque, topmost at the centre, or `[data-preloader]`/`.preloader`) stops covering the page; body scroll lock released; otherwise all requested atlases finished. The signal used is reported (`readySource`). |
| bytes / requests | CDP transferred bytes (headers + encoded body; cache hits count 0, 304s count their headers), redirects included; "@load" / "@ready" = finished by that moment (partially received bytes counted). Broken down by type: html, js, css, font, img, atlas, media, other (**atlas** = images under `/frame-atlases/` or whose path contains `atlas`, whether loaded by `<img>` or `fetch()`); third-party bytes separately. |

Today's landing (commit 8545b6e) mounts no preloader and never calls
`onSiteReady`, so "ready" falls back to "all atlases loaded". **Recommended
for the migration:** emit `performance.mark('genesis:ready')` where the
landing becomes usable (e.g. in `onSiteReady` / when the preloader is
dismissed). The harness picks it up automatically and the before/after
"ready" numbers then measure the same thing explicitly.

### Link previews

`ux.mjs` (and standalone `node scripts/perf/linkpreview.mjs [--dir|--url]`)
fetch each route's raw HTML with a bot user agent and **no JavaScript** — what
WhatsApp, LinkedIn, Slack and X see — following redirects, and record: HTTP
status, `<title>`, meta description, `og:title`, `og:description`,
`og:image`, `og:url`, canonical, `twitter:card`, whether the HTML carries
visible (prerendered) text, and whether a route's tags are identical to "/".
The `og:image` is fetched too (production URLs are mapped onto the local
origin) to check status, type, size and dimensions. `linkpreview.mjs` exits 1
unless every route is 200 and `/does-not-exist` is 404.

## Before / after: `compare.mjs`

```
node scripts/perf/compare.mjs <before.json> <after.json> [--out=report.md]
```

One table per profile (rows = metrics, columns = routes), each cell
`before → after (Δ%)`, tagged `better` / `worse`, or `~noise` when the after
median falls inside the before run range (or vice versa). Also compares the
warm "/" visit, the ready signal used, and the link-preview tags.

## Measurement noise — read before comparing

- **Re-measure the baseline right before the "after" run**, on the same
  machine, same Chrome, similar load. The committed baseline documents the
  conditions it was taken under (Chrome version, CPU, `benchmarkIndex`
  before/after, host CPU busy % per run). Comparing results taken hours apart
  under different load is not meaningful for timings. To rebuild the
  baseline: `git worktree add ../genesis-baseline 8545b6e && cd ../genesis-baseline && npm ci && npm run build`, then
  `node <this repo>/scripts/perf/ux.mjs --dir=../genesis-baseline/build --label=baseline-cra-rerun`.
- **Host load dominates mobile numbers.** Chrome's CPU throttling slows the
  renderer relative to the host; if other processes (builds, other browsers)
  compete, the effective slowdown is much larger than 4× and long tasks
  explode (a busy host turned a 2.6 s mobile FCP into 13 s in testing). Before
  each visit the harness waits up to `--idle-wait` s for host CPU busy <
  `--idle-threshold` %, and records `hostCpuBusyPct` per run.
- **Bytes and request counts are deterministic** (± a few header bytes);
  trust them over small timing deltas.
- **Third-party fonts** (Fontshare, Google Fonts) are fetched from the real
  internet through the emulated network. Their stylesheets are
  render-blocking today, so FCP on *every* route (even desktop, localhost) is
  mostly the latency to those origins: 0.1–0.2 s on a quiet connection, up to
  several seconds while other agents were downloading. Use
  `--third-party=block` for first-party-only comparisons.
- **Failed requests.** In testing, one mobile pass had visits where the
  third-party CSS and 20–30 *local* atlas requests failed, at the same time as
  the host's network connection dropped (cause not isolated; Chrome aborts
  in-flight requests on network changes). Visits with failed requests (not
  counting requests the page cancels itself or `--third-party=block` blocks)
  are re-measured in a fresh context (`--retries`, default 2); the report
  counts retried visits and runs that still had failures.
- Headless Chrome (`--headless=new`) rasterizes in software; paint-heavy
  timings differ from a GPU session (`--headed` to compare).
- The local server is HTTP/1.1 (6 connections per host): on the throttled
  profile this changes request ordering compared with HTTP/2 on Cloudflare
  (e.g. 42 simultaneous atlas requests are queued six at a time locally,
  multiplexed in production).

## Scrollytelling scrub harness: `measure.mjs`

Drives stock Chrome over CDP, scrubs the **whole page** top → bottom → top
`--cycles` times (default 6) with real scroll gestures
(`Input.synthesizeScrollGesture`, `--speed` px/s, default 3000) and records
presentation and jank, network, residency and main-thread cost. For
section-by-section smoothness with repeated runs and a calibration page, use
`scroll.mjs`; `measure.mjs` answers "what does a full scrub cost".

Frame metrics come from the Chrome trace of each gesture (`viz` +
`input.scrolling`, the same analysis as `scroll.mjs`), pooled over all gestures:

| field | meaning |
|---|---|
| `presentedFps`, `refreshHz`, `vsyncMs` | presented frames per second while scrolling; the display's vsync |
| `frameCount` | presented frames (distinct presentation timestamps) |
| `frameP50` / `frameP95` / `frameP99` / `frameMax` | presentation-to-presentation intervals in ms (were rAF intervals before) |
| `dropped`, `droppedPct` | vsyncs on which no new frame was presented while scrolling (Σ round(interval ÷ vsync) − 1), and their share of all vsyncs — relative to the observed vsync, so meaningful at 165 Hz (the old rule counted only rAF gaps > 32 ms) |
| `longIntervalPct` | share of intervals > 1.5 × vsync |
| `sjJankyPct`, `sjMissedVsyncs` | Chrome's ScrollJankV4 janky-frame share and missed vsyncs |
| `latencyP50` / `latencyP95` | input → presentation of scroll updates that drew a frame (EventLatency) |
| `scrubGestures`, `scrubNotes` | per gesture: direction, from/to scroll position, fps, janky %; notes if a gesture did not reach its target |

Long tasks (`longtaskCount`, `longtaskTotal`) still come from a
`PerformanceObserver` in the page, script/task time from
`Performance.getMetrics`. `--trace=none` scrubs with the same gestures but
without tracing (frame fields `null`), for residency numbers without trace
buffers; in validation (headless, one cycle) tracing did not raise them beyond
run-to-run noise (RSS after one scrub 1295–1433 MB traced, 1471–1473 MB
untraced), so the default stays traced and `envelope.mjs` is unaffected. The old scrub called `window.scrollBy()` inside
`requestAnimationFrame`, which forced main-thread scrolling (not what visitors
get) and could not see missed 6 ms deadlines at 165 Hz.

```bash
npm run perf:measure          # full scenario suite, prints PERF_RESULT JSON
npm run perf:check            # run baseline and assert the resource envelope
node scripts/perf/measure.mjs --scenarios=baseline,no-atlas,max-8-atlas
node scripts/perf/measure.mjs --dir=dist/client             # Vite build
node scripts/perf/measure.mjs --url=http://localhost:4173   # running server
node scripts/perf/envelope.mjs --dir=dist/client            # envelope against the Vite build
node scripts/perf/envelope.mjs --dir=build --budgets=cra     # envelope with the CRA (42-atlas) budgets
node scripts/perf/shot.mjs out/shot [--dir=... | --url=...] # canvas screenshots for visual regression
```

`shot.mjs out/shot [--section=flagship-section] [--fractions=0.3,0.5,0.7]
[--scroll=instant|gesture] [--headed]` writes `out/shot-30.png` … at those
fractions of the section's scroll range (a GSAP pin-spacer's length for pinned
sections). It scrolls with `window.scrollTo({behavior: 'instant'})` or a real
gesture (`--scroll=gesture`), then **asserts** the scroll position (±2 px) and
that the section covers the viewport centre, waits for network idle and for the
section's `<canvas>` to stop changing (downscaled pixel signature stable for
600 ms) and not be blank, and only then captures. A failed assertion or a blank
canvas exits with code 1 (the old version dispatched synthetic `WheelEvent`s,
which no longer scroll the page, so every screenshot showed the hero).

In `--dir` mode these scripts keep the original server semantics (SPA
fallback, `Cache-Control: no-store`) so numbers stay comparable with the table
below; add `--cf-cache` to use the Cloudflare-like caching instead.

- **Atlases are recognised by path** — images under `/frame-atlases/` (or
  whose file name contains `atlas`) — not by how they are loaded, so both the
  CRA build (`<img>`, `atlas-N.webp`) and the Vite build (`fetch()` +
  `createImageBitmap`, content-hashed `atlas-N.<hash>.webp`) are counted, and
  the `no-atlas` / `max-N-atlas` scenarios intercept both (no resource-type
  filter). `ux.mjs` classifies atlas bytes the same way.
- **`modeledDecodedAtlasMB`** = distinct atlases fetched × W × H × 4, with W×H
  read from the first atlas response (WebP/AVIF/PNG/JPEG header), falling back
  to `src/components/scrollytelling/atlas-manifest.json` (v1 or v2). Reported
  with `atlasUnique`, `atlasDims`, `atlasDimsSource` and `manifestAtlasCount`.
- **`?scstats`** is appended to every scenario URL so the optimized
  ScrollCanvas exposes its debug counters on `window.__sc` (returned as `sc`);
  older builds ignore it. `--no-scstats` omits it.
- **Envelope budgets** (`envelope.mjs`) come in two presets: `cra` (42 atlases,
  atlas transfer ≤ 22 MB) and `vite` (9 atlases of 3840×3780, ~4.64 MiB,
  atlas transfer ≤ 6 MB). The default follows the atlas-manifest version in
  the checkout (v1 → `cra`, v2+ → `vite`); `--budgets=cra|vite` forces one and
  `--max-<key>=N` overrides a single budget. Commit 8545b6e (original
  ScrollCanvas) fails the residency / long-task budgets by design.

### Scenarios (ablations)

| scenario | what it isolates |
|---|---|
| `baseline` | full page |
| `no-atlas` | atlas subsystem removed entirely (control) |
| `max-8-atlas` / `max-16-atlas` | residency sweep |
| `no-backdrop` (alias `nobackdrop`) | `backdrop-filter` removed |
| `no-filter` | animated `filter` removed |
| `no-atlas-no-backdrop` | combined control |
| `no-fixed-bg` / `no-blend` / `no-fixed-bg-no-blend` | `background-attachment: fixed` and/or `mix-blend-mode` forced off |

CSS ablations are injected with `Page.addScriptToEvaluateOnNewDocument` and
wait for `document.head` (`injectCss`; the script runs before `<html>` exists,
so appending to `document.documentElement` silently did nothing). After load
every ablation is **verified**: the injected `<style data-perf-ablation>`
elements must exist and parse, and no element may have a computed value other
than the forced one (`backdrop-filter: none`, `filter: none`,
`background-attachment: scroll`, `mix-blend-mode: normal`); otherwise the
scenario throws and the run exits with code 1. The result records
`cssVerification`. **Removed:** `scale-50`, `scale-33`
(`?atlasScale=`) and `nodraw` (`?noCanvasDraw=1`) — the current ScrollCanvas
reads neither parameter, so they silently measured the baseline. There is no
switch that turns canvas drawing off today; the closest controls are `no-atlas`
(nothing to decode or draw) and hiding the canvas with a `scroll.mjs --css`
ablation (then it is not composited, although the JS still draws into it).

### The model

The page consumes a pipeline of finite resources:

```
Storage -> Network -> Decoded RAM/VRAM -> GPU work per frame
work/frame x frame frequency
```

- **State cost** — resident decoded atlas bitmaps. `N_atlas x W x H x 4`.
  CRA build: each 3840x3240 atlas is ~47.5 MB decoded; the full 42-atlas set
  is ~2.0 GB. Vite build: 9 atlases of 3840x3780 (28 frames of 960x540),
  ~55 MB decoded each, ~0.5 GB for the full set.
- **Rate cost** — canvas draws, compositing passes, blur area, per-frame JS.

### What was measured (Chrome 154, wheel-driven full down/up scrub)

| metric | original | optimized |
|---|---|---|
| resident after load | 1830 MB | **371 MB** |
| RSS settled after full scrub | 2528 MB | **1680 MB** |
| main-thread script | 1996 ms | **521 ms** |
| total main-thread task | 2674 ms | **1403 ms** |
| long-tasks | 21 / 1552 ms | **3 / 249 ms** |
| p95 frame | 90.8 ms | 78.7 ms |
| max frame | 175.8 ms | 115.2 ms |
| atlas transfer | 20.1 MB | 20.1 MB |

Ablation (`no-atlas`) drops page residency from ~1.8 GB to ~250 MB and removes
the load hitch, proving the decoded atlas set is the dominant state cost.

Commit 8545b6e (the CRA baseline) still has the *original* ScrollCanvas: a
one-cycle `baseline` run on it measured 42 atlas requests / 20.1 MB and
~1.7 GB page residency after load, matching the "original" column.

### Frozen invariants

1. **Memory**: resident decoded atlases <= `MAX_RESIDENT_ATLASES` (12).
2. **Proximity**: only `current ± prefetch window` is requested; everything
   else is evictable.
3. **Decode follows demand**: never enumerate the manifest to decode.
4. **Visibility**: zero render/prefetch work while the section is off-screen.
5. **Bounded miss cost**: nearest-resident fallback scan <= `MAX_FALLBACK_SCAN`.
6. **No request storms**: failed/in-flight/queued atlases are never re-requested.

### Notes / unverified

- Old headless Chrome used software rasterization. New headless (Chrome 154,
  `--headless=new`) on the development laptop rasterizes and composites on the
  Intel iGPU (ANGLE/D3D11) like headed Chrome, but nothing is scanned out and
  it runs at DPR 1; frame numbers are still not those of a visible window. Use
  `scroll.mjs` (headed by default) for smoothness.
- `performance.measureUserAgentSpecificMemory()` is unavailable in this setup;
  residency is measured from the Chrome process tree RSS via PowerShell.

## Files

| file | role |
|---|---|
| `scroll.mjs` | scroll-smoothness benchmark (JSON + Markdown, `--compare`) |
| `ux.mjs` | page-load UX + link-preview runner (JSON + Markdown) |
| `compare.mjs` | before/after Markdown table (`ux.mjs` or `scroll.mjs` results) |
| `linkpreview.mjs` | standalone link-preview check |
| `measure.mjs`, `envelope.mjs`, `shot.mjs` | scrollytelling scrub harness, budget lock, screenshots |
| `lib/static-server.mjs` | Cloudflare-like static server (also used by `scripts/serve.mjs`) |
| `lib/static-server.test.mjs` | `_headers` self-test (`node scripts/perf/lib/static-server.test.mjs`) |
| `lib/scroll-trace.mjs` | real scroll gestures, tracing, trace analysis (presentation, ScrollJankV4, EventLatency, main thread) — shared by `scroll.mjs` and `measure.mjs` |
| `lib/scroll-report.mjs` | `scroll.mjs` Markdown report and comparison |
| `lib/calibration.mjs` | the calibration page and its server |
| `lib/cdp.mjs` | CDP client + Chrome launcher |
| `lib/pageload.mjs` | per-visit measurement, profiles, metric definitions |
| `lib/linkpreview.mjs`, `lib/report.mjs`, `lib/target.mjs` | bot view, Markdown rendering, `--dir`/`--url` handling |
| `lib/image-dims.mjs` | image header dimensions (PNG/JPEG/WebP/AVIF) and atlas-manifest reader |
| `results/` | committed baselines (`baseline-cra.json` / `.md`) |
