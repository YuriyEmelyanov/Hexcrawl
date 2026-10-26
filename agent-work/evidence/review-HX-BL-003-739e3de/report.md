# Независимая проверка HX-BL-003

**Вердикт: changes_requested; полная приёмка blocked.** Проверен PR474 на точном SHA `739e3de36587533bf3d2f3196072270f4695fa8a`, baseline `103d31b9f6f5c76b1f6b45d9d6664fe3f75dd63b`. Выпуск не разрешён. Новых баллов нет. Дорогие серии, PNG, продукт, пороги, корпус и main не менялись.

Проверяющий — отдельный агент со свежим контекстом, изолированный clone. Прочитаны актуальные AGENTS.md, docs/index.md, latest, process, vision, score-model1.2 и спецификация. Спецификация содержит историческую1.1; действующий процесс26.10 требует1.2 и не разрешает механический перенос старых grades. HX-FB-001 остаётся отложенным; его UI-изменение в продуктовый diff не включено.

## Проверенные факты

Артефакт12624578941/run40252325923 скачан независимо: 266826020байт, SHA256 `45d3a461852a4181c1aa705a715b3423fba0c8e3735f7fe096e7801060df4cfd` совпал. Скрипт `analyze.py` заново разобрал исходные файлы, сохранил `independent-analysis.json`:

- 98 строк, все success, нет зарегистрированных generation timeout/JS errors; 49 полных A/B JSON-пар совпали после удаления только верхнего `savedAt`. Порядок массивов сохранялся.
- 14 полных SVG-пар совпали байтами: семь после генерации, семь в отдельном import/export-профиле. Пять доступных PNG-пар совпали по размерам и всем декодированным RGBA-байтам.
- Две большие PNG-пары отсутствуют: оба варианта каждого nominal2400 input завершились timeout180s. Равенство имеющихся файлов не доказывает отсутствующие результаты.
- В трёх доступных small-checkpoint сценариях все64 диагностические строки одинаковы между A/B, включение/выключение debug сохранило полный JSON. На четырёх больших checkpoint нет эквивалентного открытия панели/selection evidence.

| Целевая группа | Фактический N | Generation median A→B | Снижение | Победы |
|---|---:|---:|---:|---:|
| Mythic seed0 nominal2400 |2493→2714|102550.6→67263.2мс|34.41%|5/5|
| Mythic seed123456789 nominal2400 |2410→2590|86968.6→55528.2мс|36.15%|5/5|

Целевое ускорение подтверждено повторным расчётом существующих данных, а не новым запуском. Это ограниченный Linux/Chromium результат. Время async generation включает ticks и промежуточные React commits согласно инструментализации. Cold/warmup отделены от пяти warm; nearest-rank timing p95 пяти значений равен max.

## Блокирующие и существенные замечания

**RV1 / AC06:** нет двух больших PNG-пар. Изолированные fresh-browser попытки уже исчерпали согласованный bounded retry. Не перезапускать автоматически и не уменьшать качество/масштаб. Приёмка остаётся blocked.

**RV2 / AC04:** навигационная агрегация между повторениями заранее не закреплена. Пул120frame p95 превышает guard в двух группах:

| Группа zoom | Pooled p95 A→B, мс | Frame>50мс A→B /120 | Frame>500мс A→B /120 | Max A→B, мс |
|---|---:|---:|---:|---:|
|Mythic seed0 nominal1200|49.966→66.596|5→7|3→4|616.7→3733.2|
|Mythic seed0 nominal2400|66.642→83.308|8→10|3→4|916.6→883.2|

Median пяти per-run p95 guard не превышает. У каждой серии24frame per-run p95 —23-е значение: один самый долгий frame каждого повтора исключается, а медиана потом исключает ещё вариативность повторов. В пуле влияют и другой ранг, и расположение долгих frames между повторами. Оба показателя осмысленны для разных вопросов; выбрать благоприятный после результата нельзя. Pooled samples тоже не независимы: frames вложены в пять запусков. Этого недостаточно для причинного вывода «оптимизация ухудшила навигацию», но достаточно, чтобы **не утверждать выполнение общего guard**. Итог inconclusive. Полные распределения и ratios сохранены, неудобные строки не исключены. Дополнительная оптимизация запрещена текущим stop rule.

**RV3 / точность отчёта:** 28 ERR_ABORTED в paired raw принадлежат **candidate, mythic-123456789-N400.json, iteration0**, а не mythic0/N1200, как записано в developer report/PR. Это безопасная правка отчёта по уже имеющимся данным. Отдельный visual raw содержит отменённые asset requests в обоих вариантах многих Mythic inputs; например captured seed0/N400 A28/B25 и blocked seed123456789/N2400 A28/B28. Нельзя автоматически простить их как harmless или называть asset root cause доказанной: lifecycle запросов не размечен точным этапом. Полные соответствия JSON и имеющихся PNG/SVG не устанавливают причину отмены. Разрешён анализ существующих путей/конечных SVG/ресурсов без новой серии.

**RV4 / AC07:** exact head Check40252463579 — completed/action_required. Это не runtime test failure, но и не успешный exact-SHA gate. Parent00f5e4 Check40252330019 прошёл check236/236, browser и world-random. Самостоятельно скачаны полные логи всех трёх jobs. Реальный checkout CI `d1ed32633ed947a952529ef339fff8cded9223d3` имеет tree `9aec586b203de11062d2c0604192b6b73c49cc62`, равный00f5e4. Tree739e3de —`b7ec8c5f439b0d78069b4dbc92efc527bb506362`; различие с00f5e4 только `reports/HX-BL-003/paired-environment.json`. Это сильное свидетельство того же runtime, но формальный exact-head шаг остаётся незавершённым.

**RV5 / ограничения safety и selection:** 56/98 строк не выполнили выбор четырёх видимых гексов, на больших картах eligible targets0. Не заменялись искусственными targets. Полной последовательности native snapshots undo/redo/import/continuation для каждой большой paired-карты в evidence нет; savedJSON не доказывает внутренние Map/Set.

## Source и безопасность

Весь продуктовый diff — четыре строки src/App.tsx: memo диагностического индекса возвращает пустой Map при закрытой debug-панели; dependency debugRivers обеспечивает пересчёт при открытии. Все потребители ведут в debug-представление; алгоритмы мира, RNG, импорт, транзакции и handlers не изменены. Нет unbounded cache, новой async задачи или второго исправления. Diagnosis83b0ccf предшествует96a2a89 в истории. Recorded trace подтверждает22.86–24.77% self/24.40–26.45% inclusive в пяти больших traces; исходный trace ZIP в этом bounded review заново не анализировался, поэтому проценты не объявляются независимо воспроизведёнными.

На Node24.22.1 выполнены исходные `saveSafety`, `mapTransactions`, `worldContinuation`, `worldAcceptance` и два проверочных native варианта. В исходных четырёх файлах нет failures. Общий первый эксперимент:103tests,95pass,8fail. Все8fail находятся только в проверочном native-continuation варианте: глобальная замена JSON-copy на structuredClone ошибочно изменила сравнение сериализуемого save с импортированным JSON. Отличия — собственные optional поля со значением undefined (`generationMode`, `kingdomId` и другие), которые JSON по определению удаляет. **Это ошибка проверочного harness, а не обнаруженная регрессия продукта.** Полный первоначальный log сохранён.

Исправление проверочного harness: JSON-нормализация экспортируемых save остаётся исходной; structuredClone применяется только к внутренним undo/redo stacks и captureDocument. Отдельный focused запуск R1/R2/R3/R5 дал5/5pass, exit0. Эти сценарии проверяют stale classic callbacks, скрытые classic controls при Mythic regeneration, поздний failure с detached options/RNG, consumed regeneration после новых действий/undo/redo. R4 (safe integer ID boundary) проверен исходным saveSafety: region/road/lake/river/kingdom ID namespaces и полный rollback document/stacks. Full parent CI дополнительно подтверждает эти тесты и реальный browser сценарий R2, malformed imports, busy mutations, duplicate ticks и mixed100 UI history.

Отдельный native-snapshots test на обоих режимах сравнил **полный structuredClone(captureDocument())** после generation→undo→redo и manual biome edit→undo→redo. Присутствуют реальные Map: Mythic terrainMap3entries, biome overrideMap1entry. Равенство прошло. Первоначальная дополнительная проверка потребовала nonemptyMap на пустой classic terrain и ошиблась условием; тест уточнён реальной ручной правкой, продукт не менялся. Set в обходе этих документов не обнаружен; Set-specific coverage не заявляется. Native тесты и оба вида логов прилагаются.

## AC01–08

| AC | Итог |
|---|---|
|AC01|Bounded minimum7 достигнутых checkpoint соблюдён; manifests закреплены до timing. Classic1200/2400 явно unreachable в исходных100attempt.|
|AC02|Частично:98 сохранённых исходов, production listeners, t0–t3, внешний180s timeout;56selection сценариев неполны.|
|AC03|История/узкий source и recorded trace поддерживают diagnosis одного участка; исходный trace заново не пересчитан.|
|AC04|Target generation проходит; общий navigation guard inconclusive, полной приёмки нет.|
|AC05|Равенство outputs/RNG и существующие safety + focused native checks поддержаны; полной native проверки всех больших paired sequences нет.|
|AC06|Blocked: missing2largePNG; меньшие изображения иSVG совпали.|
|AC07|Not pass exact head: action_required; parent имеет тот же runtime и успешные полные логи.|
|AC08|Независимый review/evidence analysis/ограниченные safety выполнены; paired benchmark не перезапускался по прямому ограничению. Полная приёмка не объявляется.|

## Score assessment1.2

Модель1.2 — blob `bf22bd53a75f5f337c637bf94922d12915ffbd74`, operational source agent-work/strategy/score-model.md. Исторический источник before — current-score.json модели1.1. Эти пять критериев технические/общепродуктовые: покрытие20НРИ искусственно не требуется и за benchmark не начисляется. Существующие evidence поддерживают ограниченные неизменные сценарии, но этот review не объявляет полную повторную оценку каждого grade по1.2. Непроверенность не заменяется G0 или механическим сохранением прежнего grade.

|Criterion|Исторический before1.1|Before1.2|After1.2 на739e3de|Delta|
|---|---|---|---|---|
|S09-C01|G2 /10|unknown|insufficient_evidence|unknown|
|S02-C01|G1 /7.5|unknown|insufficient_evidence для полного grade|unknown|
|S03-C05|G2 /10|unknown|insufficient_evidence для полного grade|unknown|
|S04-C04|G2 /7.5|unknown|insufficient_evidence|unknown|
|S09-C04|G2 /5|unknown|insufficient_evidence для полного grade|unknown|

У каждого ID в result.json отдельно указаны SHA, метод, evidence и ограничения. Прирост0 начисленных баллов; это не утверждение числовой delta0 неизвестного нового grade и не изменение193.75 модели1.1. G3 user confirmation/G4Android не доказаны. Детерминизм не начисляется повторно за экспорт; undo отдельно от ошибочного импорта; измерительный harness не создаёт CI/observability points.

## Конкретная передача

Следующий безопасный этап разработчика — исправить атрибуцию ERR_ABORTED в существующем отчёте, сохранить bounded непрошедший результат со всеми raw исходами и при необходимости закрыть обычный exact-head CI gate без запуска PNG/benchmark. Можно проверить уже существующие файлы/ресурсные пути и передать недостающую существующую evidence, если она имеется. Все эти действия сами по себе не снимают RV1/RV2.

Если существующей полной evidence нет, требуется **решение владельца о продолжении ограниченного validation plan или изменении требований приёмки**. Новый PNG retry, viewport/corpus series, смена агрегации и тем более второе узкое место автоматически не разрешены. Допустимо оставить кандидат заблокированным вне main; удалять полезное исправление только ради этого review не обязательно. Альтернатива — подготовить report-only negative package без продуктовой правки, как требует AC08 для negative_result. Нельзя просто переименовать текущий PR с продуктовой правкой в accepted negative_result.

Повторная проверка того же SHA/тех же файлов без новых данных не создаёт прогресса. Команда остаётся включена; blocked задачи не основание её отключать. GitHub в этом дочернем review не изменялся; root сохраняет общую передачу.

Actual automation peek в начале вернул is_enabled=true (точное время отдельно не записано; первая ошибка аргумента id исправлена jawbone_id). Перед завершением actual peek26.10.2026 04:17:20UTC также true; восстановления/смены расписания не было. Проверка не гарантирует будущее состояние сервиса.

Reproduce raw analysis: распаковать проверенный ZIP в artifact/, затем `python analyze.py`. Native mjs копировать в test/ изолированного checkout того же SHA: относительный импорт helpers/generation-harness.mjs должен указывать на штатный test/helpers. Команды: `node --test --test-name-pattern="R1 |R2 |R3 |R5 " test/native-acceptance.mjs test/native-continuation.mjs`; `node test/native-snapshots.mjs`. Не запускать measurement workflow.
