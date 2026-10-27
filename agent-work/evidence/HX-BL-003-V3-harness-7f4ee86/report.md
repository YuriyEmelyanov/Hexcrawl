# Independent offline harness review

Exact head: `7f4ee86e8780b255389b988251e396de31f2cc34`; base: `86100c390d8d4cf66cee6e87589be64ce51687e5`.

Verdict: **changes_requested**. Do not create the approved execution branch or consume the sole measured attempt for this head.

## F1 — History A/B comparisons include independently randomized startup transactions (blocking)

`scripts/hx-bl-003-v3.mjs:156,175-177` captures S0 after the first import and compares complete S0/other snapshots across fresh A/B pages. Production `src/App.tsx:11235` initializes each page with `createGenerationState(newWorldSeed())`; `src/worldRandom.ts:27-29` obtains entropy from crypto. The first import records its complete pre-import document as `undo[0].before` (`App.tsx:13722-13736`). Therefore the independent initial RNG states and seed-derived toponym seed remain in every retained undo stack. Identical imported worlds will still fail the cross-A/B full snapshot assertion, ordinarily at S0. This is a harness comparison defect, not evidence of a product regression.

Pure offline diagnostic in `offline-diagnostics.json` models the actual initial import transaction, passes exact post-import document/RNG equality, then reproduces the full typed snapshot comparison failure for two legitimate different startup seeds. It executes neither browser nor product generation.

Least intrusive fix: record each full pre-import P; validate the exact first import transaction against that P locally; validate startup documents differ only in documented entropy-derived fields; preserve all raw typed snapshots. For cross-A/B only, replace exactly the independently validated first transaction's before-document with a named common startup token. Compare every subsequent transaction and imported document/RNG fully. Make this startup baseline rule explicit in the protocol before the new freeze. Do not patch entropy or RNG APIs to force a passing comparison.

## F2 — Preflight manifest omits source/build SHA256 inventories (V301 gap)

The freeze script records harness/input hashes, commit IDs and environment, while the workflow separately stores the history App source patch/hash. Production/history source/public/package trees and emitted dist artifacts do not receive a pre-action SHA256 inventory. Spec section2 explicitly requires source SHA256 and build identity in the immutable preflight manifest. Exact detached worktrees plus clean diffs are useful source parity checks, but do not provide that requested build inventory.

Add a pre-action inventory of each production/history build (including emitted assets/sourcemaps) and source/public/package/lock files, with source SHA and observation patch identified separately; include it in the immutable preflight artifact. This needs no app action.

## Positive checks and limits

Reviewed AGENTS.md, docs/index.md, development workflow, vision/score sources, actual V3 spec/protocol and operational latest/backlog/approval at ops `9f2180bb25bdd748a69789863c45697f37f49026`. Approval record explicitly authorizes V3 and excludes release474. Verified all10 changed working files byte-for-byte against the exact head's git blobs; actual diff has only harness/docs/workflow files, no product change.

The planned 20 measured +2 warmup +2 trace /4 history cap, fixed AB/BA order, 43min soft deadline /45min job, single attempt gate, original fixture hashes, exact A/B source commits, no PNG or generation benchmark, separate history observation builds, exact-head normal Check checkout and branch activation without another source commit align with the approved plan. The observer inserts only the read accessor. Existing owned BrowserSupervisor is reused and the adapter serializes disposal and shares a shrinking per-disposal budget. No additional lifecycle defect was established by this review.

Typed codec retains Map/Set contents and undefined/null. Pure diagnostics independently confirm primary240frames/rank228 and nonfinite input fails closed. Actual measured outcomes, trace attribution, resource/runtime behavior and normal exact-head CI remain outside this offline result. CI is collected by the parent developer; this report does not infer it passed.

No browser launch, navigation/history operation, PNG export, workflow launch, execution branch creation, GitHub mutation or full suite rerun occurred. Product RV2/RV5 remain open. Any changed harness SHA needs an updated independent gate result before measurement.

## Test change summary

Base86100→head7f4ee86: permanent logical cases added0, removed0, modified0 (all suites; git name-status/source diff). Existing Check commands and logical cases unchanged; checkout target fixed to exact PR head. Bounded measurement actions and temporary reviewer diagnostics are not permanent regression cases. Existing developer240/240 Node and4 supervisor results are developer claims, not rerun or silently counted as independent passes here. Browser/RNG CI remains separately pending.

## Score assessment

Model1.2; S09-C01/S02-C01/S03-C05/S04-C04/S09-C04: before grade/points unknown/null; after grade/points unknown/null; delta unknown/null; awarded0. Method: offline harness source review and pure diagnostics tied to this exact SHA. No product transition or release acceptance is established; no historical1.1 points carried forward. Product RV2/RV5 remain open.
