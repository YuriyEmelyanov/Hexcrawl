# TABLES1 App data contract checkpoint

Source: 83baec26594ab43d77f4b35f357a8bdfce86605a; spec TBL-1.0, approved HX-BL-043. This documents implementation details within the approved migration/history scope, not new product authority.

- map.knave.content schema1 stays unchanged on read and old shortcuts; first TABLES1 command atomically materializes all live saved records and its target edit into schema2.
- Public JSONv12 is emitted iff content.schemaVersion=2. App refuses schema2 under v11 and refuses v12 without materialized schema2; nested physicalGrid/classification keep their own versions.
- schema2 migrationMeta.categoryCounter retains old automatic category draws. Optional migrationMeta.primarySource={table:locations|structures|dungeons,sourceRow:1..100} freezes original physical provenance before primary call becomes editable. It is not a second writable site/trait result. Commands/remaps/loss preserve it. DETAIL1 water requirement uses it, so replacing a text call does not edit the map or invalidate accepted water attachments merely by losing source provenance. Older experimental schema2 without it uses available legacycall provenance; unknown remains unknown.
- preparationContext(owner) returns an opaque token and revision registered in a WeakMap. mutatePreparation(cmd,draft) checks owner/revision/token/current document/editor guards, obtains current authoritative facts, proposes detached schema2, then uses commitManualMap. Success consumes token. No-op/error do not allocate history/IDs/counters. UI must also check its current draft object on Cancel/Apply; never wire a cancelled stale closure directly.
- Imported schema2 and all owned data participate in existing copyDocument/applyDocument/save/import/undo/redo. remapKnavePois/dropKnaveLoss support schema2 and retain nextCallId, including last-owner deletion. Existing loss UI must obtain confirmation first.
- prepareKnaveGeneratedMap uses fillPreparation only after materialization. New automatic primary/trait reuse original distributions/namespaces, then fresh global IDs; existing calls and descriptions remain literal.
- Discovery Hidden row43 works with schema2 call semantics; no localized text matching. Manual table commands do not change biome/POI kind/roads/world RNG.

## Blocking UI work

The current legacy KnaveContentRow renders schema1 only; schema2 calls are not yet displayed or editable there. Old mutateKnaveContent refuses schema2 to prevent silently redrawing an unsupported projection. Full-feature readiness requires rendering all independent calls and children, shared selector/actions and description draft, real interactive/stale/dirty/IME/Cancel/focus checks and actual desktop/390/320 presentation. This checkpoint is not release-ready.
