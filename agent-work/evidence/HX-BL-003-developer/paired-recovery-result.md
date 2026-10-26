# HX-BL-003 — bounded developer result, 26.10.2026

Status: **blocked_visual / performance acceptance incomplete**. Independent review of exact head739e3de36587533bf3d2f3196072270f4695fa8a is the next stage; this is not a release-ready package.

One product optimization remains96a2a8979ce2ef8ad10e5174392dbe2bb0b899d5: closed river-debug panel skips its unused all-region vertex-usage derived index. Diagnosis83b0ccf preceded it. Measurement-only recovery00f5e4 and environment-only child739e3de introduce no second product optimization. Main remains103d31b9f6f5c76b1f6b45d9d6664fe3f75dd63b. Interface and map behavior were intended to stay unchanged; HX-FB-001 remains deferred.

## Same-runner AB/BA outcome
[Run40252325923](https://github.com/YuriyEmelyanov/Hexcrawl/actions/runs/40252325923) finished. Latency step passed; isolated PNG export and subsequent comparison failed. All98 cold/warmup/warm expansions succeeded;0 script/JS errors, no generation timeout. All49 A/B full saved output pairs independently deep-compared equal after excluding only top-level savedAt; arrays retain order. Full input/expected comparisons passed98 rows. Five measured warm repetitions per variant/checkpoint, separate cold and warmup.

| Primary checkpoint | Actual Nbefore→Nafter | Baseline generation median | Candidate | Reduction | Paired wins |
|---|---:|---:|---:|---:|---:|
| mythic-0-N2400.json | 2493→2714 | 102.55s | 67.26s | 34.41% | 5/5 |
| mythic-123456789-N2400.json | 2410→2590 | 86.97s | 55.53s | 36.15% | 5/5 |

Target generation passes>=20% and>=50ms on bothseeds; this is a bounded Linux Chromium result, not Android/SLA or complete product acceptance. Raw min/median/max/nearest-rank p95 and all ratios are in paired-analysis.json; at5warm samples timing p95 is max.

No warm e2e or cold e2e guard exceeded. Navigation requires independent assessment: median of5per-run p95 does not exceed guard, but pooled120-frame p95 DOES:
- mythic-0-N1200.json zoom: 49.966→66.596ms (>10% and>10ms).
- mythic-0-N2400.json zoom: 66.642→83.308ms (>10% and>10ms).
The protocol did not pre-register across-repeat navigation aggregation. Both statistics are retained; selecting the favorable one after results would hide a potential regression. No claim of full regression-free speed acceptance.

## Visual and error limitations
All7 fullSVG pairs independently byte-equal. All5 available PNG pairs independently decoded and exact RGBA bytes compared equal (all channels, dimensions unchanged). Two nominal2400 checkpoints each fail full-quality PNG download after180s in BOTH versions even with fresh isolated Chromium process per export. Root cause unknown. No scale/export/product changes or further PNG retries permitted by this bounded recovery. Overall AC06 blocked.

28 asset ERR_ABORTED requests are recorded in candidate mythic0/N1200 firstwarm. No JS error/fullJSON mismatch; request root cause is not established or excused. Fresh-import visual requests also retained in visual report. Four-visible-selection scenario incomplete56/98 rows (large maps0visible); no synthetic replacement. Classic1200/2400 remain unreachable within original100attempt corpus limit.

## Verification and handoff
Exact00f5e4 Check40252330019 passed236/236 tests, browser and world-random; full logs already retained.739e3de only changes paired-environment.json. This developer result does not replace independent review or claim full undo/nativeMapSet coverage from savedJSON alone.

Reviewer next: independently inspect exact739e3de, raw artifact/logs and semantic/visual comparisons; assess navigation/errors and AC01–08 plus existing R1–R5/native-snapshot safety evidence. Record explicit blocked/changes-requested or other supported verdict and score_assessment under active model1.2 for S09-C01,S02-C01,S03-C05,S04-C04,S09-C04. Historical1.1 before grades are not automatically1.2 evidence. No automatic PNG rerun, second optimization, threshold change, release or new task. Do not pass AC06 without missing evidence or new explicit owner decision. No score increase; no release approval requested.

[Artifact12624578941](https://github.com/YuriyEmelyanov/Hexcrawl/actions/runs/40252325923/artifacts/12624578941),266826020bytes, SHA25645d3a461852a4181c1aa705a715b3423fba0c8e3735f7fe096e7801060df4cfd downloaded/hashverified. Raw timing, visual reports, fulljoblog, independent analysis and analysis script retained alongside this report in agent-operations. Source ZIP preserves all98outputJSONs and fullSVG/availablePNG. Recorded 2026-10-26T03:11:12.459Z.
