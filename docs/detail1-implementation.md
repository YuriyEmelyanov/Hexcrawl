# DETAIL1 implementation checkpoint A2

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

This checkpoint is not connected to App, save/import or generation. Existing
maps, format v10 and all UI remain unchanged. No feature readiness or product
score increase is claimed. Subsequent work must integrate stable POI identity,
validate water/access references against live geometry, add explicit apply/cancel
and v11 document/history wiring, then implement the compact multi-scale UI before
independent acceptance.

Test decision: existing tests cover pixel rendering and POI editor lifecycle,
but no physical across-flats multi-scale projection or shared footprint union.
Four Node cases now protect separate requirements: A1 grid/boundary topology and
A2 source projection/strict state preview. No browser case is added for modules
that are still deliberately disconnected from the product.
