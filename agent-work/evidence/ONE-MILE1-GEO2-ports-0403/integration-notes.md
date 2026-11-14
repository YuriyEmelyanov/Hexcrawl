# GEO2-PORTS integration boundary

Exact implementation: 61f69e3fd8d3f04c4db71447156e3dcadb872ca2.

The new standalone preparer projects degree1 terminals onto legal edges and
splits them into positive interval pieces. Junctions retain integer vertices.
Fractions are edge-local references, never fractional grid addresses. Existing
river allocation and mark traversal still consume the old integer graph; wiring
them to split edges is the next step, not completed by this checkpoint.

Code lookup on this exact checkout: App.tsx buildRegionRiverNetwork lines2850–2933
computes frontier from actual candidate hex corners. It resolves lakes first,
then sea, then degree1 frontier, then true source/closed inland mouth. Artificial
fixed:start/end nodes are hydrology solve boundaries, not geographic map exits.
getCandidateBoundaryVerticesForRegion uses actual candidate boundary edges.
Do not copy sector region_boundary into new open ports or classify lake holes
as unexplored territory. Preserve the existing source flow and F; do not reroll
or regenerate candidates. Retain stable source exit refs. Delta handling is also
not certified by the ordinary retained fixture or the standalone port utility.

The diagnostic's3471 cells come from fixture regions, matching prior routing
witnesses. It does not supply the full oneMileSources accepted-water override
adapter, so its boundaryEdgeKeys must not be certified as actual open frontiers.
The real caller needs that accepted geography and explicit eligible boundary
edges. An exit request validates that its edges are topological boundaries of the
supplied cell union; their semantic open-frontier status is caller-owned.

Finite work: <=4096 cells/requests; edges*requests<=2,000,000. Junction incidence
counting is linear in supplied allowed edges, not an edge-by-vertex scan.
No product-scale or statistical benchmark was introduced.
