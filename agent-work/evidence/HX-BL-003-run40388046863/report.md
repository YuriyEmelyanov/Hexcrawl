# V2 measured result — run40388046863,26.10.2026

**Collection complete; developer result nonpassing navigation guard, not product acceptance.** Exact harness/source SHA 86100c390d8d4cf66cee6e87589be64ce51687e5; baseline103d31b9f6f5c76b1f6b45d9d6664fe3f75dd63b, runtimecandidate739e3de36587533bf3d2f3196072270f4695fa8a. [Run](https://github.com/YuriyEmelyanov/Hexcrawl/actions/runs/40388046863) succeeded as collection/analysis execution; greenworkflow is not passing productgate.

20measurednavigationactions +4successfulwarmups,4PNGclicks/4captured. Eachinput/variant hasordered0..4, one preceding successfulwarmup,120finiteframes perphase. Recomputed nearest-rank95 rank114/120 exactly matches summary. No failed rows removed/replaced/retried. Fiveactions, not120independentrepetitions. Both perrun and pooled statistics remain inraw/summary.

| Input | Phase | A pooledp95ms | B pooledp95ms | Delta | Guard |
|---|---|---:|---:|---:|---|
|N1200|zoom|766.700|816.700|+50ms/+6.52%|no breach|
|N1200|pan|133.268|116.642|−16.626ms/−12.48%|no breach|
|N2400|zoom|166.554|483.300|+316.746ms/+190.18%|nonpassing|
|N2400|pan|216.576|233.300|+16.724ms/+7.72%|no breach|

Original strict guard >10ms AND >10% unchanged. NegativeN2400zoomresult is retained. This finite5pairedactionseries establishes guardbreach, not proven causalregression or rootcause. No newgenerationtiming/gainclaimed; historical34.41%/36.15% remainsseparate. No secondoptimization/harnessrepair or newmeasurementsafterthiscollection.

BothfullqualitylargePNGpairs decoded sequentially, allRGBAbytes directlycompared in32rowstrips, dimensions18284×10780 and17508×12376. Exactdecodedbyteequality onboth; compressedfilehashes alsoequal pairwise. RGBAhashes+bytecounts in pixels-recomputed.json. PNGfiles/fullSVG in retained [artifact](https://github.com/YuriyEmelyanov/Hexcrawl/actions/runs/40388046863/artifacts/12684286700),162310969bytes, SHA256c729258618dd5251709b1417508229684bea8725c07a000bc0bedb7b147b5f04 downloaded/hashverified. All12artifactmanifestentries matched filesize/SHA256; raw/summary/environment/manifest copiedhere, restore-snapshot/fullimages remain inartifact withhashes. Nopixel/quality/scalechange. Prior missingPNGfinding nowhasnew evidence, closure belongsreviewer.

Rawerrors0, navigationeventerrors0. FourPNG requestfailedrecords are mc.yandex.ru/metrika/tag.js, analytics:true, uniformlyblocked asprospectiveprotocol; retained in recomputed.json, no otherrecordedrequest/pageerror. Five ownedbrowserprocesses spawned/exitsconfirmed. FullPNGevents/lifecycle retainedraw; decode/encode times areobservations, not claimedrootcause.

Environment beforemeasurement committed92b8629297c8fe696d95d34990bd48b40fce4344: EPYC9V74,4vCPU,16766414848RAM,Node24.21.0,Playwright1.62.1,Chromium151.0.7922.34,production1500×1000/DPR1 asprotocol. No mixing witholdrunner series. Existingarchivehashes retainedenvironment. Only currentapprovedworkflowattempt1, totalhistory3authorizedattempts retained(two prior0measuredactions); no automaticmeasuredrerun.

NormalCI40388056032:240/240check+TypeScript/build,browserpassed. OriginalRNGcancelled afterapproximately15minjob includinglonginstall; reasonnotconclusivelyestablished. Retried only cancellednormalRNGjobonce,121817945407, success. LatestnormalCIall3success. Logs oldfailure+retryretained; measuredworkflow notrerun. Source/tests unchanged duringcollection; structuredtestsummary0/0/0. FeedbackseedPR475 separate, auditHX-FB-002deferred.

Independentreview next: exact86100 includingnewsaveAs/downloadtransport, prospectiveprotocol/hashes/raw and priorfindings; recomputeguard/decodedpairs independently, assessRV1/RV2/RV4/RV5 and currentmodel1.2criterionevidence. Larger nativehistory/selection andAndroidlimits remain. Developerdoesnotawardpoints orclosefindings. No productscore/historychange, no mainmerge/publication. Actualautomationhealth recordedresult; samepersistedmanualclaim safelyresumed afterterminalexternalrun, not leaseexpiry.
