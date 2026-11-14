# GEO2 retained-source projection

Programmer checkpoint; approved HX-BL-051/GEO2-v2. Source8230c00dcda0e9c723278c1e71193f8b72bacf15, basef522b356afadf947f5ff95ebfc8bc40f9616dbbf. No activation, public-schema migration, main merge or publication.

## Completed component

`projectGeometryRefinementSource` reconstructs the old input domain from the already accepted exact fingerprint and stable region/river/road/crossing/owner/water references. It separates outside records and validates the retained domain against the stored source fingerprint without route search, RNG or accepted writes. Existing geometryRefinement is returned literally. Current authored physical3 inputs are validated rather than overwritten by old derived state.

Explicit seams (reused old coarse cells, shared river nodes, road endpoints, old crossing dependencies, extended old lake IDs) return boundary_dependency. Missing old entities report their IDs; changed old roads, features, bodies or authored footprints return scope_source_changed. Old river/road records that gain new parts conservatively conflict; no ID-only truncation is performed. Input permutation preserves validation. Size bounds and cancellation prevent an unbounded detached preparation; this is not a CPU/runtime or global all-phase budget guarantee.

One new logical case reuses the retained53-river/31-road/7-crossing fixture, checking accepted-model identity, no input mutation, unchanged fingerprint, outside-region separation, physical4 source reuse, changed authored anchor, road class, lost river, shared node, crossing and lake seams, permutation, cancellation and capacity. Existing two GeometryPlan cases remain. No new seed series or browser cases.

## Explicitly incomplete

A successful projection is not proof of isolation. Every result has readyForApplication=false and boundaryValidation=required. Arbitrary spatial contacts and mixed coarse/fine interfaces still need validation; this component is not called by App, import or generation. Existing refinement_domain_expansion refusal remains in place.

Next programmer: combine this projection with spatial/interface closure and global authored-owner bookkeeping; persist the domain/mapping in physical4, update parser/source validation for exact16 roundtrip, and preserve new unrefined geography and fine edits. Do not store the old-domain projection as the whole map or use it to bypass boundary/loss/stale guards. Integrate through real generation/history handlers and show the required map/PNG/UI before full package review. Browser acceptance still requires an executor allowing Chromium socket(); don't repeat installation attempts without a capability change.

Score1.2 remains unknown/unverified for S01-C02,S01-C04,S02-C02,S04-C03,S04-C04,S05-C01. This detached prerequisite is evidence for retained-source selection, not completed expansion/UI acceptance, rules support or product-score gain.
