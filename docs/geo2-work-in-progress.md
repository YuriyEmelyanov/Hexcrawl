# GEO2 implementation checkpoint

Approved specification: agent-operations/agent-work/specs/HX-BL-051-ONE-MILE1-GEO2.md.
This unmounted primitive is not a GeometryPlan, public16 support, complete routing,
or acceptance of G201–G210. App/save/rendering remain unchanged until dependent
river/POI/road/crossing/mouth preparation and transaction are coherent.

Before adding tests, existing detailGrid/oneMile cases were inspected: polygon
intersection/footprint and old straight crossing paint are covered, but stable
side selection, perimeter alternatives and a constrained integer edge graph are
not. Four new logical Node cases cover distinct G201/G202 risks: canonical shared
edges, seeded sides, six-oriented perimeter detours, and blocked graph routing.
They do not duplicate browser lifecycle, certify a generated world or grow the
permanent browser/RNG suites. No implementation-specific cache/layout assertions.
