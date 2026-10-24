# HX-BL-030 — исправления независимого review R1/R2

25.10.2026, программист. Spec 1.0; модель оценки 1.1 неизменна.

- Исходный проверенный head: `ffb5e85311420b14fe509819ec26b420606ce0dd`.
- Новый head: `c6923f37559a8ce00e0bb995e19c32fb22f3941c`.
- PR: https://github.com/YuriyEmelyanov/Hexcrawl/pull/472
- Продуктовая база: `6aaefa8896e7aac163cfcd5c2ca896ac60fc54d0`.
- CI: https://github.com/YuriyEmelyanov/Hexcrawl/actions/runs/40141169603
- Head tree и synthetic merge tree: `4c3c6befc14667addb02b610b345e0127184b43c`; проверено локальным git после fetch refs/pull/472/merge (`6b58e1c41daf9ff06bd30ad5d446247a0db01c96`). Main не менялся.

## Изменения

R1: локальная для App синхронная ревизия документа. `generateAt` и regenerate инвалидируют повторный callback до подготовки options; транзакции и undo/redo/import инвалидируют обработчики предыдущего документа. Guard проверяет ref, поэтому действует и до следующего React render. Не вводится глобальная блокировка или общий RNG. Регрессия проверяет два вызова до render и вызов после render, неизменность полного JSON/обоих стеков, точный undo/redo и неизменность после повторного вызова старого callback.

R2: Mythic regenerate не вызывает подготовку classic options. Скрытый locality больше не расходует geography перед startKingdom; checkpoint содержит базовый мир и RNG начала regenerate. Полный failure backup остаётся отдельным. Регрессия: locality→Mythic, generate, regenerate, delete-last, undo/redo, повтор regenerate после undo и второй последовательный regenerate. Сравниваются целые сохранения и точные RNG.

## Воспроизведение до изменения

На исходном ffb5e85 выполнен исходный независимый `hx-review-repro.mjs`: оба finding воспроизведены. Новые R1/R2 тесты тоже выполнены до изменения App: 0/2 pass. Сохранены исходный script/output и отрицательный лог. Ошибка R2: ожидался geography=1193655228, фактически 3025221041. R1: вместо одной транзакции появлялись две, повторный callback расходовал RNG.

## Проверки

Node `v24.22.1`. Локальный `npm run check` завершён: TypeScript, 213/213 тестов, production build. Этот запуск начался до добавления двух последних тестов корпуса; поэтому он не выдаётся за единый прогон всех 215 тестов итогового дерева. Отдельно на окончательном коде прошли два новых теста (2/2), а полный итоговый прогон выполняет CI.

Локальный targeted worldContinuation: 16/16, включая R1/R2. Дополнительно manifest import-v2 (8 записей) и rng-v3 (11 записей), каждый в обоих режимах: загрузка в независимые контексты, v3 roundtrip, следующее действие. При отказе — одинаковый outcome и полный rollback; hash каждого исходного fixture проверен и не изменён. У lake-reentry-map и sea-pocket-map при выбранном входе Mythic есть воспроизводимый отказ; этот результат явно сохранён в логе, а не исключён из выборки. Успехом генерации он не считается. Проверена атомарность некорректных значений RNG (объект/массив/строка/null, отсутствующие поля, дробные/отрицательные/overflow состояния, версии), включая v2-with-generation, с сохранением redo.

Production browser world-random дополнен: не только первая, а все три единицы каждого из 8 seed/mode профилей сравниваются между двумя свежими контекстами до отдельной проверки continuation. Дополнен R2 через публичные кнопки Mythic generate/regenerate/delete/undo/repeat с сохранённым hidden locality. Существующие test:browser сохранены.

Локальный `npm run test:browser` запущен и блокирован отсутствующим Chromium executable. Повторять уже неудавшуюся установку предыдущей роли не требовалось: оба browser набора выполняет GitHub CI с собственной установкой Chromium. Syntax check нового browser script пройден.

## Границы доказательств и следующий этап

Это evidence программиста, не независимое принятие или разрешение выпуска. R1/R2 имеют статус addressed_pending_independent_review, прежнее заключение ffb5e85 не переносится на новый SHA. Проверяющий должен перепроверить весь новый SHA, score_assessment и оставшиеся частичные пункты собственного review.

AC-01: существующие независимые векторы/сериализация/потоки сохранены.
AC-02: новая полная fresh-тройка обоих режимов в CI, seeds 0/1/123456789/4294967295.
AC-03: существующий полный continuation на тех же профилях, плюс manifest roundtrip/continuation.
AC-04: закрыты конкретные R1/R2, два последовательных regenerate, undo/redo/delete и non-auto настройка; прежние manual-edit сценарии сохранены.
AC-05: прежние failure/late Mythic/prepare-options/sea-recovery тесты сохранены; расширенной независимой оценки всей failure matrix в этом запуске нет.
AC-06: render/timer/runtime guards и независимость потоков сохранены; полный единый visual+navigation+rename→next-world эксперимент из предыдущего partial review не добавлен. Не объявлять этот AC полностью принятым.
AC-07: весь manifest теперь проходит production handler roundtrip/next-action в обоих режимах; браузерный полный action matrix для rng-v3 целиком не заявляется. Два явных отказа Mythic требуют отдельной оценки reviewer.
AC-08: malformed RNG matrix расширена на production handler с redo; вся матрица не дублируется в настоящем браузере.
AC-09: R1 same-batch/stale callback и прежние pending/import/kingdom tests; физический двойной клик отдельно не воспроизведён.
AC-10: прежние detached logger tests сохранены; полной replay matrix JSON+diagnostic-action в этом запуске нет.
AC-11: итоговые CI результаты дописываются после завершения на точном дереве; отсутствие полного доказательства отдельного AC не маскируется зелёным CI.

## Evidence оценки продукта

S02-C01: реестр G0/0; прогноз спецификации G1/7.5 (+7.5), не подтверждён программистом. Evidence: сохранение RNG, независимые векторы, full continuation/fresh triples, R1/R2, source guards. Ограничения отдельных AC выше. Reviewer обязан актуализировать оценку на c6923f3; до принятия и публикации новых баллов нет.

S02-C03 (G1/5), S03-C05 (G2/10), S04-C04 (G2/7.5), S09-C04 (G2/5): отдельных новых баллов не запрашивается. Evidence: import/rollback/redo/manifests, existing browser save-history и новые malformed/stale/regenerate проверки. Проверяющему также проверить регрессии. Реестр остаётся 186.25/1000, unverified_weight=70. Веса, пороги и критерии не изменены.

Следующий этап: независимая проверка точного c6923f3, в том числе перечисленных ограничений, и обновлённый score_assessment. Если ограничения не позволяют принять spec1.0, вернуть конкретную remaining matrix программисту. Разрешение владельца на выпуск не запрашивалось.

## Итог CI на c6923f3

CI40141169603 завершён: check — success, 215/215, TypeScript и production build; browser — success; world-random — success. Chromium 151.0.7922.34. Все три job checkout synthetic merge 6b58e1c41daf9ff06bd30ad5d446247a0db01c96; его tree совпадает с head. Сохранены excerpts логов и ссылки. Программист не подменяет независимую приёмку этим результатом.
