# Scroll smoothness — canvas-team-after

- **When / what:** 2026-10-12T07:20:36.438Z · commit 56b60f9 (dirty) · target --dir ..\..\..\..\Users\arahe\AppData\Local\Temp\claude\C--genesis\64511141-8b03-40fd-b281-d6e6c1dcfba8\scratchpad\dist-B (404-page)
- **Browser:** Chrome/154.0.8037.99 · headed (real GPU path, window must stay visible) · GPU: ANGLE (Intel, Intel(R) UHD Graphics (0x0000A78B) Direct3D11 vs_5_0 ps_5_0, D3D11-32.0.101.6790)
- **Display:** 165 Hz (vsync 6.061 ms, from ScrollJankV4.vsync_interval_us) · DPR 1.33 (native) · viewport 1440x900
- **Gesture:** Input.synthesizeScrollGesture, mouse source, 1500 px/s, ≤ 1500 px per gesture, downwards, center-aligned in each section
- **Design:** 5 runs per target, order shuffled per round (seed 788274439), calibration page shuffled in like a section; 1 discarded warm-up round first; every measurement re-navigates the one tab (via about:blank) with a warm HTTP cache; trace `full` (viz, input.scrolling, devtools.timeline, disabled-by-default-devtools.timeline)
- **State before each gesture:** fresh document, HTTP cache warm (warm-up round); waited for load, network idle, fonts, the landing's `genesis:ready` mark, the jump to the start position, network idle again and 800 ms
- **Other GPU load:** none above 2 % (median over rounds of the Windows "GPU Engine" 3D utilization per process, sampled before each round)
- **Window state:** page visible in every run; focused in every run

Cells: median [p25–p75] over the runs. Presented frames = distinct presentation timestamps (`Display::FrameDisplayed`) between the first and last presented scroll update. See scripts/perf/README.md "Scroll smoothness" for every definition.

## Smoothness

| target | scroll range (px) | runs ok | presented fps | vsync hit % | interval p50 / p95 / p99 ms | >1.5×vsync % | janky % (SJv4) | missed vsync/s (SJv4) | input→present p50 / p95 ms |
|---|---|---|---|---|---|---|---|---|---|
| calibration | 600–2100 (1500 px) | 5/5 | 165 [165–165] | 100 [100–100] | 6.1 / 6.2 / 6.3 | 0 [0–0] | 0 [0–0] | 0 [0–0] | 11.8 / 12.0 |
| hero | 0–513 (513 px) | 5/5 | 162 [162–162] | 98 [98–98] | 6.1 / 6.2 / 9.2 | 2 [2–2] | 2 [2–2] | 3 [3–3] | 11.8 / 12.0 |
| theses | 963–1962 (999 px) | 5/5 | 162 [159–162] | 98 [96–98] | 6.1 / 6.3 / 12.1 | 2 [2–3] | 2 [2–3] | 3 [3–6] | 11.8 / 12.1 |
| canvas | 2932–6352 (1500 px) | 5/5 | 161 [157–162] | 98 [95–98] | 6.1 / 6.6 / 12.2 | 3 [2–5] | 3 [2–5] | 4 [3–8] | 11.9 / 18.0 |
| team | 8624–17268 (1500 px) | 5/5 | 159 [159–160] | 96 [96–97] | 6.1 / 6.3 / 12.1 | 3 [3–4] | 3 [3–4] | 6 [5–6] | 12.9 / 18.1 |
| footer | 18168–18900 (732 px) | 5/5 | 163 [161–163] | 99 [98–99] | 6.1 / 6.2 / 7.9 | 1 [1–3] | 1 [1–3] | 2 [2–4] | 11.8 / 12.0 |

## Cost while scrolling

| target | main busy % | long tasks (>50 ms) | paints / frame | rAF ms | style+layout ms | paint ms | drawn fps | host CPU busy % |
|---|---|---|---|---|---|---|---|---|
| calibration | 4 [4–5] | 0 [0–0] | 0.01 [0.01–0.01] | 0 [0–0] | 0 [0–0] | 6 [5–6] | 164 [164–164] | 19 [15–20] |
| hero | 30 [28–33] | 0 [0–0] | 1.68 [1.61–1.71] | 0 [0–0] | 10 [9–11] | 28 [28–29] | 162 [162–162] | 22 [20–23] |
| theses | 22 [21–24] | 0 [0–0] | 0.02 [0.02–0.02] | 3 [2–3] | 13 [12–15] | 19 [17–19] | 161 [161–162] | 18 [16–21] |
| canvas | 43 [42–45] | 0 [0–0] | 0.23 [0.23–0.23] | 19 [18–20] | 38 [38–38] | 71 [70–76] | 163 [163–163] | 26 [21–28] |
| team | 40 [40–41] | 0 [0–0] | 0.01 [0.01–0.01] | 0 [0–0] | 60 [57–61] | 143 [141–148] | 162 [161–163] | 21 [21–24] |
| footer | 22 [20–23] | 0 [0–0] | 0.00 [0.00–0.00] | 0 [0–0] | 10 [10–11] | 13 [12–15] | 163 [163–163] | 21 [19–24] |

## Scroll canvas counters (`window.__sc`, `?scstats`)

Deltas over the traced gesture. draws = canvas redraws; missA = draws without the exact atlas for that frame (nearest resident frame shown); blank = draws with no atlas at all; resident = peak decoded atlases so far in that page load. `genesis:ready` = the landing's ready mark (ms after navigation start).

| target | canvas draws | draws / presented frame | missA | blank | resident atlases | genesis:ready ms |
|---|---|---|---|---|---|---|
| hero | 0 [0–0] | 0.00 [0.00–0.00] | 0 [0–0] | 0 [0–0] | 0 [0–0] | 351 [351–357] |
| theses | 1 [1–1] | 0.01 [0.01–0.01] | 0 [0–0] | 0 [0–0] | 3 [3–3] | 360 [351–360] |
| canvas | 148 [147–148] | 0.92 [0.91–0.93] | 0 [0–0] | 0 [0–0] | 4 [4–4] | 370 [359–385] |
| team | 0 [0–0] | 0.00 [0.00–0.00] | 0 [0–0] | 0 [0–0] | 0 [0–0] | 341 [338–352] |
| footer | 0 [0–0] | 0.00 [0.00–0.00] | 0 [0–0] | 0 [0–0] | 0 [0–0] | 352 [351–364] |

## Relative to the calibration page

Medians of the ratio section ÷ calibration taken *within the same round* (so slow drift of the machine cancels out). 1.00 = as smooth as a plain text page in this session.

| target | presented fps ratio | janky % − calibration | >1.5×vsync % − calibration |
|---|---|---|---|
| hero | 0.98 [0.98–0.98] | 2 [2–2] | 2 [2–2] |
| theses | 0.98 [0.96–0.98] | 2 [2–3] | 2 [2–3] |
| canvas | 0.98 [0.95–0.98] | 3 [2–5] | 3 [2–5] |
| team | 0.96 [0.96–0.97] | 3 [3–4] | 3 [3–4] |
| footer | 0.99 [0.98–0.99] | 1 [1–3] | 1 [1–3] |

## Run log

All gestures stayed inside their sections; no trace data loss; no analysis notes.

Per-round order: 1: canvas → hero → team → footer → theses → calibration; 2: calibration → theses → canvas → hero → team → footer; 3: theses → footer → hero → canvas → team → calibration; 4: canvas → theses → footer → team → hero → calibration; 5: footer → canvas → theses → team → calibration → hero
