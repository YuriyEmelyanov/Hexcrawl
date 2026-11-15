# GEO2 scoped retained-river removal

Task HX-BL-051/ONE-MILE1, approved final GEO2-v2 after completed interview. Programmer continuation;051 claim clear at start. Base d30a9464ea9c2bda63fc1d94b1b83b13eaceba3f; exact source 0832eedfc65895197e2cc098d5b694a3d9f4acc7; tree ae243bc8e9f95055aeb8ab12e38634f663886507; branch agent/hx-bl-051-geo2. No main, publication or PR503 update.

## Reproduction and guarded intent

Existing actual scoped source-edit fixture contains river1/known mill/road1 and unrelated river2/road2/bridge, plus a detached outside POI3 with bilingual fine name/note. Ordinary confirmed removal of unneeded old river2 returned false before the fix (repro.log): edit projection required every historical river reference. The final-spec ordinary source operation should instead compute the complete valid dependency change.

Only an actual type=remove RiverEdit supplies an internal set of its target ID and explicitly included immediate delta children, matching the unchanged manual river editor's deletion set. Ordinary other edits/generation/import get no such set. Edit projection may omit a retained ID only if it is in this set AND actually absent; only its own old crossing keys may then be absent. A grant for another ID, a missing crossing while its river survives, roads/regions/owners missing, graph/body seams and strict fingerprint import checks remain refusals. Permission is detached preparation context, never a saved field or owner-approval change.

## Complete transaction / diagnostic correction

prepareRiverMapEdit still validates existing river/delta/fullness/features/crossing rules, required POI/road dependencies, complete GeometryPlan and fresh global boundary. Existing destructive confirmation is unchanged. Internal intent is passed through both detached preparation and commitManualMap's second preparation before any history/map write. A temporary owned diagnostic showed detached preparation succeeding while real commit still refused; forwarding the same bounded set through that second pass corrected the actual path. Diagnostic file deleted; its run is separate development evidence, not a new permanent case or final passing count. No source generator, RIV/ROAD business algorithm, RNG or JSON schema change.

## Actual-handler evidence / test governance

Node+0/-0/modified1; named cases30→30. Extended the existing G208-AUTO actual scoped lifecycle, not another fixture/seed: default missing-ref and wrong-ID projection refuse; crossing removal with surviving river refuses; ordinary unconfirmed delete writes nothing; confirmed river2 deletion updates coarse/fine river/crossing membership and is one UndoRedo. Unrelated river1/road1 choices stay literal; all POI identities/footprints, outside local bilingual data, counters and RNG are unchanged. Updated16 reloads exact choices. Original lifecycle is restored for the existing automatic river1 update/import/metadata/error-redo checks. Existing actual required-river refusal case unchanged and rerun; the partial-scope required river1 removal also retains map/redo in the extended case. Focused2/2 and TypeScript passed. Scoped delta-child deletion is not a separate new acceptance witness; finite tested positive removes one of two retained rivers.

## Remaining scope / score

This handles a bounded source membership removal, not nonempty old/new continuation or relocation closure. River/road/POI/body contacts across domains, broader membership migration, actual initial UI/overlays/map/PNG and full G201–G210 remain pending; unsupported transitions still refuse atomically. Independent exact-SHA review+score_assessment1.2 required before publication approval. Affected S01-C02/C04,S02-C02,S04-C03/C04,S05-C01 grade/points/delta remain unknown; no current-score/history increase or new game compatibility. HX-FB-023 remains in approved GEO2 scope, not fully resolved. HX-FB-002 audit already completed, not repeated. No extra expense or new owner question.

## Final verification

Exact 0832eedfc65895197e2cc098d5b694a3d9f4acc7 / tree ae243bc8e9f95055aeb8ab12e38634f663886507: npm run check exit0;420/420 Node,0 failed/skipped/cancelled, TypeScript/build passed. Both actual post-build browser/RNG-browser commands exit1 at Chromium socket() EPERM before scenarios; no screenshots/PNG/UI acceptance. Source4 files and early evidence6 files read back exactly; local HEAD/tree aligned, tracked diff empty. Actual automation start/end enabled, no restoration. Node+0/-0/modified1; focused2 included in420, temporary failed development diagnostic separate and superseded, never counted as permanent growth.
