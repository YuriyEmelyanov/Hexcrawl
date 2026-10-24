# HX-NEXT-001 limited released score assessment

Independent reviewer, 24 October 2026. Model **1.1**, unchanged blob `c05bffac61f425085e6878f7709c25e1dfc2ffb4`; spec 1.0. Result: **S09-C04 G1→G2 (+2.5), S03-C05 G1→G2 (+5), confirmed delta +7.5**. The forecast was tested against actual behavior, not treated as evidence. Registry application belongs to the next strategist stage.

## Exact package and publication

`git rev-parse <release>:` and `<reviewed-head>:` both return tree `1b9b9d438edb03ffc86bd65b26804e7439ca437b` for release `6aaefa8896e7aac163cfcd5c2ca896ac60fc54d0` and reviewed head `50d8b6f2414faa1f204cdd2a7ed936533707592c`. Local narrow checks ran on that reviewed head and tree; only pre-existing untracked node_modules was present. No product changes.

Direct GitHub connector job/log inspection of [release CI](https://github.com/YuriyEmelyanov/Hexcrawl/actions/runs/40103159125), build job120899274218, confirms checkout of release SHA, Node24.21.0, tests195/pass195/fail0, typecheck/build and all browser suites success. At14:39:17.4975262Z Save/history acceptance reports full corpus, all manual families, 100 mixed UI undo/redo, failures, serialization, classic/Mythic checkpoints, RU/EN in Chromium151.0.7922.34. Deploy job120900189200 payload pages_build_version equals release SHA;14:39:34.9857890Z reports success for https://app.hexcrawl.ru/. Both job conclusions independently read as success. These are direct release observations, stronger than merely transferring the prior head verdict.

## Independent bounded verification

Read canonical model, baseline registry, authoritative source index/AGENTS, operational process/owner decisions, budget/lessons, approved task/spec and previous positive/negative developer and independent-review evidence. Inspected production validation in src/saveValidation.ts and import/history in src/App.tsx (12687–12747;13623–13667), exact tests and fixed corpus manifest. Existing checks reused judiciously.

Repeated `node --test test/saveSafety.test.mjs test/mapTransactions.test.mjs` under Node24.22.1: **25/25 pass,0 fail**,10562.049622ms. Production-handler VM harness checks rejected malformed imports, preparation failure and both stacks, all manifest round-trips/layer/name preservation and continuation/undo, safe ID/counter boundaries, all manual families, 100 mixed undo/redo snapshots, no-op/error semantics, async import exclusion and generation checkpoint rollback. VM effects differ from a browser; genuine UI evidence is the directly inspected release CI. Prior independent reviewer42 negative cases, whole-document Mythic16/29 and job/pendingRegen concurrency checks are reused with their explicit provenance, not represented as newly run.

## Criterion decisions

| Criterion | Before | After | Delta | Separate justification |
|---|---:|---:|---:|---|
| S09-C04 (weight10) | G1 /2.5 | G2 /5 | +2.5 | Input is validated/prepared before mutation; failed JSON/read/validation/preparation leaves map and stacks intact. Supported v2 corpus round-trips preserve layers/names within specified normalization; safe continuation and destructive import/reset recovery checked. |
| S03-C05 (weight20) | G1 /5 | G2 /10 | +5 | Exact before/after snapshots, distinct generation checkpoints, all existing mutation families,100 retained operations and actual UI100 mixed mutations with each undo/redo state. Named versions remain absent. |

Both now work in ordinary tested scenarios rather than isolated prototype cases. Autotests and error handling alone do not satisfy G3 without user confirmation; no such confirmation was available. G4 target is not claimed. Data-safety credit relies on separate rejection/preservation/round-trip evidence; history credit relies on distinct mutation and 100-step undo/redo evidence. No points for seed determinism, migration support, named versions, export/interchange or unrelated criteria.

## Integrity, limitations and handoff

Registry independently recomputed:50 unique criteria, weights1000,178.75 confirmed points,70 unverified weight. G0–G4 coefficient arithmetic checked; model/weights unchanged. No history.json exists, hence no recorded task/release/model/criterion duplicate. Strategist must check again before applying. Projected total **186.25**, unverified weight70; projection **not applied**. Current-score and history left unchanged; latest retains178.75/70 until strategist application.

No regression observed in bounded evidence:25 targeted tests, exact-release195 tests and full browser suite, including earlier safe-ID continuation and Mythic crossing snapshot defects. Historical negative evidence remains in developer/reviewer records. This is not a new full50-criterion audit or proof of absence of bugs. Corpus is finite supported v2; no fuzz proof, unknown-format migration, independent user confirmation, named versions, persisted history, large-map snapshot memory or real-mobile assessment. Local browser was not repeated because earlier independent review documented missing Chromium and failed installation; exact-release CI UI evidence is identified separately.

Next role: **strategist**. Status: `pending_strategist_update`. Apply confirmed changes once after exact-SHA/model/dedup verification; append history, recompute all50 criteria and write latest last. No new task, product/model change, merge, deployment or automation change authorized by this assessment.
