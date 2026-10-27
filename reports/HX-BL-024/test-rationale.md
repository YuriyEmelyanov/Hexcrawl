# Test-change rationale — HX-BL-024

Base: 02c2fd5fcbdb2042f2708709ce4f20dfd7354787. Requirements: approved spec1.0 DATA-03/04, HIST-01–06, UI-01–06.

Existing saveSafety cases reject generic structural errors, but did not exercise the new notes field. Add seven distinct parameterized malformed inputs (null/array/scalar container, non-string value, noncanonical key, orphan, prototype key) and one supported-format/text/RNG contract. Existing mapTransactions full-history tests cover all other manual families; add three notes-specific cases (draft/save/no-op/clear/history, replacing import/legacy/failure, latest surviving notes/destructive confirmation/generation-loss rollback). Reuse the same production handlers and full-document comparisons; do not add another generic 100-history corpus. Eleven added Node cases, zero removed, two existing Node cases modified (current export version and expanded invalid-RNG matrix); harness exposure is instrumentation, not a test case.

Extend the existing real-React save/history smoke with one bounded notes editor lifecycle, including RU/EN, narrow display, dirty navigation blocking, exact history, JSON and busy import. Extend the existing RNG rejection matrix with format4: 30 added format4 malformed inputs per mode (60 total); count these matrix subcases separately from Node and from whole browser smoke scripts. The existing Node malformed matrix likewise gains 30 format4 subcases within its modified case. No duplicate general benchmark or audit suite.

Arithmetic/runner counts, exact head and actual results are recorded in the operational handoff. Screenshots are evidence, not test cases. The reviewer must independently assess usefulness and sensitivity; counts do not establish coverage completeness.
