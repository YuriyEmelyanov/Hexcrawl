# DETAIL1 implementation checkpoint A1

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

This checkpoint is not connected to App, save/import or generation. Existing
maps, format v10 and all UI remain unchanged. No feature readiness or product
score increase is claimed. Subsequent work must implement projection from the
authoritative six-mile source grid, polygon intersection, stable POI identity,
typed water/access constraints, explicit adaptation preview, v11 validation,
history and the compact multi-scale UI before independent acceptance.

Test decision: existing tests cover pixel rendering and POI editor lifecycle,
but no physical across-flats multi-scale projection or shared footprint union.
Two new Node cases protect those separate requirements (DTL-01/02 and the
geometric part of DTL-05/08/09). No browser case is added for an unused module.
