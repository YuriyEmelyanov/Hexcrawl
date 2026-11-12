# HX-BL-051 / ONE-MILE1 — OM-C02/C05 presentation correction

Version OM-C-PRESENT1, 12.11.2026. Ready for programmer only for the bounded scope below. This is one repair phase of existing approved051/HX-FB-023, not a new product task or complete acceptance of8owner clauses. Current product reference PR503 d41911b8d7c2248f115b182923350dc8d08c0a48; published main1962fb9a835a9c310e55c1a09415fe180f22cca9. PR496 remains on hold. No source changed in analyst run; publication not authorized.

## Goal and user effect

A GM can distinguish bridge/ford/ferry on the1-mile map and identify a named POI by type without guessing its icon. Before: generic crossing dot; «Айхенхайм». After: corresponding native crossing artwork; «Городок Айхенхайм». Existing pencil/read/edit shell retained; no new settings or panel. Proposal is shown in current owner chat: previews/ONE-MILE1-C02-C05-P1/{desktop.png,narrow.png}. P1 is schematic, based on existing d419 shell and native crossing conventions, not actual future build. Symbol widths intentionally illustrative, no river-width/town-size calibration claimed. Owner answer to preview is not a third approval gate.

## Scope and invariants

Implement OM-C05 and visual/type-preservation portion of OM-C02. Do not claim closure of full OM-C02 geographical placement until OM-C01/03/06/07 reconciled. Do not change source/map coordinates, road/river paths, crossingkind/ID/position, POI anchors/footprints, catalogue sizes, RNG/counters, JSON versions, accepted/save history or generation. No width/edge reroute, new1milegenerator,12/24/C-FILL, TABLES1/PF2/CLASSIFY1. Existing6-mile appearance remains the baseline; any shared renderer extraction must produce equivalent6-mile output. Zero automatic geographic migration. The former town0.8mi assumption is still disputed, not reapproved here.

## POI names and type

Resolve actual type from existing land/water/central/secondary locator, never from icon or ownname. Display localized type + ownname, separated by one space; ru «Городок Айхенхайм», en «Town Eichenheim». Name uses current existing localized fallback policy; do not translate or modify stored name. For no ownname, display type once (not duplicate a generated type fallback). Unknown type: existing localized generic POI + known name, no guessed settlementclass; unknown locator retains current safe behavior. Keep stableID identity for duplicate names. Distinguish a real named value from fallback using structured resolver data, not regex stripping words from user-entered names.

Apply common label to fine card and image/accessibility label/title where existing renderer exposes it. POI emoji/SVG and available type unaffected. No new map text labels, popup, tooltip mechanism or entity editing UI. Existing hover/selection/keyboard and locale switches must return the same entity, draft target unchanged. Text escapes as ordinary React text; long names wrap, accessible labels remain full. Existing name/biome/note editor behavior and44px controls preserved. Native6 label already exposing type must not become double-prefixed.

## Crossings artwork

Use existing actual crossingkind and rendered crossing road/segment matching; do not infer kind from fullness or reroll. Source bridge App.tsx16359–16412; fine circles OneMileArtwork.tsx32 are the defect. Bridge: continuous road/trail through crossing with existing paired rail symbol. Ford: water visible beneath translucent crossing part of road/trail, outside part normal. Ferry: road terminates at both visible river banks with gap across water; no road line painted across gap, no replacement generic dot. Retain current source rule restrictions (ROAD-10, manualbridge/ferry F1–5, ford F1–2); rendering does not mutate invalid legacy kind or authorize new crossing combinations.

Place at existing crossingx/y using existing route tangent and river geometry; preserve water/road paint order, correct rotation and attachment to that roadsegment. Road splitting only affects render primitives, never model segments. Gap/rail artwork dimensions must follow same coordinate→screen transform as depicted water/road and existing native convention, not unscaled SVG constants copied into fine view. Derive shore gap from current visible river-stroke envelope and crossingangle and clamp splitpoints to segment; no overshoot/NaN/reversed fragments at endpoints. Very acute/degenerate inputs use deterministic safe rendering without synthetic bridge/ferry/ford or data changes, record limitation. Multiple crossings on one segment must be ordered/deduped by stable crossingkey and rendered once each, not lost by first-match find. Avoid drawing unchanged full road under a ferry gap. Dash phase/type for trails must remain distinguishable; selection/focus overlays do not replace the crossing.

PNG exporter includes these accepted crossing/POI label semantics (label accessible, no mandatory new textual map overlay), same rotation and styles; editor-only masks/focus never leak into PNG. Tiles/emoji/color modes all retain distinct transition artwork. Busy readonly scene remains visible; callbacks remain guarded. UI does not add diagnostics or implementation explanations to user card.

## Scenarios, compatibility and failures

Open a current or public2…10 imported world, explicit fine adaptation as before, select1mile: inspect all3crossings and named/unnamed/unknown POI. Toggle1→6→1, rotate, zoom, switchRU/EN, pointerhover and keyboardselection. The same crossing/POI and known type remain. Exportv15/reimport and existing UndoRedo of a POI rename or crossing edit preserve exact map/RNG; presentation toggles create no new content transaction. Missing referenced data must not crash or silently repair the document. Prior strict import/version refusal and draft guards remain; invalid saveddata still governed by existing parser. No new serialization fields or mandatory migrations.

## Acceptance and useful checks

P01: current type+name named/unnamed/unknown land/water/central/secondary, RU/EN, duplicates and long text; label resolves one stable entity and no double prefix. Extend existing fine-card/POI label assertions where possible.
P02: actual bridge/ferry/ford in fine map and PNG, matching native conventions; ferry gap visibly removes underlying road; ford translucent; bridge rails; no generic identical circles. Reuse existing native crossing fixtures if alltypes available, otherwise one explicitly edited copy of existing world; no new statistical worldseries.
P03: crossingpos/kind/roadkey and geometry identical before/after/toggle/save/load; multi-crossing and nearendpoint render source-sensitive examples if helper changed. Assertions should fail when crossingkind branches collapse, not only countSVGnodes.
P04: native6 same world before/after visual comparison; sourcegeometry/JSON/RNG unchanged. Shared helper extraction cannot hide a6-mile regression. Current sourcewidth/shore defects remain recorded, not newly declared fixed.
P05: desktop1500,390,320 and RU/EN read/edit/empty/unknown/busy; card wrapping/buttons/focus not obscured. Exact finalSHA actual screenshots of normal and crossing states +PNG presented to owner. Existing tests for busy/read/guard retained; do not duplicate them merely to growcasecount.
P06: required AGENTS npmcheck onNode24, build/browser after renderer change; existing RNG suite as required by repo, report separately. Review necessity of each added/modifiedcase against existing coverage; count logicalcases by comparable runner. Save test_change_summary, exactSHA/evidence/limitations; no blind newcases or10k series. Reviewer independently reviews whole changedSHA and necessary regressions; prior acceptance historical.

## Score1.2

Current-score blob0b3526f8f4665067276c159508c730790aac5448:50unverified/weight1000, confirmedpointsnull. S01-C04(P02/P03), S02-C02(P01/P03/P04), S04-C03(P02/P04), S04-C04(P02/P03 PNG/JSON), S04-C05(P01/P05), S05-C01(P01/P05). For each criterion beforegrade=null/unverified,beforepoints=null, expectedgrade/points/delta=null (unknown). No wholecriterion award; future exactSHA reviewer records separate evidence and breadthlimitations. No release-score update in this phase.

## Remaining8-clause ledger and next stages

C01 pending: source6 lines do not in general lie on fine edges. A representation/geometry correspondence must retain topology, crossinglocations/POI/shore invariants and not create a separate driftingriverworld. Do not choose silent snap/reroute in thisphase. Next BA boundeddesign: evaluate existing fixture correspondence, document displacedanchors and viable mapping before choosing algorithm; no statistical generation series.
C02 partial: thisphase fixes visible type; physical bank alignment follows C01/C07 and gets independent acceptance later.
C03 pending: legacytown lacks water requirementref. Retrieve origin or explicitlyunknown; do not assert samecoarsehex proves river adjacency. Analyze correct controlled adaptation/consent, no automatic movinglegacy authoredPOI.
C04 existing mechanism only, per-object size correctness unverified. Measured/manual size wins; multihex oneentity and commonoutline remain mandatory.
C05 ready thisphase as above.
C06 pending: exposedendpoint→lakecellcenter connector requires actualshore intersection and validated inletprofile tied to width. Do not change mouth here.
C07 unresolved: historicalF1–10 percentages do not supply currentF1–5 water-vs-corridor width. Currentowner qualitative largefraction1mile retained. No approved precise F1meters/miles supplied; calibration proposal must state source, definition and6×ratio. Pixelstroke is not physical evidence.
C08 unresolved: town0.8mi catalogue is projectassumption, challenged byowner. Need actual/declared extent basis, distinguish builtarea/settlementterritory; multi-mile town maps to multihex. Do not set all towns arbitrarily2/3miles or certify current Айхенхайм0.8.

The fullpackage remains not_release_ready while these clauses unresolved. This bounded developer phase does not close HX-FB-023 or replace publication approval. After phase implementation comes independent review; BA geometry/width/size continues by normalqueue after that phase, with exact material choices surfaced to owner if still ambiguous. Preserve unrelated claims/researchpause.
