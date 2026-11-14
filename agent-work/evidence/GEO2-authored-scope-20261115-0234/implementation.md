# GEO2 authored-owner scope projection

Task HX-BL-051 / ONE-MILE1 / GEO2-v2; source 7c9f049befa1c7b3a09d357b6992fe3e0b1db9a3, tree ff9e50e4c3b653b09c7f86574fcd65ae9b265b26; base8230c00dcda0e9c723278c1e71193f8b72bacf15. Approved immediate continuation, completed interview, no new start/design gate or release permission.

## Implemented boundary

The detached projector now separates the current authored physical3 snapshot into retained owner/footprint inputs and outside owner/footprint records. It returns globalAuthoredState separately. Current old IDs must still match; missing retained owners/footprints, ID rebinding or a regressing monotonic identity counter reject. The global snapshot is parsed structurally and its identity aliases checked against live source POIs before projecting. New owners/footprints are never substituted with old data to force a signature match.

physical4 accepted geometry output is still unwrapped to its authored geometry source. The live outer fineCellEdits, viewStep and selection/focus override the historical source snapshot; clearing focus also clears it in the returned global authored snapshot. This addresses a reproduced detached-projector loss: after a note was edited following accepted refinement, the prior implementation returned empty historical fine edits instead of the current note. Input and accepted refinement remain unchanged. Exact old source fingerprint still holds after owner projection; accepted route choices are returned literally, no rerouting/RNG use.

Every projected result remains boundaryValidation=required and readyForApplication=false. globalAuthoredState is structurally/identity validated, not a complete global spatial or public16 document validation. The scoped physical3 input is an internal geometry slice, never a replacement for the global map; global fine edits are deliberately retained separately from geometric owner scoping. This is not an acceptance of connected expansion, nor a solver for changed retained source geometry.

## Verification and test governance

Existing named source-projection contract expanded, no duplicate fixture/seed series. Exact base/head logical case comparison: Node +0/-0/modified1; the other two geometryPlan cases unchanged. Reuses53 source segments,31 road parts,7 crossings. New subscenarios cover one outside authored site and identity allocation, retained ID loss/rebinding, dangling owner, counter regression while live IDs remain legal, current fine note/view/focus and cleared focus. Subscenarios are not separate named-case growth. Focused3/3 and TypeScript passed. The original owner-append check failed scope_source_changed before implementation; the live outer edit check failed because {} replaced the current note before the final fix.

An intermediate full check on d35da9686bae14ea51990a9f6d9ed7144097e537 was deliberately interrupted130 after the new live-edit concern appeared. Its partial output is superseded, not a passing final check. Final source7c9f049 is checked independently. Browser/RNG were not rerun for this detached module with no App/generation/render activation. Prior actual socket EPERM evidence remains at agent-work/evidence/GEO2-browser-runtime-20261115-0108/checks.json; full G210 acceptance is pending a permitted runner, not a missing-binary assumption.

## Remaining handoff

Программист продолжает HX-BL-051/GEO2 на 7c9f049befa1c7b3a09d357b6992fe3e0b1db9a3: завершить пространственную проверку новых/старых границ и global physical4 bookkeeping/persisted scope, затем подключить расширение к реальному recordGenerated/UndoRedo и public16 roundtrip. Сохранить новый неуточнённый домен, все глобальные владельцы/ручные правки, текущие fine edits/focus и старые literal choices; projected.input не заменяет весь документ. До этой интеграции refinement_domain_expansion остаётся отказом, readyForApplication=false. Затем карта/PNG/initial preview, G201–G210 и независимая проверка полного точного SHA с score_assessment1.2. Browser acceptance требует разрешающего Chromium socket() runner; публикация отдельно.

No main/PR503 update/publication and no product score change. All model1.2 affected grades/points/deltas remain unknown; programmer evidence is not independent score_assessment.
