# HX-BL-030 — исправление R5

Дата: 25.10.2026. Роль: программист. Spec 1.0. Разрешение: owner-approval-2026-10-24-HX-BL-030.

Base исправления: 855cfd5b8cd2e70e1013d92b5dc9e6e21be063d0. Новый head: 202570a4b97beb2090225ef4e485b00a43c34fb5; tree f2fc6c9a6519e63eb94b5bd30699146b733191ac. PR472; main 6aaefa8896e7aac163cfcd5c2ca896ac60fc54d0 не изменён. Основная роль выбрана по единственному открытому R5 после независимой проверки, активного claim не было.

R5: lastPendingRegen помнил только последний объект. Callback уже выполненной A после B снова запускал генерацию с устаревшими данными. Теперь отдельный App-local WeakSet сохраняет факт выполнения каждой заявки; дополнительно до побочных эффектов проверяется ревизия документа. Выполнение помечается перед запуском classic/Mythic, поэтому повтор не начинает job, не расходует RNG и не использует старый backup. WeakSet не удерживает заявку после освобождения callback. Формат, алгоритмы генерации, доменные RIV/ROAD, веса score и UI не менялись. ADR/правила обновлены.

## Регрессия TX-06 / AC-09

Новые два теста в test/worldAcceptance.test.mjs: seed0, locality, classic/Mythic; generate → regenerate A с сохранённым callback → regenerate B → старый A. Проверяются полный save (исключён только savedAt), captureDocument с сессионными checkpoints, оба RNG, оба transaction stack, отсутствие kingdomJob и новых логов. Повторяется после undo с непустым redo и после redo. На старом App оба теста упали (0/2); после исправления 2/2. Исходный скрипт проверяющего отдельно повторён программистом на новом head; это не независимая повторная приёмка.

| Режим | Полный JSON SHA256 до = после старого A | Регионы | Undo | RNG geography / poi |
|---|---|---|---|---|
| classic | 1a090b7dafb4e4b8250107ec73c996f365e317a40c7f38616f84af15c455b1de | 1 → 1 | 3 → 3 | 2865532062 / 4294177991 без изменения |
| Mythic | 3077961eb54099b06f71887ae4eea5fdb5c57620a1104edc99263a1e6b4edd40 | 33 → 33 | 3 → 3 | 1163608680 / 257391574 без изменения |

[R5-evidence.zip](HX-BL-030-developer-202570a/R5-evidence.zip) содержит отрицательный/положительный логи, скрипт, полные JSON и оба стека; [manifest](HX-BL-030-developer-202570a/manifest.json) — версии и SHA256. Raw отрицательный лог947389 bytes сохранён без сокращения. Предыдущая независимая проверка: [report855](review-HX-BL-030-855cfd5/report.md), R1–R4 подтверждены исправленными; новый SHA требует актуализации заключения.

## Проверки

Node v24.22.1 local: `npm run check` exit0;236/236 pass,0 fail/skip/cancel;313434.875379ms тесты,build7.61s. Дерево не менялось во время запуска; git status чистый. [Полный локальный лог](HX-BL-030-developer-202570a/check.log).

[CI40164382105](https://github.com/YuriyEmelyanov/Hexcrawl/actions/runs/40164382105): check, browser, world-random все success. Node24.21.0, Chromium151.0.7922.34. CI checkout5dcec8324554ce2c7603d7d7511841374fcc68d2 имеет родителей main6aaefa8/head202570a и точное дерево f2fc6c9a6519e63eb94b5bd30699146b733191ac, совпадающее с head. Это тестовый PR merge, не слияние в main.

[CI check](HX-BL-030-developer-202570a/ci-check.log):236/236/types/build. [Общий browser](HX-BL-030-developer-202570a/ci-browser.log):все7 наборов; [RNG browser](HX-BL-030-developer-202570a/ci-world-random.log):8 профилей modes×seed, R2 checkpoint, AC06 visual/next-world, AC08 malformed/nonempty-redo, AC09 double-click/paused effect/busy-export/delayed import. Все исходные логи сохранены полностью.

## Приёмка и оценка

AC01–08/10 имели независимое ограниченное положительное заключение на855cfd5; их регрессии перепроверены полным набором на новом tree. AC09: новый R5 no-op тест дополняет прежние classic duplicate, Mythic consumed tick, browser double-click/repeated effect/busy-export; R5 addressed_pending_review. AC11 — проверки выше. Это developer evidence, а не итоговая приёмка нового SHA.

| criterion_id | Опубликованный baseline (модель1.1) | Evidence на новом head | Статус |
|---|---|---|---|
| S02-C01 | G0 / 0; current-score.json | сохранённые geography/poi; continuation, rollback, replay, isolation; R5 тест и полный CI | ожидаемый G1/+7.5 не подтверждается программистом |
| S02-C03 | G1 / 5 | полная migration/malformed/roundtrip матрица CI | score-neutral, без нового начисления |
| S03-C05 | G2 / 10 | full document + both stacks, R5 после B/undo/redo; полная history suite | score-neutral, независимая revalidation нужна |
| S04-C04 | G2 / 7.5 | JSON continuation и браузерные JSON/PNG сценарии | score-neutral |
| S09-C04 | G2 / 5 | malformed nonempty-redo, atomic rollback, stale request no-op | score-neutral |

Опубликованная оценка186.25/1000 и unverified_weight70 не изменялись. Предыдущий score_assessment относится только к855cfd5 и не переносится как подтверждённый на202570a. Модель1.2 PR473 подготовлена отдельно, этот запуск её не меняет. Реестр OSE/PF2 Hexploration/Shadowdark/Forbidden Lands — ориентир требований; рейтинг top5/10/20 не определён, проверка RNG не означает подтверждённой поддержки правил этих игр.

## Ограничения и передача

Локальный Chromium отсутствует (проверено executablePath/exists=false); браузерные проверки выполняются в CI. Harness исполняет production handlers с hook storage без React effects; физическая доступность точно такого старого callback из обычного UI не утверждается. Registry rename не доказывает UI переименования; regenerate replay требует сессионного префикса; два legacy fixture в Mythic могут детерминированно отказать с rollback. Конечные тесты не доказывают любые seed/10000/100000 карт.

Следующий этап: независимый проверяющий со свежим контекстом на202570a, R5 и регрессии всего пакета, затем score_assessment точного SHA. R1–R4 были независимо verified_fixed на предыдущем SHA; не объявлены повторно принятыми программистом. Merge/публикация не разрешены. Откат до выпуска — закрытие/исправление PR, main не меняется. Новых решений владельца сейчас не требуется.
