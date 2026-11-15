# GEO2 explicit new-scope preview/Apply

Task HX-BL-051/ONE-MILE1, approved final GEO2-v2 after completed interview. Programmer continuation; no051 foreign claim at start. Base ddb3ceb2709c7c6c16d3b7a6a1bede904a864ead, exact source d30a9464ea9c2bda63fc1d94b1b83b13eaceba3f, tree 16bee13dc019543bb532c171106d58c25b766578; branch agent/hx-bl-051-geo2. No main, publication or PR503 update.

## Why this bounded contract repair

The prior generated empty seam correctly left new land outside the accepted refinement. Final GEO2-v2 says new regions acquire refinement only through explicit plan/Apply, but preview/apply handlers unconditionally refused any existing geometryRefinement; dependencyClosure also refused every expanded domain. This prevented the promised explicit path independently of the remaining nonempty mixed closure. Reused the existing actual connected-generator lifecycle to reproduce preview=null before the fix (repro.log). No owner question is needed: the final specification already makes this distinction.

## Implementation

Only previewGeometryRefinement sets the internal scopePolicy=explicit_preview preparation option, after its narrow options spread. It may include the newly generated domain in a complete plan. Ordinary prepareSourceTransition/recordGenerated do not set it; the default refinement_domain_expansion refusal remains, directly verified on the same partial map. Unknown policy values reject. Explicit expansion bypasses ONLY this domain-acquisition guard: all affected/unrelated old river/POI/road/crossing comparisons and complete plan/document checks remain. No blanket reroute, changed generator/RNG, or domain acquisition on import/view/timer. The option is not serialized in16.

Existing explicit preview/Apply handlers no longer refuse solely because refinement exists. Busy, identity/revision, cancellation and stale/double-Apply protections remain. No accepted writes on prepare/Cancel. Apply is one existing complete transaction; the resulting full-scope physical4 retains accepted choices and public16 loads them literally. An already current full-scope map returns unchanged/no transaction. No new UI was introduced or claimed shown; initial actual controls/overlays/map/PNG remain pending.

## Test governance and actual evidence

Node+0/-0/modified1; named cases30→30. Extended the existing connected land-only generator case using its accepted scoped snapshot: default automatic plan still refuses expansion; explicit preview exports accepted state and preserves an available redo branch; cancel/apply-cancelled refuse; a replaced revision invalidates the callback; fresh Apply includes new region in persisted fingerprint and preserves all old river paths, latest outer RU/EN fine name/note, cleared live focus, counters and RNG. One UndoRedo restores full before/after; duplicate Apply refuses; repeated current-scope preview returns null without history;16 reimport is exact. Existing initial-preview/budget/cancel/stale case unchanged and rerun as a focused regression. Focused2/2 and TypeScript passed. Subscenarios are not additional tests or a new seed series. Additional stale inner metadata check passed using existing handling; no second product defect or metadata fix is claimed.

## Remaining scope / score

Nonempty mixed closure (river/road/POI/body contact/terminal continuation and source membership migration), actual initial UI/ghost overlays, actual map/PNG and full G201–G210 remain pending. Explicit acquisition is demonstrated on the finite existing land-only expansion fixture; other input can still reject if complete constraints/unrelated checks fail. No claimed general connected-flow resolution or game compatibility. Independent new-SHA review and score_assessment1.2 remain required. S01-C02/C04,S02-C02,S04-C03/C04,S05-C01 grade/points/delta unknown, no current-score/history change. HX-FB-023 included within approved GEO2 only; full feedback remains open. HX-FB-002 audit already completed and not repeated. No new start/design/release approval or paid costs.

## Final verification

Exact d30a9464ea9c2bda63fc1d94b1b83b13eaceba3f / tree 16bee13dc019543bb532c171106d58c25b766578: npm run check exit0,420/420 Node,0 failed/skipped/cancelled; TypeScript and build passed. Both actual post-build browser and RNG-browser commands exit1 at Chromium socket() EPERM before scenarios. No screenshots/PNG/UI acceptance. Source4 files and early evidence5 files read back exactly; local HEAD/tree exact, tracked diff empty. Actual automation start/end enabled, no restoration. Node+0/-0/modified1; focused2 cases included in420, not added on top.
