# HX-NEXT-001 — исправление F1

Дата: 2026-10-24. Developer, явное поручение владельца после reviewer. Spec 1.0.
PR: https://github.com/YuriyEmelyanov/Hexcrawl/pull/471
Новый head: 50d8b6f2414faa1f204cdd2a7ed936533707592c.
Предыдущий head: 459a813168bba07d6196a279fbc7e807127f6a6c; base/main f89530abe1e237493dddb533502bb772ae1ab4e5.
Отдельный checkout hexcrawl-fix-f1; старые изменения hexcrawl-dev не тронуты.
CAS claim: a7083d89866d7d075119b45c6864ae1d22c95209.

## Воспроизведение до исправления
Оригинальный reviewer script на 459a813 независимо повторён:
42 malformed cases PASS; nextRoadId=MAX_SAFE_INTEGER после успешной production generation стал 9007199254740992; region.id=MAX_SAFE_INTEGER породил region.id=9007199254740992. Оба экспорта отклонены валидатором. Источник: agent-work/evidence/HX-NEXT-001-reviewer-extra-459a813.mjs.

## Исправление
assertGeneratedIds проверяет готовое предложение до первого setter карты/истории: уникальные положительные safe IDs regions/rivers/roads/kingdoms, lake IDs и оба next counters. Road/lake ID также оставляют безопасный max(existing)+1 для импортной нормализации. Проверка стоит до раннего возврата внутренних Mythic шагов; final kingdom проходит тот же барьер. startKingdom отдельно отвергает unsafe следующий kingdom ID до создания job. Существующий rollback восстанавливает документ, selection/view, undo/redo и generation checkpoints. Допустимые импортные IDs не перенумерованы, схема/географический алгоритм не изменены.

## Регрессии
- Табличные границы для всех numeric entity namespaces и counters, включая округлившиеся duplicate IDs и road/lake normalization overflow.
- Настоящие import и safelyAddRegionToMap с MAX road/lake counter, region/river ID: отказ сохраняет DocumentSnapshot и оба стека, успешное продолжение сохраняет валидность экспорта. Для двух исходных F1 случаев обязательно success:false.
- Настоящий startKingdom с MAX kingdom ID отклонён, job не запущен, весь документ/оба стека сохранены.
- UI road/region сценарии: import, ручная правка, undo, generation error, тот же export, точные redo и undo.
- Старые 42 negative import cases повторены после исправления: PASS, карта и оба стека неизменны.

## Проверки
Node v24.22.1; существующие зависимости (Playwright1.62.1, TS5.9.3, Vite5.4.21, React18.3.1). npm run check: PASS195/195, TypeScript и build PASS. git diff --check PASS. Локальный индекс имеет tree1b9b9d438edb03ffc86bd65b26804e7439ca437b, равный опубликованному дереву нового head.
Локальный npm run test:browser после build: blocked_environment — нет Chromium headless-shell1234; suite остановился при запуске браузера. Это не PASS и не продуктовый FAIL.
Первый полный check прошёл194 tests до добавления kingdom regression; первый запуск новой kingdom regression выявил разницу VM prototypes в assert.deepEqual, исправлено сравнением structuredClone с обеих сторон; финальные195 PASS. Ошибку теста не скрываем.

## Отрицательный CI и обнаруженный дефект snapshot
Первый новый CI40098442242/job120885475841 на промежуточном head71b62fcd55db5ee9e305a332e1502008cd58a73f: npm check195 PASS; первые шесть browser suites PASS; F1 UI сценарии также пройдены. Старый save-history Mythic regenerate/redo assertion (строка144) упал: visible after crossings=bridge, redo snapshot crossings=ferry. Дополнительные boundary операции изменили RNG sequence и проявили дефект, который прежний seed sequence не выявлял. Тест не ослаблен и новые сценарии не переставлены для сокрытия дефекта.
Причина в finishKingdom: два вызова случайного reconcileRiverCrossings независимо готовили snapshot и state. Минимальное исправление50d8b6f: один finalCrossings перед recordGenerated и затем тот же массив для setCrossings. Это выполняет HIST-03; правила выбора переправ не менялись. Существующий Node Mythic test дополнен проверкой exact undo/redo карты после finish для seed7/42/103. Финальный npm run check снова PASS195/195, TypeScript/build PASS.

## Финальный CI и передача
CI https://github.com/YuriyEmelyanov/Hexcrawl/actions/runs/40099004854 / job120887104458 SUCCESS. Logs: Node24.21.0, tests195/pass195/fail0, TypeScript/build PASS; полный npm run test:browser PASS, включая новые F1 UI случаи и старый exact Mythic regenerate/redo. В13:43:40Z: «Save/history acceptance passed in151.0.7922.34». Checkout synthetic merge0630deb10839cab859f4a281e73fd6e24587b407. API подтвердил тот же tree1b9b9d438edb03ffc86bd65b26804e7439ca437b, что у raw head50d8b6f и локального индекса.
Review-ready для независимого reviewer следующего hourly запуска. Проверять весь пакет spec1.0 на50d8b6f2414faa1f204cdd2a7ed936533707592c; прошлый review не переносится. Конечный набор проверок не доказывает отсутствие любых ошибок. Локальный browser repeat остаётся blocked_environment; CI browser success указан отдельно. Баллы, main, выпуск не менялись; merge/deploy не разрешены. Process/approvals/budget не редактировались. Root-изменения hourly ready-work routing сохранены; автоматизация не отключалась.
