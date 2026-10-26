# Developer harness corrections — 26.10.2026

Exact SHA: 86a7e941a823e32e7c7cf9cfde78bb247ffc8194; PR474. Scope: HX003-V2-R1/R2/R3 only. Runtime, dependencies, workflows, quality, thresholds and corpus unchanged. No release.

- R1: validate recorded Linux4vCPU/about16GB resource class and versions; record CPU without requiring7763.
- R2: own local BrowserServer/process, bound preparation/actions/cleanup, latch abort on timeout, escalate close to kill and observe process exit; unconfirmed exit stops package and preserves remaining not_executed rows.
- R3: exactly one successful finite warmup before ordered measured0–4; missing/failed/late warmup or duplicate iterations cannot pass completeness. Statistics remain visible; pooled p95 and guard unchanged.

Verification: [Check40337416043](https://github.com/YuriyEmelyanov/Hexcrawl/actions/runs/40337416043) on this exact SHA succeeded: Node24 npm run check,240/240 tests, TypeScript and build; browser and world-random jobs success. Full logs alongside this report. Saved offline supervisor4/4 and Python7/7 tests; before-fix analyzer reproduced5 failures. Node tests use disposable Node children, not Chromium. Real hung-Chromium behavior is not established by these tests. Local check completion was lost with transient runtime; exact-head CI supplies confirmed check evidence.

No new measured V2 workflow exists on this SHA (only Check returned by head-filtered runs query). No measured actions or PNG exports; previous40298230168 remains attempt1/1 with0actions. Local BrowserServer changes harness transport, so reviewer must inspect lifecycle/measurement effects; no new performance gain is claimed. Manifest hashes new helper/tests transitively; measurement workflow unchanged.

All3 findings are addressed_pending_independent_review, not independently closed. Previous RV1 missing2largePNGpairs, RV2 inconclusive navigation and RV5 partial native-history/selection remain. RV3/RV4 prior verified evidence retained. PR475 seed remains separate review_ready. Score model1.2: no points awarded; new SHA requires reviewer assessment for S09-C01,S02-C01,S03-C05,S04-C04,S09-C04. No current-score/history change.

Next: fresh independent limited source/offline review of 86a7e941a823e32e7c7cf9cfde78bb247ffc8194, existing evidence and CI; no benchmark/PNG rerun or cap reset. See source docs/HX-BL-003-V2-harness-fixes.md and canonical result JSON.
