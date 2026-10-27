# HX-BL-003 — baseline completed and one bottleneck identified

Run40228996488 completed successfully. Ordinary49rows and separate profiling12rows, no row errors; all61 fullJSON comparisons match frozen expected outputs. Original failures remain preserved. Ordinary49 outcomes and small-sample stats: baseline-timing-results.json. Trace gate and proposed single fix: diagnosis.json. No optimization gain claimed.

Warm median generation at nominalN2400: seed0 91488.2ms; seed123456789100158.4ms. Warm median end-to-end96808.4ms/105554.4ms. Times apply to one4-vCPU headless CI runner, not all devices. Profile rows are excluded from these numbers. Four large-map selection groups have no eligible visible targets at fixed viewport: selection coverage remains incomplete, despite CI success.

One repeated diagnostic helper getVertexUsageByKeyForRegion consumes22.86–24.77% of generation wall time in self CPU samples across5/5 large warm traces. App computes the all-region diagnostic map while debug is closed. Only selectedRedVertexUsage diagnostic output consumes that map. Commit this diagnosis before changing product code. Proposed single memo guard preserves open-debug computation and invalidates on toggle; no map/rules/RNG change.

Primary artifact12614280053 SHA25605c19d0ee53556324fa7400ab01bc2e93a43fe84ee9438eab73a2ed27661838c; profiling12613429909 SHA256c6a456498d56690108ac4722cbd0004bc60c865374ca94745188e209cc422401. Profiling archive downloaded and hash verified; all10 traces analyzed in fixed t0–t1 windows; raw trace retained in GitHub artifact. Main/pre-optimization product unchanged at diagnosis.
