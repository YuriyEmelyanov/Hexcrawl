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

Next checkpoint adds river-source allocation (still unmounted): common ports,
source-correspondence paths, shortest-length/deviation/seeded-side ordering and
reservation against new joins. Existing four primitive cases cannot detect a
lost confluence or partially returned candidate: add three named Node cases for
shared confluence/permutation invariants, atomic source/constraint errors, and
the existing53-segment fixture. No new generated-world series. The allocator
is bounded sequential search, not a complete simultaneous solver: failure is
not proof that the requested topology is impossible. It must not be activated
without dependent POI/road/crossing/mouth/save/UI preparation.

River preparation now reserves distinct approaches at each shared source port,
so processing an earlier downstream path cannot close a later tributary. Port
assignment uses direction, seeded-side tie-break and numeric keys. The retained
53-segment fixture and its permuted form preserve every source ID/F and exact
node incidence. A center-cell diameter exercises both seeded alternatives.
Terminal splitting, physical water envelopes, marks and actual boundary exits
still need full GeometryPlan integration; nearest vertex ports alone are not
acceptance of those contracts. No new controls or public save format activated.
