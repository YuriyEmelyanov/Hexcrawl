# DETAIL1 implementation checkpoint D1

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
