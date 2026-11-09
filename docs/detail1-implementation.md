# DETAIL1 implementation checkpoint D2b2

Approved scope: agent-operations/agent-work/specs/HX-BL-051-DETAIL1.md (DTL-1.0).

`src/detailGrid.ts` provides pointy axial world geometry, matching the existing
App.toPixel orientation, expressed in miles across opposite sides. All grids
share an explicit origin. Pixel size, camera translation, rotation and RNG are
not inputs. Cell membership uses nearest centres with lexicographic ties at
floating-point-indistinguishable boundaries. Integer lattice vertex keys keep
adjacent footprint edges identical without rounded screen coordinates.

The boundary helper returns exposed directed edges, including hole rims; it
does not stitch rings or infer a filled city area. Footprints must be nonempty,
unique and connected by edges. These are geometric primitives, not validation
of water contacts, road accesses or capital defaults.

`detailPositiveAreaIntersections` clips an authoritative source polygon against
the fixed grid and returns only positive-area intersections. Edge/vertex-only
touches are excluded, negative coordinates are deterministic, and no 6-to-1
fixed child count is assumed. No reusable clipping engine existed in the current
rendering/lake modules, so this bounded convex-cell clipper is kept here.

`src/detailModel.ts` defines and strictly parses the DETAIL1 section intended
for active v11 documents: shared origin/convention, separate source convention
and display assumption, stable POI identity, connected footprint, size
provenance, and typed water/route references. A legacy helper produces an
immutable preview for v2-v10 and cannot activate or mutate the document.

`src/detailPlacement.ts` adds the detached deterministic B/C adapter. It applies
one-cell site defaults, the capital minimum-two rule, the Mythic Bastionland
Seat exception and measured-polygon precedence without reading icon size. A
required water attachment keeps the exact water/segment identity. An assigned
road or trail is accepted only when a real segment has positive length inside
the selected footprint; adjacent and corner-only geometry fails. The adapter
never creates a route for an unassigned or isolated POI and never moves the
source river, road or POI when validation fails.

D1 connects the optional `map.physicalGrid` section to the actual App document,
JSON v11 import/export, generation/error backups and exact document Undo/Redo.
The separate classification section can coexist in the same v11 document;
removing classification alone does not downgrade a physical-grid document.
Existing v2-v10 imports stay inactive and receive no assumed convention.

This remains an internal checkpoint, without activation controls or rendering.
Only states with an empty POI footprint list cross the live document boundary.
A nonempty list is rejected atomically until D2 resolves and validates each
footprint's identity and typed water/route attachment against live geometry;
structural validity alone must not accept dangling spatial references. This
restriction is a temporary implementation boundary, not the finished format.
The detached B/C adapter still supports footprints for subsequent integration.

The integration branch also contains published OWNERFIX1/main90afe and the
unpublished CLASSIFY1 exact9dab package. Its historic RIV-011 risk remains
unresolved; neither prior review nor publication authority automatically carries
to this combined package. Whole DETAIL1 acceptance still needs the actual POI
adapter, explicit legacy adaptation/apply/cancel, remap/delete protections,
1/6/12/24 UI, exports, exact-head required checks and independent review.
No feature readiness, publication or product score increase is claimed.

Test decision: existing tests cover pixel rendering and POI editor lifecycle,
but no physical across-flats multi-scale projection or shared footprint union.
Six Node cases now protect separate requirements: A1 grid/boundary topology,
A2 source projection/strict state preview, and B/C extent plus water/route
legality. No browser case is added for modules that are still deliberately
disconnected from the product.

D1 test decision: one actual App import/history fixture is added to the existing
saveSafety suite. Pure model tests cannot detect losing physicalGrid in App
setters, dropping the sibling classification layer, downgrading JSON v11 or
partially committing invalid input. The fixture uses existing regionFixture;
no random map search or additional browser suite is introduced.

## D2a: live identity boundary

An optional physicalGrid.poiIdentities registry stores version1, a monotonic
nextId counter and byLegacyRef bindings. The aliases are the existing POI name
locators; detail-poi IDs remain independent from mutable coordinates. Removed
IDs are not recycled. Explicit simultaneous address mappings preserve IDs;
missing old aliases and conflicting targets refuse without changing input.
Allocation uses stable lexical ordering and no RNG. No source text is copied.

The live App import/document checker validates registry completeness against
actual unambiguous POI locators, reusing poiNameLocators with an opt-in ambiguity
error. Existing sparse name enumeration remains unchanged. A registry can be
saved with the empty D1 footprint list and survives exact import/history/reset.
Older D1/v11 documents without the optional registry remain compatible.

This is an internal identity checkpoint. No activation UI or automatic migration
is exposed. The nonempty-footprint gate remains until live water/route geometry
and POI placement are integrated. Ordinary POI/E7/E8 transactions must next use
the explicit identity reconciliation plus valid footprint relocation/removal;
unresolved ownership changes currently fail the live boundary instead of losing
identity silently. New generation must reconcile the complete registry in the
same transaction. Full DETAIL1 is not review-ready or approved for publication.

Test decision: one new logical Node case covers monotonic identity allocation,
explicit remap/removal, collision, overflow, ambiguity and input immutability.
The existing D1 actual-handler saveSafety case is extended to save/restore the
registry and reject orphan aliases and invalid counters atomically; it is not
a duplicate new lifecycle runner.

## D2b1: live identity transactions

The existing manual map commit allocates IDs for explicitly added POIs and
accepts deletions only through an explicit alias-removal map supplied by the
actual land/water delete command. Missing old aliases are still not guessed.
E7 transfers and E8 moves pass their known old/new locator correspondence,
retaining the ID together with names, Knave/MB payload and exact Undo/Redo.
Type/name-only edits retain identity. Counter exhaustion/conflict is checked
before the first history/state write. Geometry/path protections remain active.

Generated maps reconcile IDs before Knave content preparation and commit.
Mythic internal steps keep the temporary document coherent; final kingdom POI
allocation starts from the action's accepted backup identity registry. Thus
provisional sites do not become accepted entities, while pre-action IDs remain
fixed. Accepted map generation/continuation/history retain the existing RNG,
quota, water, route and rollback contracts; no RIV/ROAD algorithm is changed.

Nonempty footprints remain gated until actual spatial reconciliation is ready.
Water edits/removals beyond explicit POI commands, full footprint placement and
water/access geometry, legacy activation and1/6/12/24UI are not complete.
Whole DETAIL1 is still not review-ready or authorized for publication.

Test decision: extend five existing logical Node cases (E7 transfer Classic/
Mythic, E8 move Classic/Mythic, D1 actual import/history lifecycle) with active
identity registries and exact ID/counter assertions. Their existing generation
continuation, source payload and Undo/Redo checks are retained. The initial
negative run reproduced all five missing integrations. No parallel suite or
additional random search series is added.


## D2b2: source geography and joint access preview

`detailGeography.ts` and the real App `prepareDetailMapPreview` now prepare the
complete POI footprint candidate set from an accepted document, without changing
it. Unshifted model coordinates use the same pointy orientation and fixed
six-mile across-flats display assumption; renderer offsets/rotation/zoom never
enter the conversion. Existing source convention stays unknown when unproven.
Original hydrography, coarse N, roads, content and random streams are not edited.

The bridge enumerates real positive-area source-cell intersections, distinguishes
true capital from the Mythic Seat, uses the monotonic POI registry, and resolves
water environment to the existing lake/sea ID. Required water comes from the
accepted Knave source row's typed policy, never the localized name. Legacy
provenance stays unknown. Shore accesses use the shared physical edge; rivers
use their actual ID/edge, source nodes, visible rapids/waterfalls, or exact
road/river crossing point. A ford at F>=3 refuses; no connector is invented.

Only roads/trails with an existing graph node at the coarse POI address are
assigned. Each assigned road ID must have a positive interior span in the
footprint. Access ports are subdivision nodes on that existing segment, with
stable segment/cell IDs and an entry coordinate. They add no path geometry.
Water and routes are selected jointly: a nearer incompatible water port cannot
hide a valid one-cell solution, and multiple assigned routes are not silently
reduced to the first. Capital extent connects all required entries.

The result is an immutable **internal adaptation preview**, not an activated
user feature. Failure returns no partial candidate, allocates no live IDs and
writes no history. This checkpoint deliberately retains the live nonempty
footprint guard. General water/edit/removal/remap reconciliation and strict live
validation of imported/manual footprints must be connected before that guard
can be removed; legacy Apply/Cancel and the actual1/6/12/24 renderer/panel follow.
No full DETAIL1 completion, independent acceptance or publication is claimed.

Test decision: extend the existing placement access case to reproduce joint
water/route selection and every-assigned-route omission. Add two actual-App
logical Node cases for the previously uncovered source-geography bridge: true
capital/Seat and graph ports; exact sea/river/shore/source requirements/crossing
and unknown provenance with refusal. They reuse the existing authored E6/E7 and
Knave fixture data and harness rather than adding another lifecycle framework.

## D2c1: saved default footprint validation (internal)

The actual App geometry bridge now also validates a proposed saved state against
live POI owners, real water contacts and every assigned route/entry port. It
strictly parses the state, requires complete identity/footprint coverage, checks
connected source-cell coverage and capital/Seat default rules, and rejects
missing/forged water IDs, features, coordinates, paths and ports. A crossing now
retains its concrete opaque crossing key, not only the containing river edge.
Unproven source conventions cannot become known during validation.

This bounded validator supports default extents. Manual/measured extents fail
closed until their reconciliation is connected. It does not replace the live
import guard or enable an active nonempty layer. The next stage must connect
atomic edit/remap/removal/history handling and finish manual/measured validation
before enabling the layer. The two existing actual-App cases are expanded with
saved-state validity/refusal checks; no new permanent runner/case is added.

## D2c2: explicit manual/measured extents and immutable edit preparation

The internal live validator now supports manual and measured extents. Explicit
shapes may cross old source-cell/region boundaries, while every cell must have
positive overlap with compatible accepted land or the water POI's same body.
All mandatory water/feature contacts and assigned route entry ports remain
required. Unknown-size capitals still need two cells after a manual edit;
changing a provenance label alone is not evidence of a measured exception.
A real measured polygon determines exactly the positive-intersection cell set
and can substantiate a one-cell capital. Self-intersecting/degenerate surveys
are rejected. Survey polygon coordinates are fixed world miles; unit records
source measurement provenance, not an alternate unit for stored coordinates.

prepareDetailFootprintExtentEdit prepares a fully validated immutable state,
retains the POI identity, and leaves its input untouched on success or refusal.
It is still a detached preparation step: actual controller/history edits,
remap/removal/generation and explicit activation/UI must be connected before
removing the nonempty-document guard. No active importer/UI is enabled here.
Test decision: extend the existing capital/Seat actual-App geography case with
manual/measured validity, exact measured cells, malformed geometry, immutable
edit/refusal and the capital override constraint. Reuse its authored fixture,
without another case or runner.
