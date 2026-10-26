# P1 export isolation after failed run40243424173

Original artifact12620008175 and all98 log rows retained in paired-run40243424173-recovery.json. Seven fullSVG pairs are byte-identical; five fullPNG pairs have identical decodedRGBA. Largest2PNG pairs timed out after180s in both baseline/candidate. Root cause of PNG failure remains unknown; do not claim product regression, memory cause or full visual acceptance.

Only1 warm target pair per seed completed generation before export timeout. Cannot evaluate5warm medians/4-of-5 wins.16 later actions were not executed, not additional180s generation timeouts. Raw historical records remain unchanged; classifier corrected only in new harness.

Bounded recovery reviewed: move PNG completely after latency collection; each visual export gets a new Chromium process (never2 live apps), imports the same frozen AFTER document and checks fullJSON before originalSVG/PNG export. No regenerated map, rescaling, image-quality compromise, newseeds or relaxed180s threshold. Same7AB/BA cold/warmup/5warm protocol reruns both versions on one new runner. All old/new series retained separately. Capture JS errors/dialogs/failed requests even on exception. Product source remains96a2a89, no second optimization.

If isolated fullPNG again fails, preserve explicit blocked_visual evidence, no further automatic PNG retries or out-of-scope product export fix. Timing success is not complete P1 acceptance. Exact96a2a89 check236/browser/RNG previously passed; independent review/score1.2 and release still pending. No score increase.
