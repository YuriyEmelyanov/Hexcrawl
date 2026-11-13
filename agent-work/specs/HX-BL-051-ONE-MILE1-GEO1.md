> **Актуальное уточнение владельца13.11.2026:** GEO-D01 больше не ждёт выбора A/B. Принят обход по рёбрам существующих гексов со случайным устойчивым выбором стороны и согласованным переносом зависимых POI/дорог; дорога внутри охватаPOI≥целого гекса скрывается. РекомендацияA/перепривязка сетки не утверждена. Ниже разделы GEO-D01 с ожиданием решения — история, заменены [решением владельца](../decisions/owner-decision-2026-11-13-ONE-MILE1-GEO-D01-edge-detours.json). Это требует следующей ограниченной спецификации; не разрешение немедленного кодирования или выпуска. WR1 остаётся отдельно принятым этапом на3344159.

# HX-BL-051 / ONE-MILE1 — GEO1 / WR1
Version GEO1-WR1, 13.11.2026. Business analyst, approved owner corrections HX-FB-023. Source PR50360059737ec94b54db88c2f49c8d16e99da7d85a8/tree705c41da8d45f9c4a4afafc37426d32d402465af. Published main1962fb9a835a9c310e55c1a09415fe180f22cca9 unchanged. C02 visual/C05 bounded acceptance retained; full package remains not release ready.

## Decision and executable scope
**WR1 is ready for programmer:** fix only relative river-width projection and matching crossing artwork on1mile. No new calibration, geometry/routing/anchors/IDs/schema/catalogue changes. This is an independently useful limited phase of approved051, not acceptance of full C07 or an invented new task.
**GEO-D01 is proposed, not authorized implementation:** literal active-grid edge routing conflicts with unchanged coordinates and the present fixed1mile grid. Resolve explicitly before rerouting or shifting fine cells. This does not block WR1 and is not an intermediate design-approval gate.

## Measured input, one existing fixture
Reproducible source instrument/probe at agent-work/evidence/ONE-MILE1-GEO-0500/probe.mjs and copied harness; no statistical generation series. Actual production import + explicit existing ONE-MILE preview of road-entry-zigzags.json, no random/new worlds. DetailGrid across-flats, pointy, shared origin(0,0).53 riveredges,7 crossings. All7 road-midpoint crossings equal centers of1mile cells (numeric tolerance1e-8mi); distance to nearest boundary0.5mi. Example source crossing1:-1,2|0,1:1 → world(1.5,7.794228634059948), fine(-3,9). Thus exact saved crossing position cannot also belong to a current fine edge. This is a confirmed geometric incompatibility, not a rendering-quality guess.
Town detail-poi:2 / poi:1:0,0 is at(0,0), nearest existing river **centerline3mi**. This is neither measured bank distance nor proof that this legacytown has a required water attachment. Its0.8mi extent remains project_assumption_not_measured. Earlier owner's approximate2.5mi is not falsely confirmed as an exact bank measurement.
Current OneMileArtwork uses river width/6 although source and fine artwork share the same world→SVG frame. Coarse hex width=sqrt(3)*28; fine width=that/6. The current extra /6 makes water's fraction of fine cell equal the coarse fraction rather than6times larger. Geometry and this relative-width defect are distinct.

## WR1 purpose, visible effect and boundaries
User sees the same water band when switching6↔1, with the latter occupying six times the fraction of a hex. Before, switching to1 also makes the river six times narrower in the shared world frame. After, source width is preserved. Crossing approach points must follow the actual resulting visible banks.
Use the existing source stroke convention as an **unverified legacy visual baseline**, not an approved physical-width table. Do not change F1–5 classes, widths in6view, source formula, add meters/miles fields, infer water quantity, or rewrite old saves. No claim that45% fulfills the owner's qualitative 'большая часть' or completes physical calibration.
|F|Existing6mile fraction|Current1mile fraction|WR1 fraction in1mile|
|---|---:|---:|---:|
|1|7.5%|7.5%|45%|
|2|11%|11%|66%|
|3|14.5%|14.5%|87%|
|4|18%|18%|108%|
|5|21.5%|21.5%|129%|
Fractions can exceed one cell because water spans adjacent cells; never clamp width to a fine hex. These are derived rendering numbers, not a newly approved calibration. F1–10 historical2–40% cannot be mechanically converted into currentF1–5.
Crossing IDs/kinds/positions and ROAD-10 validity remain unchanged. Accepted C02/C05 label/symbol behavior retained.

## Developer contract WR1
1. Define one shared **visible stroke width in current SVG/world frame** for the fine river and its crossing envelope. With existing source r.width, WR1's visible width equals r.width, not r.width/6. Use a shared pure presentation function or equally explicit single contract; no independent inconsistent copy of divisor in renderer/helper.
2. Update ferry/ford interval and bridge rail extent from this visible width and actual crossing angle. For present interior/perpendicular crossings, halfgap=visibleWidth/2 along the road. More generally use current approved clamped projection; do not claim arbitrary finite endcap correctness. No original full road beneath ferry. Ford road across water opacity retained; bridge continuous with paired rails spanning visible water, rails outside gap if water widens. Trails remain distinguishable; maintain paint order/rotation/PNG.
3. Keep native6 rendering completely unchanged. No enlargement of road width, icons, typography, fine selection strokes, UI panels or number of controls. Rapid/waterfall identities/locations, water bodies/lake shore geometry and toponyms remain. Inspect clipping/join with existing LakeWater; a changed visible join is not closure of C06.
4. No document write on view/zoom/rotation/style. No RNG advance, ID/crossing-kind recalculation, legacy migration, auto moving POI, remapping fine edits, or changed JSONversion. Existing draft/busy/accepted snapshot guards continue.
5. Missing/invalid rendering matches follow existing safe handling: no NaN/overshoot/crash or invented crossing. Current-model assumption is saved: crossings are at source road midpoint and shared hex-edge interior. Future GEO-D01 changes that assumption and must re-specify finite joined stroke envelopes before reuse.

## Scenarios and verifiable acceptance
WR01: With same source width and camera,6→1→6 preserves actual water width in world/SVG coordinates; water/hex fraction multiplies exactly6. Verify allF1–5/sectors using analytical width function, not new generation series. F1expected45% is a legacy-projection check, not physical-target acceptance.
WR02: One existing legal fixed world/explicit F2ford variant shows bridge/ford/ferry in map and actual exported PNG. Source coordinates/kinds/refs identical. Ferry pieces end at new banks with no fullroad under gap; ford translucent section covers new visible water; rails span it. For perpendicular helper case road0..10, crossing5, visible water width6, expected ferry stops2 and8. Test should fail with old divisor, not just count nodes. Multiple/endpoint/degenerate clipping remains deterministic; current-model limitations explicit.
WR03: Exact native6 before/after same-world snapshots1500/390; current PR503 opt-in baseline diagnostic may be reused. Do not add a permanent historical build cost to every futurePR.
WR04: Tiles/emoji/color, rotation, camera,1500/390/320 and RU/EN, read/edit/busy/error paths retain accepted UI. JSON/export/import/Save/UndoRedo preserve map+RNG; width/style toggles do not create transactions. PNG uses same water/envelope; hover/candidates/editor masks excluded. Inspect actual lakejoin and POI occlusion as known limitations; do not hide them or move entities to make screenshot pass.
WR05: Required Node24 npmcheck, build/browser and existing RNG as AGENTS/spec; report separately. Base for this phase6005973, exact final SHA/evidence and full changed-package regression review required. Old C02/C05 acceptance does not automatically accept a new SHA.
Test governance: extend existing crossing unit case with analytical bank bounds and width ratio, and existing fine browser/PNG lifecycle with width-sensitive assertions. No new suite/case solely for count; reuse existing fixtures; maintain structured logical-case counts. Independent reviewer assesses usefulness and the prior tautological/vacuous assertions. Full general test audit is not this task.
Completion: one limited PR503 repair commit set with passing needed checks, actual desktop/narrow+PNG shown, exactSHA programmer score evidence, independent reviewer handoff. No merge/publication.

## UI proposal W1, not implementation
Preview files agent-work/evidence/ONE-MILE1-GEO-0500/desktop.png and narrow.png, versionW1, shown in owner chat13Nov. Geometric diagrams use actual fixture coordinates/route kinds; biomes simplified only in mockup. Ford row is explicit legal F2 variation of original bridge, not a regenerated map or changed world. Normal states shown: bridge, ferry, ford; toolbar/card/empty/error/busy UI unchanged, existing scenario guards are regression checks. The proposal concerns width only: the visible off-fine-edge routes intentionally remain as current C01 problem, not a claimed repair. No response is needed to continue WR1; silence is not design approval or release permission.

## GEO-D01: explicit geometry decision proposal within existing051
Problem: all7 current crossings are in fine-cell centers. Silently snapping them to edges changes geographic position (nearest-edge distance0.5mi), road attachment/shore/POI semantics. Keeping current straight source lines under a small grid does not satisfy C01. A common regular honeycomb also cannot subdivide one long straight coarse edge into a contiguous straight fine edge chain (three120degree edge directions at a vertex, no collinear continuation). Literal identical polyline on both regular grids is therefore not the available invariant.
Recommended principle **A**: retain source6 map and world control nodes/POI/crossing identity/physical positions; introduce an explicit revised fine-grid phase and a deterministic edge-chain detail tied to each parent river segment. Coarse view is the stable parent/generalization, fine view the linked refinement, not a separately generated drifting river world. A candidate phase offset(0,-1/sqrt(3))mi puts the current center-coset control nodes on fine vertices; this is a mathematical candidate, not an approved new origin or completed routing algorithm. Show source/bank/crossing/POI correspondence and old fine-edit migration before implementation.
Alternative **B**: retain current fine-grid addresses, explicitly adapt river/control positions and local road approaches with displacement/conflict preview. It sacrifices exact old geographic positions and requires owner-authorized adaptation; authored POI/roads cannot be moved silently.
A requires model/migration of existing fine edits: old1mile q/r no longer names the same footprint. Preserve authored names/notes/biome overrides by physical source areas, show overlaps/conflicts and require explicit loss consent; no destructive majority winner. B requires explicit object-motion consent/conflict handling. Neither is authorized by this analyst report.
Owner decision requested: approve principleA (recommended) orB for detailed contract. This is a substantive spatial/migration choice, not a third design approval. EstimateM for subsequent contract/implementation/review, no paid expense or new measurement budget inferred. No new task/duplicate backlog item: proposalGEO-D01 lives in existingHX-BL-051.
Independent ongoing WR1 continues while this decision waits.

## Remaining requirements / source boundaries
C01/geographicC02: pendingGEO-D01, no silent snap. C03: use stable water requirement+refs, controlled provenance; legacytown requirement stillunknown, not automaticallynone; correct bank/entrance relative to actual contour required. C04/C08: measured > explicit manual > defensible catalogue > unknown;0.8town cannot be certified, user's question doesn't authorize2/3mi table. A manually given multi-mile settlement must cover multiple adjacent cells with common outer outline and oneID. Do not delete authored sizes or automatically reclassify all towns.
C06: next geometry contract must intersect actual rendered shoreline, join water corridor at shore with no dry-land center connector; retain lake/river IDs and inlet direction, distinguish confirmed connector geometry from aesthetics. Not patched by WR1.
C07: relative projectionWR1 ready; water-vs-corridor definition and actualF1–5 physical calibration unknown. Existing retrieved history reused, no repeated archive search; owner's largefractionF1 target retained. Calibration proposal must explicitly state assumed physical meaning and source, not assign legacy formula official status.

## Score1.2
Source current-score blob0b3526f8f4665067276c159508c730790aac5448:50criteria,weight1000; selected grades/points null/unverified. Forecast unknown; no award until independent exactSHA review and publication.
|criterion_id|weight|before grade/points|expected grade/points/delta|separate evidence|
|---|---:|---|---|---|
|S01-C02|40|null/null (unverified)|unknown/null/null|WR01 projection ratio and explicit no full geographic/physical certification|
|S01-C04|25|null/null|unknown/null/null|WR02 actual banks/rail/ford/ferry widths and stable route refs|
|S02-C02|20|null/null|unknown/null/null|WR04 identity, world/crossing/POI data and accepted transaction snapshots|
|S04-C03|20|null/null|unknown/null/null|WR01/03/04 visible map/style/rotation/native6 comparison|
|S04-C04|15|null/null|unknown/null/null|WR02/04 real PNG width/gap parity and JSON preservation|
Full top5/10/20 applicability/breadth remains unverified. GEO-D01 has no score uplift authorized; its unresolved semantic contract is not implementation evidence.
