# PF2 App-v13 checkpoint

Exact77a6ce6; source tree627c94e5. Reads/guards follow README and region/RIV/ROAD rules; no generation algorithm/rules modified. Shared physical grid geometry is reused, including positive-area footprint protection. Actual App handler harness covers batch/save/import/UndoRedo and malformed live references.

Not complete: no PF2 page actions or feature renderer; MB/regional metadata protection incomplete; automatic new-territory filling, manual category override and dirty-exit replay pending. Geometry edits that invalidate a feature are conservatively refused before writes until the explicit loss workflow is implemented. This is safe refusal, not completed consent UX. New export-version notice and actualUI are part of next UI slice. Do not set review_ready or infer full source/game/score support.

Fixture diagnostics retained in test summary: first reader setup omitted existing readTextFile adapter; seed42 was correctly standard and gave no feature. Fixed seed0 provides outcome2 for nonempty snapshot acceptance; no random-search series or production bypass.
