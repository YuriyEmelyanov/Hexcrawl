# E4 persistence: legacy adjacency contradiction

Exact source SHA: 1bd3d973e11001d18f91718ee9c8b98bbfbf3758. Temporary diagnostic, not a permanent suite change.

`baseline-mythic.json` is changed only at `obstacles[0].neighborHex`, replacing it with its own `hex`. The existing validator accepts it. The actual App import accepts it without alerts, the v4 export preserves it, and `migrateLegacyObstacles` preserves it with axial distance 0. E4-1.0 requires unchanged legacy geometry and unconditional v5 adjacency, but exports always v5. Both requirements cannot hold for this input.

This confirms historical validation permissiveness plus a specification contradiction, not an E4 regression or a completed v5 data-loss bug. No prevalence claim is made. Ordinary legacy fixtures do not cover the complete historical acceptance set.

Reproduce from the exact source checkout after `npm ci --ignore-scripts`: copy `probe-legacy-obstacle.mjs` to repository root, create `/workspace/i4-evidence`, run `node probe-legacy-obstacle.mjs` on Node24. It mutates an in-memory fixture only. See reproduction.json for observed output.

Next: bounded analyst correction of migration/AC05, then developer integration in PR481. No silent rejection, repair, dropping or weakened v5 rule selected by this developer run. Main and product branch unchanged.
