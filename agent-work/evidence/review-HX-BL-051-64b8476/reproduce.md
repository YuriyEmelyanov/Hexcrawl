# Exact64 central discovery reproduction

Check out64b8476ff7f19e61e24b8b939663d90c1f2b37ec in /tmp/hx-independent64-1600, use Node24 and existing project dependencies. Place the recorded script at /tmp/hx-review-64-1600-output/central-discovery-probe.mjs and create that output directory. Run:

node /tmp/hx-review-64-1600-output/central-discovery-probe.mjs

Script uses existing actualApp generation harness and valid regionFixture. No browser navigation. Its passing assertions reproduce eight incorrect central auto outputs and eight controls across16observations; they are temporary diagnostic observations, not permanent producttests. Paths are the exact worktree/output paths used in the two reproductions; adapt imports/output consistently if relocating. Raw JSON/log are retained.

Current approved implementation spec: agent-work/specs/HX-BL-044-CLASSIFY1-implementation.md. Old analysis.md developer_ready=false is historical, superseded by direct owner approval/IMPL2. Newfix requires currentSHA evidence and independent review. Do not change source just to match this negative diagnostic expectation; after the fix replace negative assertions with contract-positive checks in an appropriate existing regression.
