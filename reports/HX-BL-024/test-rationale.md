# Test-change rationale — HX-BL-024

Base: 02c2fd5fcbdb2042f2708709ce4f20dfd7354787. Requirements: approved spec1.0 DATA-03/04, HIST-01–06, UI-01–06.

Existing saveSafety cases reject generic structural errors, but did not exercise the new notes field. Add seven distinct parameterized malformed inputs (null/array/scalar container, non-string value, noncanonical key, orphan, prototype key) and one supported-format/text/RNG contract. Existing mapTransactions full-history tests cover all other manual families; add three notes-specific cases (draft/save/no-op/clear/history, replacing import/legacy/failure, latest surviving notes/destructive confirmation/generation-loss rollback). Reuse the same production handlers and full-document comparisons; do not add another generic 100-history corpus. Eleven added Node cases, zero removed, two existing Node cases modified (current export version and expanded invalid-RNG matrix); harness exposure is instrumentation, not a test case.

Extend the existing real-React save/history smoke with two bounded notes scenarios: a water-only document at a negative coordinate and the real editor lifecycle, including RU/EN, narrow display, dirty navigation blocking, exact history, JSON and busy import. Extend the existing RNG rejection matrix with format4: 30 added format4 malformed inputs per mode (60 total); count these matrix subcases separately from Node and from whole browser smoke scripts. The existing Node malformed matrix likewise gains 30 format4 subcases within its modified case. No duplicate general benchmark or audit suite.

Arithmetic/runner counts, exact head and actual results are recorded in the operational handoff. Screenshots are evidence, not test cases. The reviewer must independently assess usefulness and sensitivity; counts do not establish coverage completeness.

UI-05 reproduction found during temporary real-browser diagnosis: the old information-panel wrapper required a region, hiding the new editor on a valid sea-only document. Expand the existing wrapper condition to actual terrain, and keep the water-only regression within the existing browser save/history runner. This is not covered by a land map with a water POI.

## F1 correction, base b586051
HIST-05 requires a visible actionable refusal, not merely a diagnostic string or correct rollback. Existing production-handler loss checks and the real editor/history scenario already cover state; extend that same real-React lifecycle with seed42 region→locality, visible count/coordinates and recovery advice in RU/EN plus exact before/after. This modifies one existing browser scenario group, adds no standalone runner/case or second history corpus. A dedicated notes-conflict type/structured key list keeps arbitrary programming-error text out of UI.


UIv2 owner correction: extend the existing notes transaction case and real React editor lifecycle, replacing obsolete Save/Cancel/dirty-block assertions. Risks: loss of last input on immediate navigation/export, per-character undo growth, no-op destroying redo, IME splitting groups, stale input crossing imported worlds. Reuse current notes/RNG/malformed and existing full100-operation corpus; no new runner or duplicate corpus.
