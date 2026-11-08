# Knave classic: implementation checkpoint

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

The source content catalog/generation, profile checkbox, compact property editor
and actual desktop/narrow feature walkthrough remain required before review_ready.
No new source text, full-book research, score award or publication is included.

Test governance: the four existing Knave contract cases remain useful. Existing
real import/history, E7/E8 transfer and E6 loss cases are extended for the actual
integration risks; existing expected export versions are updated to10, while
unknown-version refusal advances to11. No new test registration or duplicate
RNG/browser suite is needed. Actual generation fault injection checks the separate
backup restoration path, not only successful import. Counts in structured evidence
are logical runner cases; fixture loops, helper edits and browser workflows stay
separate.
