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

GEO2-MOUTHS rationale before tests: existing finite-water tests know no lake body
or island. Add one distinct Node case for exact displayed M/L/Q/Z shore curves,
point membership, clipped line intervals and island boundaries. Expand the
existing actual hydrology/wet-route lifecycle with real lake geometry in all3
modes, not another retained-world import case. Old Color mouth connectors cannot
be used as evidence of correct new shoreline. No active renderer/generator change.

The mouths backend now consumes actual lake-cell union boundaries for Tiles/Emoji
and the seeded Color basin M/L/Q/Z path, retaining exact quadratic intersections
and even-odd islands. It chooses a common submerged fine-edge port, reroutes only
the source endpoint within the existing finite source-plus-one-ring corridor,
and finds each mode's first external bank contact. A bank-following step ending
exactly at a fine vertex retains the next step's zero-distance shoreline contact.
The existing world supplies one actual outlet (three mode contacts); it does not
supply an inlet or rotation/PNG/runtime proof. Pure shore examples cover curved
contacts, endpoint contacts, islands and no-contact conflicts. A missing lake or
non-overlapping Color body rejects the whole candidate. Internal lake edges are
excluded from river paint, and finite river queries subtract each actual body.
This is a query-space mask, not active map/PNG clipping or a public save contract.
Nonterminal lake incidence rejects explicitly; the bounded sequential allocator
is still not a simultaneous solver. Remaining POI/roads/crossings, public16/history,
dependency closure, preview and actual three-mode renderer integration are required
before independent combined-package review.

GEO2-POI rationale before tests: existing capsule/shore cases do not find the
nearest exposed bank from an inside point or reject a buried confluence bank.
Add one bank geometry case for exposed finite boundaries, parent/side constraints
and lake masks. Add one placement case for known-vs-unknown requirement provenance,
rigid conditional footprint/route-entry translation and atomic locked/no-fit errors.
Extend the existing actual hydrology case with its real POI requirement inventory
and bank query rather than another generated-world lifecycle. Do not infer a
river requirement from an attachment or catalogue town name. Still unmounted.

The POI backend now enumerates exposed finite capsule boundaries, including
line/circle overlaps, parent/footprint constraints and quadratic lake intersections
(the latter use bounded derivative-subdivision roots through degree4). It rejects
buried banks at confluences and returns canonical nearest contact within the
provided same-parent constraints, not negative inside clearance. Whole authored
footprints enumerate rigid integer-grid translations and preserve cell count,
extent and every route-entry reference; marker anchors move to the actual bank.
Unknown source requirements remain unresolved without automatic movement. Existing
Knave policy is read through a pure alias lookup; attachment alone is not authority.
Locked/measured shapes do not translate. Feature-specific rapid/waterfall/crossing
contacts return explicit pending conflict until the adapted mark/crossing phase.
This phase expects accepted land parents/source refs; full GeometryPlan spatial
validation, ordinary source-edit rebuilding, roads/PNG/public16/history/UI and
independent review remain pending. No generator or active renderer change.
