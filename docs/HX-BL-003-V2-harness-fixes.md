# V2 harness corrections after independent review d713cb9

Scope: HX003-V2-R1/R2/R3, PR474. Product runtime (`src`, `public`, dependencies), map quality, performance thresholds, source A/B and frozen inputs are unchanged. No measured action, PNG export or Chromium launch was performed while developing these corrections. The used workflow allowance remains **1/1**; no new measured workflow is authorized by this commit.

- R1: resource preflight accepts the recorded Linux 4vCPU/approximately16GB class with the required Node24/Playwright/Chromium versions. Actual CPU model is still recorded, not matched to7763. The browser is launched locally, so A/B contexts share one host/process; older/newer runner series must stay separate.
- R2: a local Playwright BrowserServer now owns the browser process. Every action/context preparation and cleanup is externally bounded. On an external or native Playwright timeout, the package latches abort, calls BrowserServer.kill, observes the owned child process exit and preserves lifecycle evidence. It never starts another action after a timeout. Graceful disposal escalates to kill; unconfirmed exit is fatal and leaves remaining rows not_executed. A failed navigation row also stops the package, preserving partial raw. PNG rows continue only after confirmed disposal of the preceding process. This is a conservative stop policy, not a retry or altered timing threshold.
- R3: successful, finite24-frame warmup must occur exactly once before ordered measured iterations0–4 for each input/variant/phase. Missing/failed/late warmup or duplicate iterations makes completeness inconclusive while retaining all measured statistics. Pooled nearest-rank p95, strict >10% AND >10ms guard, five repetitions and raw rows stay unchanged.

Offline verification (no browser/benchmark):

```sh
node --test test/hx-bl-003-v2-harness.test.mjs
python scripts/hx-bl-003-v2-analyze.test.py
npm run check
```

The supervisor tests kill disposable **Node child processes**, not Chromium. They verify observed exit, escalation, fatal unconfirmed cleanup and prevention of subsequent work. Analyzer regression tests first reproduced five failures against d713cb9, then passed after the fix; successful synthetic data and the exact10ms boundary are controls. Actual hung-Chromium behavior remains for independent review/authorized future validation, not claimed by these tests.

The measurement workflow YAML and its trigger are deliberately untouched. The new supervisor and offline tests are hashed in `reports/HX-BL-003/v2-protocol-manifest.json`; its hash is already included by the existing environment-freeze workflow, providing a transitive record of the corrected helper. No workflow dispatch/rerun is performed. Ordinary repository CI may run automatically on a new PR head; its evidence is distinct from the capped measured V2 package.

Next: independent source/offline review of the new exact SHA, including process-disposal control flow and protocol completeness. Previous PNG/navigation/large-history limitations remain. No score increase, merge or publication is implied.
