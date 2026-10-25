# Independent review: HX-BL-030 / PR472

Exact reviewed SHA: c6923f37559a8ce00e0bb995e19c32fb22f3941c; base 6aaefa8896e7aac163cfcd5c2ca896ac60fc54d0. Spec1.0, model1.1. Fresh independent agent /root/independent_review, 2026-10-25. Detached worktree /workspace/scratch/bb71cea1fbf0/review-c6923f3; original checkout and product sources unchanged. Read AGENTS, index, vision, score model, development workflow, README, relevant region/Mythic/RNG rules, task spec, prior reviewer result and new developer evidence.

## Conclusion

Changes requested; release_ready=false. R1 and R2 are fixed at the real production-handler boundary. A new concrete diagnostic contract violation R3 remains. Full task acceptance also lacks the bounded evidence below; these gaps are evidence gaps, not allegations that those product paths fail.

## R3 (P2): preserve regenerate action in late Mythic failure diagnostic

Source: src/App.tsx:12986, related 11307,11316,12833,12940. DIAG-01 / AC-10.

Reproduce with Node24: `node /workspace/scratch/bb71cea1fbf0/review-c6923f3-diagnostic.mjs`.
1. Seed0, classic size locality, choose Mythic, generate a whole kingdom via generateAt and advanceKingdom.
2. Save full before and both histories; regenerateLastRegion, finishPendingRegeneration; advance three steps.
3. Inject a throw into chooseRegionCenter, then finish the kingdom loop.
4. Read the final `[generation]` event.

Expected final action is `regenerate`, with the original whole-document action context. Actual action is `add`. Before RNG=geography1193655228/poi1266212832; after three steps both have advanced to3762210205/3473849527. Full rollback and both histories pass; final diagnostic before/after correctly restore initial RNG. This is a diagnostic/replay bug, not demonstrated map loss.

Cause: generationProgress is recreated with action=add on each render; safelyAddRegionToMap sees pendingRegen cleared during late kingdom steps. Success finishKingdom explicitly restores action based on job.failureBackup, but the catch at12986 does not. A recorded add action at the original occupied anchor is not the original regeneration operation, so initial full JSON plus recorded action cannot faithfully replay it.

Requested fix: retain the original action and its whole-document context across all kingdom ticks, use it for the final failure record, and test successful/failing Mythic add and regenerate replay from original JSON/action. For regenerate, reconstruct the prerequisite session/checkpoint using a documented action prefix or test setup: TX-04 intentionally omits generation history from JSON and import disables regeneration until a new generation. Do not add exported history or change that boundary. If the literal bare-JSON regenerate replay wording cannot coexist with TX-04, obtain a bounded specification clarification rather than invent scope. Distinguish internal per-region events from the final user action; do not infer replay action from a current partial region or mutable controls.

## Independent R1/R2 verification

`review-c6923f3-independent.mjs` and its JSON output use production handlers with hook storage substituted, no algorithm replacement. Math.random guard is enabled after seed creation.
- R1: same captured callback invoked twice, both before a rerender and after a rerender. One transaction; exact document/RNG preserved after duplicate; undo to exact empty before and redo to exact first after.
- R2: hidden locality control then whole Mythic generate/regenerate/delete/undo. Checkpoint RNG exactly equals original pre-regenerate RNG1193655228/1266212832.
- Also tested classic locality regeneration: pending geography advances872447858→2704013671, but final checkpoint correctly uses872447858; delete/undo exact. The tempting classic variant of R2 is **not a bug**: safelyAddRegionToMap restores activeGenerationBefore from pendingRegen.backup.

## Acceptance matrix and bounded remaining work

| ID | Assessment on this SHA | Remaining proof required before full acceptance |
|---|---|---|
| AC-01 | Pass: vectors/module checks; independent interleaving/restore tests | No new gap identified. |
| AC-02 | Pass via exact-tree CI: all8 profiles, full fresh JSON after each of3 units | No new gap identified. |
| AC-03 | Pass via exact-tree UI CI and local handler suite | No new gap identified. |
| AC-04 | Partial: R2 fixed, classic/Mythic checkpoints independently checked, undo/repeat covered | Complete the explicitly required generate→manual POI/biome/name→delete-last/regenerate sequence in both modes with full content/RNG/undo/redo comparisons, including successive regenerate. Existing separate manual/history tests do not establish the combined new RNG scenario. |
| AC-05 | Partial: programming rollback, late Mythic rollback, pre-options exception, old sea recovery tests pass | Both-mode constraint/attempt-exhaustion-without-commit: compare complete document and both histories, then compare next successful action after removing injection to clean control. Add prepare-regenerate failure full before/redo checks and successful tract fallback RNG-consumption assertion. R3 repro verifies genuine both-stream advance and complete late-regenerate rollback, but not the entire required matrix. |
| AC-06 | Partial: render/runtime guards and existing visual/navigation/export tests | One production UI action sequence per mode covering Tile/Emoji/Color, POI SVG/emoji, RU/EN, zoom/pan/rotate returned to same view, PNG/JSON export and rename restored; assert unchanged RNG and next complete generated JSON equals untouched control. Keep independent extra-poi→geography test. |
| AC-07 | Pass at handler boundary: both manifests imported/roundtripped/continued in both modes; UI seed boundary profiles covered | Deterministic rejected Mythic next actions (lake-reentry and sea-pocket) restore before; test permits these. This does not prove every fixture action commits a new kingdom; finite corpus only. |
| AC-08 | Partial: broad v2/v3 malformed generation classes rejected by real import handler | Production UI negative matrix on an existing nonempty map with redo (e.g. generate twice, undo once), compare map/RNG/view/both histories; cover invalid seed classes, no-op and file cancellation without draw. Current malformed test undoes its only generation, leaving an empty world with redo; browser test covers only future rngVersion. |
| AC-09 | Partial: R1 fixed; pending callback/kingdom duplicate and delayed import coverage exists | Production UI rapid/double click, pendingRegen/kingdom repeated effect and delayed import checks with exact RNG/history counts and export blocked while mutation busy. Handler duplicate evidence proves R1 fix but is not the physical UI matrix. |
| AC-10 | **Fail R3**, plus incomplete replay proof | Fix R3; initial JSON + recorded original action replay for both modes, success and failure, exact before/after/outcome; mutate later to prove detached record. Do not substitute resolved options for original category action. |
| AC-11 | Check/CI infrastructure passes; acceptance completeness partial | Include the new AC04–10 acceptance cases in CI; green existing jobs do not imply missing cases were exercised. |

Developer acknowledges AC05/06/08/09/10 limits; this review does not turn those admissions into invented bugs. The matrix specifies finite closure work within approved scope, with no new feature request or requirement to demonstrate universal correctness.

## Checks and CI provenance

Node v24.22.1, npm ci and npm run check in detached worktree completed exit0:215/215 tests,0 failures/skips, TypeScript and production build pass; see install/check logs. Independent repro scripts completed successfully, including expected negative R3 assertion. Browser was not run locally and no Chromium reinstall attempted. Root independently read fresh CI40141169603 logs: check215/215, typecheck/build, standard browser and world-random all pass;8 RNG profiles plus R2 pass. Checkout synthetic merge6b58e1c41daf9ff06bd30ad5d446247a0db01c96 has same tree as reviewed head (root independently verifies). This is CI evidence, not a claimed local browser rerun.

## Score assessment

Model1.1; unchanged registry186.25/1000; no score edits. S02-C01 G0/0→provisional G1/7.5 (+7.5) is supported as a functioning prototype by saved independent streams, exact continuation in both modes/eight UI profiles and independent checkpoint/rollback evidence. It remains provisional and unreleased because R3 and explicit acceptance gaps block the task. Possible total after later acceptance/release193.75, not awarded now. No basis for G2/G3/G4: protected reroll/comparative/user evidence outside scope or absent.

Regression criteria: S02-C03 G1/5 unchanged, S03-C05 G2/10 unchanged, S04-C04 G2/7.5 unchanged, S09-C04 G2/5 unchanged, all delta0. New corpus/malformed/undo/checkpoint passes and prior CI tests support no demonstrated grade regression; missing combined acceptance is not proof of regression or fresh credit. R3 affects diagnostic fidelity and task acceptance; no evidence justifies reducing accepted migration/editor/export/data safety grades. Reassess if subsequent checks reveal map corruption.

Finite profiles/corpus are not proof about every seed,10000/100000 maps or comparative superiority. No product edits, GitHub writes, operations-claim writes, merges, publication or automation changes performed by this independent agent.
