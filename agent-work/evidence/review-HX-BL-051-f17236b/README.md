# Independent exact-SHA review: HX-BL-051 / f17236b

Combined DETAIL1 + integrated CLASSIFY1; reviewed head `f17236b90592b92a8f553678eaf81de3f34b340e`, tree `1b897fadd15b501a2d4b783be6d69d9c54cc5f46`, combined base `1962fb9a835a9c310e55c1a09415fe180f22cca9`.

Both previous P2 findings are closed only on this SHA. Whole-package acceptance remains incomplete due bounded required UI/export evidence. Count styling serialization omission is low severity; raster readability impact unverified. No publication permitted.

`independent-review.json` is the unchanged fresh-context agent report. Its original `/tmp/r2-*` references map to the same basename without the `r2-` prefix in this evidence folder. The root result and score assessment use repository paths.

Reproduce on a detached checkout of the exact head with installed repository dependencies. Run `node --test test/detail*.test.mjs test/classification.test.mjs test/saveSafety.test.mjs test/regionEditing.test.mjs`. Diagnostic scripts are temporary reviewer tools, not additions to the permanent suite. They retain execution-host paths `/tmp/hx-rereview-f172` (exact checkout) and `/workspace/scratch/50f278832674/hexcrawl/node_modules` (dependencies); adjust only these local path constants for another host. `independent-diagnostic.mjs` imports the existing real application generation harness and region fixture. `export-style.mjs` extracts the actual unchanged export helper and stylesheet using TypeScript AST and invokes a minimal detached SVG DOM stub; it does not run a browser or rasterize PNG. Read its explicit limitation.

Exact-SHA CI run42797910390 and jobs check/browser/world-random were independently read through GitHub and succeeded. Their original logs/screenshots remain under `agent-work/evidence/HX-BL-051-review-fixes-0957/`; existing CI artifacts do not substitute for a fresh independent UI run. This root's cloud browser navigation was explicitly denied by Browser security policy URL gate; no workaround was used. No new required browser proof is claimed by this run.

Node targeted74/74; CI386 is an overlapping/full different scope and is not added to74. Browser/RNG and temporary probes remain separate. Reviewer tracked source/test diff is empty. Incoming patch uses six modified Node callbacks and one modified browser workflow with distinct units; necessity assessment is in the report.

Nine model1.2 whole-criterion grades remain unknown/insufficient_evidence, not G0. No score current/history update or numeric award. Historic RIV011 unknown persists. Bounded programmer continuation: `agent-work/handoffs/2026-11-10-HX-BL-051-bounded-ui-export.json`.
