# Knave classic: detached data checkpoint

Approved contract: agent-operations/agent-work/specs/HX-BL-043-KNAVE2-CLASSIC1.md KNC-1.0.

This checkpoint implements only detached profile/annotation contracts in
`src/knaveClassic.ts`. It does not change the running app or export version.
App v10 persistence/history, generation/content mapping, existing editor gates,
UI and source package integration remain required before review_ready.

Before adding tests, existing `test/tags.test.mjs`, save/editor harnesses and
`src/tags/engine.ts` were inspected. Existing MB tests validate tag tuples and
MB payloads; they cannot catch an unknown physical profile, missing Knave
secret clue or a coordinate flag following a relocated POI. Four independent
cases are added to the existing suite, with no duplicate RNG/UI tests:

1. KNC-A02/A09: known six-mile profile, no legacy/MB auto-upgrade, malformed
   profile/owner rejection. Protects import without changing accepted data.
2. KNC-A06: sparse tri-state difficulty, submerged flag preservation, no-op
   identity and detached changes. Protects geography-independent annotation.
3. KNC-A07: mandatory separate clue, text limit, preserved clue after mode
   change and rejection without mutation. Protects authored secret material.
4. KNC-A08: remapping only POI metadata, collisions/dangling refusal and explicit
   candidate loss list. Protects existing E7/E8/water integration boundaries.

No source book is reread or embedded at this checkpoint. No score increase,
generation/visual acceptance or complete v10 compatibility is claimed.
