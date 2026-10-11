# Before / after: `baseline-cra-quiet` → `after-vite`

- **Before:** --dir=..\agent-a0577bf1dff3377f6\build (harness server, 404=single-page-application, _headers none) · 7982d46 · 2026-10-11T17:56:29.982Z · Chrome/154.0.8037.99 · benchmarkIndex 23070
- **After:** --dir=dist\client (harness server, 404=404-page, _headers 15 rules) · 7982d46 · 2026-10-11T18:10:58.160Z · Chrome/154.0.8037.99 · benchmarkIndex 24582

Cells: before median → after median (relative change). Lower is better for every row. `~noise` = the after median lies inside the before run range (or the before median inside the after range), so the difference is not distinguishable from run-to-run variance. Byte counts are deterministic and rarely noisy; timings are. Compare runs made on the same machine under similar load (see benchmarkIndex).

## desktop

| metric | `/` | `/robo-hi` | `/team/leads` | `/team/software` | `/does-not-exist` |
|---|---|---|---|---|---|
| HTTP status | 200 | 200 | 200 | 200 | **200 → 404** |
| TTFB | 3 ms → 4 ms (+33% ~noise) | 4 ms → 3 ms (-25% ~noise) | 3 ms → 4 ms (+33% ~noise) | 4 ms → 3 ms (-25% ~noise) | 3 ms → 3 ms (0%) |
| FCP | 0.29 s → 0.26 s (-11% ~noise) | 0.14 s → 0.13 s (-8% ~noise) | 0.16 s → 0.15 s (-10% ~noise) | 0.16 s → 0.15 s (-10% ~noise) | n/a → 0.11 s |
| LCP | 1.12 s → 1.00 s (-11% ~noise) | 0.14 s → 0.13 s (-8% ~noise) | 0.16 s → 0.15 s (-10% ~noise) | 0.16 s → 0.16 s (-5% ~noise) | n/a → 0.11 s |
| CLS | 0.000 → 0.000 (0%) | 0.000 → 0.000 (0%) | 0.000 → 0.000 (0%) | 0.000 → 0.000 (0%) | 0.000 → 0.000 (0%) |
| TBT | 348 ms → 0 ms (-100% better) | 0 ms → 0 ms (0%) | 0 ms → 0 ms (0%) | 0 ms → 0 ms (0%) | n/a → 0 ms |
| TTI | 3.22 s → 0.25 s (-92% better) | 0.14 s → 0.13 s (-8% ~noise) | 0.16 s → 0.14 s (-12% better) | 0.16 s → 0.15 s (-10% ~noise) | n/a → 0.11 s |
| load event | 0.05 s → 0.05 s (0%) | 0.05 s → 0.05 s (-2% ~noise) | 0.05 s → 0.04 s (-10% ~noise) | 0.05 s → 0.04 s (-10% better) | 0.05 s → 0.04 s (-4% better) |
| ready ("/" only) | 0.38 s → 0.41 s (+9% ~noise) | — | — | — | — |
| requests until load | 7 → 10 (+43% worse) | 7 → 16 (+129% worse) | 7 → 16 (+129% worse) | 7 → 16 (+129% worse) | 7 → 11 (+57% worse) |
| bytes until load | 190.7 KB → 175.2 KB (-8% better) | 190.7 KB → 186.6 KB (-2% better) | 190.7 KB → 186.6 KB (-2% better) | 190.7 KB → 186.6 KB (-2% better) | 190.7 KB → 177.9 KB (-7% better) |
| requests until ready | 53 → 22 (-58% better) | — | — | — | — |
| bytes until ready | 23.00 MB → 4.97 MB (-78% better) | — | — | — | — |
| requests (whole window) | 54 → 22 (-59% better) | 13 → 22 (+69% worse) | 10 → 19 (+90% worse) | 10 → 19 (+90% worse) | 9 → 13 (+44% worse) |
| bytes (whole window) | 23.00 MB → 4.97 MB (-78% better) | 1.00 MB → 208.3 KB (-80% better) | 1.92 MB → 269.5 KB (-86% better) | 1.84 MB → 275.0 KB (-85% better) | 195.2 KB → 182.9 KB (-6% better) |
| bytes: HTML | 1.4 KB → 1.9 KB (+32% worse) | 1.4 KB → 1.8 KB (+28% worse) | 1.4 KB → 1.8 KB (+28% worse) | 1.4 KB → 1.8 KB (+28% worse) | 1.4 KB → 1.8 KB (+25% worse) |
| bytes: JS | 175.3 KB → 163.8 KB (-7% better) | 175.3 KB → 168.7 KB (-4% better) | 175.3 KB → 168.7 KB (-4% better) | 175.3 KB → 168.7 KB (-4% better) | 175.3 KB → 165.1 KB (-6% better) |
| bytes: CSS | 14.0 KB → 9.5 KB (-32% better) | 14.0 KB → 16.1 KB (+15% worse) | 14.0 KB → 16.1 KB (+15% worse) | 14.0 KB → 16.1 KB (+15% worse) | 14.0 KB → 11.0 KB (-21% better) |
| bytes: fonts | 0.0 KB → 0.0 KB (0%) | 0.0 KB → 0.0 KB (0%) | 0.0 KB → 0.0 KB (0%) | 0.0 KB → 0.0 KB (0%) | 0.0 KB → 0.0 KB (0%) |
| bytes: images | 2.69 MB → 158.2 KB (-94% better) | 836.2 KB → 21.6 KB (-97% better) | 1.73 MB → 82.9 KB (-95% better) | 1.66 MB → 88.3 KB (-95% better) | 4.6 KB → 5.0 KB (+10% worse) |
| bytes: atlases | 20.12 MB → 4.65 MB (-77% better) | 0.0 KB → 0.0 KB (0%) | 0.0 KB → 0.0 KB (0%) | 0.0 KB → 0.0 KB (0%) | 0.0 KB → 0.0 KB (0%) |
| bytes: third-party | 0.0 KB → 0.0 KB (0%) | 0.0 KB → 0.0 KB (0%) | 0.0 KB → 0.0 KB (0%) | 0.0 KB → 0.0 KB (0%) | 0.0 KB → 0.0 KB (0%) |
| long tasks total | 1416 ms → 157 ms (-89% better) | 0 ms → 0 ms (0%) | 0 ms → 0 ms (0%) | 0 ms → 0 ms (0%) | 0 ms → 0 ms (0%) |

### desktop: "/" warm repeat visit (single run each)

| metric | before → after |
|---|---|
| FCP | 0.28 s → 0.27 s (-6% better) |
| LCP | 1.30 s → 1.01 s (-23% better) |
| load event | 0.05 s → 0.04 s (-9% better) |
| ready ("/" only) | 0.32 s → 0.43 s (+33% worse) |
| requests (whole window) | 54 → 22 (-59% better) |
| bytes (whole window) | 11.2 KB → 0.4 KB (-96% better) |
| requests revalidated (304) | 50 → 1 (-98% better) |
| requests served from cache | 0 → 17 (new worse) |

"/" ready signal — before: all requested atlases loaded (no preloader on page); after: performance.mark(genesis:ready).

## mobile

| metric | `/` | `/robo-hi` | `/team/leads` | `/team/software` | `/does-not-exist` |
|---|---|---|---|---|---|
| HTTP status | 200 | 200 | 200 | 200 | **200 → 404** |
| TTFB | 568 ms → 571 ms (+1%) | 570 ms → 570 ms (0%) | 567 ms → 568 ms (+0%) | 569 ms → 571 ms (+0%) | 569 ms → 569 ms (0%) |
| FCP | 3.46 s → 3.36 s (-3% better) | 2.61 s → 2.66 s (+2% ~noise) | 2.58 s → 2.63 s (+2% ~noise) | 2.57 s → 2.61 s (+2% worse) | n/a → 2.54 s |
| LCP | 4.36 s → 4.11 s (-6% better) | 7.76 s → 3.15 s (-59% better) | 2.58 s → 2.63 s (+2% ~noise) | 2.57 s → 2.61 s (+2% worse) | n/a → 2.54 s |
| CLS | 0.000 → 0.000 (-100% better) | 0.000 → 0.000 (0%) | 0.000 → 0.000 (0%) | 0.000 → 0.000 (0%) | 0.000 → 0.000 (0%) |
| TBT | 11147 ms → 82 ms (-99% better) | 0 ms → 0 ms (0%) | 0 ms → 0 ms (0%) | 0 ms → 0 ms (0%) | n/a → 0 ms |
| TTI | 136.60 s → 8.16 s (-94% better) | 2.61 s → 2.66 s (+2% ~noise) | 2.58 s → 2.63 s (+2% ~noise) | 2.57 s → 2.61 s (+2% worse) | n/a → 2.54 s |
| load event | 2.32 s → 2.23 s (-4% better) | 2.32 s → 2.31 s (-1%) | 2.33 s → 2.31 s (-1%) | 2.32 s → 2.31 s (-1%) | 2.32 s → 2.28 s (-2% better) |
| ready ("/" only) | 136.31 s → 8.02 s (-94% better) | — | — | — | — |
| requests until load | 7 → 10 (+43% worse) | 7 → 16 (+129% worse) | 7 → 16 (+129% worse) | 7 → 16 (+129% worse) | 7 → 11 (+57% worse) |
| bytes until load | 190.7 KB → 175.2 KB (-8% better) | 190.7 KB → 186.6 KB (-2% better) | 190.7 KB → 186.6 KB (-2% better) | 190.7 KB → 186.6 KB (-2% better) | 190.7 KB → 177.9 KB (-7% better) |
| requests until ready | 54 → 16 (-70% better) | — | — | — | — |
| bytes until ready | 23.03 MB → 869.0 KB (-96% better) | — | — | — | — |
| requests (whole window) | 54 → 21 (-61% better) | 13 → 22 (+69% worse) | 10 → 19 (+90% worse) | 10 → 19 (+90% worse) | 9 → 13 (+44% worse) |
| bytes (whole window) | 23.03 MB → 4.82 MB (-79% better) | 1.00 MB → 208.3 KB (-80% better) | 1.92 MB → 269.5 KB (-86% better) | 1.84 MB → 275.0 KB (-85% better) | 195.2 KB → 182.9 KB (-6% better) |
| bytes: HTML | 1.4 KB → 1.9 KB (+32% worse) | 1.4 KB → 1.8 KB (+28% worse) | 1.4 KB → 1.8 KB (+28% worse) | 1.4 KB → 1.8 KB (+28% worse) | 1.4 KB → 1.8 KB (+25% worse) |
| bytes: JS | 175.3 KB → 163.8 KB (-7% better) | 175.3 KB → 168.7 KB (-4% better) | 175.3 KB → 168.7 KB (-4% better) | 175.3 KB → 168.7 KB (-4% better) | 175.3 KB → 165.1 KB (-6% better) |
| bytes: CSS | 14.0 KB → 9.5 KB (-32% better) | 14.0 KB → 16.1 KB (+15% worse) | 14.0 KB → 16.1 KB (+15% worse) | 14.0 KB → 16.1 KB (+15% worse) | 14.0 KB → 11.0 KB (-21% better) |
| bytes: fonts | 0.0 KB → 0.0 KB (0%) | 0.0 KB → 0.0 KB (0%) | 0.0 KB → 0.0 KB (0%) | 0.0 KB → 0.0 KB (0%) | 0.0 KB → 0.0 KB (0%) |
| bytes: images | 2.72 MB → 5.0 KB (-100% better) | 836.2 KB → 21.6 KB (-97% better) | 1.73 MB → 82.9 KB (-95% better) | 1.66 MB → 88.3 KB (-95% better) | 4.6 KB → 5.0 KB (+10% worse) |
| bytes: atlases | 20.12 MB → 4.65 MB (-77% better) | 0.0 KB → 0.0 KB (0%) | 0.0 KB → 0.0 KB (0%) | 0.0 KB → 0.0 KB (0%) | 0.0 KB → 0.0 KB (0%) |
| bytes: third-party | 0.0 KB → 0.0 KB (0%) | 0.0 KB → 0.0 KB (0%) | 0.0 KB → 0.0 KB (0%) | 0.0 KB → 0.0 KB (0%) | 0.0 KB → 0.0 KB (0%) |
| long tasks total | 14429 ms → 1349 ms (-91% better) | 325 ms → 306 ms (-6% better) | 287 ms → 279 ms (-3% ~noise) | 268 ms → 249 ms (-7% ~noise) | 76 ms → 228 ms (+200% worse) |

### mobile: "/" warm repeat visit (single run each)

| metric | before → after |
|---|---|
| FCP | 2.39 s → 1.82 s (-24% better) |
| LCP | 5.63 s → 2.59 s (-54% better) |
| load event | 1.27 s → 0.70 s (-45% better) |
| ready ("/" only) | 7.13 s → 2.12 s (-70% better) |
| requests (whole window) | 54 → 21 (-61% better) |
| bytes (whole window) | 11.2 KB → 0.4 KB (-96% better) |
| requests revalidated (304) | 50 → 1 (-98% better) |
| requests served from cache | 0 → 16 (new worse) |

"/" ready signal — before: all requested atlases loaded (no preloader on page); after: performance.mark(genesis:ready).

## Link previews (raw HTML)

| route | HTTP | title | og:title | og:description | canonical | og:image |
|---|---|---|---|---|---|---|
| `/` | 200 | Team Genesis \| Humanoid Robotics Team of VIT… | Team Genesis \| Humanoid Robotics Team of VIT… | Student humanoid robotics team of VIT Chenna… → **Team Genesis is the student humanoid robotic…** | https://www.teamgenesisvitc.in/ | https://www.teamgenesisvitc.in/og-image.jpg |
| `/robo-hi` | 200 | Team Genesis \| Humanoid Robotics Team of VIT… → **Meet the Team \| Team Genesis VIT Chennai** | Team Genesis \| Humanoid Robotics Team of VIT… → **Meet the Team \| Team Genesis VIT Chennai** | Student humanoid robotics team of VIT Chenna… → **Meet the people behind Team Genesis, the hum…** | https://www.teamgenesisvitc.in/ → **https://www.teamgenesisvitc.in/robo-hi** | https://www.teamgenesisvitc.in/og-image.jpg |
| `/team/leads` | 200 | Team Genesis \| Humanoid Robotics Team of VIT… → **Leads \| Team Genesis VIT Chennai** | Team Genesis \| Humanoid Robotics Team of VIT… → **Leads \| Team Genesis VIT Chennai** | Student humanoid robotics team of VIT Chenna… → **The leads of Team Genesis, VIT Chennai, who …** | https://www.teamgenesisvitc.in/ → **https://www.teamgenesisvitc.in/team/leads** | https://www.teamgenesisvitc.in/og-image.jpg |
| `/team/electrical` | 200 | Team Genesis \| Humanoid Robotics Team of VIT… → **Electrical and Control Systems \| Team Genesi…** | Team Genesis \| Humanoid Robotics Team of VIT… → **Electrical and Control Systems \| Team Genesi…** | Student humanoid robotics team of VIT Chenna… → **The Electrical and Control Systems departmen…** | https://www.teamgenesisvitc.in/ → **https://www.teamgenesisvitc.in/team/electric…** | https://www.teamgenesisvitc.in/og-image.jpg |
| `/team/mechanical` | 200 | Team Genesis \| Humanoid Robotics Team of VIT… → **Mechanical and Design \| Team Genesis VIT Che…** | Team Genesis \| Humanoid Robotics Team of VIT… → **Mechanical and Design \| Team Genesis VIT Che…** | Student humanoid robotics team of VIT Chenna… → **The Mechanical and Design department of Team…** | https://www.teamgenesisvitc.in/ → **https://www.teamgenesisvitc.in/team/mechanic…** | https://www.teamgenesisvitc.in/og-image.jpg |
| `/team/software` | 200 | Team Genesis \| Humanoid Robotics Team of VIT… → **Software and AI \| Team Genesis VIT Chennai** | Team Genesis \| Humanoid Robotics Team of VIT… → **Software and AI \| Team Genesis VIT Chennai** | Student humanoid robotics team of VIT Chenna… → **The Software and AI department of Team Genes…** | https://www.teamgenesisvitc.in/ → **https://www.teamgenesisvitc.in/team/software** | https://www.teamgenesisvitc.in/og-image.jpg |
| `/does-not-exist` | 200 → **404** | Team Genesis \| Humanoid Robotics Team of VIT… → **Page not found \| Team Genesis VIT Chennai** | Team Genesis \| Humanoid Robotics Team of VIT… → **Page not found \| Team Genesis VIT Chennai** | Student humanoid robotics team of VIT Chenna… → **This page does not exist. Explore Team Genes…** | https://www.teamgenesisvitc.in/ → **(missing)** | https://www.teamgenesisvitc.in/og-image.jpg |

