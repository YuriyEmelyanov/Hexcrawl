# Independent review: changes requested

PR481 exact `7d7ae9d3f908be03263bd1268a8036ca3f12ded0`, tree `58be535129830023fc6304d0350ff682f7177f7f`; combined E3+E4, not release.

**P2 HX023-E4-R1:** At low zoom, the44px map circles overlap. A physical pointer click at the center labeled `0,0 → 1,0` is intercepted by the last circle and immediately saves barrier `0,0 → 1,-1`. No disambiguation occurs. Reproduced on production build, rotated, mapScale0.2592402606458915. Source `src/App.tsx:15282–15287`; E4-1.1 AC07 and overlapping-hit-target list rule. Full steps, geometry and actual exported result: `reproduction.json`, `kingdom-probe.mjs`, `kingdom-probe.log`, `three-area-fixture.json`, `overlap-before.png`.

Independent Node24 production build passed. Targeted actual-handler/pure contract suite:51 passed,0 failed/skipped. Actual UI Classic add/cancel/delete/Undo, native PNG and Mythic cross-kingdom/unowned moves passed bounded checks. Every six-direction circle measured44px at1500/390; this does not prove correct pointer targeting. PNG retains manual stroke and excludes selection overlay. No page errors or dialogs in completed probes.

Tests (combined base→head): Node +13 / −0 / modified6 named top-level cases;2 existing browser suites modified. Cases protect distinct ID/migration/preparation/network/transaction contracts, and reuse broader runners. No unnecessary duplicate established. Browser bounds/keyboard checks miss physical ambiguous pointer hits; extend existing lifecycle for this defect. Reviewer changed no permanent tests.

Score1.2: all six required criteria retain null before/after grades, points and delta (`insufficient_evidence`),0 awarded. Separate evidence/limits in `score-assessment.json`; narrow Classic/Mythic L1 samples do not establish game breadth or whole criteria. Remaining invalid-target/stale/English/physical-touch matrices are explicitly unverified, not additional findings.

Automation actual start/end peek: enabled=true; end05:11:36UTC. Start timestamp was not recorded. No restoration, schedule or prompt changes. Exact observation cannot guarantee future health. Full report: `review-report.json`.
