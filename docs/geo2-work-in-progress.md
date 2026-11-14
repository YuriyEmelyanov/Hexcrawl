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

This source-adapter checkpoint reuses the existing retained-world case rather
than adding another fixture run. Two additional logical Node cases are needed:
sector/path contradictions must reject before routing, and resolved rapid/
waterfall marks must keep directed arc correspondence on bent fine paths.
Existing grid/routing tests and manual feature-override tests do not check this
bridge. The adapter consumes the existing resolved regionMarkKeys sets; it must
not reroll feature eligibility or infer direction from lexically sorted keys.
Boundary reason/sector references are retained, but mapping them to ports is not
yet the geometric boundary-exit/shore constraint required for activation.

The unmounted source bridge now validates exact sector/path directed coverage,
fullness and region ownership, then retains start/end reasons and linked feature
refs. Contradictory or stale refs reject before routing. Already resolved rapid
and waterfall sets are required from the existing mark resolver; they are not
regenerated. Rapid centers follow normalized arc position with a downstream
unit tangent; waterfalls retain one vertex identity and every directed incident
segment (no arbitrary river choice at a junction). Synthetic feature evidence is
separate from the original53-segment world, whose diagnostic uses empty mark
sets explicitly. Actual resolver/UI wiring and geometric terminal/boundary
constraints are still pending; stored boundary provenance is not proof of a
continuable fine-map exit.

GEO2-PORTS test rationale, before implementation: existing graph and source cases
only allocate integer vertices. Two distinct Node cases are needed for terminal
projection/interior-edge splitting with preserved graph connectivity, and explicit
boundary/allowed-edge constraints with atomic collision failures. Reuse current
hex geometry and small fixed examples; no generated-world series. This checkpoint
prepares a split graph and port references, not the existing river allocator's
integration or a complete GeometryPlan. The caller must supply actual open-exit
refs/allowed boundary edges; internal sector tags cannot create exits.

GEO2 terminal-route integration rationale before test changes: extend the existing
retained-world logical case to exercise terminal subedge routes, source topology,
mark arcs and permutation together. Extend existing source-conflict and mark-direction cases rather than add a new
case for an already covered source path. Existing standalone port
checks do not detect a source mark still pointing to the old integer endpoint.
This bounded integration uses already allocated endpoint edges; it preserves the
interior route skeleton. It is not a simultaneous nearest-port rerouter or the
actual candidate/lake/sea open-exit adapter. No river-only activation.

GEO2-EXITS rationale before tests: one new Node case must use the actual App
hydrology builder, candidates, water overrides and source adapter on the existing
world, rather than manually label every boundary as open. The existing
port constraint case already covers missing/internal boundary refs; do not duplicate it.
The new adapter must reject stale/mismatched hydrology refs, retain source F/flow,
and exclude lake/sea and internal sector borders. Actual boundary-corridor reroute
now avoids existing interior/source/previously allocated nodes; failure remains a
referenced atomic conflict, never a silently retained inland port. It is bounded
sequential endpoint routing, not simultaneous global optimization or complete
geometry. Source generator and active UI are unchanged.

GEO2-WATER rationale before test changes: existing presentation tests exercise
straight-line crossing widths, not finite joined water geometry. Add two Node
cases for analytic capsule/corner/end/parallel/tangent intersection and variable
width union/disjoint gaps/invalid inputs. Expand the existing actual hydrology
fixture case with real renderer width conversion and water-envelope preparation,
instead of adding another world lifecycle. Capsule union models round caps/joins;
it is not lake clipping, nearest-bank placement from inside water, or map/PNG UI
acceptance. Query endpoints clipped inside water must never be called bank points.
