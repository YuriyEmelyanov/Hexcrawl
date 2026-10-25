# HX-BL-030 independent review — 855cfd5

Verdict: **changes_requested**. R1–R4 are independently rechecked as fixed. One new concrete TX-06/AC-09 defect remains, R5. No release or registry update is approved by this review.

Head `855cfd5b8cd2e70e1013d92b5dc9e6e21be063d0`; base `6aaefa8896e7aac163cfcd5c2ca896ac60fc54d0`; tree `498d29de8e18bc62a329f3ede52f7073362a3a50`. Separate detached worktree, spec1.0, model1.1. Sources read include AGENTS/index/vision/model/workflow, current spec/approvals/budget/backlog/lessons, prior review and current developer evidence. The owner waived usage gate; release remains separate.

## R5 — consumed pending regeneration can execute again after a newer one (P2)

`src/App.tsx:13126–13131` compares pendingRegen only to `lastPendingRegen.current`. After request B has executed, old captured request A no longer equals that ref. Invoking A executes stale generation against its old render/backup. The consumed-job WeakSet correctly fixes the analogous R4 kingdom-tick case but does not cover pending requests.

The scripts import the separate exact-SHA worktree harness; install its lockfile dependencies (`npm ci`) or temporarily link the original checkout node_modules before running them. Dependency symlink used for checks was removed; final worktree is clean.

Reproduction: seed0, locality, either mode; generate one unit; request regenerate A, capture its finishPendingRegeneration callback, execute A to completion; request/finish B; save full JSON and both histories; invoke captured A again and finish any Mythic job. Expected exact no-op/no draw. Actual:

| Mode | Regions before → after | Undo entries before → after | geography before → after | poi before → after |
|---|---:|---:|---:|---:|
| classic | 1 → 1 | 3 → 4 | 2865532062 → 2474308580 | 4294177991 → 4230236794 |
| Mythic | 33 → 26 | 3 → 1 | 1163608680 → 1193655228 | 257391574 → 1266212832 |

The handler regression demonstrates stale callback behavior explicitly prohibited by TX-06; it does not assert that an ordinary physical UI sequence automatically replays this old closure. Full before/after documents and both histories are locally in R5-classic.json/R5-mythic.json; root persists these as R5-snapshots.zip with a raw-file hash manifest. Scripts and compact hashes/outcomes are in independent.mjs/independent.log.

Requested correction: preserve permanent consumed-request/freshness protection, preventing old callbacks from drawing, committing or restoring old backups. Add finite A→B→captured A tests in both modes with exact full-document, RNG and both-history comparisons; include after undo/redo as relevant. No new feature, history export or UI is required.

## Independent fixed-defect probes

`fixed-regressions.mjs` and `.log` independently check R1 captured classic callback before/after render and undo/redo; R2 locality control carried into Mythic regenerate/delete checkpoint/undo; R3 late regenerate failure after both streams advance, changed controls, original action/categories and exact full rollback; R4 consumed tick after a newer tick and after completion. All four pass. Production source was inspected; these are separately authored handler probes using the existing real-App harness, not copied claims from developer evidence.

## Acceptance matrix

| ID | Assessment | Evidence and bounded interpretation |
|---|---|---|
| AC-01 | pass | Frozen suite: independent Python vectors seeds 0/1/max, both streams ten draws, cloning/restoration/interleaving. Source uint32 arithmetic and toponym derivation inspected. |
| AC-02 | pass | Root independently verified exact-tree CI browser eight seed/mode profiles, three successful units each and full JSON comparisons; production seed field/actions and runtime Math.random guard inspected. |
| AC-03 | pass | Exact-tree browser fresh/import continuation in both modes; frozen handler continuation suite includes real multistep Mythic, not a mocked generator. |
| AC-04 | pass | Frozen mixed manual POI/biome/name/delete/regenerate tests compare full snapshots and current/checkpoint RNG. Independent R1/R2 probes pass. Registry name edit is model boundary evidence; no text rename UI exists or is newly required. |
| AC-05 | pass | Frozen suite includes both streams actually spent before injected errors, both-mode constraint rollback with redo/clean control, prepare-regenerate failure, late Mythic rollback, successful tract fallback. Independent R3 late failure passed. Attempts exhaustion commits tract in existing rules, so no imaginary separate no-commit outcome required. |
| AC-06 | pass | Exact-tree UI CI display/language/navigation/rotation/PNG/JSON then next full world both modes; handler registry rename/restore and source stream audit. Small view roundoff reconciled to identical control view explicitly. |
| AC-07 | pass_with_limit | Both frozen manifests imported/roundtripped/next action in both modes; v2 objects preserved, v3 streams retained. Lake-reentry/sea-pocket Mythic continuation deterministic rejection with complete rollback is accurately recorded, not claimed successful expansion. Seed0/max UI covered. |
| AC-08 | pass | Frozen nonempty-map redo malformed v2/v3 and browser invalid input/no-op/file cancel matrices. Parser validates before setters and does not ignore v2 generation. |
| AC-09 | fail | Independent R5: consumed pendingRegen callback A executes after newer pendingRegen B, moving both RNG/document/histories in both modes. R1 and R4 pass, and exact-tree CI covers double click, delayed import, busy export and repeated real effect tick. No claim of full dev-mode remount testing. |
| AC-10 | pass_with_limit | Independent R3 proves late regenerate action/categories and exact rollback. Frozen eight replay combinations add/regenerate x modes x success/failure compare full outcome. Regenerate requires documented deterministic session action prefix; TX04 excludes history from JSON, so bare imported JSON cannot itself enable regenerate. |
| AC-11 | pass_checks_not_acceptance | Node24 frozen check recorded separately; root verified CI40157589419 check234 and both browser jobs on same tree. Acceptance tests are included in CI; R5 demonstrates coverage hole, not failed CI. Production Math.random is restricted to compatibility defaults; guarded real paths exercised. |

## Checks and provenance

Frozen local Node v24.22.1 `npm run check`: **passed, exit0**, TypeScript +234/234 tests (zero fail/cancel/skip;848476.65ms) + Vite production build (19.08s). Unchanged frozen tree throughout; check.log records the complete run. Separate probes R1–R4 pass; R5 negative reproduces in both modes. A separately saved reviewer Python uint32 reference (reference-vectors.py/.log) matches all sixty expected stream draws. Local browser was not reinstalled or rerun because Chromium is absent.

Root independently fetched CI40157589419 logs: all three jobs passed, check234/234 with zero fail/skip, production browser suites Chromium151.0.7922.34. Checkout952d9b1e953039b420b73c9735b583b3a3fb8129 is synthetic merge of head into stated base and has the exact head tree498d29de. Workflow, browser tests and source inspected independently here; CI log/provenance verification belongs to root and is explicitly attributed.

## Score assessment, model1.1

S02-C01 beforeG0/0; provisional functioning prototypeG1/7.5 (+7.5), supported by explicit saved streams, real continuation/undo/failure and isolation evidence. R5 blocks task acceptance; no points applied before acceptance and separately authorized release. No G2+ or protected local reroll/comparative claims. Current total186.25 remains unchanged; possible later accepted/released total193.75.

| Regression criterion | Before | Provisional after | Delta |
|---|---|---|---:|
| S02-C03 | G1/5 | G1/5 | 0 |
| S03-C05 | G2/10 | G2/10 | 0 |
| S04-C04 | G2/7.5 | G2/7.5 | 0 |
| S09-C04 | G2/5 | G2/5 | 0 |

These unchanged grades are provisional retention, not a claim that all safety/history acceptance gates pass. R5 blocks candidate safety/history acceptance. No additional credit or demonstrated criterion-grade change is applied; published baseline registry is untouched.

The registry rename, checkpoint-prefix replay, deterministic rejected fixture continuation and absence of a separate dev-mode mount experiment are accurately bounded evidence, not additional blockers or permission to broaden scope. Finite samples do not prove all seeds or10000/100000 maps. No GitHub/operations/product writes, merge/deploy/automation changes by reviewer. Next: developer fixes R5, then fresh review of exact new SHA.
