# GEO2 GeometryPlan integration checkpoint

Exact source: f522b356afadf947f5ff95ebfc8bc40f9616dbbf; base: cea2f93266913303833ef09477bc8f0c33be63d3.

Approved contract: agent-work/specs/HX-BL-051-ONE-MILE1-GEO2.md (GEO2-v2). No main merge or publication.

## Implemented

- Immutable GeometryPlan joins actual paths/ports/side choices/marks/all-mode mouths/water/POI/roads/crossings/masks.
- Public16/physical4/refinement1 stores separate authored physical3 snapshot and exact source fingerprint. No rerouting on load; strict reference/spatial/source validation.
- Actual initial preview/Apply/Cancel handlers and existing-domain Q01 writers prepare all dependencies before accepted/history writes; one exact Undo/Redo transaction, stale/busy/failure guards.
- Actual ordinary F2→F3 river edit shifts known-bank structures96 mill and road approach, preserves POI identity/extent/parent, unrelated river/road/crossing choices, text and world RNG; exact16 roundtrip.
- Marker-only representative POIs no longer acquire an invented tiny physical contour that rejects legitimate approach entries.
- Valid BR009 typed 1in→2out splits and generated sectorIndex0 preserved. Geometry-only delta sea-terminal adapter keeps arms separate from numerical RIV model; actual source delta contract validated at creation/load.
- Test harness reuses transpiled code only; exports, VM worlds and RNG remain isolated.

## Remaining scope and limitations

1. Additional accepted coarse region/cell support currently refuses atomically with refinement_domain_expansion. This does not satisfy full new-region-unrefined expansion acceptance; persisted domain and explicit mixed coarse/fine boundary closure remain programmer work.
2. A changed unrelated prepared record rejects conservatively instead of silently rerouting it. Finite routing failure is not proof of global impossibility.
3. Visible compact refinement preview, actual refined map/PNG and full desktop/narrow RU/EN acceptance remain pending. Integrated initial handlers are not a complete visible UI.
4. Browser scenarios require a working Chromium executable; actual command results are recorded separately, never counted as Node passes.
5. Fresh independent full-package exact-SHA review and score_assessment1.2 remain mandatory. Physical-width calibration C07 and town-size catalogue C08 are separate open scope.

## Test governance

Six useful logical Node cases added; two existing cases extended.32 malformed-data rows and version/mode matrices are subscenarios, not extra runner cases. Existing source fixtures and actual App harness reused. No new seed sweep/10k benchmark/browser scenario. The marker-only approach case failed before the outline-policy correction; the typed delta split was rejected before the degree/index/terminal correction. Development evidence is not independent package acceptance.

## Continuation

Программист продолжает утверждённую HX-BL-051/GEO2 на f522b356afadf947f5ff95ebfc8bc40f9616dbbf: реализовать область применения при расширении — новые регионы остаются неуточнёнными, затронутые пограничные зависимости атомарны, неизменённые пути буквальны. Затем подключить сохранённый GeometryPlan к карте/PNG и компактному первоначальному preview/Apply/Cancel; обычные правки уже используют Q01 без дополнительного UI. Довести G201–G210 и фактический desktop/узкий RU/EN показ, браузерные проверки после восстановления runtime; затем независимая проверка полного точного SHA с score_assessment1.2. Публикация отдельно разрешается владельцем.
