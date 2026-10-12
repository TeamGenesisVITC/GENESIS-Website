# Page-load UX report: baseline-cra-quiet

- **Measured:** 2026-10-11T17:56:29.982Z · label `baseline-cra-quiet`
- **Source:** `--dir=..\agent-a0577bf1dff3377f6\build` served by the harness (http://127.0.0.1:8123) with Cloudflare-like static routing: html_handling `auto-trailing-slash`, not-found `single-page-application`, `_headers` none, `_redirects` none, default Cache-Control `public, max-age=0, must-revalidate`, compression br q4 / gzip 6 for text types.
- **Code:** infra/cloudflare-prep @ 7982d46 — Wire perf scripts; mark landing ready; lint fixes in ScrollCanvas
- **Third-party requests BLOCKED** (`--third-party=block`): first-party-only numbers; fonts fall back, FCP is not gated by Fontshare / Google Fonts.
- **Browser:** Chrome/154.0.8037.99 (headless=new, software raster), stock Chrome driven over CDP.
- **Host:** 13th Gen Intel(R) Core(TM) i7-13650HX (20 logical cores), 47.7 GB RAM, Windows_NT 10.0.26300 x64, Node v24.15.0.
- **Host benchmarkIndex** (Lighthouse-style, higher = faster): 23070 before, 25977 after the run. Lower = slower or busier machine; compare it across results, and a gap between the two values means the load changed during the run.
- **Host load during visits:** whole-machine CPU busy median 26 % (range 19–31 %), including the Chrome under test; before each visit the harness waited up to 30 s for < 50 %.

### Profiles

- **desktop:** 1600x900 @1x, no CPU or network throttling. Window ends after load + 5 s network quiet (cap 90 s).
- **mobile:** 412x915 @2.625x, touch, mobile UA, CPU 4x slowdown, DevTools "Slow 4G" (1.6 Mbps / 150 ms RTT, request-level: 1.44 Mbps, 562.5 ms). CDP network: latency 562.5 ms, down 1.44 Mbps, up 675 kbps. Window ends after load + 5 s network quiet (cap 300 s).

Metric notes: medians over cold runs, each in a fresh isolated browser context (empty HTTP cache, new connections). FCP/LCP/CLS from PerformanceObserver; TBT = Σ(long task − 50 ms) between FCP and TTI (Lighthouse definition; TTI = start of the first 5 s window with no long task and ≤ 2 requests in flight; `*` = not reached in every run, TBT then runs to the window end). Bytes are transferred bytes (headers + encoded body) from CDP, redirects included; "@load" = finished by the load event. "ready" applies to "/" only — see the readiness table for which signal was used.

## desktop — medians of 3 cold-cache runs

| route | HTTP | TTFB | FCP | LCP | CLS | TBT | TTI | load | ready | req @load | bytes @load | req total | bytes total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` | 200 | 3 ms | 0.29 s | 1.12 s | 0.000 | 348 ms | 3.22 s | 0.05 s | 0.38 s | 7 | 190.7 KB | 54 | 23.00 MB |
| `/robo-hi` | 200 | 4 ms | 0.14 s | 0.14 s | 0.000 | 0 ms | 0.14 s | 0.05 s | — | 7 | 190.7 KB | 13 | 1.00 MB |
| `/team/leads` | 200 | 3 ms | 0.16 s | 0.16 s | 0.000 | 0 ms | 0.16 s | 0.05 s | — | 7 | 190.7 KB | 10 | 1.92 MB |
| `/team/software` | 200 | 4 ms | 0.16 s | 0.16 s | 0.000 | 0 ms | 0.16 s | 0.05 s | — | 7 | 190.7 KB | 10 | 1.84 MB |
| `/does-not-exist` | 200 | 3 ms | n/a | n/a | 0.000 | n/a | not reached | 0.05 s | — | 7 | 190.7 KB | 9 | 195.2 KB |

### Transferred bytes by type (KB, whole observation window, median)

| route | html | js | css | font | img | atlas | media | other | of which third-party |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | 1.4 (1) | 175.3 (1) | 14.0 (5) | 0.0 (0) | 2756.4 (5) | 20602.8 (42) | 0.0 (0) | 0.0 (0) | 0.0 (4) |
| `/robo-hi` | 1.4 (1) | 175.3 (1) | 14.0 (5) | 0.0 (0) | 836.2 (6) | 0.0 (0) | 0.0 (0) | 0.0 (0) | 0.0 (4) |
| `/team/leads` | 1.4 (1) | 175.3 (1) | 14.0 (5) | 0.0 (0) | 1771.4 (3) | 0.0 (0) | 0.0 (0) | 0.0 (0) | 0.0 (4) |
| `/team/software` | 1.4 (1) | 175.3 (1) | 14.0 (5) | 0.0 (0) | 1698.1 (3) | 0.0 (0) | 0.0 (0) | 0.0 (0) | 0.0 (4) |
| `/does-not-exist` | 1.4 (1) | 175.3 (1) | 14.0 (5) | 0.0 (0) | 4.6 (2) | 0.0 (0) | 0.0 (0) | 0.0 (0) | 0.0 (4) |

_Cells are KB (request count). "atlas" = scrollytelling frame atlases; "img" = all other images._

### "/" readiness and repeat visit

| | cold (median) | warm repeat visit |
|---|---|---|
| ready | 0.38 s | 0.32 s |
| ready signal | all requested atlases loaded (no preloader on page) | all requested atlases loaded (no preloader on page) |
| FCP / LCP | 0.29 s / 1.12 s | 0.28 s / 1.30 s |
| load event | 0.05 s | 0.05 s |
| requests / bytes until ready | 53 / 23.00 MB | 53 / 11.0 KB |
| requests / bytes whole window | 54 / 23.00 MB | 54 / 11.2 KB |
| atlases requested / transferred | 42 / 20.12 MB | 42 / 9.4 KB |
| first atlas / last atlas done | 0.30 s / 0.38 s | 0.28 s / 0.32 s |
| served from cache / 304 revalidations | 0 / 0 | 0 / 50 |
| preloader overlay seen | no | no |
| LCP element | `h1.text-[clamp(4rem,10vw,9rem)].font-black.tracking-[-0.04em]` | `h1.text-[clamp(4rem,10vw,9rem)].font-black.tracking-[-0.04em]` |

### Run-to-run variance (min – max over cold runs)

| route | FCP | LCP | TBT | load | ready | bytes total | host CPU busy | visits retried / runs with failed requests |
|---|---|---|---|---|---|---|---|---|
| `/` | 0.28 s – 0.62 s | 1.07 s – 1.22 s | 327 ms – 354 ms | 0.05 s – 0.06 s | 0.35 s – 0.46 s | 23.00 MB – 23.00 MB | 26% – 30% | 0 / 0 |
| `/robo-hi` | 0.12 s – 0.21 s | 0.12 s – 0.21 s | 0 ms – 0 ms | 0.05 s – 0.05 s | — | 1.00 MB – 1.00 MB | 25% – 30% | 0 / 0 |
| `/team/leads` | 0.16 s – 0.24 s | 0.16 s – 0.24 s | 0 ms – 0 ms | 0.05 s – 0.05 s | — | 1.92 MB – 1.92 MB | 22% – 29% | 0 / 0 |
| `/team/software` | 0.16 s – 0.17 s | 0.16 s – 0.17 s | 0 ms – 0 ms | 0.05 s – 0.05 s | — | 1.84 MB – 1.84 MB | 21% – 26% | 0 / 0 |
| `/does-not-exist` | n/a | n/a | n/a | 0.04 s – 0.05 s | — | 195.2 KB – 195.2 KB | 19% – 23% | 0 / 0 |

<details><summary>LCP elements</summary>

- `/`: `h1.text-[clamp(4rem,10vw,9rem)].font-black.tracking-[-0.04em]`
- `/robo-hi`: `h2.departments-title.glowy-title`
- `/team/leads`: `img src=/static/media/leads-bg.41947e10d11822a2d6dc.png`
- `/team/software`: `img src=/static/media/ai-bg.f9f8b8d449e20bb78ea3.png`

</details>

## mobile — medians of 3 cold-cache runs

| route | HTTP | TTFB | FCP | LCP | CLS | TBT | TTI | load | ready | req @load | bytes @load | req total | bytes total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` | 200 | 568 ms | 3.46 s | 4.36 s | 0.000 | 11147 ms | 136.60 s | 2.32 s | 136.31 s | 7 | 190.7 KB | 54 | 23.03 MB |
| `/robo-hi` | 200 | 570 ms | 2.61 s | 7.76 s | 0.000 | 0 ms | 2.61 s | 2.32 s | — | 7 | 190.7 KB | 13 | 1.00 MB |
| `/team/leads` | 200 | 567 ms | 2.58 s | 2.58 s | 0.000 | 0 ms | 2.58 s | 2.33 s | — | 7 | 190.7 KB | 10 | 1.92 MB |
| `/team/software` | 200 | 569 ms | 2.57 s | 2.57 s | 0.000 | 0 ms | 2.57 s | 2.32 s | — | 7 | 190.7 KB | 10 | 1.84 MB |
| `/does-not-exist` | 200 | 569 ms | n/a | n/a | 0.000 | n/a | not reached | 2.32 s | — | 7 | 190.7 KB | 9 | 195.2 KB |

### Transferred bytes by type (KB, whole observation window, median)

| route | html | js | css | font | img | atlas | media | other | of which third-party |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | 1.4 (1) | 175.3 (1) | 14.0 (5) | 0.0 (0) | 2787.6 (5) | 20602.8 (42) | 0.0 (0) | 0.0 (0) | 0.0 (4) |
| `/robo-hi` | 1.4 (1) | 175.3 (1) | 14.0 (5) | 0.0 (0) | 836.2 (6) | 0.0 (0) | 0.0 (0) | 0.0 (0) | 0.0 (4) |
| `/team/leads` | 1.4 (1) | 175.3 (1) | 14.0 (5) | 0.0 (0) | 1771.4 (3) | 0.0 (0) | 0.0 (0) | 0.0 (0) | 0.0 (4) |
| `/team/software` | 1.4 (1) | 175.3 (1) | 14.0 (5) | 0.0 (0) | 1698.1 (3) | 0.0 (0) | 0.0 (0) | 0.0 (0) | 0.0 (4) |
| `/does-not-exist` | 1.4 (1) | 175.3 (1) | 14.0 (5) | 0.0 (0) | 4.6 (2) | 0.0 (0) | 0.0 (0) | 0.0 (0) | 0.0 (4) |

_Cells are KB (request count). "atlas" = scrollytelling frame atlases; "img" = all other images._

### "/" readiness and repeat visit

| | cold (median) | warm repeat visit |
|---|---|---|
| ready | 136.31 s | 7.13 s |
| ready signal | all requested atlases loaded (no preloader on page) | all requested atlases loaded (no preloader on page) |
| FCP / LCP | 3.46 s / 4.36 s | 2.39 s / 5.63 s |
| load event | 2.32 s | 1.27 s |
| requests / bytes until ready | 54 / 23.03 MB | 54 / 11.0 KB |
| requests / bytes whole window | 54 / 23.03 MB | 54 / 11.2 KB |
| atlases requested / transferred | 42 / 20.12 MB | 42 / 9.4 KB |
| first atlas / last atlas done | 26.45 s / 136.31 s | 3.15 s / 7.13 s |
| served from cache / 304 revalidations | 0 / 0 | 0 / 50 |
| preloader overlay seen | no | no |
| LCP element | `h1.text-[clamp(4rem,10vw,9rem)].font-black.tracking-[-0.04em]` | `h1.text-[clamp(4rem,10vw,9rem)].font-black.tracking-[-0.04em]` |

### Run-to-run variance (min – max over cold runs)

| route | FCP | LCP | TBT | load | ready | bytes total | host CPU busy | visits retried / runs with failed requests |
|---|---|---|---|---|---|---|---|---|
| `/` | 3.44 s – 3.50 s | 4.34 s – 4.40 s | 9800 ms – 11239 ms | 2.32 s – 2.33 s | 136.31 s – 136.34 s | 23.03 MB – 23.03 MB | 23% – 25% | 0 / 0 |
| `/robo-hi` | 2.60 s – 2.68 s | 7.75 s – 7.78 s | 0 ms – 0 ms | 2.32 s – 2.34 s | — | 1.00 MB – 1.00 MB | 27% – 29% | 0 / 0 |
| `/team/leads` | 2.56 s – 2.65 s | 2.56 s – 2.65 s | 0 ms – 0 ms | 2.31 s – 2.34 s | — | 1.92 MB – 1.92 MB | 26% – 27% | 0 / 0 |
| `/team/software` | 2.55 s – 2.58 s | 2.55 s – 2.58 s | 0 ms – 0 ms | 2.31 s – 2.34 s | — | 1.84 MB – 1.84 MB | 25% – 26% | 0 / 0 |
| `/does-not-exist` | n/a | n/a | n/a | 2.32 s – 2.33 s | — | 195.2 KB – 195.2 KB | 23% – 31% | 0 / 0 |

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

