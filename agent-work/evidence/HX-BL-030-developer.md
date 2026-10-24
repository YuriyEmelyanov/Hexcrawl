# HX-BL-030 — developer evidence

24.10.2026. Status: review_ready, not independently accepted. Spec 1.0; approval owner-approval-2026-10-24-HX-BL-030. Base main@6aaefa8896e7aac163cfcd5c2ca896ac60fc54d0; head ffb5e85311420b14fe509819ec26b420606ce0dd; PR https://github.com/YuriyEmelyanov/Hexcrawl/pull/472 .

## Result
Explicit geography/poi streams, deterministic seed UI, v3 export/v2 migration and exact RNG snapshots for load, undo/redo, rollback, regenerate and multi-step Mythic. Rendering/names and animated click hint do not advance world streams. RIV/ROAD and Mythic quotas unchanged. Older v2 maps are preserved; v3 requires a new client; historical Math.random sequence cannot be reconstructed.

## Exact package
CI https://github.com/YuriyEmelyanov/Hexcrawl/actions/runs/40117916104 — all three jobs success: check 120943005151, browser 120943005106, world-random 120943004932. Head tree and synthetic merge 7e52db5fe82e42e18f3d3de6b5c428bb764c2be3 tree both 7d902225c0e911d56434d553f29444026c92052e. Local tracked tree compared equal. Main remained 6aaefa8896e7aac163cfcd5c2ca896ac60fc54d0. PR ready for review, no merge/deployment performed.

## Validation
Node24.22.1 local and Node24.21.0 CI: npm run check, 211/211 tests, TypeScript, Vite build. CI Chromium 151.0.7922.34: npm run test:browser and test:browser:rng both success. Local Chromium absent and installation failed; no claim of local browser acceptance. CI validates the production build.

| Spec group | Evidence and result |
|---|---|
| AC-01 | Independent Python uint32 vectors seeds0/1/max, 10 draws per stream, clone/restore/interleaving, worldRandom.test; pass |
| AC-02/03 | Four seeds0/1/123456789/max, classic/Mythic, 3 consecutive units, fresh contexts and save/load next action; full JSON except savedAt compared in harness and production UI; pass |
| AC-04 | Undo/repeat in all profiles; regenerate, redo and delete checkpoints in classic/Mythic; mixed UI manual layers and 100 undo/redo; pass |
| AC-05 | Pre-options exception, failure after consumption, late kingdom exception and real browser transaction-copy failure; complete document/history restoration; pass |
| AC-06 | Runtime fallback Math.random guard, repeated renders, POI stream isolation vectors, 5.5s UI wait covering 5s hint interval; existing SVG/Emoji/Color/rotation/PNG scenarios; pass within bounded scenarios |
| AC-07/08 | Full previous v2 corpus including legacy optional fields, migration and roundtrip; malformed RNG/unknown versions, zero/max, no mutation or lost redo on failure; pass |
| AC-09 | Existing delayed import/serialization and 100-history UI suite, duplicate pending callback guard and multi-step kingdom; pass |
| AC-10 | Diagnostic before/after snapshots and source options, replay/continuation cases, default/detailed logging parity and failures; existing diagnostics tests plus RNG cases pass; no dashboard or arbitrary-version replay claimed |
| AC-11 | 211 tests, types/build, all old browser scenarios plus new production UI job; all required jobs pass on exact tree |

Corpus manifest: test/fixtures/rng-v3/manifest.json, preserving previous corpus and hashes. New v3 empty/classic fixtures from actual handler seed0; Mythic v3 fixture migrated from historical v2 via actual import (not misrepresented as a fresh world).

## Negative evidence and corrections
Baseline exports no generation: docs/evidence/HX-BL-030-baseline.txt. Initial random inventory in docs/evidence describes f0d7453 before browser fix, not final source. CI40116800788 and CI40116986721 exposed continuation mismatch: import consumed exactly one extra geography draw. Root cause: animated click-hint useEffect/setInterval mistakenly used world RNG. Fixed at 19ba446858110747ac42d62a7c8b3fcb6e2a1375 using independent stable hash; new wait regression and final CI pass.

Old seed-specific cases rebased without dropping assertions: coastalRetries seed2 action11 (3 incompatible coastal attempts before success); river source-lake seed0; counter allocation seed0. Browser counter scenario explicitly selects locality and anchor2,0. Synthetic river fixture cleared stale POI-kind keys after clearing POI list. Browser failure injection uses transaction cloning rather than obsolete Math.random. Previous failed CI kept in GitHub; final CI success above.

## Score and handoff
Model1.1, S02-C01 current G0/0, expected G1/7.5 (+7.5), forecast only. Other affected criteria score-neutral regression checks, no double counting for saves/undo. Confirmed product score stays186.25/1000. Independent reviewer must verify this SHA/spec1.0 and record score_assessment before any release request. Finite scenarios do not prove absence of all errors, 10,000/100,000 worlds or user-confirmed readiness; protected arbitrary local reroll and external comparison remain outside scope.

Next: independent reviewer with fresh context. Changed SHA requires new review. Owner decisions now: none; publication still requires separate approval of the accepted exact package.
