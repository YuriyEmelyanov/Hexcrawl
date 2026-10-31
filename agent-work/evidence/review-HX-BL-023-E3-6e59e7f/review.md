# Independent review — HX-BL-023 / E3

Verdict: **changes_requested**. Review target PR480, head `6e59e7fde9545b7508804560ecd0fe0a50d1611a`, base `defaa5c24d546e4283430573c2d4e4f3b6194dc0`. Fresh reviewer agent checked out the exact commit, independently verified tree `941a084473c2f229ce09546764c73f8adb779eeb`, and inspected the entire eight-file diff. Working tree is clean; reviewer did not change product code or make GitHub writes. No publication is authorized by this report.

Sources read: exact-head AGENTS.md, docs/index.md, docs/road-model.md; operational E3-1.0 spec blob82d57dfde2e24abf1662c31fe77bef6763cd5fb3; handoff2026-10-31-HX-BL-023-E3-6e59e7f-review.json; operational score-model1.2, vision and process. Current owner decisions supersede historical budget/model1.1 instructions.

## Findings

### HX023-E3-R1 — P2: suppressed centers are accepted as road destinations

Location: src/App.tsx:12870 (destination predicate passed to prepareRoadEdit); applicable AC02/AC04 and ROAD-08, explicit suppressed-center rule in docs/road-model.md. Every region center is accepted, even when `suppressCentralPoi=true` or `isTract=true`. The generator's existing destination calculation at App.tsx:11193 excludes both. This permits a new internal dead end without a POI, existing network node or open exit.

Independent reproduction: start from baseline-mythic.json; make its dry internal region1 center(3,6) suppressed, remove its central POI kind, and ensure center is absent from explicit POIs. Clear roads/crossings/obstacles to isolate the endpoint contract; neighbor(4,6) is an explicit POI. The six neighbors of(3,6) all exist. This is a controlled valid imported fixture, not an assertion that the original unmodified fixture already has this dry suppressed center. Import succeeds without warnings. Actual App handler `editRoadDocument({type:'create',path:[{q:4,r:6},{q:3,r:6}],kind:'trail'})` returns true, road count0→1, history1→2. The independent production browser imports the same JSON, selects(4,6), enters Edit, starts the draft, clicks(3,6), focuses map and presses Enter: the road is committed. Undo restores the exact prior save.

Expected: reject the empty interior endpoint and preserve map/history/draft until corrected. Required fix: use actual eligible destinations consistently for creation and topology checks, retaining explicit POIs. Existing domain tests use `destination:()=>true`; the real handler test adds POIs at both ends, so neither can detect this omission. Extend the existing endpoint/handler coverage rather than duplicating its happy path.

Evidence: probe.mjs, probe-results.json, suppressed-endpoint-input.json, suppressed-endpoint-after.json, browser-probe.mjs, browser-results.json, suppressed-endpoint-1500.png. The earlier GitHub bot comment reported the same hypothesis; this finding was independently reproduced rather than accepted on its authority.

### HX023-E3-R2 — P2: overlapping legacy paths cannot be selected individually

Locations: src/App.tsx:14157–14167,14182–14185,14865. Selection retains only normalized segment pair, not Road.id or crossing key. In a valid imported legacy fixture with Road1 and Road8 sharing segment0,1→-1,2, clicking the labeled Road1 item sets **both** items `aria-pressed=true` and highlights two lines. Clicking Road8 uses the same pair and cannot select/highlight it separately. The specification explicitly requires the object list to select/highlight each legacy object rather than merely identify the common geometry (AC01/09).

Expected: object-specific selection including roadId/segmentKey and, for crossing selection, its exact key, while exposing the alternatives for coincident hits. Mutations currently carry their row's Road.id, so this finding does not claim that the wrong Road is silently edited. The defect is ambiguous selection/feedback and the absence of the specified individual highlight.

Evidence: browser-results.json `overlap`, overlap-ru-1500.png, overlap-ru-390.png, overlap-en-390.png. The probe derives its legacy fixture by duplicating one selected segment into a new Road.id and updating nextRoadId; import is accepted with no alerts.

### HX023-E3-R3 — P2: direct map path targets lack keyboard access and the required touch target

Location: src/App.tsx:14862–14864. The new hit targets are bare SVG lines with only onClick, transparent strokeWidth12, no tabindex, accessible role/name, or keyboard handler. Browser DOM inspection found zero focusable elements in the path interaction overlay. A keyboard user cannot focus/activate the new direct map path selector; at normal scale its narrow dimension is12px, below the explicitly required44px touch target. Panel buttons/selects are44px and passed their checks, but they do not provide keyboard access to a path that has not been selected on the map. Crossing graphics also have no separate focusable exact-key selector in this change.

Expected: meet AC01's keyboard/focus and minimum hit-area requirements for the map selection targets as well as the panel controls, with a practical way to choose coincident objects. Evidence: exact source, browser-results.json `focusableRoadTargets:0`; panel measurements recorded separately to avoid conflating them.

## Acceptance matrix

| AC | Result on this SHA | Evidence and remaining limit |
|---|---|---|
|01|Fail|R2/R3. Panel controls≥44px; RU1500/390 and EN390 no horizontal page overflow. Direct path/crossing keyboard/focus and object-specific selection do not meet contract.|
|02|Fail|R1 proven through actual App and production UI. Existing targeted tests cover short/nonadjacent/repeated/water/obstacle/duplicate/ID cases, but do not cover suppressed center eligibility.|
|03|Partial, no new defect established|Existing kind/no-op/minimum unit checks passed; real App crossing no-op/history tests passed. Literal whole-document preservation on every kind/edit combination was not separately exhaustively checked.|
|04|Partial with affected predicate|Existing redundant-edge/removal/disconnection/open-exit checks passed. R1 also supplies incorrect destination eligibility to deletion validation; no separate deletion counterexample claimed. Full production deletion across regions deferred after blockers.|
|05|Partial|Existing crossing checks verify missing/ambiguous intersection, F4 ford refusal, unrelated record preservation. Code enforces integerF1–5 and fordF≤2. Independent full15-cell matrix and every max-sector/multiple-river UI case not rerun.|
|06|Partial|Deterministic creation/dependent crossings and exact history checks passed. Independent production PNG excludes editor-only markup. Edited crossing continuation over all legacy contexts not independently exercised.|
|07|Partial pass|Actual lifecycle tests passed for ephemeral draft, blocked writes, stale finish/import. Independent browser: invalid one-node draft blocks language/hide/JSON with clear error; reset preserves exact document and redo; Enter commits once; valid language change commits then switches. Full navigation/rotation/export/error combinatorics not claimed.|
|08|Partial|CI production legacy/history suite successful and local targeted transaction suite passed. Current independent probe confirms exact Undo of created road; complete post-edit deterministic continuation and full approved legacy corpus not newly rerun.|
|09|Fail|R2 overlapping-selection repro. Narrow layout and panel targets pass sampled lengths; arbitrary long labels and every full-path multi-region preview not independently exhausted.|
|10|Partial|Exact-head Check CI check/browser/world-random all success; special HX-FB-001 UI acceptance workflow skipped, not pass. Local production build and18 targeted tests pass. Browser console errors0/alerts0. E2/full Find regression inherited CI evidence, not an independent exhaustive UI pass.|

Stopping after reproducible blockers is bounded review, not acceptance of untested AC portions. A changed SHA needs independent re-review with these regressions and remaining acceptance gaps.

## Checks and test necessity

Independent local: Node24.22.1, Chromium153.0.8010.0; production build passed; `node --test test/manualRoads.test.mjs test/mapTransactions.test.mjs`:18 passed,0 failed,0 skipped. One temporary reviewer browser probe completed with no page errors/import alerts; it is not a permanent test addition. Source checkout and diff are exact-SHA, not tree-only substitution.

Independent GitHub read: Check run41158804637 success. Jobs124411468344(check),124411468608(browser),124411468509(world-random) completed successfully, including their named npm run steps. HX-FB-001 UI acceptance run41158804657 is skipped. CI confirms its existing coverage; passing jobs do not erase the reproduced failures.

Whole PR logical cases, base→head: Node **+7 /−0 /changed0** (five new domain cases in manualRoads.test.mjs, two actual App transaction/draft cases in mapTransactions.test.mjs); browser **+0 /−0 /changed1** existing save-history lifecycle runner. Helper exposure is not another test. These cases address distinct useful contracts: geometry/ID allocation; rejected geometry and obstacles; minimum/no-op; deletion topology; crossing dependencies/fullness; real commit+stale callback; ephemeral draft lifecycle. Domain unit checks and actual App history/busy checks exercise different failure boundaries. Browser expansion covers production wiring and narrow layout. No removal/duplication request based merely on quantity; focused missing endpoint eligibility belongs in an existing case. Count source: exact git diff and runner case declarations, not file/line counts or local execution count.

Independent score_assessment1.2 is provided separately. Baseline remains unknown; no award or product-score update.

Automation actual peek: start2026-10-31 02:56:15 UTC enabled=true; end2026-10-31 03:02:49 UTC enabled=true. ID6ad9c2426c7481919bb9f3d2b289e9b9. No disabling/restoration/schedule change; these observations do not guarantee future service state.

Next: developer fixes R1–R3 within approved E3, records exact new SHA, updates targeted evidence and handoff; independent reviewer checks fixes and unfinished AC portions. No merge or release approval inferred.
