# Scroll smoothness — canvas-team-before

- **When / what:** 2026-10-12T07:36:02.343Z · commit 4d7d89c (dirty) · target --dir ..\..\..\..\Users\arahe\AppData\Local\Temp\claude\C--genesis\64511141-8b03-40fd-b281-d6e6c1dcfba8\scratchpad\dist-A (404-page)
- **Browser:** Chrome/154.0.8037.99 · headed (real GPU path, window must stay visible) · GPU: ANGLE (Intel, Intel(R) UHD Graphics (0x0000A78B) Direct3D11 vs_5_0 ps_5_0, D3D11-32.0.101.6790)
- **Display:** 165 Hz (vsync 6.061 ms, from ScrollJankV4.vsync_interval_us) · DPR 1.33 (native) · viewport 1440x900
- **Gesture:** Input.synthesizeScrollGesture, mouse source, 1500 px/s, ≤ 1500 px per gesture, downwards, center-aligned in each section
- **Design:** 5 runs per target, order shuffled per round (seed 789200320), calibration page shuffled in like a section; 1 discarded warm-up round first; every measurement re-navigates the one tab (via about:blank) with a warm HTTP cache; trace `full` (viz, input.scrolling, devtools.timeline, disabled-by-default-devtools.timeline)
- **State before each gesture:** fresh document, HTTP cache warm (warm-up round); waited for load, network idle, fonts, the landing's `genesis:ready` mark, the jump to the start position, network idle again and 800 ms
- **Other GPU load:** none above 2 % (median over rounds of the Windows "GPU Engine" 3D utilization per process, sampled before each round)
- **Window state:** page visible in every run; focused in every run

Cells: median [p25–p75] over the runs. Presented frames = distinct presentation timestamps (`Display::FrameDisplayed`) between the first and last presented scroll update. See scripts/perf/README.md "Scroll smoothness" for every definition.

## Smoothness

| target | scroll range (px) | runs ok | presented fps | vsync hit % | interval p50 / p95 / p99 ms | >1.5×vsync % | janky % (SJv4) | missed vsync/s (SJv4) | input→present p50 / p95 ms |
|---|---|---|---|---|---|---|---|---|---|
| calibration | 600–2100 (1500 px) | 5/5 | 165 [165–165] | 100 [100–100] | 6.1 / 6.2 / 6.4 | 0 [0–0] | 0 [0–0] | 0 [0–0] | 11.9 / 12.0 |
| hero | 0–513 (513 px) | 5/5 | 162 [114–165] | 98 [69–100] | 6.1 / 6.2 / 8.9 | 2 [0–45] | 2 [0–44] | 3 [0–50] | 12.0 / 12.1 |
| theses | 963–1962 (999 px) | 5/5 | 153 [122–153] | 93 [74–93] | 6.1 / 6.3 / 12.1 | 3 [3–19] | 3 [3–19] | 12 [12–43] | 11.9 / 24.0 |
| canvas | 2932–6352 (1500 px) | 5/5 | 143 [138–146] | 87 [84–89] | 6.1 / 12.1 / 24.3 | 10 [8–11] | 10 [8–11] | 25 [19–28] | 14.6 / 30.2 |
| team | 8624–17268 (1500 px) | 5/5 | 160 [154–163] | 97 [93–99] | 6.1 / 6.5 / 12.1 | 3 [1–7] | 4 [1–8] | 6 [2–12] | 11.8 / 17.8 |
| footer | 18168–18901 (733 px) | 5/5 | 163 [163–165] | 99 [99–100] | 6.1 / 6.2 / 7.9 | 1 [0–1] | 1 [0–1] | 2 [0–2] | 11.7 / 12.0 |

## Cost while scrolling

| target | main busy % | long tasks (>50 ms) | paints / frame | rAF ms | style+layout ms | paint ms | drawn fps | host CPU busy % |
|---|---|---|---|---|---|---|---|---|
| calibration | 4 [4–4] | 0 [0–0] | 0.01 [0.01–0.01] | 0 [0–0] | 0 [0–0] | 6 [5–6] | 164 [164–164] | 22 [18–25] |
| hero | 15 [13–19] | 0 [0–0] | 1.79 [1.41–1.79] | 1 [1–1] | 5 [4–6] | 14 [12–17] | 159 [157–162] | 20 [20–21] |
| theses | 24 [23–25] | 1 [1–1] | 0.02 [0.02–0.02] | 53 [53–57] | 9 [9–10] | 14 [12–14] | 156 [140–156] | 27 [26–28] |
| canvas | 38 [38–40] | 0 [0–0] | 0.19 [0.19–0.20] | 122 [120–127] | 42 [40–45] | 56 [56–59] | 148 [147–149] | 34 [33–42] |
| team | 25 [24–26] | 0 [0–0] | 0.02 [0.02–0.03] | 6 [6–7] | 23 [23–24] | 70 [68–79] | 163 [163–163] | 22 [21–23] |
| footer | 13 [12–13] | 0 [0–0] | 0.00 [0.00–0.00] | 2 [1–2] | 5 [5–6] | 8 [8–9] | 163 [161–163] | 21 [20–22] |

## Scroll canvas counters (`window.__sc`, `?scstats`)

Deltas over the traced gesture. draws = canvas redraws; missA = draws without the exact atlas for that frame (nearest resident frame shown); blank = draws with no atlas at all; resident = peak decoded atlases so far in that page load. `genesis:ready` = the landing's ready mark (ms after navigation start).

| target | canvas draws | draws / presented frame | missA | blank | resident atlases | genesis:ready ms |
|---|---|---|---|---|---|---|
| hero | 0 [0–0] | 0.00 [0.00–0.00] | 0 [0–0] | 0 [0–0] | 0 [0–0] | 329 [320–338] |
| theses | 1 [1–1] | 0.01 [0.01–0.01] | 0 [0–0] | 0 [0–0] | 3 [3–3] | 337 [331–338] |
| canvas | 124 [120–130] | 0.86 [0.84–0.90] | 0 [0–0] | 0 [0–0] | 4 [4–4] | 350 [325–352] |
| team | 0 [0–0] | 0.00 [0.00–0.00] | 0 [0–0] | 0 [0–0] | 0 [0–0] | 337 [337–342] |
| footer | 0 [0–0] | 0.00 [0.00–0.00] | 0 [0–0] | 0 [0–0] | 0 [0–0] | 328 [325–330] |

## Relative to the calibration page

Medians of the ratio section ÷ calibration taken *within the same round* (so slow drift of the machine cancels out). 1.00 = as smooth as a plain text page in this session.

| target | presented fps ratio | janky % − calibration | >1.5×vsync % − calibration |
|---|---|---|---|
| hero | 0.98 [0.69–1.00] | 2 [0–43] | 2 [0–44] |
| theses | 0.93 [0.74–0.93] | 3 [3–19] | 3 [3–19] |
| canvas | 0.87 [0.84–0.88] | 10 [8–11] | 10 [8–11] |
| team | 0.97 [0.93–0.99] | 4 [1–7] | 3 [1–7] |
| footer | 0.99 [0.99–1.00] | 1 [0–1] | 1 [0–1] |

## Run log

All gestures stayed inside their sections; no trace data loss; no analysis notes.

Per-round order: 1: hero → team → calibration → canvas → footer → theses; 2: calibration → footer → team → theses → hero → canvas; 3: footer → canvas → team → calibration → theses → hero; 4: calibration → theses → footer → canvas → team → hero; 5: canvas → team → calibration → theses → hero → footer
