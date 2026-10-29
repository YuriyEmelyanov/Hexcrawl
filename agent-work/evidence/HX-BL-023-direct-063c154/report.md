# HX-BL-023 E2 direct editing — programmer evidence

Candidate: 063c1548a5165fde8656ff016c65816c791ea387; tree fec12f86311347c4e01212c8f6d5050f59581330; base 8f7d17266c53e31428da7c0da6dbbf1afe01d035. PR #479. Spec E2-2.0 blob4701679e4b92e65f0fc7bd1690ffbf2c1addaf80, parent2.3. Owner direct-edit correction approved; independent acceptance and publication are separate.

## Result
One Edit/Done in the information card; supported values are marked and directly open one input/select/notes field. Per-object pencils, paired RU/EN form and Save/Cancel/dirty-transition dialogs removed. Existing Find object stays after information/notes. Existing POI and GM-note operations use the common mode; unsupported geometry is not advertised as editable.

Name completion captures language/key/revision/current value. Only that language changes; the other locale and metadata survive literally, including legacy values. Enter/blur/Done/language transitions finish a valid field; invalid input remains inline, Escape drops the unfinished field. Notes retain immediate input and existing500ms history grouping.

Local biome offers24 IDs/inherit, only its entry changes. Regional biome uses stored height and canonical side-neighbor compatibility, including dead-forest exceptions and allowing a same-biome neighbor. All local entries stay. Only biomeId plus four canonical label/emoji fields change; no reroll, geometry, landtype, height, woodlandStyle or RNG changes. Terrain-only operations bypass unrelated toponym normalization.

All potentially throwing snapshot preparation precedes transaction/revision writes. Existing history/import/corpus runners are reused; no schema change.

## Validation and limits
See checks.json, test_change_summary.json and score_evidence.json for exact final results and per-criterion evidence. Actual UI: manifest.json and PNGs, not the proposal mockup. Local source commit e8740a9 has the identical tree to the candidate; API tree equality was checked before moving the branch. Production assets are hashed in the manifest.

Reviewer must independently check DE-AC01–10 on the exact candidate, including name IME/keyboard transition, height2/3 and water-hidden override edges; source and bounded fixture checks do not establish exhaustive coverage. Some emoji render as missing-glyph boxes in this serverless browser; no claim about user-device fonts. E3–E8 remain outside this package. Score1.2 grades/points remain unknown; no increase applied.

## Test governance
Updated the existing name transaction case for the replacement single-locale contract, added one distinct region transaction/invariants case, and changed the existing save/history browser lifecycle rather than adding a parallel runner. Existing mixed100 and legacy corpus retained. Browser script/sections/probes are not added to Node cases.

Resolved developer negatives: old paired-name selector stopped matching after UI-language switch (locator made language independent); a first water-POI guard narrowed the old handler contract (restored known-enum acceptance); busy-note DOM observation raced closure between two awaits (single atomic DOM observation). The latter was a runner race, not evidence of a map write. Earlier attempts and cancelled/superseded CI runs are not represented as final success. No raw automation prompts, private metadata or full environment logs copied.

Next: fresh independent reviewer, exact SHA and score_assessment1.2; then owner permission for an accepted concrete release package. Main/site unchanged.

## Final verified checks
CI40958042988 on 063c1548a5165fde8656ff016c65816c791ea387: check/browser/world-random all success. Local Node24 check249/249 and build passed; targeted region handler1/1 and production save/history passed. Local first four browser scripts passed; the chained command then encountered a missing default Playwright executable before navigation assertions. After pointing that expected cache path to the already installed Chromium153, unchanged navigation and large-navigation scripts passed separately. This split local evidence does not erase the negative command outcome; exact CI ran the original seven-script command successfully. No new HX-BL-003 measurement protocol or acceptance claim.
