# Independent review: HX-BL-023 E1 / PR478

Candidate: `24fa342cfacefdf604281ac0dc414912d6726433`; base `a7a8cc58987e97c4495c405374c6a4145f3bc9ff`; tree `eada6175b9725179c8710e92f874df77321fd13f`.
Reviewer: fresh independent agent `/root/review_hx023_24fa342`, separate detached worktree. No implementation authorship, product writes, merge, deployment, or GitHub operational writes. Product source remained exact candidate. Temporary diagnostic browser script is untracked and retained as evidence, not a proposed permanent test.

**Verdict: changes_requested.** One independently reproduced P2 contract violation is sufficient to return E1. Passing automated cases do not close the acceptance contract.

## Finding F1 — ordinary existing-hex selection is blocked by dirty name draft (P2)

Location: src/App.tsx:13987–13995, with mutationBlocked at12815–12819.

Reproduce on production build in Chromium153:
1. Import test/fixtures/import-v2/baseline-mythic.json. Select existing hex3,6.
2. Open Map names, choose first catalog object, type a changed Russian name without saving.
3. Click existing hex2,6. The info panel still shows coordinates3/6. Draft remains pending; no transition choice is shown.
4. Cancel with Escape; click the same existing hex2,6. It now selects2/6.

Expected: E1 form behavior5 explicitly leaves navigation and browsing available while document mutations are blocked; an existing-hex inspection must remain possible without losing draft. Actual: common mutationBlocked() executes before distinguishing candidate generation from existing selection, so dirtyNameDraft rejects both.

Evidence: independent-browser-probe.log records the actual info panel before/dirty/afterCancel and confirms both assertions; dirty-selection.png captures the production UI. The probe uses actual exported production React handlers via rendered SVG click, not a substitute model. Earlier bot feedback was a lead, not proof; this is fresh exact-SHA reproduction. Candidate generation must remain guarded when fixing the nonmutating selection branch.

## Acceptance evidence and limits

| AC | Independent result on candidate | Evidence / remaining limits |
|---|---|---|
| N01 | Five entity-type catalog/save paths exercised by actual React runner; catalog source derives live getToponymEntities and distinct kingdoms, not arbitrary registry keys. | Browser save-history lifecycle; source inspection. Every imported forest/secondary/collision/off-screen subtype is not individually asserted by the suite; no exhaustive corpus claim. |
| N02 | Actual UI exercises paired names, literal HTML/Unicode, empty/81 rejection,80 acceptance, duplicate error; helper tests cover paired trim/boundaries. | check.log and browser lifecycle. CR/LF/C0/DEL source guard examined; Node name-handler test injects NUL. Same-kingdom namespace source is intentionally separate. No complete printable-Unicode corpus. |
| N03 | Shared one-save transaction, exact undo/redo, no-op with redo, Escape, all three catalog dirty transitions exercised. | Real production browser plus real-handler Node test. **F1 fails navigation/browsing portion of dirty contract.** |
| N04 | Real-handler test independently rerun: stale saved closure after applyDocument preserves new document and both stacks; dirty callbacks reset/import/undo refused; preparation exception leaves map/history unchanged. Browser injects structuredClone preparation failure before commit and checks visible error. | Finite faults only; no claim about arbitrary JS/process failures or full asynchronous schedule enumeration. Missing-entity/double-save safety inspected in expected draft/ref/revision/current-name guards. |
| N05 | Existing fixture imports and v4 exact name roundtrip; Classic rename→growth→delete other last-region preserves map. | Save-history runner plus handler tests. Existing generic v2/v3/v4 compatibility checks are reused, but no full rename×all versions×all entity subtypes×modes cross-product; kingdom continuation not individually asserted in E1 browser block. |
| N06 | Actual RU/EN390 and desktop forms/errors captured by runner;390 no-overflow assertion; language retains draft; dirty-dialog autofocus checked. | Screenshots and source aria-invalid/describedby/live status,44px new controls. Keyboard Escape checked; full assistive technology or every native select interaction not tested. |
| N07 | Before-save export equals committed document; after-save expected document differs only selected name pair; JSON roundtrip; no labels inserted into map artwork. | Real exported JSON snapshot assertions, source render/export split, existing PNG export regressions. E1-specific exact PNG pixel comparison was not added; notes grouping is reused from existing real-handler/browser lifecycle, not claimed universal. |

## Methods and source authority

Read repo/AGENTS.md, docs/index.md, and current GitHub agent-operations process.md, strategy/vision.md, strategy/score-model.md1.2, specs/HX-BL-023.md2.0, exact24fa342 handoff and current-score.json. Owner decisions supersede historic main1.1 and removed budget/time restrictions. Scope is only rename existing region/settlement/river/lake/kingdom RU+EN through shared history. No whole023/editor or complete game-support acceptance.

Diff:7 files,331 insertions,23 deletions. App175+/20−; CSS21+; docs16+/1−; browser save-history67+/1−; Node transaction50+; harness2+/1−. git diff --check passed. Preparation in recordTransaction now copies both snapshots before incrementing revision; save preparation clones map and constructs pair before commit. No generation algorithm changes found.

CI independently queried:40794199705 check/browser/world-random all success, commit-associated workflow API returns same run. Root independently verifies synthetic merge tree bridge; local candidate tree matches expected eada6175. CI is supplementary to fresh local execution.

## Test necessity, reuse, cost

Permanent Node runner: +1/−0/modified0 test declarations; base247→candidate248. New case belongs to mapTransactions.test.mjs and uniquely integrates actual App name handlers/shared history, kingdom storage, stale closure, dirty guard and fault. Existing topoynm helper cases reused rather than duplicated. Harness only exposes callbacks for this boundary. One test declaration with many assertions is not broad coverage by itself.

Permanent browser runner: same7 scripts,0 new runners; existing save-history script has one added E1 lifecycle block and one expanded fault hook. Necessary because DOM focus/errors/form language, actual rendered catalog and serialized JSON are not proven by VM hooks. Setup/import/export/history helpers reused. Added lifecycle has several entity transactions and continuation; cost is bounded but nonzero. No second mixed100 or new general suite. The gap that let F1 through is candidate-only dirty click coverage; a narrow existing-hex assertion belongs beside it when fixed.

Independent diagnostic: one temporary script derived only setup helpers, probes F1 with two coordinate selections and screenshot. Failed initial attempts were probe synchronization/setup issues, not product findings; final probe passed both defect and cancellation control assertions. Full mandatory browser runner initially stopped at navigation launch because that script ignores CHROMIUM_EXECUTABLE_PATH and expected Playwright cache executable was absent; negative log preserved. Runtime-only symlink to supplied Chromium153 repaired environment; remaining scripts rerun unchanged. Incidental navigation timing output comes from required existing suite; no new HX-BL-003 measurement/study was created.

## Disposition

Programmer fixes F1 narrowly: permit viewing existing hexes without losing pending draft; preserve candidate and all document-mutation guards, stale handlers, Save/Discard/Stay, shared history and focus. Extend existing regression case if appropriate; no new suite. New SHA needs independent review. No release approval exists in this review; even acceptance would require separate exact-package owner authorization.

## Final execution results

- `npm run check` Node24.22.1: exit0, TypeScript passed,248 tests executed/passed,0 failed/cancelled/skipped/todo; test duration591294.380973ms, production build passed (existing bundle-size warning). Raw check.log.
- Production browser: all7 unchanged runner scripts passed. Initial aggregate exit1 at fifth script navigation due missing cache executable after first4 passed; retained browser-attempt1-environment-failure.log. Runtime symlink only, remaining3-script chain exit0; browser-remaining.log confirms final save/history completion. Logical assertion count unknown, deliberately not equated to scripts. Chromium153.0.8010.0.
- Independent existing-hex diagnostic: exit0, reproduces F1 dirty block and confirms clean cancellation control.
- git diff --check exit0. Candidate source tree unchanged; generated screenshots/reports in isolated worktree are execution artifacts.
- Score1.2: four bounded criterion assessments before/after unknown, delta null, awarded0; no released-score update. See score_assessment.json and test_change_summary.json. Automation health/raw readbacks in automation_health.json / automation-start-raw.json / automation-end-raw.json.
