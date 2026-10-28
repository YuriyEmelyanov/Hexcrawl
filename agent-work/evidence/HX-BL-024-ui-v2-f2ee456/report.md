# HX-BL-024 UIv2 — developer evidence

Exact head f2ee456d42d0b4fb49c533d6bed89f5a2ea23d49, tree 2053bb2917202879843984dc48ba1cbc290ed1d7; amendment base e01dcbf577558200493323f408ec2285ef4d3947, product base02c2fd5fcbdb2042f2708709ce4f20dfd7354787. Local selected-file index tree matches remote tree exactly. PR476, spec1.1, approved owner UI correction28.10 / HX-FB-003. No main merge/publication.

## Behavior

No note: only Add note. Existing text: plain read button, opens with heading/text. Open textarea uses current panel colors/typography, shows a compact Saved check. No JSON caption/Save/Cancel/unsaved-draft gate. Every input synchronously changes notes document data; no pending delayed write, therefore no artificial Saving spinner. Current-document saving is not disk/cloud persistence: JSON export remains needed between sessions.

One note input series stores one detached before/after transaction in shared history and replaces its after while typing. Pause500ms, blur/close/another document action closes group. A net-zero series restores previous redo branch; future updates cannot flush into another/imported world. IME retains group across intermediate input. Per-render revision/busy/selected-key guards remain. No geographic/RNG/save-schema changes. Existing notes-loss conflict remains localized/atomic.

## Validation

Node24.22.1 npm run check:247executed/247passed/0failed/0skipped; TypeScript and build pass. Fresh real React save-history script passed Chromium153.0.8010.0: existing full corpus/100mixed histories/classic-Mythic plus amended UI groups. New scenarios cover immediate lasttext selection/export, empty open-close, no-op redo, 500ms groups, IME, busy/RUEN390px and prior natural19coordinate conflict. Temporary screenshot script separate from permanent suite. Required full browser and world-random remote evidence on exacthead: CI40662021153 (see ci-jobs.json; final status in canonical result).

An initial tsc command used a nonexistent tsconfig.build.json; corrected to project's npmruncheck/tsc--noEmit, passed. No assertion failures in corrected product checks. Common chunk-size build warning retained, not a new runtime failure. Local browser fonts lack some emoji; plain-text sample used in cropped actual previews.

## Test changes

Relativee01→newhead: Node+0/−0/modified2 existing logical cases; browser save-history+0/−0/modified2 bounded groups (water-only/editor), existing F1 nested subpath adapted. One script remains, no extra100history/corpus or benchmark. Harness only exposes new production callbacks and provides standard timers. Replaced obsolete dirty-blocked/manualSave assertions; test-rationale written before implementation. See test-change-summary.json and exact diff.

## UI

Actual new production build, not mockup: [empty](empty-desktop.png), [read](read-desktop.png), [desktop editor](editor-desktop.png), [390px editor](editor-narrow.png). Empty and390px editor presented to owner in current run. Prior actual UI: agent-work/evidence/HX-BL-024-F1-e01dcbf/ui-manifest.json. ui-manifest.json binds exactSHA/tree and limits.

## Score evidence1.2

Before/after/delta remain unknown, not confirmed by programmer. S05-C01: less costly manual contribution, no full contextual card. S03-C05: series/no-op/undo tests; named versions not added. S04-C04: full existing JSON corpus/notes compatibility. S09-C04: busy/stale/current-document grouping and prior atomic import/notes-loss protection. S02-C01: existing RNG invariants/fullCI; no algorithm changes. No top5/10/20 or module-combination completeness claim. Fresh independent assessment required on newSHA.

## Next

Independent fresh reviewer accepts or returns concrete findings under spec1.1 on exacthead, including test necessity and score_assessment1.2. Previous e01/spec1.0 acceptance is historical. Owner release permission absent. HX-BL-027 remains explicitly deferred; analytics discussion is not authorization to install telemetry/paid services.
