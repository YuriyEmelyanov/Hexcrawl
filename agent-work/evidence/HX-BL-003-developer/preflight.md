# HX-BL-003 — developer preflight, 25.10.2026

Task approval owner-approval-2026-10-25-HX-BL-003; spec1.0 agent-work/specs/HX-BL-003.md.
Branch agent/hx-bl-003-performance; draft PR474 https://github.com/YuriyEmelyanov/Hexcrawl/pull/474.
Current harness SHA f73d66a048a2223986055065d760bc8c02ec79bf. Product source/assets/lock unchanged from baseline103d31b9f6f5c76b1f6b45d9d6664fe3f75dd63b. Only corpus harness/workflow and specification copy added. No optimization/timing/gain yet.

Local Node24.22.1 check exited0:236 tests passed,0 failed; TypeScript/build pass. Log is recorded separately. This run began on de8dc2e; only harness/workflow changed while checks ran, product/test/typecheck/build inputs remained baseline-identical. Do not treat this local check as a frozen check of final harness SHA.
Final same-SHA CI Check40187555993 on f73d66a048a2223986055065d760bc8c02ec79bf: check121151552586, world-random121151552697, browser121151552698 all success (independently fetched job outcomes). Full logs are separate; finite suite, not all maps/Android proof.
Local Chromium1234 absent. No repeated attempted local browser download. Corpus uses CI, exact baseline build from separate worktree, production RNG and real UI handlers. Corpus run40187550999 pending at this checkpoint.

Preparation failures retained: run40187172755/de8dc2e preview readiness failed (ANSI-coloured stdout detection); fixed in5b234ce. Run40187289368/5b234ce produced no candidates because initial exported candidateHexes=[] differs from actual displayed0/0; those empty cases are a harness defect, not a valid product negative benchmark. Corrected in65b4b302 to read actual DOM candidates. Finalf73d66a counts union of region+terrain occupied coordinates, records component counts and distinguishes programming-error alert from expected rejection. No timing series was taken from superseded attempts. Run40187424872/65b4b302 is superseded (region-only N), its artifacts cannot substitute current P1 corpus.

HX-FB-001 reviewed by developer: defer to separate small UI package. Seed field styling/position is explicitly requested, but unrelated to the as-yet-unidentified performance bottleneck. PR474 retains UI, map appearance/content and actions. Analyst scope assessment remains pending. For the seed change present before/after before release; no silent inclusion. Score unchanged193.75/unverified70; no assessment/gain claimed.

Next: inspect final corpus manifest and every outcome; commit exact input files+hashes/manifest/baseline outputs before timing. Respect minimum corpus and100-attempt/180s bounds. If insufficient, record blocked/inconclusive and hand back specific evidence; do not substitute seeds or optimize without qualifying corpus. If sufficient, fixed P1 profile, one diagnosis before product change, at most one optimization and exact-SHA independent review. No merge/deploy approval.
