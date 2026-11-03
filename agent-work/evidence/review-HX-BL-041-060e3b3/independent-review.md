# Independent review — PR484 HX-BL-041

Exact package: `060e3b3ae153d2ee5b8afaf5b94adf28cd36343f`, base `e949d2e`. Verdict: **changes_requested**. Development scope is authorized by the combined handoff; this review grants no publication permission.

## Finding HX041-R1 — P2: accepted edits create a save the application refuses to reopen

Locations: src/tags/engine.ts:40 and :46; corresponding constraints :58/:69. Production integration: src/App.tsx:13000–13002 commits the result without validating the resulting TagState.

The loader accepts exactly64 tags per owner, including read-only unknown namespaces. Import a valid v6 map with64 future namespace tags attached to region1, switch to MB and click the ordinary «Земля +» button. rollTag accepts the65th instance, the app commits it and exports it. Reimport rejects the exported file with «map.tags: invalid tag data». The state was valid before the action and is unreopenable afterward. This violates TAGS section7's explicit own-export roundtrip invariant and S09-C04.

A separate boundary of the same missing command validation also reproduces: import a valid known mb.land instance with8 override languages x0…x7, then edit its first result in RU. editTag adds the ninth language without rejecting; the exported map again fails its own validator.

Independent production callback reproduction: core-probe.mjs / core-probe.json. Root separately reproduced the64→65 path through Chromium390 and normal «Земля +», including actual export and failed UI reimport: boundary-ui.json / boundary-ui.log / boundary-ui.png. No source mutation is required.

Required correction within041: enforce the persisted limits before accepting create/edit/fill/reconciliation commands, or validate the fully prepared TagState before any history/state mutation. Refuse an unavailable operation with a useful error; preserve all existing unknown snapshots. Do not increase/relax the specified limits merely to hide this failure. Acceptance: both valid boundary imports remain reopenable after every accepted action, rejected actions preserve exact document/history, and ordinary rerolls remain possible at the tag-count limit.

## Finding HX041-R2 — P2: independent dice have indistinguishable accessible names

Location: src/tags/TagRow.tsx:15. Both dice in an independent tag use only the overall tag label, sides and numeric roll. For a legal pair6/6, both names are exactly «Перебросить Земля; d12: 6». No component purpose (character/form) or resolved text is included. A screen reader cannot identify which of the two distinct actions it is selecting. TAGS4.10/TAG-12 explicitly require the component purpose and result and distinguishable dice. The same problem exists in EN. This is established by the direct label expression; no assistive-device coverage is claimed.

Required correction: give every die an accessible localized slot purpose and relevant result; retain the compact visible geometry. Verify a repeated-number independent pair and product group/entry pair, including keyboard operation.

## Bounded positive evidence

Reviewer-owned contracts-probe.mjs completed successfully against production callbacks/core code: independent sibling value/override/counter retention; product lookup recomputation while retaining the other die; legacy import without rolls; explicit fill exact Undo/Redo; ordinary v6 roundtrip; atomic unknown TagState rejection including history; future definition read-only mutation refusal; stale callback after replacement document; POI deletion pruning plus exact Undo; and100 pure-engine tag rerolls applied through applyDocument followed by identical actual geography generation and RNG state. This does not exercise100 real UI/App roll commands. These are temporary reviewer diagnostics, not new permanent tests.

A first diagnostic run required correcting cross-VM deep-equality normalization in the reviewer script, and the RNG setup required creating the missing tag before a slot reroll. Those were probe setup issues, not product findings. The final probe exits0.

Approved catalogue comparison was independently rerun:72 myth names,432 landmark descriptions and72 seer names all match resolved RU values. Actual approved catalogue filenames omit the spec's -v1.0 suffix. This comparison does not claim fresh PDF transcription or verification of all EN translations.

Source inspection confirms snapshots include tags at capture, exact document restore/UndoRedo and generation backup restore; owner reconciliation prunes deleted owners and keeps incompatible known tags inactive. Timers do not commit tag values. Compact UI, CI and standard suites were handled separately by root and are not relabeled as this agent's independent executions. Known acceptable same random outcome after deletion/recreation was not reported as resurrection.

## score_assessment1.2

| criterion_id | weight | before grade/points | after grade/points | delta | assessment |
|---|---:|---|---|---|---|
| S08-C04 |10|unknown/null|unknown/null|null|insufficient_evidence: separate tag engine and MB adapter observed; limited MB/Classic preservation evidence does not establish current/top5/top10/top20 game requirements or confirmed user acceptance |
| S09-C04 |10|unknown/null|unknown/null|null|insufficient_evidence, blocking boundary roundtrip defect confirmed; ordinary atomic import/history evidence cannot erase R1 |
| S07-C05 |15|unknown/null|unknown/null|null|insufficient_evidence: MB data and generic engine separated; content-pack SDK, complete provenance/licensing and extensibility without core changes not established |

Model1.2 definitions/weights/coefficient rules were read. Exact evidence SHA above applies to all rows. No points awarded and no released-product score changed; no baseline grade was invented, and content quality was not counted twice under compatibility. Evidence covers this bounded MB L1 scope, not full game support or future L2/L3.

## Authority and automation

Read exact worktree AGENTS.md/docs index, current API specs TAGS1.1 (blob4c5966b8fb5bd32b001b22c135079d86565894d5), MYTHS1.2 (17e94e419aa1cb96a9678236bbebd04ee52b4fb8), combined implementation-only handoff (22310d0850547cadfee9499ae356eebabbe9be1e), operative process/vision/score1.2. Local git fetch was insufficient for current041 material; current GitHub API documents were used.

Actual automations.peek start: is_enabled=true; exact start timestamp was not recorded by this subagent. Actual end peek requested2026-11-03 05:04:26UTC, completed05:04:29UTC: is_enabled=true. Automation6ad9c2426c7481919bb9f3d2b289e9b9 unchanged; no recovery needed. These are momentary observations, not a guarantee against later service changes.

Next role: programmer, bounded fixes R1/R2 within approved041, then fresh independent review of a new exact SHA. Shared claims/backlog/latest/main were not changed by this agent; root owns publication of the reviewer result.

