# Page-load UX report: after-vite

- **Measured:** 2026-10-11T18:10:58.160Z · label `after-vite`
- **Source:** `--dir=dist\client` served by the harness (http://127.0.0.1:8123) with Cloudflare-like static routing: html_handling `auto-trailing-slash`, not-found `404-page`, `_headers` 15 rules, `_redirects` none, default Cache-Control `public, max-age=0, must-revalidate`, compression br q4 / gzip 6 for text types.
- **Code:** infra/cloudflare-prep @ 7982d46 — Wire perf scripts; mark landing ready; lint fixes in ScrollCanvas
- **Third-party requests BLOCKED** (`--third-party=block`): first-party-only numbers; fonts fall back, FCP is not gated by Fontshare / Google Fonts.
- **Browser:** Chrome/154.0.8037.99 (headless=new, software raster), stock Chrome driven over CDP.
- **Host:** 13th Gen Intel(R) Core(TM) i7-13650HX (20 logical cores), 47.7 GB RAM, Windows_NT 10.0.26300 x64, Node v24.15.0.
- **Host benchmarkIndex** (Lighthouse-style, higher = faster): 24582 before, 26522 after the run. Lower = slower or busier machine; compare it across results, and a gap between the two values means the load changed during the run.
- **Host load during visits:** whole-machine CPU busy median 26 % (range 19–37 %), including the Chrome under test; before each visit the harness waited up to 30 s for < 50 %.

### Profiles

- **desktop:** 1600x900 @1x, no CPU or network throttling. Window ends after load + 5 s network quiet (cap 90 s).
- **mobile:** 412x915 @2.625x, touch, mobile UA, CPU 4x slowdown, DevTools "Slow 4G" (1.6 Mbps / 150 ms RTT, request-level: 1.44 Mbps, 562.5 ms). CDP network: latency 562.5 ms, down 1.44 Mbps, up 675 kbps. Window ends after load + 5 s network quiet (cap 300 s).

Metric notes: medians over cold runs, each in a fresh isolated browser context (empty HTTP cache, new connections). FCP/LCP/CLS from PerformanceObserver; TBT = Σ(long task − 50 ms) between FCP and TTI (Lighthouse definition; TTI = start of the first 5 s window with no long task and ≤ 2 requests in flight; `*` = not reached in every run, TBT then runs to the window end). Bytes are transferred bytes (headers + encoded body) from CDP, redirects included; "@load" = finished by the load event. "ready" applies to "/" only — see the readiness table for which signal was used.

## desktop — medians of 3 cold-cache runs

| route | HTTP | TTFB | FCP | LCP | CLS | TBT | TTI | load | ready | req @load | bytes @load | req total | bytes total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` | 200 | 4 ms | 0.26 s | 1.00 s | 0.000 | 0 ms | 0.25 s* | 0.05 s | 0.41 s | 10 | 175.2 KB | 22 | 4.97 MB |
| `/robo-hi` | 200 | 3 ms | 0.13 s | 0.13 s | 0.000 | 0 ms | 0.13 s | 0.05 s | — | 16 | 186.6 KB | 22 | 208.3 KB |
| `/team/leads` | 200 | 4 ms | 0.15 s | 0.15 s | 0.000 | 0 ms | 0.14 s* | 0.04 s | — | 16 | 186.6 KB | 19 | 269.5 KB |
| `/team/software` | 200 | 3 ms | 0.15 s | 0.16 s | 0.000 | 0 ms | 0.15 s | 0.04 s | — | 16 | 186.6 KB | 19 | 275.0 KB |
| `/does-not-exist` | 404 | 3 ms | 0.11 s | 0.11 s | 0.000 | 0 ms | 0.11 s | 0.04 s | — | 11 | 177.9 KB | 13 | 182.9 KB |

### Transferred bytes by type (KB, whole observation window, median)

| route | html | js | css | font | img | atlas | media | other | of which third-party |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | 1.9 (1) | 163.8 (4) | 9.5 (4) | 0.0 (1) | 158.2 (3) | 4757.2 (9) | 0.0 (0) | 0.0 (0) | 0.0 (4) |
| `/robo-hi` | 1.8 (1) | 168.7 (5) | 16.1 (10) | 0.0 (0) | 21.6 (6) | 0.0 (0) | 0.0 (0) | 0.0 (0) | 0.0 (8) |
| `/team/leads` | 1.8 (1) | 168.7 (5) | 16.1 (10) | 0.0 (0) | 82.9 (3) | 0.0 (0) | 0.0 (0) | 0.0 (0) | 0.0 (8) |
| `/team/software` | 1.8 (1) | 168.7 (5) | 16.1 (10) | 0.0 (0) | 88.3 (3) | 0.0 (0) | 0.0 (0) | 0.0 (0) | 0.0 (8) |
| `/does-not-exist` | 1.8 (1) | 165.1 (5) | 11.0 (5) | 0.0 (0) | 5.0 (2) | 0.0 (0) | 0.0 (0) | 0.0 (0) | 0.0 (3) |

_Cells are KB (request count). "atlas" = scrollytelling frame atlases; "img" = all other images._

### "/" readiness and repeat visit

| | cold (median) | warm repeat visit |
|---|---|---|
| ready | 0.41 s | 0.43 s |
| ready signal | performance.mark(genesis:ready) | performance.mark(genesis:ready) |
| FCP / LCP | 0.26 s / 1.00 s | 0.27 s / 1.01 s |
| load event | 0.05 s | 0.04 s |
| requests / bytes until ready | 22 / 4.97 MB | 22 / 0.4 KB |
| requests / bytes whole window | 22 / 4.97 MB | 22 / 0.4 KB |
| atlases requested / transferred | 9 / 4.65 MB | 9 / 0.0 KB |
| first atlas / last atlas done | 0.26 s / 0.32 s | 0.26 s / 0.32 s |
| served from cache / 304 revalidations | 0 / 0 | 17 / 1 |
| preloader overlay seen | no | no |
| LCP element | `h1.text-[clamp(4rem,10vw,9rem)].font-black.tracking-[-0.04em]` | `h1.text-[clamp(4rem,10vw,9rem)].font-black.tracking-[-0.04em]` |

### Run-to-run variance (min – max over cold runs)

| route | FCP | LCP | TBT | load | ready | bytes total | host CPU busy | visits retried / runs with failed requests |
|---|---|---|---|---|---|---|---|---|
| `/` | 0.25 s – 0.62 s | 0.98 s – 1.13 s | 0 ms – 0 ms | 0.04 s – 0.08 s | 0.40 s – 0.54 s | 4.97 MB – 4.97 MB | 23% – 29% | 0 / 0 |
| `/robo-hi` | 0.13 s – 0.20 s | 0.13 s – 0.20 s | 0 ms – 0 ms | 0.04 s – 0.05 s | — | 208.3 KB – 208.3 KB | 24% – 37% | 0 / 0 |
| `/team/leads` | 0.14 s – 0.27 s | 0.15 s – 0.27 s | 0 ms – 0 ms | 0.04 s – 0.05 s | — | 269.5 KB – 269.5 KB | 22% – 26% | 0 / 0 |
| `/team/software` | 0.14 s – 0.17 s | 0.14 s – 0.17 s | 0 ms – 0 ms | 0.04 s – 0.05 s | — | 275.0 KB – 275.0 KB | 24% – 30% | 0 / 0 |
| `/does-not-exist` | 0.10 s – 0.11 s | 0.10 s – 0.11 s | 0 ms – 0 ms | 0.04 s – 0.04 s | — | 182.9 KB – 182.9 KB | 19% – 24% | 0 / 0 |

<details><summary>LCP elements</summary>

- `/`: `h1.text-[clamp(4rem,10vw,9rem)].font-black.tracking-[-0.04em]`
- `/robo-hi`: `h2.departments-title.glowy-title`
- `/team/leads`: `img src=/assets/leads-bg-Ckr02KzA.avif`
- `/team/software`: `img src=/assets/ai-bg-B4puQ2le.avif`
- `/does-not-exist`: `h1.nf-title`

</details>

## mobile — medians of 3 cold-cache runs

| route | HTTP | TTFB | FCP | LCP | CLS | TBT | TTI | load | ready | req @load | bytes @load | req total | bytes total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` | 200 | 571 ms | 3.36 s | 4.11 s | 0.000 | 82 ms | 8.16 s | 2.23 s | 8.02 s | 10 | 175.2 KB | 21 | 4.82 MB |
| `/robo-hi` | 200 | 570 ms | 2.66 s | 3.15 s | 0.000 | 0 ms | 2.66 s | 2.31 s | — | 16 | 186.6 KB | 22 | 208.3 KB |
| `/team/leads` | 200 | 568 ms | 2.63 s | 2.63 s | 0.000 | 0 ms | 2.63 s | 2.31 s | — | 16 | 186.6 KB | 19 | 269.5 KB |
| `/team/software` | 200 | 571 ms | 2.61 s | 2.61 s | 0.000 | 0 ms | 2.61 s | 2.31 s | — | 16 | 186.6 KB | 19 | 275.0 KB |
| `/does-not-exist` | 404 | 569 ms | 2.54 s | 2.54 s | 0.000 | 0 ms | 2.54 s | 2.28 s | — | 11 | 177.9 KB | 13 | 182.9 KB |

### Transferred bytes by type (KB, whole observation window, median)

| route | html | js | css | font | img | atlas | media | other | of which third-party |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | 1.9 (1) | 163.8 (4) | 9.5 (4) | 0.0 (1) | 5.0 (2) | 4757.2 (9) | 0.0 (0) | 0.0 (0) | 0.0 (4) |
| `/robo-hi` | 1.8 (1) | 168.7 (5) | 16.1 (10) | 0.0 (0) | 21.6 (6) | 0.0 (0) | 0.0 (0) | 0.0 (0) | 0.0 (8) |
| `/team/leads` | 1.8 (1) | 168.7 (5) | 16.1 (10) | 0.0 (0) | 82.9 (3) | 0.0 (0) | 0.0 (0) | 0.0 (0) | 0.0 (8) |
| `/team/software` | 1.8 (1) | 168.7 (5) | 16.1 (10) | 0.0 (0) | 88.3 (3) | 0.0 (0) | 0.0 (0) | 0.0 (0) | 0.0 (8) |
| `/does-not-exist` | 1.8 (1) | 165.1 (5) | 11.0 (5) | 0.0 (0) | 5.0 (2) | 0.0 (0) | 0.0 (0) | 0.0 (0) | 0.0 (3) |

_Cells are KB (request count). "atlas" = scrollytelling frame atlases; "img" = all other images._

### "/" readiness and repeat visit

| | cold (median) | warm repeat visit |
|---|---|---|
| ready | 8.02 s | 2.12 s |
| ready signal | performance.mark(genesis:ready) | performance.mark(genesis:ready) |
| FCP / LCP | 3.36 s / 4.11 s | 1.82 s / 2.59 s |
| load event | 2.23 s | 0.70 s |
| requests / bytes until ready | 16 / 869.0 KB | 21 / 0.4 KB |
| requests / bytes whole window | 21 / 4.82 MB | 21 / 0.4 KB |
| atlases requested / transferred | 9 / 4.65 MB | 9 / 0.0 KB |
| first atlas / last atlas done | 7.89 s / 31.84 s | 1.85 s / 2.08 s |
| served from cache / 304 revalidations | 0 / 0 | 16 / 1 |
| preloader overlay seen | no | no |
| LCP element | `h1.text-[clamp(4rem,10vw,9rem)].font-black.tracking-[-0.04em]` | `h1.text-[clamp(4rem,10vw,9rem)].font-black.tracking-[-0.04em]` |

### Run-to-run variance (min – max over cold runs)

| route | FCP | LCP | TBT | load | ready | bytes total | host CPU busy | visits retried / runs with failed requests |
|---|---|---|---|---|---|---|---|---|
| `/` | 3.32 s – 3.38 s | 4.08 s – 4.13 s | 71 ms – 84 ms | 2.23 s – 2.24 s | 8.01 s – 8.06 s | 4.82 MB – 4.82 MB | 24% – 25% | 0 / 0 |
| `/robo-hi` | 2.65 s – 2.69 s | 3.14 s – 3.20 s | 0 ms – 0 ms | 2.30 s – 2.32 s | — | 208.3 KB – 208.3 KB | 27% – 35% | 0 / 0 |
| `/team/leads` | 2.61 s – 2.63 s | 2.61 s – 2.63 s | 0 ms – 0 ms | 2.30 s – 2.31 s | — | 269.5 KB – 269.5 KB | 26% – 32% | 0 / 0 |
| `/team/software` | 2.60 s – 2.65 s | 2.60 s – 2.65 s | 0 ms – 0 ms | 2.31 s – 2.31 s | — | 275.0 KB – 275.0 KB | 26% – 35% | 0 / 0 |
| `/does-not-exist` | 2.52 s – 2.56 s | 2.52 s – 2.56 s | 0 ms – 0 ms | 2.27 s – 2.28 s | — | 182.9 KB – 182.9 KB | 24% – 26% | 0 / 0 |

<details><summary>LCP elements</summary>

- `/`: `h1.text-[clamp(4rem,10vw,9rem)].font-black.tracking-[-0.04em]`
- `/robo-hi`: `img.node-icon src=/assets/electrical-CAdhTrP6.avif`
- `/team/leads`: `h1.leads-title`
- `/team/software`: `h1.software-ai-title`
- `/does-not-exist`: `p.nf-lead`

</details>

## Link previews (raw HTML, no JavaScript — what WhatsApp / LinkedIn / Slack bots see)

| route | HTTP | `<title>` | meta description | og:title | og:description | og:image | canonical | twitter:card |
|---|---|---|---|---|---|---|---|---|
| `/` | 200 | Team Genesis \| Humanoid Robotics Team of VIT Chennai | Team Genesis is the student humanoid robotics team of VIT C… | Team Genesis \| Humanoid Robotics Team of VIT Chen… | Team Genesis is the student humanoid robotics tea… | https://www.teamgenesisvitc.in/og-image.jpg | https://www.teamgenesisvitc.in/ | summary_large_image |
| `/robo-hi` | 200 | Meet the Team \| Team Genesis VIT Chennai | Meet the people behind Team Genesis, the humanoid robotics … | Meet the Team \| Team Genesis VIT Chennai | Meet the people behind Team Genesis, the humanoid… | https://www.teamgenesisvitc.in/og-image.jpg | https://www.teamgenesisvitc.in/robo-hi | summary_large_image |
| `/team/leads` | 200 | Leads \| Team Genesis VIT Chennai | The leads of Team Genesis, VIT Chennai, who connect ideas, … | Leads \| Team Genesis VIT Chennai | The leads of Team Genesis, VIT Chennai, who conne… | https://www.teamgenesisvitc.in/og-image.jpg | https://www.teamgenesisvitc.in/team/leads | summary_large_image |
| `/team/electrical` | 200 | Electrical and Control Systems \| Team Genesis VIT Chennai | The Electrical and Control Systems department of Team Genes… | Electrical and Control Systems \| Team Genesis VIT… | The Electrical and Control Systems department of … | https://www.teamgenesisvitc.in/og-image.jpg | https://www.teamgenesisvitc.in/team/electrical | summary_large_image |
| `/team/mechanical` | 200 | Mechanical and Design \| Team Genesis VIT Chennai | The Mechanical and Design department of Team Genesis, VIT C… | Mechanical and Design \| Team Genesis VIT Chennai | The Mechanical and Design department of Team Gene… | https://www.teamgenesisvitc.in/og-image.jpg | https://www.teamgenesisvitc.in/team/mechanical | summary_large_image |
| `/team/software` | 200 | Software and AI \| Team Genesis VIT Chennai | The Software and AI department of Team Genesis, VIT Chennai… | Software and AI \| Team Genesis VIT Chennai | The Software and AI department of Team Genesis, V… | https://www.teamgenesisvitc.in/og-image.jpg | https://www.teamgenesisvitc.in/team/software | summary_large_image |
| `/does-not-exist` | 404 | Page not found \| Team Genesis VIT Chennai | This page does not exist. Explore Team Genesis, the student… | Page not found \| Team Genesis VIT Chennai | This page does not exist. Explore Team Genesis, t… | https://www.teamgenesisvitc.in/og-image.jpg | (missing) | summary_large_image |

- og:image check: `http://127.0.0.1:8123/og-image.jpg` (production URL mapped onto the local origin) → HTTP 200, image/jpeg, 58.0 KB, 1200×630.
- Routes whose raw HTML contains visible text outside `<noscript>` (prerendered content): none.

