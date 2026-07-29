# HexCrawl: аудит технического фундамента

**Дата:** 2026-07-29  
**Режим:** AUDIT ONLY — исходный код и конфигурация не изменялись.  
**Область:** корректность, достижимость, фактическое использование кода и ресурсов, пригодность фундамента к масштабированию генератора.

## 1. Резюме

Приложение собирается Vite и имеющиеся 9 unit-тестов проходят, однако это создаёт ложное ощущение целостности: строгая проверка TypeScript завершается **45 диагностическими ошибками**, среди которых не только неиспользуемый код, но и отсутствующие идентификаторы (`TRANSLATIONS`, `centerHex`, `existingRegions`, `pathHasLake`) и небезопасное использование nullable `biomeId`. Vite транспилирует TypeScript без type-check, поэтому production build не обнаруживает эти дефекты.

Текущий фундамент трудно масштабировать безопасно:

- `src/App.tsx` содержит 13 995 строк и объединяет UI, геометрию, генерацию биомов/рек/моря/дорог, сериализацию, валидацию и profiling;
- в файле подтверждены 37 локальных функций без вызывающей стороны и один вычисляемый, но не используемый результат;
- 12 публичных графических ресурсов и отдельный корневой PNG не имеют потребителя в репозитории;
- 11 экспортов `App.tsx` используются только внутри этого же файла (экспорт как публичный контракт не обоснован);
- временный profiling и большое количество безусловных `console.log` входят в production bundle;
- тесты охватывают четыре маленьких river-модуля, но не основной генератор в `App.tsx`; тесты не подключены к `npm scripts`.

**Итоговая оценка:** функциональный прототип, но не надёжный масштабируемый фундамент. Главный риск — невозможность получить статически проверенную baseline-версию и отделить активные алгоритмы от оставшихся реализаций/обёрток.

## 2. Методика и критерии доказательства

Проверены все tracked-файлы, импорты/экспорты, package manifest, ссылки на assets, диагностические конструкции, catch-блоки и объявления в `src`. Использовались независимые сигналы:

1. TypeScript с `--noUnusedLocals --noUnusedParameters --allowUnreachableCode false`;
2. обход AST TypeScript с подсчётом ссылок на символ;
3. точный поиск идентификаторов и имён ресурсов по tracked source/config/test-файлам;
4. проверка module graph от `src/main.tsx`, production build и запуск всех существующих тестов.

Классификация:

- **confirmed unused** — объявление имеет только собственную AST-ссылку, TypeScript независимо выдаёт TS6133 и поиск не находит вызова; либо вычисленное значение не читается;
- **probably unused** — внутреннего потребителя нет, но внешний URL/public API теоретически возможен;
- **usage not proven** — инструмент не доказал отсутствие использования или конструкция может быть активирована редким runtime-сценарием.

Один результат инструмента сам по себе не использовался как достаточное доказательство.

## 3. Correctness blockers

### 3.1 Строгая компиляция не проходит

`npx tsc --noEmit` (и усиленный вариант аудита) обнаруживает ошибки, которые Vite build скрывает:

| Место | Доказательство | Риск |
|---|---|---|
| `App.tsx:1186`, `8203` | обращение к несуществующему `TRANSLATIONS` | `ReferenceError` при выполнении соответствующих formatter/POI-веток |
| `App.tsx:6011` | `centerHex` и `existingRegions` отсутствуют в scope | `ReferenceError` при достижении ветки sea layout |
| `App.tsx:11219` | shorthand `pathHasLake` не объявлен | `ReferenceError` в ветке результата третьей освоенной дороги |
| `App.tsx:11984–12020` | `BiomeId \| null` используется как ключ и сохраняется как `BiomeId` | последний fallback не доказывает получение биома; возможны некорректные данные/label |
| `App.tsx:583` | `.map()` расширяет литералы `RiverSlopeDirection` до `string` | нарушен заявленный тип направления |

Это не «мёртвый код» по умолчанию: ветки зависят от состояния карты и генератора. Их следует считать потенциальными runtime-дефектами, пока тест или доказательство инварианта не покажет недостижимость.

### 3.2 Результат вычисляется и отбрасывается

**Confirmed unused:** `hexEmojiLayout` вычисляется через `getHexEmojiLayout(...)` на `App.tsx:13410`, но после объявления не читается. JSX ниже строит отображение другим путём. Доказательство: TS6133, AST содержит только declaration-reference, точный поиск имени даёт одну строку. Это лишняя работа на каждый отрисованный hex.

### 3.3 Параметры без семантического эффекта

**Confirmed unused:** `translateCoastNotice(message, language)` на `App.tsx:532` всегда возвращает `message`; `language` не читается (TS6133). Для английского интерфейса функция создаёт ложный контракт перевода.

**Confirmed unused:** параметр `terrainMap` на `App.tsx:2902` не читается; `regionId` и `existingRegions` у `searchConnectedSeaSubset` (`5639–5640`), `regionId` (`6105`), `issues` (`7744`) и `regionHexes` (`10542`) также не читаются. Это подтверждено TS6133 и AST identifier binding.

**Confirmed unused:** `sanitizeRiversForSea` (`10634–10646`) явно делает `void` пяти параметров и безусловно возвращает `nextRivers`. Это identity-функция с вводящим в заблуждение названием; любой вызывающий код не получает sanitization.

### 3.4 Условия always true/false и недостижимые ветки

Явных литеральных `if (true/false)` не найдено. Пять `while (true)` имеют выходы и потому не признаны бесконечными/недостижимыми. TypeScript с `allowUnreachableCode=false` не сообщил отдельной недостижимости, но результат ограничен другими semantic errors.

**Usage not proven:** из-за ошибок типов и отсутствия тестового прохода по основному генератору нельзя надёжно доказать достижимость сложных fallback-веток. В частности, ветки с отсутствующими идентификаторами выше нельзя объявлять мёртвыми только потому, что smoke-build завершился.

## 4. Реестр использования

### 4.1 Confirmed unused

Следующие локальные функции одновременно: (a) отмечены TS6133; (b) имеют ровно одну ссылку на собственный символ по AST; (c) не имеют вызова/передачи как значения по точному поиску:

| Подсистема | Функции (строка объявления в `src/App.tsx`) |
|---|---|
| Hex/sea primitives | `normalizeEdgeKey` (607), `getNonSolitarySeaHexKeys` (715), `getAdjacentSeaHexesForRegion` (4309), `getHexNeighbor` (4570) |
| Biomes/rivers | `chooseBiomeLandType` (1238), `getRiverSectorFullness` (1783), `normalizeRiverSectorOrder` (1901), `getRiverSectorsForHex` (2548), `chooseRandomRegionExteriorVertexPair` (3581), `validateRiverPathUsesExteriorEndpoints` (3589), `restoreRiversStartingFromSea` (7800) |
| Coastal sea — старый pipeline | `chooseSeaAdjacentCenterHex` (5487), `connectRequiredSeaKeys` (5580), `expandConnectedSeaArea` (5604), `searchConnectedSeaSubset` (5632), `getSeaFlowingRiversForRegion` (5700), `validateGlobalSeaConnectivity` (5844) |
| Roads | `getRoadedPoiTargets` (8541), `findWildIncomingRoadEndpointsForRegion` (9073), `getWildIncomingRoadPairCandidates` (9342), `chooseBestWildIncomingRoadPairCandidate` (9390), `addWildIncomingRoadPairCandidate` (9399) |
| Старые sea/river wrappers | `getRiverTouchingSeaAwayFromMouth` (10274), `getRiverTouchingSeaThroughRegionHexAwayFromMouth` (10304), `candidateHexHasRiverEdgeOrSourceAwayFromMouth` (10382), `filterSeaCandidatesByRiverInteraction` (10402), `filterSeaCandidatesByRoadEndpoints` (10474), `candidateTouchesHexTouchingRiverStartVertex` (10512), `candidateHexHasRiverEdgeAwayFromMouth` (10521), `trimRiverEndsToLand` (10601), `riverTouchesSea` (10649) |

Особенно сильное доказательство для последних wrappers дают комментарии «со старой сигнатурой»: активный код использует предварительно построенные индексы напрямую, а compatibility wrappers уже не вызываются.

Также подтверждены:

- `public/.gitkeep`: каталог содержит tracked assets, поэтому placeholder больше не выполняет функцию;
- `forest-tile.png` в корне: не импортируется/не упоминается и не копируется Vite в `dist` (в отличие от `public/forest-tile.png`); production build его не содержит;
- экспортные модификаторы 11 helpers в `App.tsx` не имеют внешнего потребителя: `rollRegionTargetSize`, `getRegionSizeCategory`, `getRegionSizeDisplay`, `getHexNeighbors`, `getGrowthCandidate`, `weightedPickCandidate`, `findFillableEnclosedEmptyAreas`, `getFrontierCandidateHexes`, `generateConnectedRegionFromAnchor`, `chooseRegionCenter`, `getCandidateHexes`. Каждая функция вызывается внутри `App.tsx`, но ни один другой модуль/тест её не импортирует. **Не функции, а именно exports являются unused.** Пакет `private`, library entry/exports отсутствуют.

Неиспользуемых imports или npm dependencies не подтверждено: каждый import участвует в модуле, а все пять devDependencies задействованы TypeScript/Vite-конфигурацией; `react` и `react-dom` — runtime entrypoint.

### 4.2 Probably unused

Внутри репозитория нет ни одной ссылки на следующие файлы `public`: `cactus.png`, `evergreen_heavy.png`, `forest-tile.png`, `forest_heavy.png`, `forest_mixed.png`, `grassland.png`, `hills_grassy.png`, `mountain.png`, `open-plains-tile.svg`, `swamp.png`. В `BIOME_TILE_HREFS` используются другие, capitalized assets. Файлы не названы confirmed unused только потому, что `public/` допускает прямой внешний URL, который невозможно исключить анализом репозитория.

`public/forested_hills.png` также вероятно не используется: совпадения — часть имени других файлов/строк, но точного URL `/forested_hills.png` нет. `public/waterfall.svg` **используется** в двух JSX URL и исключён из кандидатов.

Экспорты типов `RiverCrossingKind`, `RiverCrossingContext`, `RiverRapidsContext`, `RiverWaterfallContext` и `RiverFullness` частично нужны между source-модулями. Неиспользуемых экспортов в четырёх малых river-модулях не подтверждено: функции имеют app- и/или test-потребителей.

### 4.3 Usage not proven

- Debug SVG classes и вычисления boundary/river graph могут использоваться только при переключателях UI; статический анализ не моделирует React state, поэтому они не объявлены unused.
- Содержимое `public/` может запрашиваться вне приложения (закладки, внешние страницы, CDN); отсутствие внутренних ссылок доказывает лишь отсутствие repository consumer.
- GitHub Actions workflow является внешней точкой входа и не должен оцениваться по import graph приложения.
- `while (true)` на строках 5206, 5239, 6572, 8824, 10732 не признаны ошибкой без доказательства отсутствия `break`/`return` для всех состояний.

## 5. Debug/profiling и обработка ошибок

### 5.1 Устаревший/production debug

**Confirmed present, removal decision not inferred:** строки 7–56 содержат секцию, прямо названную «временным профилированием». Она активируется `?profile=1`, оборачивает ключевые функции, хранит глобальную статистику, ставит timer и пишет `console.log/table`. Код включён в production bundle и не ограничен dev-mode или авторизацией.

Кроме profiler, в `App.tsx` найдено более 40 безусловных `console.log/warn`, включая результаты генерации регионов, дорог, рек, озёр и boundary debug. Некоторые warn — полезная диагностика инвариантов, но обычные logs создают шум, раскрывают внутреннее состояние и увеличивают hot-path overhead. Централизованного logger/уровней/telemetry policy нет.

### 5.2 Catch-блоки

| Категория | Места | Оценка |
|---|---|---|
| Полностью проглоченная ошибка | `App.tsx:11548` | **Подозрительно:** пустой `catch` при построении `riverGraphsByRegion`; комментарий `debug only` не сохраняет даже region id. Debug UI молча показывает неполные данные. |
| Ошибка → warn → продолжение | 2533, 3145, 3404, 7573, 12235 | Может быть осознанной деградацией, но вызывающая сторона не получает structured failure. Особенно broad catches вокруг генерации способны принять частично изменённые данные. |
| Ошибка → fallback tract | 12541 | Сохраняет работоспособность, но ловит любой exception и тем самым маскирует programmer errors (`ReferenceError`, нарушенный invariant) как допустимую генерационную неудачу. |
| Ошибка на границе UI | 13090, 13142 | Корректнее остальных: лог + локализованный alert; JSON import обновляет state только после parse/assert. |

Рекомендованный принцип: ловить ожидаемые domain failures типизированно; programmer/invariant failures не превращать в генерационный fallback; возвращать `Result`/discriminated union с причиной, attempt и region id.

## 6. Архитектура и тестируемость

1. **Монолит.** `App.tsx` — 13 995 строк против 122 строк во всех четырёх вынесенных river-модулях вместе. Изолированные модули хорошо тестируются; основной генератор связан с React state и DOM.
2. **Ненадёжный quality gate.** `npm run build` не запускает `tsc`; отдельного `typecheck`, `test`, lint или CI quality job нет. Deploy workflow вызывает только build, поэтому описанные semantic errors допустимы к публикации.
3. **Слабое покрытие.** 9 тестов проверяют crossings/fullness/rapids/waterfalls. Нет тестов на connected-region growth, sea connectivity, biome fallback, river graph/sector invariants, roads, serialization round-trip и генеративные свойства.
4. **Тесты не являются npm-командой.** Для запуска требуется знать `node --test test/*.test.mjs`; CI их не вызывает.
5. **Воспроизводимость.** `package-lock.json` не tracked, версии заданы диапазонами `^`; одинаковый commit может получить разные transitive versions.
6. **Смешение nondeterminism и логики.** Многие функции вызывают `Math.random()` напрямую; стабильные random helpers сосуществуют с нестабильными. Это затрудняет replay дефектной карты и property-based testing.
7. **Слабый внешний контракт сохранений.** Runtime assertion полезен, но schema/version migrations и отдельные contract tests не видны; большой assertion/serializer остаётся внутри UI-файла.

## 7. Приоритетный план оздоровления (без изменений в рамках аудита)

### P0 — получить честную baseline

1. Исправить все semantic ошибки `tsc`, добавить `typecheck` и сделать `build`/deploy зависимым от него.
2. Добавить `test` script и запускать typecheck + tests в CI до deploy.
3. Добавить lockfile и использовать reproducible install (`npm ci`).
4. Написать targeted tests, достигающие четыре ветки с отсутствующими identifiers и nullable biome fallback.

### P1 — отделить генератор от UI

1. Разделить доменные типы, hex geometry, RNG, region growth, biome selection, rivers, sea/coast, roads/POI, validation и persistence.
2. Передавать seedable RNG как зависимость; сохранять seed/версию алгоритма.
3. Зафиксировать инварианты property-тестами: connected regions/sea, отсутствие циклов и duplicate river edges, непрерывность дорог, валидность fullness/height.
4. Заменить broad exception flow на typed domain results.

### P2 — удалить подтверждённый балласт

1. Удалять confirmed-unused функции небольшими subsystem-коммитами после добавления characterization tests.
2. Удалить лишние export-модификаторы либо оформить осознанный generator API и тестировать через него.
3. Проверить access logs/deployment references для probable assets, затем удалить подтверждённо невостребованные.
4. Убрать временный profiler из production либо оформить dev-only instrumentation; заменить console logging на уровневый logger.

## 8. Выполненные проверки

- `git ls-files`, line counts и module/import/export inventory;
- `npx tsc --noEmit --noUnusedLocals --noUnusedParameters --allowUnreachableCode false` — fail, 45 diagnostics;
- TypeScript AST symbol-reference scan — подтверждение функций с единственной declaration-reference;
- exact `rg` по каждому кандидату и каждому asset basename;
- `npm run build` — pass;
- `node --test test/*.test.mjs` — pass, 9/9;
- проверка `dist` после build — корневой `forest-tile.png` отсутствует.

Аудит намеренно не удаляет и не исправляет код: единственное изменение репозитория — этот отчёт.
