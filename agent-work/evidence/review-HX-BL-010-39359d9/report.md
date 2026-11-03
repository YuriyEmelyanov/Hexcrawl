# Independent exact-SHA review of PR485 / HX-BL-010

Verdict: **changes_requested**. Reviewed head `39359d911403b480a833a41283d681bec72be58c` against base `e949d2ebda75af3988467c4a8d64715dd3a2e048` in a fresh detached worktree `/workspace/review-hx010-39359d9`, independently of the developer's dirty checkout. No product files or shared GitHub state changed. Only local dependency symlink added. Read AGENTS.md, docs/index.md, current agent-operations specification/handoff, vision, process, and score-model1.2. Current owner/process instructions supersede historical model1.1/budget instructions in main.

## HX010-R1 — P1 — selected-hex outline detaches from its hex during zoom

Anchor: `src/App.tsx:15339` (overlay transform), related `applyMapScale` at `src/App.tsx:13676–13688`.

Reproduce on the production build:

1. Import `test/fixtures/import-v2/baseline-mythic.json`.
2. Open Find object and activate region:1; selected hex is3,6.
3. Move over map viewport and wheel up (deltaY=-400).
4. After navigation finishes, compare the selected region polygon and the persistent outline.

At scale1 they match (48.497×56CSSpx at1025.219,522). After wheel zoom the main SVG becomes scale1.82212: actual hex88.367×102.038 at1045.858,704.756; selection SVG stays scale1:48.497×56 at627.219,394. The outline highlights the wrong location and wrong size. Waiting500ms does not repair it. Toggling Edit causes a React render and immediately repairs the overlay transform and stroke width.

Cause: zoom uses an imperative animation-frame path and updates only mapSvgRef/stage dimensions; the newly introduced sibling SVG reads mapScaleRef only during React rendering. Its transform and inverse stroke/filter dimensions never update in that path. This violates SELECT02/SELECT03 and AC05 for ordinary wheel navigation, and applies to other zoom entry points sharing applyMapScale. It is a visible functional defect in the primary new selection feature.

Repair the overlay in the existing navigation/compositor update path without forcing expensive artwork rebuilding. Extend the existing navigation browser case to assert selected-outline screen geometry after zoom before any unrelated React render. Existing tests assert artwork stability and overlay visibility but do not compare geometry after imperative zoom.

Evidence: `runtime.mjs`, `runtime.json`, `runtime.log`, `zoom-misalignment.png`. These are reviewer diagnostics, not new permanent tests.

## Confirmed bounded checks

- Production build succeeded on Node24.22.1. Targeted existing Node direct-name transaction case passed1/1 (14.4s including harness overhead), independently running exact checkout source.
- Actual mounted ordinary/debug=0/debug=false pages have no debug details. Mounted debug=1 starts collapsed OFF; after React toggle settles it opens ON and closes OFF. Initial premature probe was replaced with mounted and settled checks; it was a diagnostic setup issue, not another product defect.
- Five entity types ×RU/EN×read/edit:20 actual keyboard Enter interactions. Representative coordinates match selection; corresponding current name appears in information; information section gains focus; catalogue contains no inline name editor. Region3/6, settlement3/6, river1 at3/6, lake1 at-1/5, kingdom1 at0/0. All twenty pass.
- Actual harness callbacks: stale selection callback after reset rejects; invalid name retains draft/document/history; valid name completes as one transaction with exact undo restoration; last notes character survives navigation; obstacle Add and Move drafts cancel without map/history mutation; rejected road draft retains state; valid road completes one transaction then navigates, with unchanged generation/RNG state. See guards.mjs/guards.json. Pure representative navigation preserves map/generation/history.
- Runtime desktop1500 and narrow390 have no horizontal page overflow; sampled enabled Find buttons are44CSSpx tall and at least44CSSpx wide, with accessible type/name/coordinates. Actual one-character shortest target was not independently retested; min-width44 CSS change inspected.
- Source inspection: stable-key ref resolves against current nameTargets/document; river representative tests real edge geometry and prefers owner center only if adjacent; sorted lake fallback and kingdom existence/area fallback match spec. Overlay is noninteractive and outside memoized artwork, export SVG, and raster source. Export clone removes editor-only layers. No schema/generation source changes or PR484 source were bundled.

## Acceptance and limits

AC05 fails due to HX010-R1. AC01/02/03/04/06/07 have useful bounded evidence above, but this is not a complete acceptance claim. AC08 exact CI and remote-head validation belong to the root reviewer and were not independently repeated here. Full npm check/whole browser suite, actual PNG download/serialization observation, all water/candidate/reset/import/history visual combinations, rotated/raster/mode geometry, IME composition event runtime, Space/physical touch, Safari/Firefox, one-character Find measurement, common-row geometry baseline, and visible generation-refusal UI were not independently rerun. IME pre-navigation guard and export exclusion were inspected in source; no broad WCAG or absence-of-regression claim follows. No second defect is asserted from these gaps. Confirmed blocker is sufficient to require correction/new SHA review.

## Test change assessment

Diff base/head: added0, removed0, modified6 logical existing cases:1 Node direct-name transaction case plus5 browser lifecycles (generation, navigation, POI display, save/history, terrain color). Helper exports and profile-large-map diagnostics are not counted as new permanent logical cases. No suites are silently summed with reviewer diagnostics.

Keep the changes. Node extension checks representative resolution, river edge adjacency, map/RNG/history invariants and stale callback rejection through actual App callbacks, distinct from helper-only name validation. Browser save/history now navigates to information before editing and retains single-locale/history checks; other browser selector adjustments disambiguate artwork SVG from the newly introduced selection sibling, preserving existing assertions. Generation waits use import completion rather than a service-only debug panel, which is necessary for the ordinary URL contract. Ambiguous-obstacle coordinate capture moved after layout-affecting export/reopen, improving measurement stability. Profile assertions that selection stays separate/noninteractive/visible are useful but do not detect wrong zoom geometry. This missing assertion is a concrete sensitivity gap, addressed as part of R1; test counts are not the acceptance evidence. Root independently supplied green/mutated-red adjacency sensitivity evidence; it is not misrepresented as this agent's own run.

## Score assessment1.2

No grade/points awarded; before/after/delta remain null/unknown for S04-C01(20), S04-C05(10), S09-C05(10), S03-C05(20, regression). S04-C01 has functional flow evidence but fails selection correctness and lacks30-user study. S04-C05 has bounded RU/EN/focus/44px evidence but known outline defect and no complete WCAG audit. S09-C05 has strict service-mode OFF/ON behavior evidence and inspected unchanged diagnostic context; dashboard/versioned-funnel and complete criterion breadth unverified. S03-C05 has bounded exact mutation/history/RNG guards and targeted existing test evidence; full100operations/named versions/criterion baseline not independently established. These technical UI checks do not establish game-cohort breadth; no transfer from historical model1.1 score, no double counting, no release score increase.

## Automation health

Actual automations.peek called at start and end for6ad9c2426c7481919bb9f3d2b289e9b9; both returned is_enabled=true. Returned timestamps both:updated_at2026-11-03T08:37:23.870185+00:00,last_run_time2026-11-03T08:37:00.400556+00:00,last_run.started_at2026-11-03T09:00:21.545621Z,next_run_time=null. End lookup repeated immediately before completion at2026-11-03 09:08:30UTC; actual enabled=true with the same returned timestamps. Start lookup wall-clock was not separately sampled; returned timestamps are preserved rather than invented. No automation mutation, schedule/prompt change, claim creation, shared state mutation, merge or publication.
