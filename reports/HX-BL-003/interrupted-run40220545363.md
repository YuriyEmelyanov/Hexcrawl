# HX-BL-003 — interrupted P1 baseline series, 25 October 2026

Run: https://github.com/YuriyEmelyanov/Hexcrawl/actions/runs/40220545363
Harness: 4fc9f229e9b3329c74a37abe4514aebc6b008e8e; frozen environment: 19f119036d3e12b2ac04c63fb6a17bcc507356fc.
Job121250972089 cancelled after90min (18:17:38–19:47:55 UTC); profile series skipped.
Artifact12612465494: HX-BL-003-P1-timings, 51files, ZIP SHA2562110d0a146887f537d2e0b936c00f3966091f476231dcb04f906a4b6a249ce88.
Artifact upload success is confirmed by job log; archive not independently downloaded in this recovery.

48 completed row records recovered verbatim from P1_TIMING log lines and retained in interrupted-run40220545363.json. Six Mythic checkpoints have seven records each; classic has six (last warm repetition interrupted). All48 recorded output equality with frozen full JSON, including streams.20 completed records have selection locator errors,28 no row error; none completed all four selections. This is NOT a complete P1 baseline, trace evidence or acceptance.

Root cause in harness: selector polygon.hex.region,polygon.hex.center includes decorative SVG polygons without data-hex-key. Extracted null became a locator for data-hex-key="null", which waited180s. Uppercase TimeoutError was also missed by case-sensitive timeout classification. These errors are measurement defects, not product performance evidence. Source generator is unchanged.

Recovery before any product change: restrict targets to coordinate-bearing region/center polygons; validate coordinate syntax and deduplicate keys before choosing at most four visible cells. Missing targets remain explicit selection_complete=false (never synthesize targets). Selection locator timeout5s; case-insensitive timeout classification prevents repeating actions in unusable context. Preserve original48 records and rerun exact same seven checkpoints, seeds, frozen output and action order; new runner manifest committed before timing. Keep old and new runner series separate. No threshold/metric, product code, RNG, map image or user behavior changed.
Validation: node --check patched timing script; synthetic selector extraction checks valid/null/duplicate/malformed/invisible targets. CI rerun required. No optimization or score increase; diagnosis remains pending fixed full ordinary series and separate traces.
