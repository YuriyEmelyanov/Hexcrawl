GEO2-v2 road-search checkpoint 5dda0a307b7e91f9b0389828857edc616931c8fc, tree c03a5e349178d7c7a3c0e68c9cafd5f3b680d735

Base 359f1c1c1243ebf3d293ab49a77abec3895f142d; working branch agent/hx-bl-051-geo2. PR503 remains3344159406c3619bc3903e7185f7b0a5c4d13de5, main remains1962fb9a835a9c310e55c1a09415fe180f22cca9. Pure preparer only, no UI/source generation change.

Existing dry straight candidates now use finite visibility search between every mandatory POI anchor/entry for affected parts without typed crossings. Dijkstra labels compare physical miles first, exact integrated old-polyline squared distance second, numeric point sequences last. The integral is the lower envelope of clamped segment-distance quadratics, split at clamp boundaries and pairwise polynomial roots. Positive physical lengths include hidden paths inside POI. Land/lake queries use actual quadratic/cell union geometry; water queries use analytic finite capsules, never a polygon mask as proof of dry land. Shared budget defaults2million work units across all dry intervals. Cancel, capacity, budget and no-path-in-candidate-graph reject the entire candidate with refs and no partial roads.

A reproduced overflow with finite1e200 coordinates initially yielded NaN deviation. Guard now rejects nonfinite metric/label totals; existing new objective case includes regression assertions. First full check was deliberately interrupted (exit130) for this correction and is not a passing exact-head check. The final check is separate.

Two new logical Node cases and one expanded existing POI case; 40 ephemeral analytic-vs-quadrature comparisons are diagnostic math examples, not permanent tests or another generated-world series. Existing retained-world lifecycle verifies31parts/7typedcrossings and the explicitly separate F2 ford variant. The retained witness supplies no actual eligible POI move or footprint to this phase.

- Unmounted backend; no complete GeometryPlan, feature-specific POI adapter, public16/history/source-edit auto-shift or actual map/PNG acceptance
- Search is shortest only in supplied finite visibility graph (<=512 vertices); sampled curve vertices do not prove globally shortest continuous path or all-path completeness. Capacity/budget/no-path-in-graph distinguished.
- Integrated only affected moved-POI portions with no typed crossing; typed-crossing routes retain prior source-incidence candidate. Joint ordered crossing placement/search still pending.
- No real eligible POI movement claimed: retained fixture supplies no moves/footprints to this phase; positive move/detour/mask witnesses are synthetic.
- No activation, PR503 head update, fresh whole-package independent review, publication or score award.

Next: Программист продолжает HX-BL-051/ONE-MILE1-GEO2-PLAN с 5dda0a307b7e91f9b0389828857edc616931c8fc: связать ordered typed-crossing bank/entry constraints с поиском пути, устранить неполноту конечной visibility-сети и сохранить явные capacity/budget ошибки. Затем actual owner/requirement/feature refs (rapid/waterfall/crossing/start), единый GeometryPlan, public16/physical4, автоматическая source-closure по Q01 и одна история Undo/Redo, общие stroke/dash/rails/map/PNG маски, фактический интерфейс и G201–G210. До полного точного SHA/проверок не review_ready; после завершения — независимый проверяющий. Выпуск отдельно.
