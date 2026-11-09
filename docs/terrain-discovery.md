# Terrain and discovery — CLASSIFY1 / policy1

Owner direction9November2026: normal (hidden), difficult, dangerous (normally
also difficult). Defaults are HexCrawl policy, not universal game mechanics.
The complete supported24-biome mapping is `src/classification.ts`:
plains/plain woodland normal; hills/forests difficult; mountains/swamps dangerous;
semi-desert unknown because packed/loose surface is unspecified. Unknown future
biomes remain unknown. Water needs a movement method, not a dry-land default.
Mountain risk is falling, swamp risk is becoming mired; no damage or DC is rolled.
No unsupported lava biome is manufactured.

Shared classifications apply to Classic, Knave and Mythic alike. Manual common
overrides win, then existing authored Knave overrides, then policy defaults.
Unknown and normal do not occupy read rows. Surface is edit-only; names of seas,
lakes and their existing tag actions remain visible. Empty discovery stays hidden;
existing first-roll/reroll actions are retained.

Discovery defaults use exact POI identity and map context, not localized names:
secret/lost semantic tag → exploration; lair/dungeon → exploration; an ordinary
site on an actual road segment endpoint → passage; prominent settlements/towers
in open terrain → passage; otherwise unknown. No search rolls or player-reveal
engine is introduced. A hidden/lost descriptor alone does not invent an
interaction secret or a clue. Semantic IDs in policy1: Knave place_traits43;
mb.feature character7, mb.luxuries character7 (zero-based), mb.dwelling16 and
mb.ruin42. The MB identifiers require definitionVersion1 and no authored override
of the relevant text slot. Other tags have no inferred effect by substring.

`map.classification` is optional: version1, difficultyByHex keyed by coordinate,
discoveryByPoi keyed by unique live POI. `auto` removes a terrain override;
discovery auto may retain an authored clue. Explicit unknown differs from auto.
`interaction` requires a nonempty trimmed clue up to512UTF-16 units. Editor uses
the existing accepted-document/draft/history gate; field edits preserve unrelated
legacy values. When explicitly replacing a field, its old Knave override is cleared
atomically so it cannot unexpectedly reappear behind the common override.

Files with common annotations export as JSONv11; annotation-free files retain
v10. v2..10 imports never acquire stored overrides by opening; auto labels are
derived without RNG or rewriting saved objects. Earlier readers are not expected
to open v11. Unknown fields/version/owners/malformed values fail before commit.
The Knave layer itself remains unchanged and accepts the containing v11 envelope.

E7/E8 remap POI annotations, not coordinate difficulty. Water edits show annotation
loss in the existing confirmation flow. Generic manual deletion uses a loss gate;
generation checkpoint restoration retains surviving authored annotations and
confirms losses; ordinary Undo/Redo restores the exact common layer. Biome/tag
changes may change derived values but do not overwrite manual values. Road edits
do not make every part of a whole hex safe or resolve an MB barrier.

Scope excludes resources, movement/time/checks/damage, player views, barrier
generation and the separate DETAIL1 geometry package. Operational spec and owner
approval are in agent-operations/HX-BL-044-CLASSIFY1. No criterion grade is awarded
by the programmer; exact-SHA checks and bounded independent review are required.
