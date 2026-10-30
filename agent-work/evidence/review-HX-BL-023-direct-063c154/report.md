# Independent review — HX-BL-023 E2 direct edit

Verdict: **request changes** for one medium interaction-contract defect, R1. No data loss was observed. This is not acceptance of the current SHA, publication permission, or completion of the permanent team.

Reviewed remote head `063c1548a5165fde8656ff016c65816c791ea387`, base `8f7d17266c53e31428da7c0da6dbbf1afe01d035`, tree `fec12f86311347c4e01212c8f6d5050f59581330`, PR479. Independently fetched exact head into detached `/workspace/review-direct-063c154`; no product/source changes. Operational sources fetched separately at8b3e315. Root separately verified PR head/base/open/unmerged and exact CI40958042988 check/browser/world-random success; see root-verified-metadata.json. I did not treat programmer assertions or old E1 acceptance as E2 acceptance.

## R1 — wheel navigation bypasses completion/validation (medium)

`src/App.tsx:13676` wheel handler calls `beginMapNavigation` and schedules zoom, without `finishInlineName`. The completion boundary at `src/App.tsx:14025` is pointer-down capture; moving the pointer and using the wheel does not trigger it. DE01 explicitly classifies pan/zoom/rotation as navigation; DE07 says valid input completes before navigation/other mutation; DE03 requires invalid departure to be rejected with the local error. DE-AC04 therefore fails for wheel navigation. Object-click navigation does pass.

Reproduction on independently built production UI, Chromium153,1500×1200:

1. Import baseline-mythic fixture; select first region center; enable Edit and click region name. The probe initially makes some independent name edits so prior committed RU is `IME Независимый`.
2. Fill valid `Колесо независимое`; move mouse onto map; use actual Playwright mouse wheel(0,-180), without pointer-down.
3. SVG scale changes1→1.30996 while the name input remains open with the draft. Pressing Escape and exporting shows committed RU is still `IME Независимый`: wheel did not complete the field.
4. Open the name again, empty it, move mouse onto map and wheel(0,-120). Zoom advances1.30996→1.56831; input remains empty, aria-invalid=false, and no local error appears.

Evidence: `wheel-observation.json`, `wheel-active-input.png`, `wheel-invalid-input.png`; exact executable reproduction is the wheel section in `ui-probe.mjs`. This is a localized missing boundary, not an allegation of corrupted saved data. Request: route wheel navigation through the same synchronous completion/validation contract; valid change should create exactly one transaction, invalid should retain focus/error and decline the navigation action. Inspect adjacent scroll/pinch entry paths within this same boundary; do not add another form or Save/Cancel flow. Extend the existing direct-edit browser lifecycle with bounded valid/invalid wheel assertions, without a new mixed100/corpus runner. New SHA requires fresh exact-SHA review.

## Acceptance evidence

| AC | Independent finding |
|---|---|
| DE-AC01 | Bounded pass: actual view has no editable controls/pencils; one Edit/Done; direct values44px on390; wide and RU/EN390 screenshots; supported values only by source. |
| DE-AC02 | Bounded pass: native inline name/select/notes controls; no Save/Cancel/Apply/hex-region/keep-clear form; direct source and production interactions. |
| DE-AC03 | Pass in targeted actual-handler five-type×RU/EN case, including literal second locale and name metadata. UI independently checks captured locale and long legacy kingdom second locale; invalid empty/other errors covered by source/targeted/current CI. |
| DE-AC04 | **Fail R1** for actual wheel navigation. Enter, Tab, blur, Done, object navigation, language switch, invalid Done/Escape and synthetic composition-event deferral passed independent UI probes. |
| DE-AC05 | Bounded pass: real notes immediate edits coalesce, blur/Undo/Redo/export exact; source retains500ms grouping. View and mode integrate notes. Timer/native IME combinations not exhaustively tested. |
| DE-AC06 | Pass bounded edge probe for all12/6/6 choices at saved heights1/2/3, zero-weight dead variants, exact local entries incl lake-hidden and base-equal. Canonical adjacency24 decisions matches helper; source uses symmetric dead exceptions and ignores override appearance. Water geometry unchanged by exact snapshots. |
| DE-AC07 | Pass targeted source/runtime: only5 canonical region fields; all other serialized fields, overrides, RNG/counters/geometry/names/notes unchanged, exact undo/redo. No-op and preparation faults preserve redo/history. |
| DE-AC08 | Pass bounded targeted runtime: stale callbacks/name preparation fault; separate pending-read busy, import/preparation failure, no-op/redo cases3/3. Actual unchanged active field import closes field/mode; no delayed UI resurrection. |
| DE-AC09 | Existing Classic/Mythic/legacy corpus, mixed100 and continuation tests read and exact CI reused; no duplicate complete run. Targeted changed region case independently passed edited-copy deterministic continuation. This evidence is bounded, not universal compatibility. |
| DE-AC10 | Actual POI inline add/remove and exact undo passed; central no-removal by source; catalog stays below info/notes, collapsed by default and shares direct rendering. Source and screenshots show no paired form/scope expansion. |

## Checks, necessity and counts

Local Node24.22.1 production build passed. I ran five permanent actual-handler cases only: direct names, region biome, import exact transaction/fault, pending-file-read busy, no-op/failed-import redo. Executed5/passed5/skipped0 across two targeted invocations (`targeted-tests.log`, `guard-tests.log`). No permanent tests added or changed. No full mixed100/corpus repetition.

Independently inspected the diff: Node mapTransactions10→11 logical test declarations (one name case updated, one new region case); overall logical baseline248/head249 are exactCI/programmer runner totals, not a count of lines or this review’s executions. Parameterized runtime cases mean top-level declaration totals alone are not equivalent to logical runner totals. Browser remains seven production scripts, one changed save/history script; world-RNG remains one separate script. Neither browser sections nor reviewer temporary diagnostics are added to the Node count.

The changed name test is necessary to replace the explicitly superseded paired-locale contract, preserving exact snapshots, validation/stale/fault guards and long legacy locale. The added region case has distinct risk: canonical height/adjacency, exact metadata, retained overrides, atomic faults and edited continuation. Browser changes update existing lifecycle to owner-approved direct controls rather than running contradictory old/new form assertions. Existing mixed100/corpus is reused. Assertions use semantic controls and snapshots, with atomic DOM observation for import closure; event/React races and browser input composition remain bounded evidence. The suite is currently insensitive to R1 because wheel navigation while a name is active is absent; green CI therefore does not discharge DE-AC04. A bounded assertion in the same lifecycle is the useful extension, not another whole runner.

Temporary reviewer `edge-probe.mjs` checks all24 canonical choices across height1/2/3 and24 touching-neighbor decisions; `ui-probe.mjs` checks production interactions and reproduces R1 with actual mouse wheel. Synthetic IME composition is a simulation, not a physical OS IME. These are diagnostics, not permanent test growth. Initial diagnostic setup failures (server lifetime/connection refusal and choosing a no-lake fixture) were corrected; neither is a product defect. Repeated UI diagnostics were refinements of one probe, not independent sample counts. No paid services used.

## Score and independence limits

`score_assessment.json` independently assesses S01-C05,S02-C02,S03-C01,S03-C05,S04-C04,S09-C04 under1.2, with before/after grade and points unknown/null, delta null, quality and breadth separate. Award0; current50 unknown/unverified1000 remains unchanged. A successful L1 editing slice does not prove500 expert maps, all entity operations, all export roles, named versions or top5/10/20 requirements; R1 also limits navigation/error claims. No double counting or score inference from CI/test counts.

Read AGENTS.md, docs/index.md, operational E2-2.0, parent2.3, vision/process, score1.2, handoff, relevant approval/budget/backlog/previous result/lessons and changed source/tests. Root independently supplied metadata/CI verification; the functional finding and bounded probes are my own. Shared checkout dependencies were reused, but a fresh build came from the fetched exact tree. Public deployed site remains published E1; “production UI” here means candidate `vite build`+`vite preview`, not a claim candidate was deployed. Browser glyph fallback has some unsupported emoji; do not infer a product glyph defect. Local screenshots inspected at390; full device/browser/physical touch coverage not claimed.

Next action: developer bounded R1 correction and existing-lifecycle regression assertion; preserve scope, captured locales and exact history. Then fresh independent review of the resulting SHA. No merge/deploy or schedule mutation performed. Automation start and end health is recorded separately in automation-health.json; permanent team remains active.
