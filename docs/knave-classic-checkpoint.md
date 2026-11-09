# Knave classic: implementation checkpoint

## Compact bilingual content — 9 November 2026

OWNERFIX1 removes the Source disclosure, printed-page links, RU fallback badge
and visible pick wording from the normal card. Every accepted catalog row has
an English UI translation of the supplied Russian edition, without claiming a
verified transcription of the official English book. Language changes leave
saved Russian snapshots, identities and random counters intact.
Primary sites show a compact reroll icon; traits show their saved d100.
The content rows use32px-high,44px-wide reroll targets and no extra row gaps,
as requested by the owner's compactness correction. This supersedes the former
44px Knave row height; other shared-table controls retain their existing sizes.

## Mixed-map continuation — 9 November 2026

The owner's correction supersedes the earlier Knave-to-Mythic reset restriction.
Changing the next generation mode preserves the accepted map, Knave content,
annotations, names, notes, RNG and history. The retained Knave layer is valid in
both Classic and Mythic documents. Existing Knave points remain viewable and
editable in either mode. New Mythic regions keep their own POIs, quotas and
automatic tags; they are not reinterpreted as new Knave sites. Returning to Classic
continues the selected Knave profile on newly generated points only. The Knave
checkbox can be changed on an existing Classic map: its optional v10
`ui.knaveEnabled` preference controls future generation while saved content stays
in `map.knave`. A missing preference inherits whether the legacy layer exists.
Changing this preference on a populated map is one Undo/Redo transaction and does
not retroactively fill accepted points. The stored
6-mile source metadata is retained; selecting a generation mode does not change
physical scale or rebuild accepted geography.

The surface editor labels its Land/Lake/Sea value as Surface rather than Water.
The Knave profile's reset explanation and the redundant clue parenthesis are
removed from the normal interface.

## Current correction: ROLLUI2 (9 November 2026)

Owner-approved UI2-1.0 supersedes the earlier no-reroll presentation requirement.
Knave and Mythic Bastionland now use `TableResultRow` for the visible entity label,
roll action, result, keyboard/context menu and accessible44px target. The visible
language badge states the current RU/EN language; its accessible action still
names the target language. Each entity label precedes its actions and result.

Knave's trait is a genuine saved d100, including100/00. Primary sites retain the
honest compatible-pool action and source row; their row number is not rendered as
an invented d100. A primary reroll stays in the current table/category and uses
current accepted geographic facts. Trait and primary counters remain independent;
the context menu rerolls both in one transaction when both exist. Settlement and
water points keep trait-only behavior. A repeated result is valid randomness.

The command prepares the selected result, source references and actual marker
together before one manual-map transaction. Names, notes, discovery/clue,
difficulty, other points, geography and world RNG remain unchanged. Dirty editors,
pending operations and repeated clicks refuse safely. Empty pools, invalid catalog
data and counter exhaustion leave the accepted document untouched. Undo/Redo and
JSON continuation retain the accepted result/counters. Save schema remainsv10;
there are no new persisted fields or retrospective inferred rolls.

Earlier source-free/private-package paragraphs below describe historical
checkpoints. PR494 subsequently published the complete approved catalog; this
correction preserves that catalog unchanged. It adds no new source material.

Verification extends the existing adapter, actual App command and browser
lifecycle cases: counter/owner isolation, atomic primary+trait/marker update,
Undo/Redo, v10 continuation, language/entity labels and keyboard/touch controls.
This correction has its own PR and requires independent review and separate
publication permission.

## Previous checkpoints

Approved contract: agent-operations/agent-work/specs/HX-BL-043-KNAVE2-CLASSIC1.md KNC-1.0.

The first checkpoint provided detached profile/annotation contracts. This checkpoint
connects the layer to the actual App: import/export v10, capture/restore/Undo/Redo,
generation failure backups, E7/E8 POI remapping and E6 explicit loss confirmation.
A submerged dry difficulty flag survives water edits. Reset removes the profile,
including on an otherwise empty map; Undo restores it. Ordinary generation
checkpoints retain annotations on surviving objects and confirm removed ones.

JSON v10 adds optional `map.knave` with `profile`, `difficultyByHex` and
`discoveryByPoi`. Missing layers in v2..9 remain missing; supplied layers require
v10 and Classic. Unknown versions/scales and dangling or ambiguous owners refuse
before any setter. Physical scale remains6mile with convention null, never zoom.
The old v9 application cannot read v10 exports.

The next checkpoint adds the compact Classic checkbox and6mile label, locked on
an accepted map. Switching a Knave map to Mythic offers a reset, retaining the
existing loss/name/note gates; Undo restores the old document and mode. Empty
profile choices do not roll or add history. Imported profiles restore the checkbox.

The existing hex panel now edits difficulty and POI discovery/clue. A UI-only
draft captures revision, document identity and object address. Done validates a
secret's trimmed clue (1..512 UTF-16 units); Cancel/Escape drops only the draft.
Other actions offer Save/Discard/Stay. Export and map navigation retain the
accepted document; no invalid draft enters JSON. A saved clue is escaped text,
is preserved when discovery changes, and shares one Undo transaction with the
other property changes. Dry difficulty remains independent of POI location.

The complete new-map walkthrough with the private source catalog remains
required before review_ready. The public source checkpoint must not be released
as a completed profile: its catalog module deliberately contains no book text.

The catalog preparation checkpoint supplies four100-row RU tables privately
and a public source-free300-row eligibility policy. The next code checkpoint
adds `tags/knave.ts`: a catalog/context adapter using the existing tag hash
sampler via `drawTagIndex`. Compatible-pool choices and the real trait d100 are
stored distinctly. POI snapshots retain source rows, text, unresolved references,
catalog/source identity and independent counters. Settlement/water owners receive
a trait without changing their identity; no trait changes discovery or terrain.

Optional `map.knave.content` participates in validation, exact save/history,
E7/E8 address remapping and E6/checkpoint/reset loss gates. The same panel displays
accepted content as escaped text with keyboard/touch source disclosure. Old v10
layers without content remain valid. Unknown catalog versions, dangling owners,
invalid rows/counters and misleading die/pool metadata are rejected. The public
code contains authored fixtures only; the actual400-row catalog is not transferred.

The App now prepares Knave content after final geography/roads/water/POI
placement and before history or state writes, in both ordinary and fallback
generation. It uses actual land owners, physical regional height, effective
biome, incident river edges/source vertices, visible rapid/waterfall markers,
incident road segments and their existing crossings. A junction requires three
distinct neighboring road connections. A visual mountain override does not
invent physical elevation; the current biome model supplies no explicit ice
fact, so `coldIce` remains false.

Only new owners absent from the pre-generation checkpoint are filled. Missing
payload on old imported v10 owners stays missing: growth never silently converts
accepted regions. Settlement identities and water POI
markers stay literal. New nonsettlement central markers are neutral natural
site/structure/dungeon; secondary markers follow the source-free policy. New
natural-site and structure SVGs are original simple symbols. These marker kinds
never enter ordinary Classic/Mythic random pools. Coordinate placement,
density, old marker snapshots, world RNG and topographic rules stay unchanged.
The actual commit return value supplies the prepared regions, preventing the
caller from overwriting new Knave markers with pre-preparation regions.

`knaveCatalogData.ts` is an explicit source-free null provider. A separately
checked private package can replace it with the supplied400-row catalog. With
missing/unsupported data the actual generation handler refuses and restores its
entire backup, including RNG, counters, history and Knave. It never substitutes
authored fixture vocabulary for real book content. The public PR is still draft;
no source corpus is transferred and no release is authorized.

The profile lock explanation is now a native touch/keyboard disclosure. Stay or
Escape from the draft-exit dialog restores focus to the last Knave editor control.
The existing browser lifecycle checks those behaviors at the same viewport sizes.
One additional Node contract exercises real generation, physical/RNG equivalence,
marker commit, immutable prior content, reload continuation and atomic catalog
failure; the existing catalog/context case now exercises the actual App fact
extractor. These fill separate integration risks that the detached adapter test
cannot detect.

Test governance: the four existing Knave contract cases remain useful. Existing
real import/history, E7/E8 transfer and E6 loss cases are extended for the actual
integration risks; existing expected export versions are updated to10, while
unknown-version refusal advances to11. No new test registration or duplicate
RNG/browser suite is needed. Actual generation fault injection checks the separate
backup restoration path, not only successful import. Counts in structured evidence
are logical runner cases; fixture loops, helper edits and browser workflows stay
separate. The same actual-import/history case now covers draft refusal, stale
callbacks, accepted-only export, no-op/cancellation, profile lock and mode reset.
One DOM lifecycle scenario in the existing tags browser workflow checks native
controls, explicit draft exits, keyboard Escape and desktop/390/320 layout. Its
browser count is recorded separately from Node cases.
