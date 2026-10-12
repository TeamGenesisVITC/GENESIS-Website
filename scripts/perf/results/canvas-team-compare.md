# Scroll smoothness: canvas-team-before → canvas-team-after

- before: 2026-10-12T07:36:02.343Z · commit 4d7d89c · Chrome/154.0.8037.99 · headed · DPR 1.33 · 165 Hz · 5 runs · trace full
- after:  2026-10-12T07:20:36.438Z · commit 56b60f9 · Chrome/154.0.8037.99 · headed · DPR 1.33 · 165 Hz · 5 runs · trace full

Each cell: before → after median (Δ). **~noise** = one median lies inside the other run set's IQR (p25–p75); otherwise better/worse by the metric's direction.

| metric | calibration | hero | theses | canvas | team | footer |
|---|---|---|---|---|---|---|
| presented fps | 165 → 165 (+0) ~noise | 162 → 162 (+0) ~noise | 153 → 162 (+9) **better** | 143 → 161 (+18) **better** | 160 → 159 (-1) ~noise | 163 → 163 (-0) ~noise |
| vsync hit % | 100 → 100 (+0) ~noise | 98 → 98 (+0) ~noise | 93 → 98 (+6) **better** | 87 → 98 (+11) **better** | 97 → 96 (-1) ~noise | 99 → 99 (+0) ~noise |
| interval p50 ms | 6.1 → 6.1 (+0.0) ~noise | 6.1 → 6.1 (+0.0) ~noise | 6.1 → 6.1 (-0.0) ~noise | 6.1 → 6.1 (-0.0) ~noise | 6.1 → 6.1 (+0.0) ~noise | 6.1 → 6.1 (+0.0) ~noise |
| interval p95 ms | 6.2 → 6.2 (+0.0) ~noise | 6.2 → 6.2 (-0.0) ~noise | 6.3 → 6.3 (-0.0) ~noise | 12.1 → 6.6 (-5.5) **better** | 6.5 → 6.3 (-0.2) ~noise | 6.2 → 6.2 (+0.0) ~noise |
| interval p99 ms | 6.4 → 6.3 (-0.1) ~noise | 8.9 → 9.2 (+0.3) ~noise | 12.1 → 12.1 (-0.1) ~noise | 24.3 → 12.2 (-12.1) **better** | 12.1 → 12.1 (+0.1) ~noise | 7.9 → 7.9 (+0.0) ~noise |
| >1.5×vsync % | 0 → 0 (+0) ~noise | 2 → 2 (+0) ~noise | 3 → 2 (-1) **better** | 10 → 3 (-7) **better** | 3 → 3 (+0) ~noise | 1 → 1 (+0) ~noise |
| janky % (SJv4) | 0 → 0 (+0) ~noise | 2 → 2 (+0) ~noise | 3 → 2 (-1) **better** | 10 → 3 (-8) **better** | 4 → 3 (-1) ~noise | 1 → 1 (+0) ~noise |
| missed vsync/s (SJv4) | 0 → 0 (+0) ~noise | 3 → 3 (+0) ~noise | 12 → 3 (-9) **better** | 25 → 4 (-21) **better** | 6 → 6 (+0) ~noise | 2 → 2 (+0) ~noise |
| input→present p50 ms | 11.9 → 11.8 (-0.1) ~noise | 12.0 → 11.8 (-0.2) **better** | 11.9 → 11.8 (-0.1) **better** | 14.6 → 11.9 (-2.7) **better** | 11.8 → 12.9 (+1.1) ~noise | 11.7 → 11.8 (+0.1) ~noise |
| input→present p95 ms | 12.0 → 12.0 (+0.0) ~noise | 12.1 → 12.0 (-0.1) ~noise | 24.0 → 12.1 (-11.9) **better** | 30.2 → 18.0 (-12.2) **better** | 17.8 → 18.1 (+0.3) ~noise | 12.0 → 12.0 (+0.0) ~noise |
| main busy % | 4 → 4 (+1) ~noise | 15 → 30 (+15) **worse** | 24 → 22 (-1) ~noise | 38 → 43 (+5) **worse** | 25 → 40 (+15) **worse** | 13 → 22 (+9) **worse** |
| long tasks | 0 → 0 (+0) ~noise | 0 → 0 (+0) ~noise | 1 → 0 (-1) **better** | 0 → 0 (+0) ~noise | 0 → 0 (+0) ~noise | 0 → 0 (+0) ~noise |
| paints/frame | 0.01 → 0.01 (+0.00) ~noise | 1.79 → 1.68 (-0.11) ~noise | 0.02 → 0.02 (+0.00) ~noise | 0.19 → 0.23 (+0.04) **worse** | 0.02 → 0.01 (-0.01) **better** | 0.00 → 0.00 (+0.00) ~noise |
| fps ÷ calibration | — | 0.98 → 0.98 (+0.00) ~noise | 0.93 → 0.98 (+0.05) **better** | 0.87 → 0.98 (+0.11) **better** | 0.97 → 0.96 (-0.01) ~noise | 0.99 → 0.99 (-0.00) ~noise |
| janky % − calibration | — | 2 → 2 (+0) ~noise | 3 → 2 (-1) **better** | 10 → 3 (-8) **better** | 4 → 3 (-1) ~noise | 1 → 1 (+0) ~noise |
| >1.5×vsync % − calibration | — | 2 → 2 (+0) ~noise | 3 → 2 (-1) **better** | 10 → 3 (-7) **better** | 3 → 3 (+0) ~noise | 1 → 1 (+0) ~noise |
