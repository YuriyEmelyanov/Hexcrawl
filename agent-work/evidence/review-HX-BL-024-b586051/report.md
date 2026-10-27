# Independent review — HX-BL-024 / PR476

Verdict: **changes_requested** for exact head b586051ccb3a7cb219b77e9908ddd79b97febd51 against base02c2fd5fcbdb2042f2708709ce4f20dfd7354787. Independent detached worktree hx024-review fetched from public origin; head tree d6ac6f261b6638d274233be51582bd84ca4b31e7 matches expected. Developer checkout was not edited. No merge, release, GitHub review, backlog/latest mutation or game research.

Read AGENTS.md, docs/index.md, operational spec1.0, review handoff, process, vision, score-model1.2, feedback, budget, relevant lessons and developer report. Operational1.2 controls assessment; main's1.1 labels are historical.

## F1 — P2 / HIST-05: notes-loss refusal hides required actionable information

Location: src/App.tsx:14434–14442 (generation-error alert); relevant producer src/App.tsx:12830 and reportGenerationFailure at12873. A deliberate notes safety rejection is rendered as a generic programming error inviting retry. Required count/coordinates and instruction to move or clear notes are present only in diagnostics, not the user-facing alert. This blocks acceptance of HIST-05 / AC07 UX despite correct rollback in the observed case.

Natural reproduction, no algorithm fault injection:
1. Fresh app, RU, classic, world seed42, size category `region`, remaining defaults (Auto type/biome, mainland).
2. Click start hex0,0. Result:27 region hexes.
3. Select each of the27 actual region hexes, enter `keep` into «Заметки мастера» and click «Сохранить».
4. Change size to `locality`, click «Перегенерировать регион».
5. The proposed map loses19 noted coordinates. The visible alert is exactly «Не удалось создать регион из-за ошибки. Прежняя карта сохранена. Можно повторить попытку.» It contains neither coordinates/count nor the move/clear remedy. Repeating unchanged remains blocked; the alert offers no useful recovery.

Independent evidence: `ui-conflict.mjs`, `ui-conflict.log`, `conflict-ui.png` reproduce through real React + Chromium153 built from exact tree. Complete exported JSON before/after (except savedAt) compares equal. `conflict.mjs` / `conflict.log` separately exercise actual production generate/regenerate handlers and compare full captureDocument (generation RNG, checkpoints, selection, mode and scale included) plus both entire undo/redo stacks: equal. Its diagnostic explicitly identifies19 coordinates and «Сначала перенесите или очистите заметки».

Minimal handoff: preserve notes-loss as a distinct expected conflict; display a translated, safe count/coordinate list and move/clear instruction in the actual alert. Avoid indiscriminately rendering arbitrary raw programming-error text. Extend the existing React scenario with a natural regeneration conflict and assert its visible recovery text, plus existing exact rollback. Do not alter generation rules or weaken atomicity. Re-review changed SHA.

## Bounded independent verification

- Node24.22.1. `node --test --test-name-pattern='notes|no-op' test/mapTransactions.test.mjs test/saveSafety.test.mjs`:12 passed,0 failed,0 skipped (targeted-node.log). Distinct notes save/clear/dirty/no-op/redo; replace/legacy/malformed import; latest-surviving delete notes/confirmation and injected generation rollback; validator malformed classes and format compatibility.
- `node --test --test-name-pattern='notes' test/saveSafety.test.mjs`:8 passed,0 failed (notes-validation.log), separate diagnostic run, not additional coverage count.
- `node node_modules/typescript/bin/tsc --noEmit`:exit0 (tsc.log). `npm run build`:exit0 (build.log).
- `CHROMIUM_EXECUTABLE_PATH=/tmp/chromium node test/browser/save-history.smoke.mjs`:exit0 in Chromium153.0.8010.0 (browser-save-history.log): real notes lifecycle, water-only negative coordinate, dirty select/history guard and message, RU/EN390px, busy import; existing full fixture corpus,100 mixed history, errors and classic/Mythic checkpoints. UI-05 water-only case independently passes. Read dirty guards in actual selection/export/import/mutation handlers: guarded, not solely disabled attributes.
- Extra natural conflict browser check:exit0 and exact JSON rollback; production-handler check:exit0 and exact full-state/stacks rollback.
- A broader three-file Node run was started, then bounded after the material defect was confirmed; its partial node.log has no complete overall result. Do not call it a pass. Full npm run check, all browser suites and browser RNG suite were not independently repeated; developer/CI claims are not independent evidence. Targeted checks cover this change; no universal correctness claim.

## Independent test-change assessment

Diff exact base→head: Node +11 /−0 /modified2 logical runner cases. Added:7 parameterized malformed-notes inputs in saveSafety,1 supported-version/text case,3 mapTransactions notes cases. Modified2 worldContinuation cases: export4 expectation and invalid-RNG matrix. Added30 version4 malformed-RNG subcases inside existing Node matrix; not30 new runner cases. Browser save-history keeps1 existing script and adds2 bounded scenario groups (water-only and editor lifecycle). Browser RNG keeps2 mode matrices and adds30 version4 subcases per mode=60; do not sum scripts/subcases with Node cases. Helper harness exposure and screenshots are not test cases.

Useful and proportionate: notes is a new persisted manual-data contract; malformed classes differ by validation risk. Existing transaction/import infrastructure is reused; no duplicate100-history corpus added. The sea-only test protects a real wrapper condition unavailable in a land-based scenario. RNG version4 matrix protects a format boundary and is inexpensive within existing loops. Exact-state tests are sensitive to actual data/history corruption. The synthetic finalizer fault test protects rare loss rollback but only checks diagnostic text, which is why it misses F1's rendered-message defect. Recommendation: keep current coverage; add/extend a visible conflict assertion in the existing React runner rather than another generic suite. No test removal justified.

## Independent score_assessment1.2

All five criterion baselines in operational current-score are unknown/null. No speculative points, no conversion of historical1.1 score, no product/released score update. Before grade/points, after grade/points, delta are **unknown/null** for every criterion; status insufficient_evidence. This is an explicit bounded assessment, not omitted work.

| Criterion / weight | Quality observed at head | Breadth and limits |
|---|---|---|
| S05-C01 /25 | Working plain-text manual contribution at selected land/water; not full structured contextual hex card | Technical generic UI observed, no complete game/scenario audit; top5/10/20 unverified; module combination remains manual only |
| S03-C05 /20 | Notes save/clear/import/delete have bounded exact reversibility; real existing100-history runner passes | Technical criterion, no artificial game quota. Named map versions and every edit family not established by this bounded review; no overall grade |
| S04-C04 /15 | v4 notes format, v2/3 compatibility, actual JSON history/round-trip pass; no SVG note text in current runner | Technical criterion. Full claimed styles/roles, independent PNG fidelity and whole approved corpus completeness beyond bounded runner not newly established |
| S09-C04 /10 | Malformed notes atomic; destructive latest-note preservation; natural conflict rollback exact. F1 recovery UX incomplete | Technical criterion. Bounded malformed/fault/natural cases, not proof against every failure/data-loss path; overall grade unverified |
| S02-C01 /30 | Notes-only equality and conflict restoration preserve RNG in bounded cases; generation version unchanged | Technical criterion. Full independent RNG/continuation corpus not rerun; no demonstrated criterion-wide transition |

SHA for every assessment: b586051ccb3a7cb219b77e9908ddd79b97febd51; methods: exact code diff, production handlers, real React/Chromium, logs above. Quality and breadth are separate; no double credit between serialization and RNG. No scores are added before release.

Automation health: task6ad9c2426c7481919bb9f3d2b289e9b9 start/end actual peek enabled=true; no restoration or mutation. Initial wrong argument `id` returned binding error; corrected `jawbone_id` succeeded. This observation cannot guarantee future service state. Root owns durable operational updates.
