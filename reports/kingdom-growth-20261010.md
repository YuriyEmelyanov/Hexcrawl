# Sequential kingdom growth diagnosis — 2026-10-10

Production baseline: 506e440bc9272c4e53b1042cb64ca61aa4d44188.
Diagnostic code branch: diagnostics/kingdom-growth-20261010.
Browser run: https://github.com/YuriyEmelyanov/Hexcrawl/actions/runs/38087984908

## Method

Three deterministic random seeds (42, 7, 123), Chromium, optimized Vite build, mythic mode, eight sequential kingdoms requested per chain. Each seed ran separate fresh emoji and color pages. Actual UI candidate clicks and generation handlers; candidate chosen by greatest q, smallest r. Fixed crypto seed 12345. Timing instrumentation adds some overhead. Generation ends when controls re-enable; render timing runs until detailed artwork readiness plus two animation frames. These are CI desktop-browser measurements, not user's device measurements.

40 kingdom actions completed; two fifth-kingdom actions exceeded an external 180-second deadline. Seeds 7 and 123 completed all eight in both modes. Seed 42 stopped at the fifth in both modes. This deadline does not prove permanent inability to finish.

## Confirmed findings

1. **Expensive debug-derived data is computed when river debug is off.** App's riverGraphsByRegion, candidateBoundaryDebugByRegion, regionSharedVerticesByRegion, regionExteriorVertexUsageByRegion recompute over every old region when regions/candidates change. The shared-vertex and vertex-usage helpers each traverse the entire map. This introduces approximately quadratic work per map update. They also serve real generation in other call sites: fix only debug consumers, not global helpers.
2. **Main-thread synchronous generation has very long individual calls.** Seed 42, fifth kingdom, anchor q64 r-19: advanceKingdom max observed 68.440s emoji / 68.895s color, followed by calls ~24s and ~43s. Logs report river 53 mouth at 2473.369,-644 exhausting endpoint search, constraint rejection/rollback, missing old river edge, and mythic_full_river_network rejection. Heavy river search and retries are a separate failure path from debug overhead.
3. **Search budgets are not wall-clock budgets.** completeRegionRiverEnds allows 128 recursive states, depth24, repeatedly rebuilds global river/lake model and searches targets. solveRiverComponents permits 5000 solver states per component. Kingdom recovery permits 12 retries and 300 steps; neither protects the UI against a single expensive search. setTimeout yields only between advanceKingdom calls.
4. **Completed drawing grows, but is not the dominant measured delay.** At eight kingdoms, color detail render 1.614–1.788s, generation 33.778–43.467s. App computation consumes 23.578–25.761s of the latter. Stage timings are nested; do not sum all instrumented functions.
5. **Whole-map/history cloning is another growing cost, not the primary cause in measured local runs.** Actual structuredClone instrumented in handler harness, seed42 with four debug memo computations disabled: sixth kingdom 71 clone calls, cumulative 1.310s, max95ms, total14.173s. History retains whole previous map snapshots.
6. **Anchor choice changes work.** All 374 candidates of one generated six-kingdom map tested with actual findKingdomOrigin/connectionPath: all found paths, worst combined computation37ms. Four candidates required paths84–85hexes. Building these paths entails additional regions. No actual full kingdom construction at these enclosed anchors was tested.

## Controlled local ablation

Real generation-handler harness, no JSX artwork. Its useMemo always recomputes, so timings are not browser timings. Disabling only the four App debug memos changed seed42 sixth-kingdom total from44.832s in profiled baseline to13.495s (~3.3x). Separate reference rerun baseline51.613s. Geography, regions, rivers, roads, terrain, obstacles, and candidates matched on all six saved maps. Kingdom names/toponyms and crossing attributes differed because local harness used unfixed toponym seed; full save JSON is not claimed identical. No production changes were made.

Browser process summed RSS rose to roughly1.65–1.92GiB by eighth kingdom. This is aggregate RSS including shared pages counted multiple times, not unique allocated memory. No OOM/crash reproduced; do not attribute the observed timeout to OOM.

## Raw timing rows

| Seed | Mode | Kingdom | Anchor | Generation s | Detail render s | App computation s | Longest task ms |
|---|---|---:|---|---:|---:|---:|---:|
| 123 | emoji | 1 | 0,0 | 1.165 | 0.099 | 0.470 | 64 |
| 123 | emoji | 2 | 13,2 | 2.554 | 0.141 | 1.200 | 129 |
| 123 | emoji | 3 | 31,-9 | 6.060 | 0.179 | 3.028 | 209 |
| 123 | emoji | 4 | 51,-22 | 9.381 | 0.171 | 4.657 | 560 |
| 123 | emoji | 5 | 69,-34 | 14.286 | 0.182 | 8.684 | 639 |
| 123 | emoji | 6 | 88,-43 | 20.931 | 0.213 | 10.557 | 1660 |
| 123 | emoji | 7 | 103,-48 | 23.285 | 0.248 | 15.092 | 765 |
| 123 | emoji | 8 | 121,-59 | 42.591 | 0.253 | 25.793 | 4917 |
| 123 | color | 1 | 0,0 | 1.131 | 0.388 | 0.495 | 272 |
| 123 | color | 2 | 13,2 | 2.527 | 0.684 | 1.263 | 508 |
| 123 | color | 3 | 31,-9 | 6.040 | 0.849 | 3.022 | 648 |
| 123 | color | 4 | 51,-22 | 9.829 | 0.936 | 4.764 | 738 |
| 123 | color | 5 | 69,-34 | 15.256 | 1.433 | 8.682 | 1161 |
| 123 | color | 6 | 88,-43 | 21.892 | 1.272 | 10.830 | 1684 |
| 123 | color | 7 | 103,-48 | 23.983 | 1.455 | 15.269 | 1098 |
| 123 | color | 8 | 121,-59 | 43.467 | 1.614 | 25.761 | 5015 |
| 7 | emoji | 1 | 0,0 | 1.569 | 0.098 | 0.469 | 315 |
| 7 | emoji | 2 | 12,-4 | 3.091 | 0.121 | 1.490 | 166 |
| 7 | emoji | 3 | 31,-15 | 8.706 | 0.128 | 3.928 | 795 |
| 7 | emoji | 4 | 51,-25 | 8.486 | 0.169 | 5.010 | 276 |
| 7 | emoji | 5 | 66,-27 | 14.465 | 0.196 | 9.030 | 358 |
| 7 | emoji | 6 | 79,-29 | 21.121 | 0.210 | 12.870 | 2181 |
| 7 | emoji | 7 | 97,-40 | 32.048 | 0.223 | 22.464 | 809 |
| 7 | emoji | 8 | 113,-48 | 34.191 | 0.252 | 24.390 | 1022 |
| 7 | color | 1 | 0,0 | 1.538 | 0.449 | 0.536 | 351 |
| 7 | color | 2 | 12,-4 | 2.785 | 0.674 | 1.370 | 541 |
| 7 | color | 3 | 31,-15 | 8.585 | 0.873 | 3.799 | 787 |
| 7 | color | 4 | 51,-25 | 9.296 | 0.960 | 5.098 | 761 |
| 7 | color | 5 | 66,-27 | 15.216 | 1.391 | 9.262 | 1114 |
| 7 | color | 6 | 79,-29 | 21.950 | 1.558 | 12.953 | 2243 |
| 7 | color | 7 | 97,-40 | 33.009 | 1.601 | 22.451 | 1300 |
| 7 | color | 8 | 113,-48 | 33.778 | 1.788 | 23.578 | 1445 |
| 42 | emoji | 1 | 0,0 | 1.022 | 0.123 | 0.371 | 76 |
| 42 | emoji | 2 | 14,-2 | 2.441 | 0.112 | 1.207 | 117 |
| 42 | emoji | 3 | 28,-8 | 4.194 | 0.132 | 1.955 | 179 |
| 42 | emoji | 4 | 47,-17 | 9.272 | 0.132 | 4.392 | 1849 |
| 42 | emoji | 5 | 64,-19 | deadline 180s | — | — | — |
| 42 | color | 1 | 0,0 | 1.018 | 0.217 | 0.432 | 130 |
| 42 | color | 2 | 14,-2 | 2.420 | 0.502 | 1.257 | 375 |
| 42 | color | 3 | 28,-8 | 4.114 | 0.577 | 1.917 | 429 |
| 42 | color | 4 | 47,-17 | 10.099 | 0.706 | 4.576 | 1901 |
| 42 | color | 5 | 64,-19 | deadline 180s | — | — | — |

## Recommended fix order

- River search: profile completeRegionRiverEnds / solver individually on the seed42 reproduction, share indexes, cache repeated failed states, avoid repeated full-network rebuilding; preserve fixed old edges and fullness. Add a cancellable work budget and move expensive work off main thread or yield within it. A simple lower retry limit could change generation quality, so it is not a quality-preserving fix.
- Guard inactive debug memos and debug-panel content; share global vertex adjacency index instead of scanning world once per region.
- Replace repeated full-history cloning with safe immutable snapshots/structural sharing; cache only affected geometry.
- Re-run these same seeds and enclosed-anchor cases with undo/save/water invariants before publishing.

Artifacts contain saved maps after each completed action and per-seed JSON including rejection diagnostics. Failed fifth action has no final save; preceding fourth map is available. All diagnostic changes remain off main.
