# Independent review: HX-BL-023 E3, PR480

**Verdict: changes_requested.** Exact head `7267843da85afa92e6a31b2b6960cf6e7312db18`, tree `dd39d05488f731c6e3d3a6e58bde7d6725e3fc74`, base `defaa5c24d546e4283430573c2d4e4f3b6194dc0`. Reviewed the whole E3 package, not just the final patch.

A fresh independent reviewer used `/workspace/hx-review-7267843`; no product or permanent-test changes and no GitHub writes. Generated report screenshots were copied to evidence and checkout restored clean. No merge/publication is authorized. The parent owns operational state and remote CI coordination.

Sources: exact-head AGENTS.md, docs/index.md, docs/development-workflow.md, road rules and cumulative source/test diff; operational E3-1.0 spec, process, canonical score-model1.2, vision, current-score, exact-head handoff and prior independent findings. Canonical operational sources are at commit `b032924d0f08cec3d3da7a00a77fadfa7f2b860f` in agent-operations; the current-score input snapshot is retained in `inputs/`. Owner budget waiver and active model1.2 override historical main instructions.

## Confirmed remaining findings

**HX023-E3-R4, P2 — required navigation browser gate fails (AC10).** `src/App.tsx:13658–13659` adds two SVG inline CSS-variable writes after the transform assignment. The existing observer in `test/browser/navigation.smoke.mjs:74` counts every SVG style-attribute mutation, so the unmodified test now observes3 while expecting1. The exact-head GitHub browser job and independent local run reproduce the same failure. CI run41167054315, job124436775764; full parent-downloaded log preserved as `remote-browser-ci.log`. This is a concrete check/implementation incompatibility, not evidence of three transforms per frame.

A separate temporary diagnostic retained all old style values and saw one transform change followed by the two custom-property changes. Its remaining navigation checks passed: unchanged artwork/dimensions, focal error0px, drag90px, rotation, JSON live scale and PNG. This diagnostic does **not** convert the original CI failure into a pass. Fix the existing gate by consolidating writes or measuring actual transform changes accurately, while preserving batching and44px requirements. Merely raising an expected style-record count to3 would be weak protection. Evidence: `navigation-with-browser.log`, `navigation-diagnostic.mjs`, `navigation-diagnostic.log`.

**HX023-E3-R5, P2 — deletion confirmation targets remain too short (AC01).** `src/App.tsx:14210–14214` renders plain Delete/Cancel buttons outside the `.road-editor__item .direct-value`44px rule. At1500×1100 production viewport, measured rectangles are Delete86.1875×34.59375px and Cancel82.1875×34.59375px. Both fail the explicit44×44px target requirement. Add the appropriate minimum hit area and keep visible focus/spacing/narrow layout; extend the existing browser measurement to this state. Evidence: `confirmation-targets.json`, `confirmation-probe.mjs`, `confirmation-browser-results.json`. `whole-path-ru-390.png` shows the narrow state visually; no exact390 numerical measurement is claimed.

## Prior findings rechecked

- **R1 fixed in sampled cases.** Suppressed and tract centers without explicit POI are rejected by the actual App handler, while explicit POIs remain eligible. Production UI imported the controlled suppressed-center fixture, created the4,6→3,6 draft, refused Enter with an explanation, and preserved exact document after Escape. Existing amended Node case also passes. No arbitrary claim that the original unmodified baseline contains that exact counterexample.
- **R2 fixed in sampled cases.** A structurally valid fixture with Road1/Road8 sharing one normalized pair selects exactly one panel item and one map target. ChangingRoad8's kind preserves all other saved data. Keyboard activation of the crossing retains its exact key. Independent probe plus screenshot: `browser-results.json`, `overlap-desktop.png`.
- **R3 fixed for direct map targets.** Actual keyboard Tab traversal reached a map road after36Tabs; Enter selected it. Continued Tab traversal reached a crossing; Space selected its exact key. Both had `:focus-visible` and visible computed focus paint. Direct road width/crossing diameter measured44px at scales1 and2.4596 (floating tolerance). `keyboard-focus.png` visually confirms crossing focus. Separate R5 concerns confirmation buttons, not those map targets.

## Acceptance and checks

Full per-AC status/evidence/limitations: `acceptance_matrix.md` and `.json`. AC01 failsR5; AC10 failsR4. Other criteria have bounded positive evidence; no exhaustive-proof claim.

Independent Node24.22.1 `npm run check` completed successfully:256tests,256pass,0fail,0skip,0cancel; typecheck and production build passed. Raw `check.log`, process exit0. Build emits the existing large-chunk advisory. Standalone production `save-history.smoke.mjs` passed under Chromium153.0.8010.0, covering E2 names/biomes, notes, Find-after-info, RU/EN, legacy corpus,100mixed UI Undo/Redo, failures/serialization and Classic/Mythic checkpoints. Raw `save-history-after-build.log`.

Independent temporary probes exercise actual App callbacks and production React:

- Cross-region creation uses oneID/onehistory entry; exactUndo/Redo and injected copy fault rollback preserve document/stacks; two identically edited copies continue identically and retain old roads.
- Single-node/jump/repeat/unknown/reverse-duplicate commands refuse atomically. Water/obstacle/overflow are covered by existing domain tests, not separately claimed as new production pointer fixtures.
- All15crossing matrix cells use the actual live context: bridge/ferryF1–5 allowed; fordF1–2 allowed andF3–5 refused. A structurally accepted second river on the same edge exercises maxF5 and another crossing key. No alerts.
- Creation on a real river edge produces bridge deterministically; road kind changes preserve crossing; no-op preserves redo; save/load/UndoRedo/two-copy continuation retain IDs, kinds, RNG and old crossing.
- A redundant road with one dependent crossing is deleted; only thatRoad/crossing disappear, the otherRoadID/counter remain, exactUndoRedo passes. A separate triangle test refuses deletion isolating a requiredPOI. Whole-path preview includes all8segments of a multi-regionRoad.
- Production overlap mutation is isolated; narrowRU/EN has no page overflow; actual mouse wheel/drag and View hex selection leave saved map unchanged. Active-draft pan/rotation/export combinations were not independently enumerated; existing lifecycle tests provide bounded coverage.
- Actual PNG download411638bytes has validPNG signature. The serialized exportSVG clone contains no `data-editor-only` overlay. This proves exclusion of editor UI and successful image export, not a complete role/style pixel-comparison matrix.

Evidence scripts/results: `handler-probe*.mjs`, `handler-results*.json`, `geometry-probe.mjs`, `geometry-results.json`, `deletion-probe.mjs`, `deletion-results.json`, `browser-probe.mjs`, `browser-results.json`. Saved controlled maps: `cross-region-edited.json`, `crossing-created.json`.

## Negative evidence and review limits

All failed runs retained. Initial save-history launch preceded the build and failed because `dist` did not exist; after building the same SHA, the justified prerequisite-corrected run passed. Initial navigation launch lacked Playwright's expected browser path; an existing free Chromium executable was bound to that path, and the actual unmodified navigation run then reproduced3!=1. No paidAPI used.

Temporary diagnostic startup failures (separate network namespace/server; module resolution) were corrected before collecting product evidence. Handler diagnosticv1/v2 contained invalid reviewer inputs: counters placed under `map`, a duplicatePOI, duplicated river-sector identity; these imported failures are not product defects. Original logs/results and script versions are preserved. The first result's shared alerts array collected later diagnostic errors, so its alerts are not attributed to R1. Corrected structural fixtures and expected deletion refusal produced clean results. No test was blanket retried to hide a product failure.

Unmodified `test:browser` is not green: it stops at navigation. The parent verified earlier CI generation/POI/terrain/forest successes; large-navigation/save-history were not reached by that CI chain. Save-history was independently run standalone and passed. Large-navigation was not newly rerun. Separate seedUI workflow skipped, not passed. No screen-reader device, broad performance benchmark, every draft/navigation interleaving, arbitrary imported graph or full game-cohort coverage is claimed.

## Test necessity and score

`test_change_summary.json`: cumulative base→head Node+7/−0/changed0; browser+0/−0/changed1 existing runner. Last patch6e59e7f→7267843 Node+0/−0/changed1, browser+0/−0/changed1. Five domain contracts plus two actual-App transaction/lifecycle cases protect distinct boundaries; browser expansion tests production wiring. Helpers/fixtures are not additional logical tests. No permanent reviewer tests added, no deletion request based on count alone.

`score_assessment.json` uses canonical1.2 for S01-C04, S02-C02, S03-C05, S04-C04, S09-C04 and adjacent S03-C01. Before/aftergrade andpoints remain null/unverified;delta null;award0. Bounded positive evidence does not establish broad criteria, named versions, full image/role coverage or top5/10/20game support. No released-product score update, no double counting. L1Classic/Mythic map samples do not establish L2/L3 mechanics.

Automation actual `peek` performed at reviewer start/end, both enabled=true for6ad9c2426c7481919bb9f3d2b289e9b9. Raw results and `automation_health.json` retained. No disable/restoration/schedule change; artifact save timestamps are labelled separately from observation time.

Next: developer addressesR4/R5 within approvedE3, records newSHA and updated required checks, then independent exact-SHA review. Publication remains a separate owner decision.
