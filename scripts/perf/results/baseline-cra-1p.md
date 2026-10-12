# Page-load UX report: baseline-cra-1p

- **Measured:** 2026-10-11T17:21:01.110Z · label `baseline-cra-1p`
- **Source:** `--dir=build` served by the harness (http://127.0.0.1:8123) with Cloudflare-like static routing: html_handling `auto-trailing-slash`, not-found `single-page-application`, `_headers` none, `_redirects` none, default Cache-Control `public, max-age=0, must-revalidate`, compression br q4 / gzip 6 for text types.
- **Code:** worktree-agent-a0577bf1dff3377f6 @ 8545b6e — Improve SEO: meta tags, sitemap, robots, per-route titles
- **Third-party requests BLOCKED** (`--third-party=block`): first-party-only numbers; fonts fall back, FCP is not gated by Fontshare / Google Fonts.
- **Browser:** Chrome/154.0.8037.99 (headless=new, software raster), stock Chrome driven over CDP.
- **Host:** 13th Gen Intel(R) Core(TM) i7-13650HX (20 logical cores), 47.7 GB RAM, Windows_NT 10.0.26300 x64, Node v24.15.0.
- **Host benchmarkIndex** (Lighthouse-style, higher = faster): 20417 before, 25663 after the run. Lower = slower or busier machine; compare it across results, and a gap between the two values means the load changed during the run.
- **Host load during visits:** whole-machine CPU busy median 29 % (range 21–50 %), including the Chrome under test; before each visit the harness waited up to 30 s for < 50 %.

## Observations

- **What this is:** the same CRA build as `baseline-cra.md`, with every third-party request blocked (`--third-party=block`: the 4 Fontshare / Google Fonts stylesheets; the font files are then never requested). Pages render with fallback fonts. Use it to compare first-party changes with an "after" run made in the same mode; it is not what visitors see.
- **Much lower noise:** mobile FCP spread across runs is ≤ 0.13 s on every route and "/" ready is 136.31–136.34 s; desktop FCP is 0.13–0.78 s. In the live baseline the desktop FCP ranged 0.9–8.6 s because of third-party latency.
- **Cost of the third-party fonts on mobile** (live vs this run, medians): team pages FCP ~3.2–3.3 s vs ~2.6 s, "/" FCP 3.62 s vs 3.49 s.
- **First-party floor on mobile:** ~2.6 s FCP on the team pages = 570 ms document latency, then `main.js` (175 KB brotli at 1.44 Mbps) and `main.css`, then React rendering at 4× CPU. Nothing is visible before the JS bundle has run (client-side rendering, no prerendered HTML).
- **"/" is unchanged by blocking:** 54 requests / 23.0 MB, all 42 atlases requested at mount, ready (= last atlas) ~136 s on mobile, TBT ~11.7 s from atlas decode/upload on the main thread; desktop TBT ~470 ms.
- **Measurement conditions:** host benchmarkIndex 20 417 → 25 663 (≈ 35 000 when quiet), whole-machine CPU 21–50 % busy during visits; no failed or retried visits.

### Profiles

- **desktop:** 1600x900 @1x, no CPU or network throttling. Window ends after load + 5 s network quiet (cap 90 s).
- **mobile:** 412x915 @2.625x, touch, mobile UA, CPU 4x slowdown, DevTools "Slow 4G" (1.6 Mbps / 150 ms RTT, request-level: 1.44 Mbps, 562.5 ms). CDP network: latency 562.5 ms, down 1.44 Mbps, up 675 kbps. Window ends after load + 5 s network quiet (cap 300 s).

Metric notes: medians over cold runs, each in a fresh isolated browser context (empty HTTP cache, new connections). FCP/LCP/CLS from PerformanceObserver; TBT = Σ(long task − 50 ms) between FCP and TTI (Lighthouse definition; TTI = start of the first 5 s window with no long task and ≤ 2 requests in flight; `*` = not reached in every run, TBT then runs to the window end). Bytes are transferred bytes (headers + encoded body) from CDP, redirects included; "@load" = finished by the load event. "ready" applies to "/" only — see the readiness table for which signal was used.

## desktop — medians of 3 cold-cache runs

| route | HTTP | TTFB | FCP | LCP | CLS | TBT | TTI | load | ready | req @load | bytes @load | req total | bytes total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` | 200 | 3 ms | 0.30 s | 1.38 s | 0.000 | 469 ms | 3.34 s | 0.05 s | 0.40 s | 7 | 190.7 KB | 54 | 23.00 MB |
| `/robo-hi` | 200 | 4 ms | 0.19 s | 0.19 s | 0.000 | 0 ms | 0.19 s | 0.06 s | — | 7 | 190.7 KB | 13 | 1.00 MB |
| `/team/leads` | 200 | 4 ms | 0.18 s | 0.18 s | 0.000 | 0 ms | 0.18 s* | 0.05 s | — | 7 | 190.7 KB | 10 | 1.92 MB |
| `/team/software` | 200 | 3 ms | 0.17 s | 0.17 s | 0.000 | 0 ms | 0.17 s | 0.05 s | — | 7 | 190.7 KB | 10 | 1.84 MB |
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
| ready | 0.40 s | 0.41 s |
| ready signal | all requested atlases loaded (no preloader on page) | all requested atlases loaded (no preloader on page) |
| FCP / LCP | 0.30 s / 1.38 s | 0.34 s / 1.36 s |
| load event | 0.05 s | 0.06 s |
| requests / bytes until ready | 53 / 22.69 MB | 53 / 10.5 KB |
| requests / bytes whole window | 54 / 23.00 MB | 54 / 11.2 KB |
| atlases requested / transferred | 42 / 20.12 MB | 42 / 9.4 KB |
| first atlas / last atlas done | 0.32 s / 0.40 s | 0.36 s / 0.41 s |
| served from cache / 304 revalidations | 0 / 0 | 0 / 50 |
| preloader overlay seen | no | no |
| LCP element | `h1.text-[clamp(4rem,10vw,9rem)].font-black.tracking-[-0.04em]` | `h1.text-[clamp(4rem,10vw,9rem)].font-black.tracking-[-0.04em]` |

### Run-to-run variance (min – max over cold runs)

| route | FCP | LCP | TBT | load | ready | bytes total | host CPU busy | visits retried / runs with failed requests |
|---|---|---|---|---|---|---|---|---|
| `/` | 0.27 s – 0.78 s | 1.36 s – 1.46 s | 381 ms – 502 ms | 0.05 s – 0.10 s | 0.35 s – 0.60 s | 23.00 MB – 23.00 MB | 26% – 41% | 0 / 0 |
| `/robo-hi` | 0.13 s – 0.26 s | 0.13 s – 0.26 s | 0 ms – 0 ms | 0.05 s – 0.07 s | — | 1.00 MB – 1.00 MB | 26% – 50% | 0 / 0 |
| `/team/leads` | 0.17 s – 0.31 s | 0.17 s – 0.31 s | 0 ms – 0 ms | 0.05 s – 0.06 s | — | 1.92 MB – 1.92 MB | 22% – 46% | 0 / 0 |
| `/team/software` | 0.15 s – 0.19 s | 0.15 s – 0.19 s | 0 ms – 0 ms | 0.05 s – 0.06 s | — | 1.84 MB – 1.84 MB | 22% – 44% | 0 / 0 |
| `/does-not-exist` | n/a | n/a | n/a | 0.05 s – 0.06 s | — | 195.2 KB – 195.2 KB | 21% – 38% | 0 / 0 |

<details><summary>LCP elements</summary>

- `/`: `h1.text-[clamp(4rem,10vw,9rem)].font-black.tracking-[-0.04em]`
- `/robo-hi`: `h2.departments-title.glowy-title`
- `/team/leads`: `img src=/static/media/leads-bg.41947e10d11822a2d6dc.png`
- `/team/software`: `img src=/static/media/ai-bg.f9f8b8d449e20bb78ea3.png`

</details>

## mobile — medians of 3 cold-cache runs

| route | HTTP | TTFB | FCP | LCP | CLS | TBT | TTI | load | ready | req @load | bytes @load | req total | bytes total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` | 200 | 570 ms | 3.49 s | 4.42 s | 0.000 | 11730 ms | 136.65 s | 2.33 s | 136.34 s | 7 | 190.7 KB | 54 | 23.03 MB |
| `/robo-hi` | 200 | 568 ms | 2.66 s | 7.79 s | 0.000 | 0 ms | 2.66 s | 2.33 s | — | 7 | 190.7 KB | 13 | 1.00 MB |
| `/team/leads` | 200 | 570 ms | 2.62 s | 2.62 s | 0.000 | 0 ms | 2.62 s | 2.34 s | — | 7 | 190.7 KB | 10 | 1.92 MB |
| `/team/software` | 200 | 569 ms | 2.57 s | 2.57 s | 0.000 | 0 ms | 2.57 s | 2.34 s | — | 7 | 190.7 KB | 10 | 1.84 MB |
| `/does-not-exist` | 200 | 571 ms | n/a | n/a | 0.000 | n/a | not reached | 2.33 s | — | 7 | 190.7 KB | 9 | 195.2 KB |

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
| ready | 136.34 s | 7.72 s |
| ready signal | all requested atlases loaded (no preloader on page) | all requested atlases loaded (no preloader on page) |
| FCP / LCP | 3.49 s / 4.42 s | 2.76 s / 6.24 s |
| load event | 2.33 s | 1.33 s |
| requests / bytes until ready | 54 / 23.03 MB | 54 / 11.2 KB |
| requests / bytes whole window | 54 / 23.03 MB | 54 / 11.2 KB |
| atlases requested / transferred | 42 / 20.12 MB | 42 / 9.4 KB |
| first atlas / last atlas done | 26.44 s / 136.34 s | 3.74 s / 7.72 s |
| served from cache / 304 revalidations | 0 / 0 | 0 / 50 |
| preloader overlay seen | no | no |
| LCP element | `h1.text-[clamp(4rem,10vw,9rem)].font-black.tracking-[-0.04em]` | `h1.text-[clamp(4rem,10vw,9rem)].font-black.tracking-[-0.04em]` |

### Run-to-run variance (min – max over cold runs)

| route | FCP | LCP | TBT | load | ready | bytes total | host CPU busy | visits retried / runs with failed requests |
|---|---|---|---|---|---|---|---|---|
| `/` | 3.39 s – 3.52 s | 4.31 s – 4.44 s | 10539 ms – 13309 ms | 2.32 s – 2.33 s | 136.31 s – 136.34 s | 23.03 MB – 23.03 MB | 26% – 31% | 0 / 0 |
| `/robo-hi` | 2.65 s – 2.73 s | 7.76 s – 7.84 s | 0 ms – 0 ms | 2.33 s – 2.34 s | — | 1.00 MB – 1.00 MB | 29% – 34% | 0 / 0 |
| `/team/leads` | 2.60 s – 2.63 s | 2.60 s – 2.63 s | 0 ms – 0 ms | 2.33 s – 2.35 s | — | 1.92 MB – 1.92 MB | 28% – 33% | 0 / 0 |
| `/team/software` | 2.57 s – 2.62 s | 2.57 s – 2.62 s | 0 ms – 0 ms | 2.33 s – 2.35 s | — | 1.84 MB – 1.84 MB | 26% – 37% | 0 / 0 |
| `/does-not-exist` | n/a | n/a | n/a | 2.32 s – 2.33 s | — | 195.2 KB – 195.2 KB | 25% – 28% | 0 / 0 |

<details><summary>LCP elements</summary>

- `/`: `h1.text-[clamp(4rem,10vw,9rem)].font-black.tracking-[-0.04em]`
- `/robo-hi`: `img.node-icon src=/static/media/electrical.fa88d584f40102b1b1d1.png`
- `/team/leads`: `h1.leads-title`
- `/team/software`: `h1.software-ai-title`

</details>

