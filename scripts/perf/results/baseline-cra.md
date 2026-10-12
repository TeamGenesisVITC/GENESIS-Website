# Page-load UX report: baseline-cra

- **Measured:** 2026-10-11T16:56:33.088Z · label `baseline-cra`
- **Source:** `--dir=build` served by the harness (http://127.0.0.1:8123) with Cloudflare-like static routing: html_handling `auto-trailing-slash`, not-found `single-page-application`, `_headers` none, `_redirects` none, default Cache-Control `public, max-age=0, must-revalidate`, compression br q4 / gzip 6 for text types.
- **Code:** worktree-agent-a0577bf1dff3377f6 @ 8545b6e — Improve SEO: meta tags, sitemap, robots, per-route titles
- **Browser:** Chrome/154.0.8037.99 (headless=new, software raster), stock Chrome driven over CDP.
- **Host:** 13th Gen Intel(R) Core(TM) i7-13650HX (20 logical cores), 47.7 GB RAM, Windows_NT 10.0.26300 x64, Node v24.15.0.
- **Host benchmarkIndex** (Lighthouse-style, higher = faster): 32173 before, 19472 after the run. Lower = slower or busier machine; compare it across results, and a gap between the two values means the load changed during the run.
- **Host load during visits:** whole-machine CPU busy median 29 % (range 19–41 %), including the Chrome under test; before each visit the harness waited up to 30 s for < 50 %.

## Observations

- **Link previews:** all seven paths return the same `index.html` (HTTP 200), so WhatsApp/LinkedIn see the homepage title, description, og tags and a canonical of `/` for every route; no route has prerendered text. `/does-not-exist` is a soft 404 (HTTP 200) and renders a blank page (FCP never fires).
- **Render-blocking third-party CSS:** `index.html` loads Fontshare + Google Fonts stylesheets, and `main.css` `@import`s two more Google Fonts stylesheets (a chained request after `main.css`). First-party assets come from localhost in < 50 ms, so desktop FCP on every route is essentially the latency to those origins: it ranged 0.9–8.6 s in this run purely from internet latency (other agents were downloading). See `baseline-cra-1p.md` (third parties blocked) for first-party-only numbers.
- **The load event is meaningless for this SPA:** React renders after `load`, so "@load" is only the shell (7 requests / 194 KB: HTML, `main.js` 175 KB brotli, CSS). Images and atlases are requested afterwards.
- **"/" downloads everything up front:** all 42 frame atlases (20.1 MB) are requested at mount, plus `robot-hero.png` (2.2 MB, the desktop LCP image) and `genesis-logo.png` (0.55 MB): 58 requests / 23.1 MB. On the mobile profile the first atlas finishes at ~27 s and the last at ~137 s; TBT is ~12.7 s and TTI ~137 s because each atlas is decoded and uploaded (47.5 MB bitmap) as it arrives.
- **"ready" on this commit = all atlases loaded:** `GlobalPreloader` is not mounted and `onSiteReady` is not wired, so there is no preloader; the hero is visible at FCP while the scroll sequence keeps loading. Recommend emitting `performance.mark('genesis:ready')` where the landing becomes usable so the after-measurement reports the same signal explicitly.
- **Repeat visits revalidate everything:** without `_headers`, Cloudflare's default `max-age=0, must-revalidate` applies: the warm visit sent 50 conditional requests (304) for 58 resources (only the third-party fonts came from cache); on mobile the warm visit still took ~7.3 s to "ready" (50 round trips at 562 ms request latency over six HTTP/1.1 connections, plus decoding). Content-hashed assets with `Cache-Control: immutable` would remove these round trips.
- **Heavy PNGs:** the team pages use 1.7–2.4 MB PNG backgrounds (measured: `leads-bg` 1.8 MB, `ai-bg` 1.7 MB; also in the build: `electrical-bg` 2.3 MB, `mechanical-and-design-bg` 2.4 MB); `/robo-hi`'s mobile LCP (~8.4 s) is a 326 KB PNG icon.
- **Measurement conditions:** other agents were building/running browsers on the same machine. Host benchmarkIndex was 32 173 at the start and 19 472 at the end (≈ 35 000 when quiet); whole-machine CPU was 19–41 % busy during visits. Desktop timings are noisy because of the third-party latency above; mobile timings were consistent for "/" (FCP 3.6–4.2 s, ready 136.9–137.5 s), `/team/leads` and `/team/software` (FCP spread ≤ 0.7 s), while `/robo-hi` FCP varied 2.7–5.6 s. Bytes and request counts are deterministic. One mobile "/" visit hit `net::ERR_NO_BUFFER_SPACE` and was re-measured automatically. An earlier pass (discarded) had visits where third-party CSS and 20–30 local atlas requests failed while the host network dropped.

### Profiles

- **desktop:** 1600x900 @1x, no CPU or network throttling. Window ends after load + 5 s network quiet (cap 90 s).
- **mobile:** 412x915 @2.625x, touch, mobile UA, CPU 4x slowdown, DevTools "Slow 4G" (1.6 Mbps / 150 ms RTT, request-level: 1.44 Mbps, 562.5 ms). CDP network: latency 562.5 ms, down 1.44 Mbps, up 675 kbps. Window ends after load + 5 s network quiet (cap 300 s).

Metric notes: medians over cold runs, each in a fresh isolated browser context (empty HTTP cache, new connections). FCP/LCP/CLS from PerformanceObserver; TBT = Σ(long task − 50 ms) between FCP and TTI (Lighthouse definition; TTI = start of the first 5 s window with no long task and ≤ 2 requests in flight; `*` = not reached in every run, TBT then runs to the window end). Bytes are transferred bytes (headers + encoded body) from CDP, redirects included; "@load" = finished by the load event. "ready" applies to "/" only — see the readiness table for which signal was used.

## desktop — medians of 5 cold-cache runs

| route | HTTP | TTFB | FCP | LCP | CLS | TBT | TTI | load | ready | req @load | bytes @load | req total | bytes total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` | 200 | 4 ms | 1.38 s | 2.75 s | 0.002 | 1086 ms | 5.69 s | 1.09 s | 1.99 s | 7 | 194.1 KB | 58 | 23.09 MB |
| `/robo-hi` | 200 | 5 ms | 1.55 s | 1.55 s | 0.005 | 0 ms | 1.55 s | 1.42 s | — | 7 | 194.1 KB | 16 | 1.05 MB |
| `/team/leads` | 200 | 4 ms | 1.25 s | 1.27 s | 0.009 | 0 ms | 1.25 s | 1.14 s | — | 7 | 194.1 KB | 13 | 1.96 MB |
| `/team/software` | 200 | 4 ms | 1.18 s | 1.19 s | 0.009 | 0 ms | 1.18 s | 1.07 s | — | 7 | 194.1 KB | 13 | 1.89 MB |
| `/does-not-exist` | 200 | 4 ms | n/a | n/a | 0.000 | n/a | not reached | 1.05 s | — | 7 | 194.1 KB | 9 | 198.7 KB |

### Transferred bytes by type (KB, whole observation window, median)

| route | html | js | css | font | img | atlas | media | other | of which third-party |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | 1.4 (1) | 175.3 (1) | 17.4 (5) | 92.5 (4) | 2756.4 (5) | 20602.8 (42) | 0.0 (0) | 0.0 (0) | 95.9 (8) |
| `/robo-hi` | 1.4 (1) | 175.3 (1) | 17.4 (5) | 41.6 (3) | 836.2 (6) | 0.0 (0) | 0.0 (0) | 0.0 (0) | 45.1 (7) |
| `/team/leads` | 1.4 (1) | 175.3 (1) | 17.4 (5) | 41.6 (3) | 1771.4 (3) | 0.0 (0) | 0.0 (0) | 0.0 (0) | 45.1 (7) |
| `/team/software` | 1.4 (1) | 175.3 (1) | 17.4 (5) | 41.6 (3) | 1698.1 (3) | 0.0 (0) | 0.0 (0) | 0.0 (0) | 45.1 (7) |
| `/does-not-exist` | 1.4 (1) | 175.3 (1) | 17.4 (5) | 0.0 (0) | 4.6 (2) | 0.0 (0) | 0.0 (0) | 0.0 (0) | 3.5 (4) |

_Cells are KB (request count). "atlas" = scrollytelling frame atlases; "img" = all other images._

### "/" readiness and repeat visit

| | cold (median) | warm repeat visit |
|---|---|---|
| ready | 1.99 s | 0.60 s |
| ready signal | all requested atlases loaded (no preloader on page) | all requested atlases loaded (no preloader on page) |
| FCP / LCP | 1.38 s / 2.75 s | 0.52 s / 1.48 s |
| load event | 1.09 s | 0.08 s |
| requests / bytes until ready | 57 / 22.76 MB | 57 / 11.0 KB |
| requests / bytes whole window | 58 / 23.09 MB | 58 / 11.2 KB |
| atlases requested / transferred | 42 / 20.12 MB | 42 / 9.4 KB |
| first atlas / last atlas done | 1.82 s / 1.99 s | 0.53 s / 0.60 s |
| served from cache / 304 revalidations | 0 / 0 | 8 / 50 |
| preloader overlay seen | no | no |
| LCP element | `img.hero-robot-img src=/robot-hero.png` | `h1.text-[clamp(4rem,10vw,9rem)].font-black.tracking-[-0.04em]` |

### Run-to-run variance (min – max over cold runs)

| route | FCP | LCP | TBT | load | ready | bytes total | host CPU busy | visits retried / runs with failed requests |
|---|---|---|---|---|---|---|---|---|
| `/` | 1.25 s – 2.34 s | 1.92 s – 5.80 s | 365 ms – 1600 ms | 1.04 s – 2.14 s | 1.39 s – 2.69 s | 23.09 MB – 23.09 MB | 26% – 37% | 0 / 0 |
| `/robo-hi` | 1.26 s – 5.12 s | 1.26 s – 5.12 s | 0 ms – 0 ms | 1.02 s – 4.95 s | — | 1.05 MB – 1.05 MB | 24% – 38% | 0 / 0 |
| `/team/leads` | 1.06 s – 8.58 s | 1.08 s – 8.61 s | 0 ms – 0 ms | 0.93 s – 8.30 s | — | 1.96 MB – 1.96 MB | 26% – 31% | 0 / 0 |
| `/team/software` | 0.89 s – 1.60 s | 0.90 s – 1.62 s | 0 ms – 0 ms | 0.80 s – 1.50 s | — | 1.89 MB – 1.89 MB | 21% – 30% | 0 / 0 |
| `/does-not-exist` | n/a | n/a | n/a | 0.76 s – 1.21 s | — | 198.7 KB – 198.7 KB | 19% – 30% | 0 / 0 |

<details><summary>LCP elements</summary>

- `/`: `img.hero-robot-img src=/robot-hero.png`
- `/robo-hi`: `h2.departments-title.glowy-title`
- `/team/leads`: `img src=/static/media/leads-bg.41947e10d11822a2d6dc.png`
- `/team/software`: `img src=/static/media/ai-bg.f9f8b8d449e20bb78ea3.png`

</details>

## mobile — medians of 5 cold-cache runs

| route | HTTP | TTFB | FCP | LCP | CLS | TBT | TTI | load | ready | req @load | bytes @load | req total | bytes total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` | 200 | 569 ms | 3.62 s | 4.57 s | 0.003 | 12680 ms | 137.25 s | 2.39 s | 136.95 s | 7 | 194.2 KB | 58 | 23.12 MB |
| `/robo-hi` | 200 | 571 ms | 3.10 s | 8.42 s | 0.013 | 0 ms | 3.37 s | 2.77 s | — | 7 | 194.2 KB | 16 | 1.04 MB |
| `/team/leads` | 200 | 571 ms | 3.28 s | 3.28 s | 0.039 | 0 ms | 3.28 s | 2.96 s | — | 7 | 194.2 KB | 13 | 1.95 MB |
| `/team/software` | 200 | 570 ms | 3.19 s | 3.19 s | 0.015 | 0 ms | 3.19 s | 2.92 s | — | 7 | 194.2 KB | 13 | 1.88 MB |
| `/does-not-exist` | 200 | 569 ms | n/a | n/a | 0.000 | n/a | not reached | 2.92 s | — | 7 | 194.2 KB | 9 | 198.8 KB |

### Transferred bytes by type (KB, whole observation window, median)

| route | html | js | css | font | img | atlas | media | other | of which third-party |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | 1.4 (1) | 175.3 (1) | 17.5 (5) | 92.4 (4) | 2787.6 (5) | 20602.8 (42) | 0.0 (0) | 0.0 (0) | 95.9 (8) |
| `/robo-hi` | 1.4 (1) | 175.3 (1) | 17.4 (5) | 29.8 (3) | 836.2 (6) | 0.0 (0) | 0.0 (0) | 0.0 (0) | 33.2 (7) |
| `/team/leads` | 1.4 (1) | 175.3 (1) | 17.5 (5) | 29.8 (3) | 1771.4 (3) | 0.0 (0) | 0.0 (0) | 0.0 (0) | 33.3 (7) |
| `/team/software` | 1.4 (1) | 175.3 (1) | 17.4 (5) | 29.8 (3) | 1698.1 (3) | 0.0 (0) | 0.0 (0) | 0.0 (0) | 33.2 (7) |
| `/does-not-exist` | 1.4 (1) | 175.3 (1) | 17.5 (5) | 0.0 (0) | 4.6 (2) | 0.0 (0) | 0.0 (0) | 0.0 (0) | 3.5 (4) |

_Cells are KB (request count). "atlas" = scrollytelling frame atlases; "img" = all other images._

### "/" readiness and repeat visit

| | cold (median) | warm repeat visit |
|---|---|---|
| ready | 136.95 s | 7.29 s |
| ready signal | all requested atlases loaded (no preloader on page) | all requested atlases loaded (no preloader on page) |
| FCP / LCP | 3.62 s / 4.57 s | 2.49 s / 5.98 s |
| load event | 2.39 s | 1.28 s |
| requests / bytes until ready | 58 / 23.12 MB | 58 / 11.0 KB |
| requests / bytes whole window | 58 / 23.12 MB | 58 / 11.2 KB |
| atlases requested / transferred | 42 / 20.12 MB | 42 / 9.4 KB |
| first atlas / last atlas done | 26.85 s / 136.95 s | 3.31 s / 7.29 s |
| served from cache / 304 revalidations | 0 / 0 | 8 / 50 |
| preloader overlay seen | no | no |
| LCP element | `h1.text-[clamp(4rem,10vw,9rem)].font-black.tracking-[-0.04em]` | `h1.text-[clamp(4rem,10vw,9rem)].font-black.tracking-[-0.04em]` |

### Run-to-run variance (min – max over cold runs)

| route | FCP | LCP | TBT | load | ready | bytes total | host CPU busy | visits retried / runs with failed requests |
|---|---|---|---|---|---|---|---|---|
| `/` | 3.57 s – 4.18 s | 4.48 s – 5.23 s | 11485 ms – 13577 ms | 2.38 s – 2.93 s | 136.94 s – 137.49 s | 23.12 MB – 23.12 MB | 25% – 32% | 1 / 0 |
| `/robo-hi` | 2.72 s – 5.60 s | 8.06 s – 10.92 s | 0 ms – 4 ms | 2.39 s – 5.29 s | — | 1.04 MB – 1.04 MB | 28% – 37% | 0 / 0 |
| `/team/leads` | 3.19 s – 3.35 s | 3.19 s – 3.35 s | 0 ms – 39 ms | 2.91 s – 2.97 s | — | 1.95 MB – 1.95 MB | 26% – 41% | 0 / 0 |
| `/team/software` | 2.62 s – 3.29 s | 2.62 s – 3.29 s | 0 ms – 0 ms | 2.37 s – 2.96 s | — | 1.88 MB – 1.88 MB | 28% – 34% | 0 / 0 |
| `/does-not-exist` | n/a | n/a | n/a | 2.40 s – 2.93 s | — | 198.7 KB – 198.8 KB | 25% – 35% | 0 / 0 |

<details><summary>LCP elements</summary>

- `/`: `h1.text-[clamp(4rem,10vw,9rem)].font-black.tracking-[-0.04em]`
- `/robo-hi`: `img.node-icon src=/static/media/electrical.fa88d584f40102b1b1d1.png`
- `/team/leads`: `h1.leads-title`
- `/team/software`: `h1.software-ai-title`

</details>

## Link previews (raw HTML, no JavaScript — what WhatsApp / LinkedIn / Slack bots see)

| route | HTTP | `<title>` | meta description | og:title | og:description | og:image | canonical | twitter:card |
|---|---|---|---|---|---|---|---|---|
| `/` | 200 | Team Genesis \| Humanoid Robotics Team of VIT Chennai | Team Genesis is the student humanoid robotics team of VIT C… | Team Genesis \| Humanoid Robotics Team of VIT Chen… | Student humanoid robotics team of VIT Chennai, de… | https://www.teamgenesisvitc.in/og-image.jpg | https://www.teamgenesisvitc.in/ | summary_large_image |
| `/robo-hi` | 200 | Team Genesis \| Humanoid Robotics Team of VIT Chennai **[same as /]** | Team Genesis is the student humanoid robotics team of VIT C… | Team Genesis \| Humanoid Robotics Team of VIT Chen… | Student humanoid robotics team of VIT Chennai, de… | https://www.teamgenesisvitc.in/og-image.jpg | https://www.teamgenesisvitc.in/ | summary_large_image |
| `/team/leads` | 200 | Team Genesis \| Humanoid Robotics Team of VIT Chennai **[same as /]** | Team Genesis is the student humanoid robotics team of VIT C… | Team Genesis \| Humanoid Robotics Team of VIT Chen… | Student humanoid robotics team of VIT Chennai, de… | https://www.teamgenesisvitc.in/og-image.jpg | https://www.teamgenesisvitc.in/ | summary_large_image |
| `/team/electrical` | 200 | Team Genesis \| Humanoid Robotics Team of VIT Chennai **[same as /]** | Team Genesis is the student humanoid robotics team of VIT C… | Team Genesis \| Humanoid Robotics Team of VIT Chen… | Student humanoid robotics team of VIT Chennai, de… | https://www.teamgenesisvitc.in/og-image.jpg | https://www.teamgenesisvitc.in/ | summary_large_image |
| `/team/mechanical` | 200 | Team Genesis \| Humanoid Robotics Team of VIT Chennai **[same as /]** | Team Genesis is the student humanoid robotics team of VIT C… | Team Genesis \| Humanoid Robotics Team of VIT Chen… | Student humanoid robotics team of VIT Chennai, de… | https://www.teamgenesisvitc.in/og-image.jpg | https://www.teamgenesisvitc.in/ | summary_large_image |
| `/team/software` | 200 | Team Genesis \| Humanoid Robotics Team of VIT Chennai **[same as /]** | Team Genesis is the student humanoid robotics team of VIT C… | Team Genesis \| Humanoid Robotics Team of VIT Chen… | Student humanoid robotics team of VIT Chennai, de… | https://www.teamgenesisvitc.in/og-image.jpg | https://www.teamgenesisvitc.in/ | summary_large_image |
| `/does-not-exist` | 200 | Team Genesis \| Humanoid Robotics Team of VIT Chennai **[same as /]** | Team Genesis is the student humanoid robotics team of VIT C… | Team Genesis \| Humanoid Robotics Team of VIT Chen… | Student humanoid robotics team of VIT Chennai, de… | https://www.teamgenesisvitc.in/og-image.jpg | https://www.teamgenesisvitc.in/ | summary_large_image |

- og:image check: `http://127.0.0.1:8123/og-image.jpg` (production URL mapped onto the local origin) → HTTP 200, image/jpeg, 58.0 KB, 1200×630.
- Routes whose raw HTML contains visible text outside `<noscript>` (prerendered content): none.
- Routes whose title / og tags are identical to "/" (bots cannot tell them apart): `/robo-hi`, `/team/leads`, `/team/electrical`, `/team/mechanical`, `/team/software`, `/does-not-exist`.

