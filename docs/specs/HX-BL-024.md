# HX-BL-024 — GM notes

Implementation contract: [approved operational specification 1.0](https://github.com/YuriyEmelyanov/Hexcrawl/blob/agent-operations/agent-work/specs/HX-BL-024.md). Start approved; publication requires separate owner approval of the independently reviewed SHA.

- One plain-text note for an actual land/water hex. Explicit Save/Cancel; each save is one shared undo transaction. Drafts block document commands and exports; panning and zoom remain available.
- `map.gmNotesByHexKey` uses canonical axial keys. Export schema version 4; read versions 2/3/4. Missing notes means empty, malformed/orphan notes reject the whole import. A successful import replaces the whole notes layer.
- Notes never enter SVG/PNG or RNG. They are included in the full JSON, which is not a player-safe export.
- Delete/reset confirm removal of nonempty notes, retain the latest surviving notes, and are reversible. Generation that would lose a noted hex rejects the entire action and restores its backup.
- Memory-only drafts and the current document are not disk/cloud autosave. Export JSON for persistence between sessions.

Score 1.2 evidence is handed to independent review for S05-C01, S03-C05, S04-C04, S09-C04 and S02-C01; previous and expected grades/deltas remain unknown. A textarea does not prove full structured content or game-specific top-5/10/20 coverage. Tactical VTT, player sharing, module import, AI text, and test cleanup are outside this task.
