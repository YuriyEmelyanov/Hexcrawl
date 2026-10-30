# Independent review — HX-BL-023 E2 / c4a37ee

Verdict: **changes_requested**. HX023-DE-R1 is independently verified resolved. One medium issue HX023-DE-R2 prevents E2 acceptance; no release/publication approval implied.

Reviewed exact freshly fetched c4a37ee9b16b0d0641f1f01f1b6093b863f56d15, tree6b51af3e49f294964888228ff27ac26e7adf453b, isolated /workspace/review-c4a37ee. Source read: AGENTS.md, docs/index.md, development workflow, current agent-operations spec E2-2.0 including30Oct compact amendment, process, canonical score-model1.2 and vision. Entire base8f7d172→head source/test diff reviewed plus latest063c154→head changes. No product source, GitHub, main or claim writes.

## HX023-DE-R2 — short direct values lack required44px width (medium)

Source: src/styles.css:227–228, src/App.tsx:14015–14019. DE-01 and DE-AC01 require effective44px touch targets;30Oct amendment preserves that requirement while asking for zero padding, close underline and blue values.

Reproduce in production build at390px: import baseline-mythic fixture, select first region centre, enable Edit, rename region to valid one-character name “Я”, Enter. Direct name button measures **12.328125×44px**, computed min-width0px. A real Playwright mouse click30px from its left edge at middle height (inside a44px-wide target, outside current button) does not open input. Clicking text centre does. Parent has no delegated extended hit target. Consequently allowed short labels make direct editing substantially narrower than required.

Evidence: short-target.json, short-target-390.png, ui-probe.mjs. Fix within scope: ensure minimum44px effective width for supported direct controls, preserving padding0, currentColor underline, .08em offset and blue text. Recheck shortest accepted names at390 and wide. No new permanent test requested automatically; current height-only browser check misses this failure.

## R1 / package verification

- Real browser wheel completes valid current draft before zoom; exactly one name transaction survives exact Undo/Redo. Invalid name retains focused local error, cancels zoom and preserves committed data.
- Ref-based native listeners consult latest finishInlineName closure. Synthetic TouchEvent pinch completes once; invalid pinch and single-finger moves cancel; valid single-finger move completes. Composing wheel defers completion/zoom, then compositionend permits current draft completion.
- Global Edit/Done, no paired Save/Cancel/pencil controls; direct Enter/Tab/blur/Done, locale departure and existing-object selection work. Captured old locale changes only; untouched long legacy kingdom locale remains literal. Notes immediate/grouped Undo/Redo and existing POI inline add/remove work. Import closes unchanged active input/mode and does not resurrect old fields.
- Production390 RU/EN does not horizontally overflow. Normal fixture targets have44px heights. Computed compact style: rgb(125,211,252), padding0px, dashed underline,1.28px(.08em) offset. Desktop/390 screenshots inspected; short-name width is the exception.
- Five targeted existing actual-handler cases pass: direct names (all5×2 locales, legacy/no-op/stale/precommit fault), region biome and deterministic edited-copy continuation, notes grouping, busy import, redo preservation. Separate independent edge probe covers canonical12/6/6 choices, exact five metadata fields and whole snapshots/history, hidden underwater/equal-base overrides,24 canonical adjacency decisions.
- Fresh local production build passes. Independently refreshed GitHub commit workflow and jobs: Check40995005765 success; check249/249, browser and world-random successful. Logs show synthetic merge35ad255; fresh fetched merge tree independently equals candidate tree6b51af3. Separate HX-FB-001 UI acceptance workflow skipped, not represented as pass.

## Test review and normalization

Full E2 vs base8f7d172: logical Node +1 region-biome case /−0 / modified1 name lifecycle, plus modified1 existing browser lifecycle (overall +1/−0/modified2). Harness exposure is instrumentation, not another case. Latest R1 vs063c154: +0/−0/modified1 browser lifecycle. Reusing lifecycle cases is justified: locale-only writes replace paired-name behavior; region-base mutation is distinct from local overrides; wheel bypasses pointerdown and previously reproduced R1. Touch assertions are useful bounded diagnostics, explicitly synthetic. No new permanent reviewer tests.

Normalizing **only ui.mapScale** in full saved-document comparisons is sound for these wheel/pinch transaction checks: navigation legitimately changes zoom outside name semantics, while map/generation/counters/selection/mode/rotation remain compared. Separate assertions require actual zoom for valid input and unchanged scale for invalid input. It does not prove physical touch scrolling behavior, viewport scroll anchoring or general navigation quality.

Limitations: Linux headless Chromium153 runtime, no physical touchscreen/OS keyboard/real IME device. Touch events are synthetic; no claim of physical-device acceptance. Reused earlier probe structure as an input, rerun all reported results independently on exact new build; prior verdict not inherited. Full mixed100/corpus/audit was not duplicated locally; refreshed exact-tree CI supplies that broader evidence. Passing bounded probes is not proof of all cases.

Score: score_assessment.json records all6 requested criteria under model1.2 with before/after grade/points unknown, insufficient_evidence, delta unknown and **no awarded increment**. Current50unverified/1000 weight remains unchanged; no game cohort support or historical1.1 score transferred.

Next step: developer fixes HX023-DE-R2 in same isolated E2 branch; new SHA requires fresh review before acceptance and separate owner publication permission.

