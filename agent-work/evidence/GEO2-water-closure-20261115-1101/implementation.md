# HX-BL-051 GEO2 lake/support closure

Source 1a8c632777eb26549e1834d1f69a98fe7656885f, base f733cfb372d1db611187528b877930f24e8792ee. One approved programmer stage; full water seams and GEO2 not complete.

Reproduced actual scoped16 import refusal when an old lake's validated shoreline touches empty new region support. Once that was resolved, actual E6 growth failed invalid_boundary_input lake body_source: geometryLakeInputs used per-region lake fragments as if each were a complete body. Now group current lake cells once by stable ID for full all-mode contour/mouth preparation. Existing complete GeometryPlan, strict source correspondence and global validation remain before writes.

Boundary certificate permits only body/region candidate pairs. All-mode quadratic hulls, source/fine water, road stroke/rail envelopes and complete POI extents/attachments are already compared against opposite support/features. Any potential body/river, body/road, body/POI or body/body pair still refuses. This is a conservative sufficient support-only certificate, not an exact resolution of occupied-feature contacts or permission to move them.

Reuse waterSetup/geometryRiverBackendFixture and accepted plan helper. One distinct actual handler case covers an old lake crossing into a new region: shared lakeID and counters, changed Tiles/Emoji/Color signatures, unrelated river paths literal, new region unrefined, exact16 reload, one UndoRedo, injected contour failure preserves redo, stale water body16 import refuses. No new seed series. Base reproduction uses same valid fixture and exact base source. Full check is running on source SHA; browser/RNG attempts follow build.

Limits: no river/lake mouth shifts in positive fixture; complicated water-feature contacts, merge/split/sea handler combinations and rendering/PNG remain pending. No new game support, score award, release or PR503 update. Programmer evidence is not independent full package assessment.
