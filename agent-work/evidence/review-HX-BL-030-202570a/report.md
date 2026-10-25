# HX-BL-030 — независимая проверка

SHA `202570a4b97beb2090225ef4e485b00a43c34fb5`, tree `f2fc6c9a6519e63eb94b5bd30699146b733191ac`, base `6aaefa8896e7aac163cfcd5c2ca896ac60fc54d0`. PR472, spec1.0. Отдельный fresh reviewer, detached worktree; исходники и GitHub не изменялись.

**Вердикт: accepted.** Техническая готовность: True. Разрешение merge/release отсутствует. Опубликованная оценка186.25/1000 и unverified70 сохранены.

## Результат

Новых воспроизведённых дефектов в утверждённых границах не обнаружено. R1–R5 перепроверены на текущем exact SHA. R5: независимый новый script выполнил11 сценариев для classic/Mythic seed0 locality. Сравниваются полные JSON кроме savedAt, оба RNG, generation checkpoints, undo/redo, pending/job; A→B→oldA, oldA после undo с redo и после redo, oldA при новом pending и активном Mythic job. Все сравнения равны; snapshots сохранены.

WeakSet consumedRegenerations хранит все потреблённые объекты заявки в App. Guard ревизии отсекает устаревший render. Оба условия проверяются до запуска job, RNG и чтения backup. R1 classic duplicate/undo, R2 hidden-classic draw/checkpoint, R3 поздний Mythic regenerate failure/action/categories и R4 oldjob tick после нового тика также проходят независимый повтор.

## Проверки

- Frozen `npm run check`, Node24.22.1: pass; см.check.log. Старый прерванный частичный log недоступен после ошибки сохранения пути; он не используется как evidence.
- `r5-independent.mjs`: exit0,11/11. `r1-r4-independent.mjs`: exit0.
- `audit.py`: независимая Python uint32 реализация,60 vector values для seed0/1/max;50unique criteria/1000, коэффициенты и текущая сумма;19 manifest SHA256 проверены отдельно.
- CI40164382105: все3jobs success; root заново получил API/logs. Checkout5dcec832 имеет точное дерево head f2fc6c9...; прочитаны полные ci-check.log,ci-browser.log,ci-world-random.log и source тестов. CI236/236,0fail.
- Local browser: executable Chromium отсутствует (local-browser.log). Локальный browser acceptance не заявляется; новый Chromium не устанавливался. Browser основание — root-verified exact-tree CI; версия151.0.7922.34.

## Приёмочная матрица

| AC | Результат | Основание и метод |
|---|---|---|
| AC-01 | pass_bounded | Independent Python uint32 implementation matched all 60 stored vector values (seeds0/1/max ×10 ×2); Node vectors also clone/serialize/restore and stream isolation. Evidence: audit.py, audit.log, check.log. |
| AC-02 | pass_bounded | Root freshly retrieved CI browser logs; 2 fresh production contexts, 3 units, 8 seed/mode profiles; full JSON except savedAt. Reviewed exact browser test source. Evidence: ci-world-random.log, root-ci-verification.md. |
| AC-03 | pass_bounded | Production handler continuation tests and exact-tree CI UI A/B/export/import/C equality include full map, names, counters, UI and RNG. Evidence: check.log, ci-world-random.log. |
| AC-04 | pass_bounded | Mixed manual POI/biome/registry names, regenerate/delete checkpoint, exact undo/redo and sequential regeneration covered; independently reran R1/R2 and R5 snapshots. Evidence: r1-r4.log, r5.log, check.log, ci-browser.log. |
| AC-05 | pass_bounded | Both-stream failure, constraint rejection, prepare-regenerate, tract fallback and late Mythic failure rollback; R3 independent replay preserved original regenerate action and categories. Evidence: r1-r4.log, check.log. |
| AC-06 | pass_bounded | Source audit explicit stream plumbing and runtime Math.random guard; independent vectors; display/navigation/PNG/JSON isolation followed by full next-world equality in exact-tree browser CI; name registry restoration at handler boundary. Evidence: random-audit.txt, audit.log, check.log, ci-world-random.log. |
| AC-07 | pass_bounded | All19 manifest entries hash verified; v2/v3 manifests import/roundtrip and subsequent action in both modes; initial/advanced states and seed boundaries covered. Evidence: audit.log, check.log, ci-browser.log, ci-world-random.log. |
| AC-08 | pass_bounded | Malformed RNG classes/v2 known generation/future versions on nonempty map with redo; invalid seed and file cancel preserve state. Evidence: check.log, ci-world-random.log. |
| AC-09 | pass_bounded | Independent new R5 11-case reproduction includes oldA during new pending/job and after undo/redo; R1/R4 rerun. Exact-tree browser covers physical double-click, effects, busy export, delayed import. Evidence: r5-results.json, snapshots.zip, snapshots-manifest.json, r1-r4.log, ci-world-random.log. |
| AC-10 | pass_bounded | Node acceptance replays original JSON+recorded actions, including documented regenerate session prefix and failures; detached inputs/events. Independent R3 verifies late failure context. Evidence: check.log, r1-r4.log. |
| AC-11 | pass_bounded | Node24 frozen check types/unit/build and exact-tree mandatory3-job CI; prior import/100-history/sea-recovery/Mythic browser suites; explicit source inventory and runtime guard. Evidence: check.log, ci-check.log, ci-browser.log, ci-world-random.log, root-ci-verification.md. |

## Score assessment1.1

| criterion_id | До | После | Delta | Отдельное evidence и пределы |
|---|---|---|---:|---|
| S02-C01 | G0/0 | G1/7.5 | 7.5 | audit.log, check.log, r1-r4.log, r5-results.json, ci-world-random.log, random-audit.txt. Bounded working prototype of master seed, streams, continuation and undo. Protected independent-object local reroll is not implemented; no full G4 or broad all-seed proof. G1 is supported by actual observed behavior, not the spec forecast. |
| S02-C03 | G1/5 | G1/5 | 0 | check.log, ci-browser.log. v2/v3 compatibility is required regression preservation here; no additional migration score awarded. |
| S03-C05 | G2/10 | G2/10 | 0 | check.log, r1-r4.log, r5-results.json, ci-browser.log. Existing mixed100-history behavior retained; no named versions, broader all-edit completeness or new separate gain. |
| S04-C04 | G2/7.5 | G2/7.5 | 0.0 | check.log, ci-browser.log, ci-world-random.log. Full corpus JSON roundtrip retained; RNG reproducibility counted only under S02-C01; no new export/format breadth credit. |
| S09-C04 | G2/5 | G2/5 | 0 | check.log, r1-r4.log, r5-results.json, ci-world-random.log. Atomic import/rollback/stale callback safety retained; same undo/import work not counted twice. |

S02-C01 G1 основан на фактически работающем ограниченном наборе, а не на прогнозе спецификации. Метод для каждой строки: independent exact-SHA source/handler review, frozen Node checks и root-verified exact-tree browser CI. Общий потенциальный прирост+7.5 применим лишь после отдельно разрешённого выпуска этого пакета и последующего пересчёта стратегом. G2/G3/G4 для S02-C01 не заявляются. Прежняя безопасность импорта/undo не начислена повторно по смежным четырём критериям; веса и модель не менялись, PR473/model1.2 исключён.

## Границы

- Finite fixed-seed/corpus scenarios do not prove all seeds or 10000/100000 runs.
- Local Chromium absent; direct launch failed. No download/reinstall attempted. Browser conclusions rely on root freshly verified GitHub job logs and exact head-tree equivalence, not a local browser execution.
- Generation harness retains production handlers/algorithms but substitutes React hook storage and final JSX; it does not execute real React effects/DOM. CI covers that boundary.
- Names editable via registry/model only; no text naming UI claimed.
- Regenerate replay recreates session prefix/checkpoint. Session history is intentionally not exported (TX-04).
- Mythic lake-reentry/sea-pocket fixtures may deterministically reject with full rollback; successful generation for every input is not required.
- Protected local reroll, broader game coverage, user validation and competitive leadership are outside this task. OSE/PF2Hexploration/Shadowdark/ForbiddenLands are contextual targets; top5/10/20 undefined. Model1.2 PR473 excluded.
- Previous interrupted partial check.log was overwritten due a relative-path preservation error; it is unavailable and is not counted as completed evidence. Only fresh full check may be accepted.
- Fresh frozen check completed exit0, but stored check.log lost its final tail after pathname inode replacement during execution (new birth07:10:37). check-completion.json records tool completion and dist evidence; full count236 is independently available in CI. Replacement actor/cause not established.

## Automation health

{
  "automation_id": "6ad9c2426c7481919bb9f3d2b289e9b9",
  "start": {
    "checked_at": "2026-10-25T07:05:16Z",
    "is_enabled": true,
    "status": "checked",
    "error": null,
    "note": "Initial peek at resumed start also true; this timestamp is an explicit timed reaffirmation."
  },
  "end": {
    "checked_at": "2026-10-25T07:13:07Z",
    "is_enabled": true,
    "status": "checked",
    "error": null
  },
  "restored_during_this_run": false,
  "errors": []
}

Следующий шаг: Root saves exact-SHA accepted review/evidence and updates own claim/latest. Then await separate owner authorization to merge/release202570a; published score remains186.25 until an authorized release and strategist update.
