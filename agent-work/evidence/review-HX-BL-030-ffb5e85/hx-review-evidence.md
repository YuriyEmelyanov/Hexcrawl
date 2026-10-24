# Independent review — HX-BL-030 spec 1.0

Verdict: **changes_requested**, exact PR472 head `ffb5e85311420b14fe509819ec26b420606ce0dd`, base `6aaefa8896e7aac163cfcd5c2ca896ac60fc54d0`. Two independently reproduced failures block acceptance. No product changes, merge, deployment, or operations-branch mutations were performed.

## R1 — stale classic generation callback mutates RNG and breaks undo (P2)

Location: `src/App.tsx:13024`, related `mutationBlocked` at12743 and `safelyAddRegionToMap` at12817.

TX-06 / AC-09 explicitly require stale/repeated callbacks to avoid extra RNG use and stale commits. `generateAt` checks only import/kingdom/pending flags and render-captured state. Classic generation has no freshness check against the current document.

Reproduction: seed0, classic, locality; capture `generateAt` from one render. Call it at0/0, render the result, then invoke the same captured function at0/0 again. First result has1region/1undo and streams geography872447858/poi2590494572. The stale callback replaces it with1region/2undo and geography2752802268/poi2526553375. Undo now yields0regions, retaining the RNG after the first action, instead of preserving the first committed map.

The independent test executes the actual App callback with hook storage substituted, without changing algorithms or replacing the product RNG. Physical mouse double-click reachability was not reproduced locally. The stale-callback contract failure is directly demonstrated at the production handler boundary.

Reject stale actions before seed/options draws and transaction capture; add a regression that verifies both RNG and exact undo document after a repeated captured classic callback.

## R2 — Mythic regenerate checkpoint loses the RNG start (P2)

Location: `src/App.tsx:13097`; related backup capture at12870, checkpoint commit at12931, pending dispatch at13110.

TX-05 requires the new regenerate checkpoint to contain the restored base world and RNG at the start of regenerate. With non-auto classic size left in the hidden controls, `buildGenerationOptions` spends a geography draw before `startKingdom` captures `job.backup`.

Reproduction: seed0; choose locality in classic controls, switch to Mythic, generate a complete kingdom. Before regenerate: geography1193655228, poi1266212832. Regenerate succeeds, but its new checkpoint contains geography3025221041, poi1266212832. Delete-last restores the advanced3025221041 instead of the required1193655228. Existing Mythic regenerate tests leave size at auto and do not expose this draw.

Carry the pre-option regeneration RNG into the base-map checkpoint, separate from the full failure backup. Cover non-auto classic controls followed by Mythic regenerate/delete.

## Verification

`npm ci && npm run check` on Node24.22.1 passed:211tests,0failures, type checking and build successful. Worktree stayed clean. Independent Python uint32 arithmetic matched60vector draws, and all11entries of the RNG-v3 manifest matched their SHA256 values. `hx-review-repro.mjs` independently confirms both negative regressions and writes canonical full-JSON hashes (only savedAt removed).

CI run40117916104 succeeded in check/browser/world-random jobs. Full logs were retrieved and inspected, including all8classic/Mythic seed profiles0/1/123456789/max. Its checkout was merge7e52db5fe82e42e18f3d3de6b5c428bb764c2be3. Independently fetched merge ref and compared trees: both merge and reviewed head have tree7d902225c0e911d56434d553f29444026c92052e.

Local browser rerun was attempted after build and blocked by missing Chromium. An independent browser installation attempt failed with an invalid/truncated ZIP. Successful identical-tree CI evidence is available; it is not a local browser rerun.

AC-04 andAC-09 fail on the new findings. Full AC-06 style/navigation/rename→next-world comparison, full new RNG-v3 fixture continuation matrix, expanded malformed-RNG UI matrix, and complete recorded-action replay are not established by the current new RNG acceptance. Per-AC results and limits are in `hx-review-result.json`.

## Score assessment

Model1.1: S02-C01 provisionally G0/0→G1/7.5, delta+7.5, on the exact reviewed SHA: isolated working master-seed/streams/continuation behavior is demonstrated despite the blockers. This assesses prototype capability; it does not accept the task or authorize release. Current registry remains186.25/1000. Provisional193.75 only after later acceptance/release and strategist update.

S02-C03 G1/5, S03-C05 G2/10, S04-C04 G2/7.5, S09-C04 G2/5 remain unchanged for this assessment, with no additional credit. S03-C05/S09-C04 are impacted/blocked by these regressions, not declared regression passes. Exact before/after, methods, evidence, and limits are mandatory fields in the attached result JSON.

Finite profiles do not establish universal correctness,10,000/100,000map guarantees, protected reroll, or comparative superiority.
