# HX-FB-002 — что проверяется и где есть лишняя работа
27.10.2026 · бизнес-аналитик · утверждённый разовый аудит. Результат: каталог и кандидаты, не выполненная очистка.

## Вывод для владельца
Основное покрытие полезно: правила географии/рек/дорог, сохранность ручных данных, воспроизводимость генерации и реальный браузер. Подтверждённого списка тестов, которые можно просто удалить без потери покрытия, нет. Найдены повторная подготовка одинаковых входов, устаревшая подмена RNG и привязанный к завершённому PR интерфейсный workflow.
Первый возможный узкий пакет — AUD-02/03/04: убрать лишнюю подготовку corpus, кешировать только неизменяемую трансляцию harness, убрать неиспользуемую подмену RNG. Сначала принять этот ограниченный объём; увеличение скорости пока не обещано. Это не блокирует уже утверждённые «Заметки мастера».

## Зафиксированные версии и метод
- Published main: `02c2fd5fcbdb2042f2708709ce4f20dfd7354787`, повторно прочитан GitHub branches/main; reviewed seed475 `415349bc9fb9ce72fb2a8bc5e777cc98ea515bd0` имеет тот же release tree3892b812c0910eced73c8abf676f17cb267bba11 по сохранённому release/review evidence.
- Unmerged474: `58adcce787549ff6baa3d0dd9f14dac6b34b9a97` отдельно от main.
- Прочитаны28Node-файлов, все8browser entrypoints, вспомогательный harness, scripts и6workflows опубликованного дерева; новые workflow/script/test файлы474 классифицированы отдельно.
- Только исходники и существующие CI/evidence. Ни Node/browser/benchmark, ни искусственные mutation-прогоны сейчас не запускались.
- Команды/сценарии/подслучаи не суммируются в одно рекламное число. [Машинный каталог](inventory.json) сохраняет236фактических названий cases/длительности и их декларации. [Рекомендации](recommendations.json) содержат evidence, риск и границы.

## Команды и фактические количества
| Команда / назначение | Что запускает | Как считать | Где запускается |
|---|---|---|---|
| npm test | node --test test/*.test.mjs |236зарегистрированных Node cases в28файлах; suites0 в отчёте runner | Check/check, через npm run check |
| npm run check | TypeScript noEmit + Node + Vite build | Проверка типов/сборка не дополнительные test cases | Check/check; также исторический render benchmark |
| npm run test:browser |7последовательных smoke entrypoints |7команд; вложенные assertions/итерации не превращать в Node cases | Check/browser после build |
| npm run test:browser:rng |world-random.smoke.mjs |16именуемых групп сценариев:8mode×seed, R2,2AC06,2AC08, invalid seed/noop,2AC09; внутренниеmalformed-подслучаи отдельно | Check/world-random после build |
| scripts/hx-fb-001-ui.mjs |before/after UI seed |6строк:4viewport×language +2mode semantic;24invalid inputs — подслучаи | отдельный branch/manual workflow, не npm test |
| npm run build / deploy |Vite build |не тестовый runner | deploy.yml публикует main; build не означает независимую проверку |
| npm run dev / preview |локальный сервер |не тесты | вспомогательные команды |

Обоснование236: статические регистрации с развёрткой внешних циклов совпали с236строками ✔ в ci-check.log; повторные seed внутри callback не новые Node cases. Например regionGeneration46=36комбинаций +4инъекции ошибок +2размера позднего отказа +4остальных; riverEndpoints16; saveSafety19; worldAcceptance21; worldContinuation18. Подсчёт не исполнение.

## Каталог Node
Последняя числовая колонка — сумма длительностей cases данного файла в одном сохранённом run, секунды. Файлы выполнялись параллельно, поэтому суммы строк **не являются временем всего CI**, стоимость трансляции/инициализации также не полностью входит в durations callback.
| Файл | Cases | Что защищает | Действующее требование | Сумма case seconds | Решение |
|---|---:|---|---|---:|---|
| [biomeHeight.test.mjs](https://github.com/YuriyEmelyanov/Hexcrawl/blob/02c2fd5fcbdb2042f2708709ce4f20dfd7354787/test/biomeHeight.test.mjs) | 4 | Высота по входящим/исходящим рекам и fallback | docs/region-generation.md | 0.002 | keep |
| [coastalRetries.test.mjs](https://github.com/YuriyEmelyanov/Hexcrawl/blob/02c2fd5fcbdb2042f2708709ce4f20dfd7354787/test/coastalRetries.test.mjs) | 1 | Повтор при несовместимом береге вместо преждевременного урочища | docs/region-generation.md | 1.975 | keep |
| [deadForestBiomes.test.mjs](https://github.com/YuriyEmelyanov/Hexcrawl/blob/02c2fd5fcbdb2042f2708709ce4f20dfd7354787/test/deadForestBiomes.test.mjs) | 3 | Мёртвые леса: таблицы, совместимость, ручное сохранение | docs/region-generation.md | 11.758 | keep |
| [forestGeometry.test.mjs](https://github.com/YuriyEmelyanov/Hexcrawl/blob/02c2fd5fcbdb2042f2708709ce4f20dfd7354787/test/forestGeometry.test.mjs) | 9 | Контуры, стыки, 3–4 острова/просвета, устойчивость рисунка | docs/forest-rendering.md | 2.049 | keep |
| [generationDiagnostics.test.mjs](https://github.com/YuriyEmelyanov/Hexcrawl/blob/02c2fd5fcbdb2042f2708709ce4f20dfd7354787/test/generationDiagnostics.test.mjs) | 5 | Логи без изменения мира; причины отказов и recovery | docs/region-generation.md | 2.165 | keep |
| [lakeGeometry.test.mjs](https://github.com/YuriyEmelyanov/Hexcrawl/blob/02c2fd5fcbdb2042f2708709ce4f20dfd7354787/test/lakeGeometry.test.mjs) | 7 | Форма/острова/устья, кеш и стабильность озёр | docs/natural-lakes.md | 1.672 | keep |
| [lakeReentry.test.mjs](https://github.com/YuriyEmelyanov/Hexcrawl/blob/02c2fd5fcbdb2042f2708709ce4f20dfd7354787/test/lakeReentry.test.mjs) | 4 | Запрет нового повторного входа реки в озеро при совместимости старой карты | docs/river-model.md | 34.027 | keep |
| [mapTransactions.test.mjs](https://github.com/YuriyEmelyanov/Hexcrawl/blob/02c2fd5fcbdb2042f2708709ce4f20dfd7354787/test/mapTransactions.test.mjs) | 6 | Атомарный импорт, ручные семейства,100undo/redo, занятость | docs/specs/HX-NEXT-001.md | 18.620 | keep |
| [mythicKingdom.test.mjs](https://github.com/YuriyEmelyanov/Hexcrawl/blob/02c2fd5fcbdb2042f2708709ce4f20dfd7354787/test/mythicKingdom.test.mjs) | 7 | Квоты, размер, размещение, продолжение и атомарный откат королевства | docs/mythic-bastionland.md | 30.573 | keep |
| [regionGeneration.test.mjs](https://github.com/YuriyEmelyanov/Hexcrawl/blob/02c2fd5fcbdb2042f2708709ce4f20dfd7354787/test/regionGeneration.test.mjs) | 46 | 36комбинаций river/sea/coast + ошибки/откат/fallback | docs/region-generation.md | 34.905 | keep |
| [riverCrossings.test.mjs](https://github.com/YuriyEmelyanov/Hexcrawl/blob/02c2fd5fcbdb2042f2708709ce4f20dfd7354787/test/riverCrossings.test.mjs) | 3 | Вероятности моста/брода/парома | docs/river-model.md | 0.002 | keep |
| [riverEndpoints.test.mjs](https://github.com/YuriyEmelyanov/Hexcrawl/blob/02c2fd5fcbdb2042f2708709ce4f20dfd7354787/test/riverEndpoints.test.mjs) | 16 | Истоки/устья при закрытии фронтира, сохранение старого русла | docs/river-model.md | 2.980 | keep |
| [riverFullness.test.mjs](https://github.com/YuriyEmelyanov/Hexcrawl/blob/02c2fd5fcbdb2042f2708709ce4f20dfd7354787/test/riverFullness.test.mjs) | 3 | Полноводность исходящего соединения и upstream reduction | docs/river-model.md | 0.002 | keep |
| [riverIntegration.test.mjs](https://github.com/YuriyEmelyanov/Hexcrawl/blob/02c2fd5fcbdb2042f2708709ce4f20dfd7354787/test/riverIntegration.test.mjs) | 7 | Численная модель в реальных обработчиках; сохранность старых потоков | docs/river-model.md | 16.772 | keep |
| [riverModel.test.mjs](https://github.com/YuriyEmelyanov/Hexcrawl/blob/02c2fd5fcbdb2042f2708709ce4f20dfd7354787/test/riverModel.test.mjs) | 20 | RIV-числа,125троек, озёрный бюджет, топология и bounded search | docs/river-model.md | 0.054 | keep |
| [riverRapids.test.mjs](https://github.com/YuriyEmelyanov/Hexcrawl/blob/02c2fd5fcbdb2042f2708709ce4f20dfd7354787/test/riverRapids.test.mjs) | 2 | Таблица вероятности порогов | docs/river-model.md | 0.002 | keep |
| [riverWaterfalls.test.mjs](https://github.com/YuriyEmelyanov/Hexcrawl/blob/02c2fd5fcbdb2042f2708709ce4f20dfd7354787/test/riverWaterfalls.test.mjs) | 3 | Допустимость и вероятность водопадов | docs/river-model.md | 0.002 | keep |
| [roadContinuation.test.mjs](https://github.com/YuriyEmelyanov/Hexcrawl/blob/02c2fd5fcbdb2042f2708709ce4f20dfd7354787/test/roadContinuation.test.mjs) | 7 | ROAD-AUD01–03: выходы, соединения и допустимая точка входа | docs/road-model.md | 16.281 | keep |
| [roadEntry.test.mjs](https://github.com/YuriyEmelyanov/Hexcrawl/blob/02c2fd5fcbdb2042f2708709ce4f20dfd7354787/test/roadEntry.test.mjs) | 4 | Дорога входит со старого endpoint, не обходит новый регион | docs/road-model.md | 1.269 | keep |
| [saveSafety.test.mjs](https://github.com/YuriyEmelyanov/Hexcrawl/blob/02c2fd5fcbdb2042f2708709ce4f20dfd7354787/test/saveSafety.test.mjs) | 19 | Структура/типы/ID/ссылки, safe integer и атомарный отказ | docs/specs/HX-NEXT-001.md | 2.294 | keep |
| [seaRecovery.test.mjs](https://github.com/YuriyEmelyanov/Hexcrawl/blob/02c2fd5fcbdb2042f2708709ce4f20dfd7354787/test/seaRecovery.test.mjs) | 4 | Реальная карта sea-pocket, восстановление берега и отказ без потери | docs/region-generation.md | 52.835 | keep |
| [terrainStyle.test.mjs](https://github.com/YuriyEmelyanov/Hexcrawl/blob/02c2fd5fcbdb2042f2708709ce4f20dfd7354787/test/terrainStyle.test.mjs) | 3 | 20SVG, детерминированные варианты/соседи, берег и цвет воды | docs/biome-color.md | 0.041 | keep |
| [toponyms.test.mjs](https://github.com/YuriyEmelyanov/Hexcrawl/blob/02c2fd5fcbdb2042f2708709ce4f20dfd7354787/test/toponyms.test.mjs) | 5 | RU/EN-имена, уникальность, рост, переименование и сохранение | docs/toponym-generation.md | 0.811 | keep |
| [tractSeaSource.test.mjs](https://github.com/YuriyEmelyanov/Hexcrawl/blob/02c2fd5fcbdb2042f2708709ce4f20dfd7354787/test/tractSeaSource.test.mjs) | 3 | Исток урочища не появляется в существующем море | docs/river-model.md | 3.467 | keep |
| [woodlandStyle.test.mjs](https://github.com/YuriyEmelyanov/Hexcrawl/blob/02c2fd5fcbdb2042f2708709ce4f20dfd7354787/test/woodlandStyle.test.mjs) | 4 | Стиль первого контакта, сохранение и граница лес/вода | docs/forest-rendering.md | 0.634 | keep |
| [worldAcceptance.test.mjs](https://github.com/YuriyEmelyanov/Hexcrawl/blob/02c2fd5fcbdb2042f2708709ce4f20dfd7354787/test/worldAcceptance.test.mjs) | 21 | Replay, устаревшие callback, смешанные правки, RNG rollback | docs/HX-BL-030.md | 156.078 | keep |
| [worldContinuation.test.mjs](https://github.com/YuriyEmelyanov/Hexcrawl/blob/02c2fd5fcbdb2042f2708709ce4f20dfd7354787/test/worldContinuation.test.mjs) | 18 | Seed/потоки,8mode×seed, v2/v3, corpus и продолжение | docs/world-random.md | 381.861 | keep |
| [worldRandom.test.mjs](https://github.com/YuriyEmelyanov/Hexcrawl/blob/02c2fd5fcbdb2042f2708709ce4f20dfd7354787/test/worldRandom.test.mjs) | 2 | Независимые uint32 vectors и validation генератора | docs/world-random.md | 0.004 | keep |

Короткие unit-тесты численных правил не дублируют integration: первые локализуют ошибку формулы/таблицы, вторые проверяют адаптеры и сохранность существующих объектов. Точные контуры/геометрические signatures — договорённый визуальный результат forest-rendering, а не автоматически «плохой тест внутренностей». Отменённых доменных требований в проверенном наборе не установлено; полный аудит всего production dead code не выполнялся.

## Браузерный каталог
| Entry point | Проверяемый риск | Объём / ограничение |
|---|---|---|
| generation.smoke.mjs |реальные клики coast/auto/mainland, deferred generation, undo/reload и recovery |6добавлений на режим и специальные пути; не6отдельных Node cases; дорогая DOM/effects граница |
| poi-display.smoke.mjs |значки/фильтры POI, сохранение, PNG, upright rotation, RU/EN,320/390px |39SVG и6сочетаний режимов — параметры внутри одного script |
| terrain-color.smoke.mjs |20ассетов, tiles/emoji/color, старые/Mythic saves, цвет/озёра/острова, PNG |unit asset existence не заменяет реальный raster/export |
| forest-display.smoke.mjs |общий лесной контур, islands/clearings, вода, рост, rotation/grid, PNG |граница SVG/CSS/PNG, отдельная от forestGeometry |
| navigation.smoke.mjs |wheel/focal point, drag, rotation, неизменность artwork, JSON scale/PNG |400гексов; optional NAV_BASELINE только при явном сравнении |
| large-navigation.smoke.mjs |motion buffer/резкость/scroll/pixels/export |wrapper ставит LARGE_VALIDATE=1 и импортирует profile-large-map;1случай1200гексов, normal phase, не полный profile1/3/6 |
| save-history.smoke.mjs |FileReader/import/ошибки, manual families,100mixedundo/redo, checkpoint, RU/EN |100действий и300снимков не100/300независимых тестов; browser-путь ценен сверх Node |
| world-random.smoke.mjs |seed/streams, продолжение, настоящие эффекты/двойной клик/busy/delayedread |16групп выше; Math.random бросает ошибку при неожиданном production fallback |

Точная общая сумма атомарных browser assertions не является стабильным контрактом runner и не вычислялась. Источники сценариев — указанные scripts на точном main, требования docs/HX-BL-030.md, world-random.md, specs/HX-NEXT-001.md, map-navigation.md, poi-display.md, forest-rendering.md. Обычный npm test не моделирует React memo invalidation: helper использует useMemo:fn=>fn(),useEffect(){}.

## Отдельно: seed475
Четыре layout/input строки проверяют уникальную геометрию: input после transfer и вне details, строка RU/EN при1500/390px,10цифр, focus/error и отсутствие popup overlap. Два semantic сценария сравнивают full JSON между baseline/candidate после first/next generation, undo/redo, import→continuation и reset seed sync.
Совпадение undo/import с обычным RNG/history — реальное частичное пересечение. Но обычный RNG smoke сравнивает две копии **одной версии**, а seedUI — разные версии. Поэтому рекомендация AUD-05 не объявляет их бесполезными. Сохранить release evidence; для будущего обслуживания отделить узкий layout gate от opt-in cross-version comparison. Старый baseline103d31b и branch guard agent/hx-fb-001-seed-row не дают универсального покрытия будущих PR. В текущем общем Check эти6строк не исполняются.
Ограничение контракта: точный RGB и непосредственное DOM-соседство полезны для принятого UI, но при будущем согласованном редизайне должны обновляться вместе с требованием, а не запрещать его.

## Отдельно: наблюдения и измерения
- test/audit/river-model.mjs и road-model.mjs — наблюдательные инструменты JSONL; не входят в npm test/browser и не утверждают обнаруженные дефекты как норму.
- scripts/profile-large-map.mjs — полноценный профиль1/3/6, в обычном browser только LARGE_VALIDATE=1. scripts/benchmark-kingdom.mjs — эксперимент сравнения, не постоянный product test. scripts/create-terrain-assets.py — генератор ассетов, не тест.
- large-map-profile/navigation-benchmark/render-benchmark workflows привязаны к историческим веткам или manual и baseline SHA. Они не обычные CI gates; могут стать несовместимы с новой моделью RNG/форматом. Keep history; перед новым использованием нужна явная задача/сверка версий.
-474добавляет4Node supervisor cases; их вклад объясняет240=236+4 на его SHA. Они проверяют классы ресурсов, остановку дочернего процесса и запрет продолжения после unconfirmed kill; не генерацию карты.
-474analyzer unittest:7методов (success, failed/missing/late/bad-frame warmup, duplicate measurement, guard boundary). Не входят в npm test и не складываются с240; используются offline synthetic data.
-474содержит отдельные corpus/environment/instrument/output/paired/timing/v2/v3/freeze/history-observe/visual/verify scripts и7HX-workflows. Это цепочка единовременного evidence. V3:20measured nav+2warmup+2trace,3/4complete histories; не новые постоянные test cases. Неполный четвёртый путь — evidence gap, не обнаруженная потеря данных.
- Временные reviewer diagnostics/source/artifact checks не постоянный рост набора. Условный minimal-release handoff474 предлагает не переносить все измерители в чистый пакет; этот аудит не утверждает замену AC и не запускает его.

## Реальная стоимость и стабильность
Источник: сохранённые ci-check/browser/rng/ui.log в agent-work/evidence/HX-FB-001-developer/ и GitHub jobs run40284793669/40284793677,26.10.2026, Chromium151.0.7922.34, Node24. Все3normal jobs success, seedUI success; released tree совпадает с reviewed package.
- Node runner:236passed,0failed,0skipped; wall461.170815s (~7м41с). npm run check step476s включает также typecheck/build; это разные величины.
- Browser command step170s; целый job706s, из них515s установка Chromium. Этот единичный installer выброс не доказывает медленность тестового кода.
- RNG command step174s; job223s. UI acceptance step26s; job78s, включая установку и две сборки.
- Самый дорогой отдельный Node corpus case139.468s;8mode×seed продолжений содержат4Mythic случая ~39.584–66.061s. Сумма callback durations всех тестов773.135s больше wall из-за параллельности.
- Нестабильность каждого сценария/частота flakes — **unknown**: один принятый run не статистика. Предыдущая UI-проверка пропустила popup overlap из-за слабого isVisible assertion; текущая проверяет геометрию. Это подтверждённая прежняя недостаточность проверки, а не flaky test.
- Указанные времена — наблюдение конкретной среды, не прогноз экономии после кандидатов. Новый профиль не запускать ради заполнения таблицы.

## Рекомендации и дальнейшая работа
- **AUD-01 — keep:** Сходные действия проверяются на разных границах: pure validation/VM callbacks и настоящий React/FileReader/DOM/effects. Количество совпадающих слов undo/import не доказывает дубликат. Предлагаемое действие: Сохранить разные уровни; повторную подготовку можно сокращать отдельно. Риск: Потеря проверки DOM событий, асинхронной занятости или отдельного RNG-контракта.
- **AUD-02 — update:** 8общих путей перечислены дважды внутри RNG corpus test. Дополнительно общий v2 corpus обходит mapTransactions и browser. Это подтверждённое пересечение входов/подготовки, не доказательство одинаковых assertions: старые save/map/name invariants отличаются от продолжения RNG. Предлагаемое действие: Предложение узкой правки: сформировать union по path+sha256+normalization/ожиданиям; для одинакового входа подготовить один изолированный старт, сохранив обе группы assertions и classic/Mythic. Если ожидания различаются — не объединять. Длительность после изменения unknown. Риск: Простая дедупликация может потерять проверку различающейся migration/normalization политики двух manifests.
- **AUD-03 — update:** Повторная TS-трансляция на каждом отдельном harness видна по коду; её доля в общей длительности не измерена. Предлагаемое действие: Кандидат: кешировать только неизменяемый текст трансляции по exact source/content, оставляя новый context, exports, state, modeCache для каждого harness. Не менять production и не уменьшать матрицу. Перед принятием показать изоляцию и сопоставимый существующий прогон. Риск: Общий кеш module.exports/VM может смешать RNG, Map/Set и замены функций между тестами.
- **AUD-04 — update:** Комментарий/подмена унаследованы от прежнего RNG: подмена createToponymSeed не влияет на production путь в этом SHA. Это найденная устаревшая подготовка, а не основание удалять сам тест диагностик. Предлагаемое действие: Кандидат remove obsolete setup: убрать неиспользуемый inject и host-global Math.random override; сохранить сравнение полного документа и проверку логов. Использовать уже имеющийся guardRandom там, где он проверяет действующий контракт; отдельный новый тест не нужен. Риск: Удаление всей проверки потеряет invariance debug logging и ошибки без commit.
- **AUD-05 — keep_for_release_then_update_routing:** 4layout rows имеют уникальный контракт геометрии/перекрытия/языков/ширин.2semantic rows пересекают RNG/history, но уникально сравнивают полные документы между версиями и синхронизацию seed после reset. Доказанного бесполезного дубликата нет. Фиксированный старый baseline и ветка уже выпущенного PR непригодны как универсальный future PR gate. Предлагаемое действие: Сохранить исторический release harness/evidence. При отдельно принятой очистке отделить текущие4layout rows от opt-in cross-version2rows, сделать актуальный trigger/явно выбираемую пару SHA. Не запускать старую пару на каждом косметическом PR; обычный RNG gate сохранить.24invalid input subcases не считать24новыми случаями. Риск: Слепое удаление обеих semantic rows уберёт единственное в этом harness cross-version comparison; новый shared helper сам по себе не даёт покрытия.
- **AUD-06 — keep_and_separate:** Это проверка измерителя и конечные исследовательские серии, не240проверок выпущенного продукта.4supervisor cases защищают процесс/kill/resource gate,7analyzercases — полноту/порог. Публикуемый малый App guard не требует автоматически переносить весь архив tooling. Предлагаемое действие: Не переносить measurement workflows/scripts в будущий минимальный release package474 без отдельной необходимости; сохранить историю/evidence. Никаких новых запусков, удалений или изменения AC этим аудитом не разрешено. Риск: Удаление архива потеряет воспроизводимость прошлых отрицательных результатов; перенос в каждый CI раздует обычную проверку.
Список «удалить тест немедленно»: пуст. Устаревшая подготовка AUD-04 подтверждена; её удаление не равно удалению функциональной проверки. Для AUD-02/03 требуется узкая реализация с сохранением контрактов/изоляции и проверка изменённого точного SHA, без нового benchmark.
Дальше в уже утверждённой очереди **HX-BL-024, аналитик: спецификация заметки мастера у гекса**. Она использует существующие transaction/import/browser проверки; новые cases добавлять только для отдельного контракта заметок. Стратег может отдельно принять узкий пакет очистки AUD-02/03/04; аудит сам не выдаёт разрешение на его реализацию.

## Score и границы
Модель1.2, эффект данного анализа score-neutral: приложение не изменено, product grade до/после unknown, delta unknown/null; баллы не начислялись. Полный score audit и переоценка игровых сценариев не проводились. Нет branch/PR/release продукта от этого аудита. HX-FB-002 после сохранения — audit_completed, рекомендации pending, не cleanup_completed. Старые evidence и чужие результаты сохранены.
