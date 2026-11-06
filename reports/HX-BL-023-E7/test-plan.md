# E7 geometry and identity preparation checkpoint

Spec: E7-1.0 H01/T01/D01, AC01–05 and identity portion of AC08.

Existing manualWater tests cover water components and lake identities; manualRivers
tests cover sector/fullness rebuilding; saveSafety covers document rollback. None
exercises transfer of one existing hex between two connected regions, protected
centers/anchors, fixed kingdom membership or POI owner-key migration. Those are
distinct contracts, so the new manualRegions tests exercise detached geometry and
identity preparation without duplicating water/river numerical tables.

Extend manualRivers by two cases for explicit owner remapping and directed height
contacts (AC06), reusing its existing fixtures. Do not duplicate RIV numeric tables.

Use the existing generation harness for E7 App lifecycle, full-document snapshots,
both history stacks, v7 validation/import and continuation (AC08/10/11). Distinct
new cases cover transfer identity, no-op/cancel/stale callbacks and a late format
fault; extend the existing browser save-history runner for native selects, shared
Done/Esc, navigation guards and actual desktop/narrow screenshots (AC12).

No existing generator/domain policy is weakened. Passing a detached geometry
case alone is not full E7 acceptance; final evidence must distinguish App/DOM and
dependency coverage from unsupported devices or untested map families.

The ROAD07 case also downgrades an existing road after an accepted ordinary
six-to-five transfer, preserving physical graph connectivity. It reproduced a
real integration failure (the old E3 sizeCategory filter allowed the downgrade),
so the E3 policy now uses the preserved isTract flag. Removing an open-exit road
was an inadequate reproduction because another existing guard refused it first.

The browser E7 case checks Enter on marker details separately from native-select
Enter and map Enter: opening a details summary must never accept a region edit.
Screen-space polygon vertices, rather than painted bounding boxes including
stroke, verify the draft overlay during rotation/wheel navigation.

R1 review fixes: extend the two existing E7 mode lifecycles for map/list target
equivalence, projected target contour, complete owner/POI/exception preview and
preview-Enter. Add one browser ambiguity scenario for same-name targets and44px
hit circles after zoom/rotation, reusing the same page and export harness.
Add one Node v7-frontier import case: valid retained order, duplicate/mismatch,
legacy normalization, empty world and sea exclusion are a distinct persistence
contract not covered by the previous water/RNG corpus. Extend the existing stale
case for closing the active outdated draft while preserving a newer draft/Redo.

R2: the mandatory existing manifest tests reproduced a real valid legacy import
failure when optional candidateHexes was absent. Keep those assertions unchanged;
also vary the v2 input in the new frontier case to exercise the missing field.
Extend existing E7 browser mode lifecycles to require an affected river name/ID
for a height-only change with zero owner transitions, plus the accepted-document
export notice. Owner transition count alone was insufficient preview coverage.

R3: extend the existing real-geometry river case with the reviewer's directed
two-edge counterexample. Require the actual refusal text to identify river5,
the1→2 height transition, unchanged map and recovery action, with both history
stacks still exact. This protects the user-visible D01/X01 refusal contract;
the flow algorithm and previous numerical assertions stay unchanged.
