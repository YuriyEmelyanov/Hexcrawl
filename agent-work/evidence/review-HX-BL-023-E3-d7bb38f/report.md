# Independent review — HX-BL-023 E3 / PR480

**Verdict: accepted, with the bounded evidence and limitations below.** Exact head `d7bb38fbcee367621e5f5ce9fbaf369fbc775e0a`; base `defaa5c24d546e4283430573c2d4e4f3b6194dc0`. This is acceptance of the E3-1.0 package. It is not a broad product score award or permission to publish.

A fresh independent reviewer inspected the full E3 diff and the final R4/R5 patch in `/workspace/hx-review-d7bb38f`. No product or permanent-test changes, GitHub writes, merge, deployment, paid API use, or score updates were made. The parent coordinates operational state and independently downloaded exact-head CI evidence. The checkout remains clean.

Sources: exact-head AGENTS.md, docs/index.md, development workflow, road rules and source/tests; operational process, canonical score-model1.2, vision, parent specification2.3, E3-1.0 and current-score at operational commit `c093c5969f2dc48d1a76616555be5375b54eb7b9`. The baseline score, prior acceptance matrix and source diffs are retained. Historical main references to model1.1 do not override the operational owner decision.

## R4 and R5 are resolved

**R4 — navigation gate.** The unmodified production `test/browser/navigation.smoke.mjs` passes independently on Chromium153.0.8010.0. It verifies unchanged SVG artwork/dimensions, focal error0px, drag90px, batched wheel updates, rotation, live JSON scale and PNG export. This is not a performance benchmark or proof for arbitrary map sizes.

The updated observer uses `attributeOldValue` to reconstruct intermediate transforms. A separate temporary diagnostic extracted that exact observer from the checked-out runner and injected two synchronous transform changes, with an unrelated CSS-variable write between them. It counted2 and the original one-change assertion rejected the violation. Thus the fix ignores unrelated styles while retaining sensitivity to multiple transforms in one MutationObserver delivery. Evidence: `navigation.log`, `navigation-sensitivity.mjs`, `navigation-sensitivity-results.json`.

**R5 — confirmation hit areas.** Both Delete and Cancel measured44px high at desktop1500 and narrow390, in RU and EN. Widths were86.1875/82.1875px in RU and72.1875/73.1875px in EN, with8px between actions. Keyboard traversal returned to each action, `:focus-visible` was true, and computed outline was visible. Screenshots were inspected. No horizontal overflow occurred.

In each of the four viewport/language samples, Cancel via Enter was an exact document no-op. Confirmed Delete via Space removed only a controlled redundant Road8 and its3 dependent crossings; other roads, IDs, counters, RNG and document fields were unchanged. One Undo and Redo restored the exact snapshots. Evidence: `browser-results.json`, `confirmation-ru-390.png`, `confirmation-en-1500.png` and the other two confirmation screenshots.

## Whole-package acceptance and regression evidence

The final patch only changes confirmation presentation and two existing browser oracles. Prior independent review evidence on `7267843` is retained as historical evidence, checked against the final diff; it is not relabelled as a new execution. `acceptance_matrix.json` traces every AC and states the carry-forward basis.

Fresh production probes also rechecked:

- R1: suppressed center draft refuses Enter with a visible explanation; Escape leaves the document exact. The existing Node actual-App contract covers suppressed and tract centers while permitting explicit POIs.
- R2: overlapping legacy Road IDs select exactly one map/panel target. A kind change affects only the selected segment; Undo restores it.
- R3: actual Tab traversal reaches road and crossing targets; Enter/Space selects the exact identity with visible focus. Map hit areas stay44px at two sampled zoom scales.
- Whole-path preview highlights all8 segments of a multi-region path; RU/EN narrow layout remains usable. PNG is successfully downloaded and the serialized SVG export clone contains no editor overlays. SHA256, sizes and signature/marker checks are retained in `export-artifact-metadata.json`; the large export artifacts need not be uploaded.
- Previously limited AC07: with an active one-segment draft, real mouse pan, wheel zoom and rotation preserve the draft geometry. Invalid single-node export is refused; valid export commits once. Enter, repeated endpoint and Reset are independently exercised; one Undo/Redo restores exact document data. The Reset action is browser-clicked, not tested on physical touch hardware.

Prior independent actual-App geometry/crossing evidence covers cross-region creation, the15-cell crossing matrix, multiple river IDs/max fullness, dependent deletion, invalid topology, preparation failure and deterministic continuation. The exact-head Node and CI suites validate those unchanged boundaries. Full local production-browser/mixed100 corpora were not duplicated after exact-head CI was independently verified; a local `npm run check` was run for the repository-required Node/typecheck/build gate.

Remote CI, independently verified by the parent: run41175211725 check job124461231216, browser job124461231201 and world-random job124461231100 succeeded on this head. All7 required browser suites passed. The separate seed-ui run41175211733 was skipped, not passed. Parent-persisted raw CI evidence supplies the provenance for those remote claims.

Local Node24.22.1 `npm run check` exited0:256 tests,256 passed,0 failed,0 skipped; typecheck and production build passed. Duration356006ms. Build emits the existing large-chunk advisory. Raw evidence: `check.log`.

## Negative evidence and limits

The first temporary R4 diagnostic failed before browser injection because its reviewer extraction delimiter did not match the runner indentation; it generated a JavaScript SyntaxError. `browser-probe.mjs`, `browser-probe.log` and `browser-results.json` preserve that failure. Only the corrected standalone diagnostic was rerun; successful scenarios were not repeated. This was a harness error, not a product failure or a suppressed failing gate.

There are10 distinct temporary production scenarios. Across11 scenario executions,10 passed and1 failed due to that extraction error; all10 distinct scenarios ultimately passed. These counts are not permanent test-suite growth. Browser page errors and unexpected dialogs were absent.

No screen-reader session, physical touchscreen, all asynchronous interleavings, arbitrary imported road graphs, exhaustive zoom/device set, broad performance campaign, complete export role/style pixel matrix, or top5/10/20 game support is claimed. Existing asserted generator refusals in Node logs are not evidence of silently retried successful generation. No concrete unresolved E3 acceptance defect was found within the examined scope.

## Tests and score

Cumulative base→head: Node **+7 / −0 / modified0**, existing browser runners **+0 / −0 / modified2**. Final7267843→d7bb38f patch: Node0 changes; browser **+0 / −0 / modified2**. Five domain contracts plus two actual-App transaction/lifecycle cases protect distinct boundaries; the existing navigation and save-history runners cover production wiring. The final observer is independently sensitive to the intended regression. The confirmation extension checks the previously omitted state without adding another corpus. See `test_change_summary.json` for counting method, necessity, execution results and reuse rationale.

`score_assessment.json` independently applies canonical1.2 to S01-C04, S02-C02, S03-C05, S04-C04, S09-C04 and adjacent S03-C01. Before/after grades and points remain null/unverified; delta null, awarded points0. Bounded E3 acceptance does not establish every entity/mutation, named versions, the full export contract or broader game coverage. L1 map evidence is separated from L2/L3 mechanics; no released-product score update or double counting occurs.

Actual automation `peek` at reviewer start and end returned enabled=true for6ad9c2426c7481919bb9f3d2b289e9b9. No restoration or schedule change was needed. `automation_health.json` retains the observed status; raw responses with automation instructions need not be uploaded. The precise initial wall-clock timestamp was not captured; artifact-save time is labelled separately. Checks do not guarantee future service state.

Next: the parent records accepted E3 and its separate release-approval boundary. Further work in the already approved parent task can proceed through the E4 analyst handoff; acceptance of E3 does not authorize publication.
