# HX-BL-043 / OWNERFIX1
Owner correction 9 November 2026. Start/scope directly authorized in this chat; release requires a separate exact-package decision.
## Outcome
An existing map can continue using Knave, plain Classic or Mythic Bastionland without a reset. Existing Knave POI content, authored properties, geography, IDs and RNG remain saved. Future generation follows the selected mode/profile. Physical scale is independent of the mode; this fix preserves accepted scale metadata, while the approved 1/6/12/24 implementation continues separately in HX-BL-051.
English Knave results show English content for all400 accepted rows. These UI translations derive from the supplied RU edition; official English collation is unverified. RU snapshots and counters do not change when viewing another language.
The card shows content and compact reroll controls. Remove Source disclosures/page references, RU fallback badge, pick/compatible-pool jargon and profile explanation. Primary random selection retains geographic eligibility and displays a simple reroll icon; its source row is not invented as a historical d100 roll. The saved trait d100 still uses the shared die.
Replace misleading Water:Land with Surface:Land (RU Поверхность:Суша), also meaningful for Lake/Sea.
## Acceptance
- OF1: Switch a populated Knave map to Mythic and back with no reset, no document/RNG/content loss; generate a Mythic continuation without replacing its own POI quotas with Knave content.
- OF2: Turn Knave off/on for future Classic regions on a populated map; preserve the layer and existing results. Save/load and Undo/Redo retain the choice. Missing optional preference in old v10 infers previous behavior.
- OF3: All400 rows have nonempty EN view with no Cyrillic/page refs; language switch spends no rolls or counters and leaves accepted RU snapshots literal.
- OF4: No Source/pick/RU badge in Knave content; label precedes action/result; d100 matches saved trait; primary reroll remains valid random filtered selection.
- OF5: Desktop/390/320 content rows adjacent and readable, no overflow/overlap, keyboard reroll/menu focus and44px hit targets retained.
- OF6: Surface:Land/Lake/Sea is localized; water editing still works.
- OF7: npm run check, build+browser, applicable RNG; independent review on concrete SHA; actual UI desktop/narrow shown before publication.
## Test governance
Extend existing snapshot, profile, actual import/generation, and browser lifecycle tests for these newly reported risks. No duplicate full-audit or test-count target.
## Score model1.2
Baseline agent-work/score/current-score.json: grades/points unknown; expected grade/delta unknown. No award before release. Reviewer independently assesses S04-C04 (save/load/mixed mode), S05-C01 (clear/localized compact card), S08-C04 (mode/profile compatibility), S03-C02 (preserved reroll). Each requires its own evidence; a small fix does not establish full cohort coverage.
## Queue
Owner's current correction preempts the safe saved HX-BL-051 BC1 checkpoint at14f413f, PR496. Preserve that claim and resume after this fix. No main merge or deployment authorized.
