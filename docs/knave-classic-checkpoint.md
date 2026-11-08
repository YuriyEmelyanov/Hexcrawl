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

The source content catalog/generation and complete new-map feature walkthrough
remain required before review_ready. The checkpoint UI alone is not a working
Knave content generator and must not be released as a completed profile.
No new source text, full-book research, score award or publication is included.

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
