# HX-BL-030 — developer evidence (in progress)

Spec 1.0, approval owner-approval-2026-10-24-HX-BL-030. Base main@6aaefa8896e7aac163cfcd5c2ca896ac60fc54d0. Product branch agent/HX-BL-030-rng, PR472.

Implemented explicit geography/poi streams, seed UI, v3 export/v2 migration and exact RNG snapshot restoration. Node24.22.1 local check on initial implementation passed 211/211, TypeScript and Vite build. Four seeds (0,1,123456789,4294967295) x classic/Mythic, 3 units, save/load and undo/repeat through real callbacks; fallback Math.random guard. Local Chromium unavailable; installation failed; browser checks require CI.

Negative evidence retained: baseline exports no generation (docs/evidence/HX-BL-030-baseline.txt); initial source inventory docs/evidence/HX-BL-030-random-inventory.txt describes f0d7453 before the browser fix, not final source. CI40116800788 and CI40116986721 found browser continuation mismatch. Second run proved a loaded checkpoint consumed exactly one extra geography draw. Source audit isolated the animated click hint useEffect/setInterval; it had accidentally received the geography stream. Fixed at 19ba446858110747ac42d62a7c8b3fcb6e2a1375 using stable presentation hash, with a real 5.5s browser wait covering the 5s interval. CI40117220460 pending.

Older seed-specific regression paths rebased without removing assertions: coastalRetries seed2 action11 (3 incompatible coastal attempts before success); river source-lake seed0; counter-overflow continuation seed0. Synthetic river fixture cleared stale POI-kind keys after clearing POI list. Targeted six regressions passed; old invalid fixtures not silently accepted by product.

All score changes are forecasts only: S02-C01 G0/0 -> expected G1/7.5; other criteria score-neutral regression checks. Score_assessment belongs to independent reviewer. No merge/deployment authorization requested or inferred. No product points changed. Not review_ready until browser CI passes on the final SHA.
