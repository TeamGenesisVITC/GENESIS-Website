# Scroll smoothness — final-after

- **When / what:** 2026-10-12T04:57:51.143Z · commit cdf9c8e (dirty) · target --dir dist\client (404-page)
- **Browser:** Chrome/154.0.8037.99 · headed (real GPU path, window must stay visible) · GPU: ANGLE (Intel, Intel(R) UHD Graphics (0x0000A78B) Direct3D11 vs_5_0 ps_5_0, D3D11-32.0.101.6790)
- **Display:** 165 Hz (vsync 6.061 ms, from ScrollJankV4.vsync_interval_us) · DPR 1.33 (native) · viewport 1440x900
- **Gesture:** Input.synthesizeScrollGesture, mouse source, 1500 px/s, ≤ 1500 px per gesture, downwards, center-aligned in each section
- **Design:** 5 runs per target, order shuffled per round (seed 779709060), calibration page shuffled in like a section; 1 discarded warm-up round first; every measurement re-navigates the one tab (via about:blank) with a warm HTTP cache; trace `full` (viz, input.scrolling, devtools.timeline, disabled-by-default-devtools.timeline)
- **State before each gesture:** fresh document, HTTP cache warm (warm-up round); waited for load, network idle, fonts, the landing's `genesis:ready` mark, the jump to the start position, network idle again and 800 ms
- **Other GPU load:** claude 49 %, dwm 8 % (median over rounds of the Windows "GPU Engine" 3D utilization per process, sampled before each round — **another application was using the GPU: absolute numbers are depressed, read the rows relative to calibration**)
- **Window state:** page visible in every run; focused in every run

Cells: median [p25–p75] over the runs. Presented frames = distinct presentation timestamps (`Display::FrameDisplayed`) between the first and last presented scroll update. See scripts/perf/README.md "Scroll smoothness" for every definition.

## Smoothness

| target | scroll range (px) | runs ok | presented fps | vsync hit % | interval p50 / p95 / p99 ms | >1.5×vsync % | janky % (SJv4) | missed vsync/s (SJv4) | input→present p50 / p95 ms |
|---|---|---|---|---|---|---|---|---|---|
| calibration | 600–2100 (1500 px) | 5/5 | 165 [165–165] | 100 [100–100] | 6.1 / 6.2 / 6.3 | 0 [0–0] | 0 [0–0] | 0 [0–0] | 11.9 / 12.1 |
| hero | 0–513 (513 px) | 5/5 | 165 [162–165] | 100 [98–100] | 6.1 / 6.2 / 6.3 | 0 [0–2] | 0 [0–2] | 0 [0–3] | 11.9 / 12.1 |
| theses | 963–1962 (999 px) | 5/5 | 159 [154–162] | 96 [94–98] | 6.1 / 6.2 / 12.3 | 3 [1–6] | 3 [1–6] | 6 [3–10] | 12.0 / 18.1 |
| canvas | 2932–6352 (1500 px) | 5/5 | 138 [137–139] | 83 [83–84] | 6.1 / 12.2 / 18.2 | 16 [16–18] | 16 [16–18] | 28 [28–29] | 17.9 / 32.8 |
| team | 8624–17268 (1500 px) | 5/5 | 143 [136–155] | 87 [83–94] | 6.1 / 12.2 / 12.3 | 15 [7–20] | 15 [6–20] | 22 [10–31] | 23.5 / 30.1 |
| footer | 18168–18901 (733 px) | 5/5 | 161 [151–165] | 98 [91–100] | 6.1 / 6.2 / 12.0 | 3 [0–4] | 3 [0–4] | 4 [0–14] | 12.0 / 18.1 |

## Cost while scrolling

| target | main busy % | long tasks (>50 ms) | paints / frame | rAF ms | style+layout ms | paint ms | drawn fps | host CPU busy % |
|---|---|---|---|---|---|---|---|---|
| calibration | 6 [5–6] | 0 [0–0] | 0.01 [0.01–0.01] | 0 [0–0] | 0 [0–0] | 8 [7–8] | 164 [164–164] | 14 [14–16] |
| hero | 18 [18–19] | 0 [0–0] | 1.79 [1.79–1.82] | 1 [1–1] | 6 [6–6] | 17 [17–17] | 162 [162–162] | 15 [15–16] |
| theses | 17 [17–17] | 0 [0–0] | 0.02 [0.02–0.02] | 29 [29–29] | 7 [7–8] | 10 [10–11] | 161 [161–162] | 15 [15–16] |
| canvas | 26 [26–27] | 0 [0–0] | 0.19 [0.19–0.20] | 81 [80–81] | 26 [26–26] | 36 [36–36] | 147 [147–149] | 18 [18–20] |
| team | 20 [20–20] | 0 [0–0] | 0.03 [0.03–0.03] | 5 [5–5] | 18 [18–19] | 61 [59–61] | 147 [143–156] | 15 [15–16] |
| footer | 13 [13–13] | 0 [0–0] | 0.00 [0.00–0.00] | 1 [1–1] | 6 [6–6] | 8 [8–8] | 161 [153–163] | 16 [15–16] |

## Scroll canvas counters (`window.__sc`, `?scstats`)

Deltas over the traced gesture. draws = canvas redraws; missA = draws without the exact atlas for that frame (nearest resident frame shown); blank = draws with no atlas at all; resident = peak decoded atlases so far in that page load. `genesis:ready` = the landing's ready mark (ms after navigation start).

| target | canvas draws | draws / presented frame | missA | blank | resident atlases | genesis:ready ms |
|---|---|---|---|---|---|---|
| hero | 0 [0–0] | 0.00 [0.00–0.00] | 0 [0–0] | 0 [0–0] | 0 [0–0] | 320 [318–322] |
| theses | 1 [1–1] | 0.01 [0.01–0.01] | 0 [0–0] | 0 [0–0] | 3 [3–3] | 322 [321–322] |
| canvas | 140 [140–140] | 0.98 [0.97–0.99] | 0 [0–0] | 0 [0–0] | 4 [4–4] | 329 [329–333] |
| team | 0 [0–0] | 0.00 [0.00–0.00] | 0 [0–0] | 0 [0–0] | 0 [0–0] | 316 [315–317] |
| footer | 0 [0–0] | 0.00 [0.00–0.00] | 0 [0–0] | 0 [0–0] | 0 [0–0] | 318 [316–322] |

## Relative to the calibration page

Medians of the ratio section ÷ calibration taken *within the same round* (so slow drift of the machine cancels out). 1.00 = as smooth as a plain text page in this session.

| target | presented fps ratio | janky % − calibration | >1.5×vsync % − calibration |
|---|---|---|---|
| hero | 1.00 [0.99–1.00] | 0 [0–1] | 0 [0–1] |
| theses | 0.98 [0.94–0.98] | 2 [1–6] | 2 [1–6] |
| canvas | 0.83 [0.83–0.84] | 16 [16–18] | 16 [16–18] |
| team | 0.87 [0.83–0.94] | 15 [6–20] | 15 [7–20] |
| footer | 0.97 [0.91–1.00] | 3 [0–4] | 3 [0–4] |

## Run log

All gestures stayed inside their sections; no trace data loss; no analysis notes.

Per-round order: 1: calibration → canvas → footer → hero → team → theses; 2: footer → hero → team → canvas → theses → calibration; 3: canvas → hero → calibration → team → theses → footer; 4: team → footer → hero → theses → calibration → canvas; 5: footer → hero → team → canvas → theses → calibration
