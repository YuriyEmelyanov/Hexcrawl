# HX-BL-003-V2 — результат разработчика26.10.2026

Статус: blocked_preflight / ready_for_limited_independent_review. Это отрицательный результат подготовки, не результат performance-замера и не приёмка продукта.
PR [№474](https://github.com/YuriyEmelyanov/Hexcrawl/pull/474); head d713cb9d11c0cd00bfda1eaf13a7489f58e48634.
A baseline103d31b9f6f5c76b1f6b45d9d6664fe3f75dd63b; B frozen product739e3de36587533bf3d2f3196072270f4695fa8a.
Spec1.1/[P1-V2](../../specs/HX-BL-003-P1-V2.md), immutable addendum commit1421459bd428d42f78bfe8776b55c8bd5d862c1d; owner-approval-2026-10-26-HX-BL-003-V2.

## Что сделано и что фактически произошло

Добавлены только отдельные V2 navigation/PNG диагностические скрипты, вычислитель статистики, workflow и заранее зафиксированный protocol manifest. Production src/public/package.json/package-lock совпадают с739e3de; подтверждён local git diff (runtime-tree-audit.log) и CI runtime parity. Алгоритмы, карта, экспортное качество/масштаб и интерфейс не менялись; seed PR475 не включён. Не было новой генерации.

В [единственном V2 run40298230168](https://github.com/YuriyEmelyanov/Hexcrawl/actions/runs/40298230168), job121489428120, attempt1, npm/Chromium install, download артефакта, проверка хэшей всех42 baseline outputs, сборки обеих production версий и запись actual environment прошли. Сам validation step завершился exit1 ДО старта измерения: assert /AMD EPYC 7763/ не принял фактически выданный CPU AMD EPYC9V74.

| Параметр | Фактическое значение |
|---|---|
|CPU|AMD EPYC9V74 80-Core Processor|
|vCPU/RAM|4 /16766414848 bytes|
|OS/image|Linux6.17.0-1022-azure /20261023.334.3|
|Node/Playwright|v24.21.0 /1.62.1|
|Chromium|151.0.7922.34|
|runner|GitHub Actions1000001135|
|lockSHA256|6b7a348067a218afce320ca370bee8cd323eff14fbdf9a24fbbfc5e3deedcee7|

Фактические4vCPU, RAM и browser совпали с прежним paired resource profile, CPU model отличается. Требование точного CPU model — консервативная реализация guard разработчиком по формулировке «тот же профиль / recorded7763». Это НЕ доказывает дефект продукта, регрессию либо непригодность другого4vCPU/16GB runner для paired A/B. Независимой проверке передана явная неоднозначность: относится ли same resource profile к точной модели CPU или к классу ресурсов при A/B на одном новом host. По уже утверждённым границам требуется технически разрешить это расхождение ДО нового прогона; повторного продуктового утверждения сама задача не требует.

Raw measurement_started=false; все24navigation rows (4warmups+20measured) not_executed; все4PNG rows not_executed/attempted=false. Счётчики:0measured,0warmup,0PNGclick. Из отсутствия строк нельзя получить timings, guard pass или новую причину прежних PNG timeout. Синтетические проверки агрегатора — не реальные измерения.

Workflow limit1 attempt учтён отдельно от0actual actions. После этого результата job не перезапускался, новый workflow не создавался и source SHA не менялся. Остановка текущего bounded пакета записана, бесконечного цикла нет. Это не полная техническая блокировка команды: PR475 review_ready и независимая проверка evidence доступны; автоматизация остаётся включённой.

## Точные версии, доказательства и артефакт

Environment ДО measurement сохранён отдельным evidence commit [5d3b1ed57f23d83e7546743a2035696e61cd78b6](https://github.com/YuriyEmelyanov/Hexcrawl/commit/5d3b1ed57f23d83e7546743a2035696e61cd78b6), ветка agent/hx-bl-003-v2-environment-40298230168. PR source head осталсяd713cb9, чтобы normal CI относился к нему. Env содержит SHA256 всех harness files, runtime tree37539a2a4df68f5a8bcf04b2eee4281ac2f08a8d, source input artifact12602421349/run40200788539, его server-reported archive digest и фактические версии.

V2 artifact [12639668025](https://github.com/YuriyEmelyanov/Hexcrawl/actions/runs/40298230168/artifacts/12639668025),3669bytes, SHA256571b6212ae1a9f97630ead3b94cf72d588cc4be1b0ede28d7529ff770bea38e4. Скачан, локальный SHA256 совпал. Raw/summary/environment/artifacts-manifest скопированы без изменений в этот каталог; summary помечает все4navigation groups incomplete_inconclusive и обе PNG pairs blocked_missing_png, а не успех. Полныйci-validation.log сохранён. Read-only original artifact и negative evidence прежних запусков не заменены.

## Проверки на конечном source d713cb9

[Check40298240249](https://github.com/YuriyEmelyanov/Hexcrawl/actions/runs/40298240249), attempt1, head_sha=d713cb9d11c0cd00bfda1eaf13a7489f58e48634: все3jobs success:
- check121489462437:236tests,236pass,0fail, TypeScript/build; ci-check.log.
- browser121489462488: весь production browser/history набор, Chromium151.0.7922.34; ci-browser.log.
- world-random121489462029: seeds/continuation/invalid import/undo/busy scenarios; ci-rng.log.

Локальный Node24.22.1 npm run check на том же SHA: exit0,236/236, build; local-check.log. Локальная browser-приёмка не заявляется; CI использует настоящий браузер. YAML60min/syntax и synthetic aggregate checks прошли: pooled120 nearest rank, strict AND guard, delta=10ms boundary, missing frame → incomplete. Эти проверки не доказывают фактическое выполнение navigation/PNG script body — CPU preflight до него не пропустил.

Старый Check40252463579 на739e3de остаётся action_required в истории; новый точный head имеет собственный успешныйCI. Никакой необходимости одобрить старый run для подтверждения новогоCI не заявляется. Reviewer отдельно оценивает источники, tree parity и закрытиеRV4 на актуальном SHA.

## Матрица передачи

|Проверка|Результат|
|---|---|
|V201 sources/hashes/freeze|passed ограниченно: manifest до данных, actual environment committed, все42 output hashes и runtime parityCIpassed; CPU guard blocked до действий|
|V202 navigation|not_executed;20actions/4warmupsplanned,0attempted; никаких новыхp95|
|V203 PNG|not_executed;4planned,0clicks; lifecycle/export причина не исследована в этой попытке|
|V204 history/negative evidence|сохранены originalraw/thresholds/результаты; AC02/05/08 large history/selection gaps не закрыты|
|V205 exact headCI|passed236/check/browser/RNG наd713cb9, full logs|
|V206 independent review|pending; bounded review нового harness/CPUguard/raw/CI, не новый performance run и не повтор прежнего полногоаудита|

RV1/RV2 остаются blocked/inconclusive: новые данные отсутствуют. RV3 correction из предшествующего developer response сохранена, independent confirmation не присваивается. RV4 addressed_pending_review на новом headCI, старыйstatusнеподменён. RV5 partial: новые expensive safety/selection series не выполнялись. Общая AC01–08 приёмка не заявляется. Одна исходная оптимизация и подтверждённые ранее34.41%/36.15% остаются прежними; V2 не подтверждает дополнительноеускорение.

## Score1.2: evidence, без начисления

Before1.2 по всем пяти критериям unknown_pending_reassessment; источник — reviewer739e3de и current-score (193.75/unverified70 — исторический итог1.1). Historical1.1: S09-C01G2/10, S02-C01G1/7.5, S03-C05G2/10, S04-C04G2/7.5, S09-C04G2/5. Не перенесены автоматически.

|criterion_id|Evidence на d713cb9|Ограничение/ожидание|
|---|---|---|
|S09-C01|новый manifest/environment/raw + исходные paired timings|unknown:V2неизмерен,guardambiguity; Android/user confirmation отсутствуют|
|S02-C01|точный runtime unchanged + ci-rng/check|score-neutral forecast; исходный bounded RNG evidence, не новый полныйgrade|
|S03-C05|ci-browser save/history +236tests, originalnativeevidence|score-neutralforecast; large paired history gap остаётся|
|S04-C04|ci-browser export/import/savedJSON + original5PNG/7SVGpairs|score-neutralforecast; две большиеPNGпары всё ещё отсутствуют|
|S09-C04|ci-rng busy/invalid-import/atomic rollback +ci-check|score-neutralforecast; finite existing scenarios, не всеошибки|

Разработчик не назначает подтверждённые grades/points/delta. Reviewer обязан записать score_assessment1.2 на новом SHA, включая insufficient_evidence и нулевой/unknown результат, бездвойногоучёта. Баллы продукта не изменялись. Не опубликовано; main103d31b остался прежним. Выпуск отдельно.

Следующий этап — ограниченная независимая проверка d713cb9: guard exactCPU против resourceclass, raw0actions, новыеCI/runtime parity, оставшиесяblockers и score_assessment. Не повторять замер автоматически по тому же исчерпанному workflow attempt. Согласование владельца на V2 сохраняется; не превращать этот preflight результат в повторный запрос утверждения самой задачи.
