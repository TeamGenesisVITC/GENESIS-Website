# Genesis performance harness

Local, dependency-free measurement rig for the Genesis website. Everything
drives stock Google Chrome over the DevTools protocol (CDP); nothing is
installed and nothing leaves the machine except the site's own third-party
requests (Fontshare / Google Fonts).

Two tools share one static server and one CDP client (`lib/`):

| tool | question it answers |
|---|---|
| `ux.mjs` | How fast does each route load for a visitor (desktop and throttled mobile)? What do link-preview bots see? |
| `measure.mjs` (+ `envelope.mjs`, `shot.mjs`) | What does the landing scrollytelling cost while scrubbing (memory residency, frame times, main-thread work)? |

`compare.mjs` turns two `ux.mjs` results into a before/after delta table.

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
`--cdp-port=`), `scripts/serve.mjs` uses **4180**. Run one harness command at
a time.

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
| `_headers` | Cloudflare format: path patterns with `*` and `:placeholder`, `Name: value` lines, `! Name` removes; values from several matching rules are joined with `, `; custom headers replace the defaults. Host-specific rules are matched on the path only. |
| `_redirects` | static and splat (`:splat`) rules; status 200 = rewrite. |
| caching | strong ETag, default `Cache-Control: public, max-age=0, must-revalidate`, `304` on `If-None-Match` (so a warm repeat visit revalidates every asset unless `_headers` says `immutable`). |
| compression | brotli q4 (else gzip 6) for text types, as Cloudflare's edge does on the fly; images/media are sent as-is; single `Range` requests → 206. |

Not modelled: HTTP/2/3 multiplexing (the local server is HTTP/1.1, so Chrome
opens at most 6 connections per host — Cloudflare multiplexes all requests on
one connection), edge cache, Early Hints, real RTT to the edge.

`node scripts/serve.mjs [port] [--dir=dist/client] [--log]` serves a build on
4180 with the same semantics for manual testing (`--no-store` restores the
original minimal SPA server).

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

Drives stock Chrome over CDP with real wheel events (so Lenis actually
advances) and records latency, network, residency, and main-thread cost.

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
| `scale-50` / `scale-33` / `nodraw` | `?atlasScale=` / `?noCanvasDraw=1` experiments (need the optimized ScrollCanvas) |

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

- Headless Chrome uses software rasterization, so absolute frame times are not
  representative of a GPU session. `backdrop-filter` GPU cost could not be
  isolated headlessly; it remains a structural hypothesis, not a measured fact.
- `performance.measureUserAgentSpecificMemory()` is unavailable in this setup;
  residency is measured from the Chrome process tree RSS via PowerShell.

## Files

| file | role |
|---|---|
| `ux.mjs` | page-load UX + link-preview runner (JSON + Markdown) |
| `compare.mjs` | before/after Markdown table |
| `linkpreview.mjs` | standalone link-preview check |
| `measure.mjs`, `envelope.mjs`, `shot.mjs` | scrollytelling scrub harness, budget lock, screenshots |
| `lib/static-server.mjs` | Cloudflare-like static server (also used by `scripts/serve.mjs`) |
| `lib/cdp.mjs` | CDP client + Chrome launcher |
| `lib/pageload.mjs` | per-visit measurement, profiles, metric definitions |
| `lib/linkpreview.mjs`, `lib/report.mjs`, `lib/target.mjs` | bot view, Markdown rendering, `--dir`/`--url` handling |
| `lib/image-dims.mjs` | image header dimensions (PNG/JPEG/WebP/AVIF) and atlas-manifest reader |
| `results/` | committed baselines (`baseline-cra.json` / `.md`) |
