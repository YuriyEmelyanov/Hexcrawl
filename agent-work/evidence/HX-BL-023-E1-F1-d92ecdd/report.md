# HX-BL-023 E1 — исправление HX023-E1-F1
Base исправления: `24fa342cfacefdf604281ac0dc414912d6726433`; PR base: `a7a8cc58987e97c4495c405374c6a4145f3bc9ff`.
Конечный SHA: `d92ecdd7ca8c5b7293a4f3e2e6efde93f944c57c`; tree: `2e74b1aa11b571cc2a566aec67f8c805f79f4730`; PR478, ветка agent/hx023-e1-names. Spec2.0, E1 behavior5 / N03–N04. Это результат программиста, независимая перепроверка ещё требуется.

## Результат и границы
На исходном24fa342 расширенный существующий browsercase упал на невозможности выбрать другой существующий гекс при dirty-имени (negative-existing-selection.log). Теперь общий documentBusy защищает оба вида клика, mutationBlocked применяется к candidate generation; просмотр существующего гекса завершает прежнюю notes group и меняет только выбор. Парный черновик имени сохраняется. Генерационные алгоритмы, схемаJSON, dependencies/workflows не менялись. Diff исправления:3файла,25insertions/3deletions (App6+/2−, browser18+, docs1+/1−).

Поле ui.selectedHex уже входит вJSON. Первый расширенный assertion ошибочно требовал полного неизменного экспорта при просмотре: отрицательный лог negative-selection-export-assertion.log сохранён, причина — ожидаемая смена выбранного гекса, не потеря карты/RNG. Коммитceba2b6 содержал этот неверный assertion; d92ecdd уточняет только его. Ожидается ровно изменение ui.selectedHex; возврат к исходному выбору возвращает точный экспорт.

## Проверки и происхождение
- Node24.22.1: npm run check exit0,248executed/248passed/0failed/0skipped; TypeScript и build passed; duration365407.990104ms. check.log. Важно: запуск начался наceba2b6, во время него исправлялся только browser assertion. Runtime/Node inputs идентичны; этот локальный прогон не выдаётся за чистый запуск всего check на одном конечномSHA. Точное основание финальногоSHA — CI40827716186.
- Первый полный локальный browsercommand прошёл generation,POI,terrain,forest,navigation,large-navigation; затем остановился на ошибочном export assertion. После уточнения весь save-history повторён: exit0, все его старые cases и E1 прошли. Raw negative + save-history-corrected.log. Это7 прошедших scripts с повтором последнего, не7логическихtests. Chromium153.0.8010.0.
- Временный production UI probe на окончательной сборке d92ecdd: 3/6→2/6 при dirty, черновик сохранён, Escape/control работает,390 безoverflow. ui-proof-final.log, f1-proof-temp.mjs, manifest.json, fixed-desktop.png/fixed-390.png. Временный probe не добавляет постоянныхtests.
- CI окончательногоSHA и совпадение synthetic merge tree зафиксированы отдельно в ci-provenance.json. Результат не переносится на будущий изменённыйSHA.
- Навигационные цифры в прежних обязательных browser scripts — побочный вывод regression suite, не новый замерHX-BL-003 и не основание performance/score.
- Обязательные shared-history cases проверяют Save/Discard/Stay, no-op/Redo, stale/fault, PNG/JSON и продолжение; конечный набор не доказывает отсутствие всех ошибок.

## Необходимость тестов и score
До изменения проверено существующее покрытие: прежний E1block проверял dirty candidate click, но не противоположное немутирующее existing click. Расширен этот же block, без нового runner/Nodecase/второгоmixed100. Он проверяет наблюдаемое поведение, оба текста черновика, точный exportdiff и блокировкуUndo; source/test_change_summary разделяет suites, варианты и временные probes.

Score1.2: S02-C02 — прежние ID/данные остаются; S03-C05 — просмотр не добавляет историю, mutations заблокированы; S04-C04 — экспорт меняет только документированный выбор; S09-C04 — busy/dirty guards разделены по операции. Это evidence программиста точного runtime; unknown before/after, deltaunknown,0award. Reviewer обязан заново записать independent score_assessment наd92ecdd; предыдущее заключение24fa342 не переносится. Продуктовую оценку/current-score не меняли.

Фактический UI показан владельцу в существующем чате desktop/390, источник после финальной сборки сохранён; внешний вид контролов не перестраивался. Полный023, остальные15функций и marketing gate остаются незавершёнными. Публикации/mainизменений не было. Следующий этап — свежий независимый reviewer exactd92ecdd, не продолжение других редакторов в этой передаче.


## Итог exact-SHA CI
CI40827716186 наd92ecdd: check/browser/world-random — success. ci-check.log подтверждает248/248,0fail/0skipped; ci-provenance.json содержит rawrun/jobs и syntheticmerge e9ddf788, tree2e74b1a совпадает с кандидатом. Это полная конечная provenance, отдельно от ограничения локального прогона.
