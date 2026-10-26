# HX-BL-003 — P1-V2: допроверка PNG и навигации

Версия1.0,26.10.2026. Статус: ready_for_developer_harness_freeze. Это перспективное дополнение к spec1.0/P1, утверждённое решением owner-approval-2026-10-26-HX-BL-003-V2 («Разрешаю замер»). Сам замер аналитиком не выполнялся. Действует только на новый ограниченный пакет; старые измерения и выводы не переоцениваются задним числом.

Основания: [утверждённый план](../proposals/HX-BL-003-V2-validation.md), [согласования](../approvals.json), [независимое заключение739e3de](../evidence/review-HX-BL-003-739e3de/report.md). [Исходная спецификация1.0](archive/HX-BL-003-spec1.0.md) сохранена целиком. Новое дополнение уточняет агрегат и диагностические наблюдения; не отменяет AC01–08, не меняет веса/пороги/качество и не разрешает новую оптимизацию.

## Пользовательский результат и границы

Интерфейс, карта, игровые данные, действия и форматы — без изменений. Сейчас подтверждено ускорение generation34.41%/36.15% в прежней конечной серии, но пакет не принят: две большие PNG-пары отсутствуют, pooled navigation p95 превышал guard в двух группах, exact-head CI не прошёл. После допроверки будут новые доказательства либо явный blocked/inconclusive/fail. Дополнительное ускорение не обещается. Фактический пример исходной/итоговой карты и времени уже в PR474; новые PNG при успехе становятся дополнительным примером неизменности.

Никаких новых карт, seed/N, generation timing, selection series, второго bottleneck, изменения PNG quality/scale/экспортера, UI-правки seed изPR475 или платных ресурсов. HX-FB-001 рассмотрен: defer, отдельный уже готовый PR475; включение меняет условия benchmark и не нужно для диагностики. Его очередь независимой проверки сохраняется.

## Замороженные источники и входы

A production baseline: 103d31b9f6f5c76b1f6b45d9d6664fe3f75dd63b.
B production candidate: 739e3de36587533bf3d2f3196072270f4695fa8a, PR474.
До выполнения программист коммитит один harness-only пакет, manifest и этот протокол/ссылку на его immutable commit. Runtime src/public/package-lock обеих сборок строго соответствуют A/B; доказать diff/tree/hash, не смешивать с новым main/PR475. Harness SHA и SHA256 всех скриптов/входов фиксируются ДО новых измерений. Новые проверки не запускаются как часть синтаксической проверки harness.

Источники existing frozen corpus: reports/HX-BL-003/corpus/fixed-corpus.zip; manifest input SHA256 c17c66bd906bb00f044927be5cf535a0c0f559dadb64bba31cfbd676ae80443a. AFTER файлы из существующего baseline-output artifact/manifest, а не новое расширение. Проверить архив/каждый файл по существующим хэшам; отсутствуют — blocked, не пересоздавать и не менять seed. При получении артефакта сохранять ID/хэш/точный источник.

| Назначение | Файл | SHA256 | Фактический N |
|---|---|---|---|
| Navigation before | mythic-0-N1200.json из исходного corpus | b27af520a75a54e893936e96b0cb24adc90aa1fc06eaec60e28e94408ba7f9a0 |1208|
| Navigation before | mythic-0-N2400.json из исходного corpus |90ad8db4f1eda2631ecd96dc130d750b2b6d5c0f736cbe08d3159a9f59175e2a|2493|
| PNG AFTER | mythic-0-N2400-after.json |d379e39077c9468fc16ffff15027657ca8073010dd8b011f88b6876cf2378391|2714|
| PNG AFTER | mythic-123456789-N2400-after.json |280d98bc93c053827143e36c6597781346a8edb32ac21c30733f430225ba3171|2590|

Navigation использует те же исходные cp.path JSON, что restore() старого paired harness. Не подменять их повторно экспортированным -before.json с другим байтовым хэшем. Полное семантическое равенство документа проверять после импорта; единственное прежнее исключение savedAt остаётся записанным, массивы/streams/числа не нормализовать. Внутренние Map/Set не сравнивать через JSON.stringify.

## Среда и порядок

Один обычный GitHub Linux runner, тот же ресурсный профиль предыдущей paired среды (4vCPU, около16GB RAM; recorded AMD EPYC7763), без параллельных tests/measurement/build процессов во время сбора. Полные OS/CPU/RAM/runner/image и фактические версии/путь Chromium фиксируются. Node24 (полный номер), Playwright1.62.1, Chromium151.0.7922.34, прежний lock SHA2566b7a348067a218afce320ca370bee8cd323eff14fbdf9a24fbbfc5e3deedcee7. Один и тот же host/версии для A/B. Недоступны требуемая версия браузера или ресурсный профиль — blocked_environment без молчаливой подмены. Предыдущие результаты разных runner не объединять с новой серией.

Production, headless, viewport1500×1000,DPR1,scale1.5,rotationfalse,RU,без CPU-throttle. Аналитику mc.yandex блокировать одинаково, её abort помечать отдельно. Остальные запросы/ошибки не игнорировать. Сохранить прежнюю одинаковую preload стратегию для navigation: ассеты и fonts готовы до измеряемых событий; незавершённую загрузку не выдавать за успешный settle.

Один workflow attempt, один measured job timeout60мин; auto-rerun отключён. 180сек внешнего watchdog на действие/экспорт, действующий при зависшем browser main thread; preparation/import/settle также ограничены180сек и общим job timeout. Все запланированные строки записать до начала, после каждой операции flush result. При глобальном лимите — оставшиеся not_executed, частичный результат и логи сохраняются always. Ошибка конкретной пары не разрешает её повтор; незатронутые заранее запланированные строки можно исполнить в остатке того же пакета. Общесистемная ошибка/непригодная среда — остановка.

Порядок в одном job: сначала navigation в двух группах N1200 затемN2400, затем четыре isolated PNG. Это не новая серия расширения. Сбор без дорогостоящего trace при navigation; минимальные одинаковые probes. Диагностический PNG код не устанавливать в навигационные контексты.

## Навигация: ровно20 измеряемых действий +4 прогрева

Для каждого input отдельные A/B contexts, последовательное исполнение, неиспользуемый context idle. Сначала один warmup каждого варианта (A,B), затем пять пар iteration0..4 в порядке AB,BA,AB,BA,AB. В обеих группах этот порядок одинаков, фиксируется заранее. Каждый warmup/measured action начинается повторным импортом того же original JSON, восстановлением options/scale/color и ожиданием ready/assets. Cold и generation вновь не измерять.

Одно action содержит весь исходный nav() сценарий: scrollLeft500,scrollTop300, пауза700ms; центр map-viewport;24 WheelEvent с deltaY -12 для первых12 и+12 для следующих12, один шаг/rAF; пауза220ms; mousedown,24 mousemove по4px/2px за шаг/rAF,mouseup, прежняя пауза220ms. Использовать реальные listeners с прежними координатами/events. Записать rAF timestamps и каждый delta,24 zoom и24pan на action, события/mark start/end, buffer/cache state и доступный heap. Не добавлять новые selection действия.

Primary statistic ДО данных: для каждой input/variant/phase (zoom И pan раздельно) concatenate24frames ×5measured actions=120; ascending nearest-rank p95 = элемент с1-based rank ceil(.95×120)=114. Без интерполяции, удаления выбросов, исключения неудачных повторов или смешивания N/phase/variant. Единица — ms. Прогрев в агрегат не входит, но сохраняется. Frames вложены в5действий:120не являются120независимыми повторами.

Secondary: все5per-run p95 (rank23 из24), median этих5p95, min/max, все парные delta/ratio, pooled max, counts/fractions >50ms и>500ms (знаменатель фактический), время settle/import отдельно, ошибки и timeouts. Сохранить старый raw и ОБА прежних агрегата. Новый primary не делает прежнюю серию принятой.

Guard неизменен: regression по phase/input, если B_p95-A_p95 >10ms И B_p95 >1.10×A_p95 (строго оба). Report delta_ms и relative_delta, baseline0 обрабатывать явно без деления/выдуманного ratio. Любая отсутствующая/неfinite frame, неполное action или timeout => группа incomplete/inconclusive, не success и не перестановка/добор повторов. Таймаут не добавлять как успешное число180000ms. Операционный guard breach => nonpassing; причинную регрессию по5повторам автоматически не доказывает. Нет breach при полной серии означает только pass данного bounded guard, не полную приёмкуAC04/S09-C01. Новый gain не выводить из navigation-only серии.

## Четыре PNG: диагностика без изменения поведения

Фиксированный порядок: mythic0 AFTER A,B; mythic123456789 AFTER A,B. Свежий процесс Chromium для КАЖДОГО export; штатный импорт и color/defaults, прежнее ожидание artwork/assets/fonts, тот же production PNG button и полный масштаб/качество. Ровно одно нажатие на каждую строку, максимум4нажатия; preflight failure не разрешает дополнительный export/замену строки. Последующее чтение полученного файла/сравнение не является новым export. Не запускать старый полный visual suite дополнительно.

Наблюдения с monotonic timestamps и wall-clock: page/import/render/assets/fonts ready; каждый request/requestfinished/requestfailed и URL/тип/status; pageerror/console/dialog; экспорт click; SVG/image Blob create/objectURL/revoke; загрузка/ошибка export image и завершение существующего decode, если вызван; canvas width/height, drawImage start/end, toBlob/toDataURL/encode callback start/end, create/download/copy/error; browser/process exit, memory when exposed (иначе unavailable). Missing phase явно not_observed, не придумывать факт.

Наблюдать через CDP/listeners; если нужны transparent wrappers существующих browser APIs — одинаковые A/B, исходные this/arguments/return/promise/errors/callback order сохраняются, никаких дополнительных decode/loads, await/sleep, canvas allocation, изменения MIME/quality, timeout/веток экспортера. Без monkeypatch src exporter. Минимальные event records, без тел/крупных dataURLs/синхронных логов на каждый пиксель; сохранить manifest wrappers и статический diff до выполнения. Часть фаз ненаблюдаема — признать ограничение; не запускать второй диагностический экспорт ради неё. Observed canceled requests не равны доказанной корневой причине.

Внешний watchdog180s от PNG click до download/copy; зависание decode/encode не блокирует фиксацию timeout и завершение browser. При успехе сохранить полныйPNG и размер/sha256, декодировать обе картинки вне измеряемого браузера, сравнить width/height и ВСЕ RGBA bytes попарно. Хэш сжатого PNG сам по себе не визуальная эквивалентность. Для каждого из2inputs обязательны A/B successful PNG и точное decoded равенство; хотя бы один missing/different =>AC06blocked/fail. SVG/JSON/старые PNG не подменяют недостающее. Сохранить исходные JS/asset failures независимо от успешного download.

## Приёмка и передача

V201: immutable addendum/оригинал, input hashes, source/lock/harness/environment manifest до сбора; syntax check скриптов без запуска benchmark. Runtime diff без новых продуктовых изменений.
V202:4warmups и20measured rows или полный план с явными not_executed; raw24×2frames на action, заданные pairing/aggregate/guards, все ошибки и вторичные метрики без подбора. Программист передаёт compute script и raw; reviewer независимо пересчитывает.
V203: не более4PNG attempts, все lifecycle записи/limitations, artifacts/hash;2decoded pixel pairs либо явный blocked. Никаких quality fallbacks.
V204: полный старый evidence/отрицательные результаты сохраняются; AC02/05/08 large native history/selection limitations остаются открыты, новая серия их НЕ закрывает. Результат допроверки не приравнивается к приёмке всего пакета.
V205: на точном конечном source/harness SHA штатные check/browser/RNG с полными логами. Check40252463579 action_required остаётся отдельной технической зависимостью; available tools не умеют approve workflow. Не подменять его parent CI, не менять runtime ради триггера. Новый harness commit естественно получает свой CI; его успех фиксировать на том SHA, reviewer проверяет tree/runtime parity и весь пакет. Нужное разрешение workflow не заменять повторным измерением.
V206: независимый reviewer (fresh agent если доступен) оценивает окончательный SHA и original+new evidence, все открытые findings и score_assessment1.2. Не запускать новый measured пакет reviewer автоматически: пересчёт raw и безопасные проверки не новый benchmark. Изменившийся SHA требует актуализации заключения.

Результат разработчика содержит run_id/attempt, A/B/harnessSHA/tree/hash, полный execution manifest, raw/navigation summary/PNG lifecycle и файлы, счётчики attempts/actions/not_executed, CI/логи, таблицуAC/findings, ресурсные ограничения и nextstep. Непрохождение/inconclusive/blocked допустимы; после лимита возвращается проверяющему без второго исправления/цикла и без очередного согласования уже разрешённого пакета. Новый scope сверх утверждённого потребует отдельного решения.

## Score1.2 и применимость

Модель agent-work/strategy/score-model.md, blob bf22bd53a75f5f337c637bf94922d12915ffbd74. Источник before: последний reviewer739e3de и current-score;193.75/unverified70 — история1.1, текущий итог1.2 unknown_pending_reassessment. Нет миграции баллов по номеру версии.

| criterion_id | Исторический before1.1 | Before1.2 | Expected after/delta | Отдельное evidence |
|---|---|---|---|---|
|S09-C01|G2/10,вес20|unknown|unknown; улучшение generation не полный grade|original paired generation + новые navigation raw/aggregates/guards + environment/errors; нет Android/user confirmation|
|S02-C01|G1/7.5,вес30|unknown|score-neutral forecast, confirmed deltaunknown|точные исходники/полный JSON/RNG и продолжение из original safety; не от navigation timing|
|S03-C05|G2/10,вес20|unknown|score-neutral forecast, confirmed deltaunknown|отдельные native snapshots/undo/redo/continuation; large gaps сохраняются|
|S04-C04|G2/7.5,вес15|unknown|score-neutral forecast, confirmed deltaunknown|новые fullPNGdecodedpairs и отдельный JSON round-trip/SVG evidence; missingPNGblocked|
|S09-C04|G2/5,вес10|unknown|score-neutral forecast, confirmed deltaunknown|отказы/rollback/import/stale callbacks из safety, таймауты и сохранность документа; CSVtiming не safetyproof|

S09-C01 — технический критерий, квота20игр N/A; performance пригоден для собственного роста карты Mythic Bastionland (режим проекта) и контрольного system-neutral classic. OSE ClassicFantasy, Pathfinder2 Remaster/Hexploration, Shadowdark Corev4.6 — сценарии роста собственной карты, ForbiddenLands core — навигация по большому фиксированному миру/наполнению, не новая география. Книги в этом bounded пакете не перечитываются: источник применимости — existing vision1.2/market register/backlog003 game_relevance. Никакой новой полной поддержки этих редакций не доказано; ручная подготовка мастером/import/layout/игровые правила остаются за пределами замера. Для S02/S03/S04/S09-C04 общепродуктовые регрессионные требования действуют вне системы; широта игровых сценариев unverified, никаких баллов за числоигр.

Reviewer фиксирует before/after/delta или insufficient_evidence отдельно по каждому критерию, метод/точныйSHA/ограничения; отсутствие нового grade не превращать в0grade или новыйприрост. Модель50критериев/1000, G0..G4=0/.25/.5/.75/1 и веса сохраняются. До отдельного выпуска score не изменяется. Выпуск НЕ разрешён этим документом. После разрешённого выпуска обязательный score_update_pending стратегу.

Start/end automations.peek и сохранение automation_health обязательны каждой роли; задача остаётся включена при blocked/готовности/ожидании. latest.json последним, чужие claims не перетирать.
