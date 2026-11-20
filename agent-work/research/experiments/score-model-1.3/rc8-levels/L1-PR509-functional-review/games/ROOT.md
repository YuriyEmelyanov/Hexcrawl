# Root: The Roleplaying Game · подготовка карты

Место 7 в топ-20 создания. 14 операций в этом срезе. Функциональная доля 50,00%, вклад в L1 8,33. Минимум со строгой приёмкой 0,00 балла L1. Полнота тематического корпуса открыта.

## ROOT-CORE-001-L1

**Подготовить 12 полян или использовать готовую карту**

Ожидаемый результат — У новой карты12полян; готовая карта не перегенерирована.

**Частично**. Hex regions and POIs exist; there is no Root12-clearing construction profile. Existing import preserves an accepted map, not allRoot invariants.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,60. Минимум по приёмке 0,00.

Дополнительная приёмка из исходной матрицы — Given Выбрана новая карта стандартного Леса. When Завершить добавление полян. Expected Всего12полян; число гексов не выведено из этого правила.; Given Готовая карта содержит12названных полян и подготовленные связи. When Выбрать её для кампании. Expected Названия, положения и связи сохранены; новые броски карты не выполнены.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/ROOT-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/audits/ROOT-L1-runtime-2026-11-10.json) · проверка `ROOT-L1-runtime-2026-11-10-probes.mjs`

## ROOT-CORE-002-L1

**Выбирать преобладающее сообщество с ограничением количества**

Ожидаемый результат — На каждой поляне одно преобладающее сообщество; одинаковое преобладание встречается не больше четырёх раз.

**Отсутствует**. No majority-community field or four-per-community policy in published map/setup model; a descriptive note is not an enforced cap.

Функциональная доля операции 0,00%. Вклад в общий функциональный ориентир 0,00. Минимум по приёмке 0,00.

Дополнительная приёмка из исходной матрицы — Given Кроличьих полян ещё нет; заданd6=2. When Выбрать сообщество. Expected Преобладают кролики; существование мышей/лис на поляне не отрицается.; Given Есть4кроличьи поляны; последовательностьd6=1,5; лисьих меньше4. When Выбрать сообщество новой поляны. Expected Первый результат переброшен; в новой поляне преобладают лисы, пятая кроличья не добавлена.; Given Завершены12полян с тремя допустимыми сообществами и лимитом4. When Проверить итоговую подготовку. Expected У каждого сообщества4поляны; это проверка следствия ограничений.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/ROOT-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/audits/ROOT-L1-runtime-2026-11-10.json) · проверка `ROOT-L1-runtime-2026-11-10-probes.mjs`

## ROOT-CORE-003-L1

**Развивать пути, учитывая существующий вход и предел12полян**

Ожидаемый результат — У поляны планируется общее число путей по броску; существующий вход не посчитан дополнительно. Число полян не превышает12.

**Частично**. Manual roads use adjacent axial segments and protect a geometric network; no Root named-clearing path budget/incoming-count/unfinished-line procedure.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,60. Минимум по приёмке 0,00.

Дополнительная приёмка из исходной матрицы — Given К новой поляне уже подходит1путь; сумма2d6=7. When Наметить остальные пути. Expected Общий план3; добавляются2линии, не3.; Given К новой поляне подходит1путь; сумма2d6=2. When Наметить остальные пути. Expected Общий план1; дополнительных линий0.; Given На карте12полян и2незавершённые линии; ведущий выбирает оставить отметки. When Завершить построение. Expected Полян остаётся12; линии отмечены незавершёнными, не выданы за доступные дороги к новым полянам.; Given Тот же Лес, ведущий выбирает убрать незавершённые линии. When Завершить подготовку. Expected Линии убраны; число и содержимое12полян сохранены.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/ROOT-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/audits/ROOT-L1-runtime-2026-11-10.json) · проверка `ROOT-L1-runtime-2026-11-10-probes.mjs`

## ROOT-CORE-004-L1

**Выбирать неповторяющееся имя поляны**

Ожидаемый результат — У подготовленных полян разные имена; имена существующей карты не переписаны.

**Частично**. POI names are editable and saved; no Root ordered-name catalog, reverse-pair collision policy or Woodland uniqueness enforcement.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,60. Минимум по приёмке 0,00.

Дополнительная приёмка из исходной матрицы — Given ИмяSundell уже занято; задана пара2,6; обратное имяOpensky Haven свободно. When Ведущий выбирает обратное чтение. Expected ВыбраноOpensky Haven по6,2; занятоеSundell не повторено.; Given Оба имени для исходного и обратного порядка уже заняты. When Ведущий выбирает переброс и получает свободное имя. Expected Используется новый свободный результат; старые названия не изменены.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/ROOT-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/audits/ROOT-L1-runtime-2026-11-10.json) · проверка `ROOT-L1-runtime-2026-11-10-probes.mjs`

## ROOT-TO-001-L1

**Название, описание и первое впечатление поляны**

Ожидаемый результат — Поляна сохранила название, мост/ворота как описание места и исходную позицию; конфликт/угроза/NPCне сгенерированы.

**Полностью**. Name and accepted situation/first impression fit existing POI name plus GM note and survive actual import/history. No dedicated clearing model/UI is claimed.

Функциональная доля операции 100,00%. Вклад в общий функциональный ориентир 1,19. Минимум по приёмке 0,00.

Дополнительная приёмка из исходной матрицы — ROOT-TO-001-L1-AC01: Поляна «Ольховый брод»; ситуация — спор о мельнице; первое впечатление — толпа у закрытых ворот. Ведущий сохраняет подготовку поляны. → У поляны доступны название, спор о мельнице и видимая сцена у ворот; это три согласованные части подготовки.
ROOT-TO-001-L1-AC02: У «Ольхового брода» есть описание толпы у ворот. Ведущий меняет первое впечатление на «у ворот дежурит один стражник». → Первое впечатление отражает одного стражника; название и уже подготовленный спор о мельнице сохранены.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/ROOT-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/audits/ROOT-L1-runtime-2026-11-10.json) · проверка `ROOT-L1-runtime-2026-11-10-probes.mjs`

## ROOT-TO-008-L1

**Riverfolk: добавить водные объекты и провести реку**

Ожидаемый результат — На карте подготовлен выбранный водный объект; известные соединения с полянами сохранены, неподтверждённые размеры и направление не придуманы.

**Частично**. Manual water/river editing is reusable geometry, but does not select Root edge clearings or execute its conditional Riverfolk setup. Source lake-direction question remains open.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,60. Минимум по приёмке 0,00.

Дополнительная приёмка из исходной матрицы — ROOT-TO-008-L1-AC01: На карте нет воды; в отдельных выборах d6=1,4,6. Определить вид добавляемой воды. → Соответственно предлагаются река, озеро, река вместе с озером.
ROOT-TO-008-L1-AC02: Выбрана только река; входной край:5, затем1; выходной край:4. Ближайшие поляны к верху и правому краю однозначноA/B. Ведущий намечает русло между краями. → 5 переброшено; река входит сверху черезA и выходит справа черезB. Промежуточное русло определяется намеченными изгибами.
ROOT-TO-008-L1-AC03: Озеро уже есть, дополнительная вода ведущим не запрошена. Начинается подготовка Riverfolk. → Условный выбор нового водного объекта не добавляет второе озеро или реку только из-за включения фракции.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/ROOT-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/audits/ROOT-L1-runtime-2026-11-10.json) · проверка `ROOT-L1-runtime-2026-11-10-probes.mjs`

## ROOT-TO-009-L1

**Расширять озеро с пределом четырёх полян и двух путей**

Ожидаемый результат — Сохранены допустимые расширения озера и ограничения; неясные численные условия остаются видимыми.

**Частично**. Geometric lake editing is not the Root rule limiting four clearings and two lost named paths. Modifier sign remains source-uncertain and is not invented.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,60. Минимум по приёмке 0,00.

Дополнительная приёмка из исходной матрицы — ROOT-TO-009-L1-AC01: Озеро связано сA/B/C; ведущий передал подтверждённый hit дляD. Удаление путей укладывается в предел2. Расширить озеро кD, затем рассмотретьE. → ПодключеныA/B/C/D; на четырёх расширение остановлено, E не добавлена.
ROOT-TO-009-L1-AC02: При подготовке озера уже стёрты два пути; подключениеE требует стереть третий. Рассмотреть это расширение. → Третий путь не стёрт; такой вариант не выдан за соответствующий пределу источника.
ROOT-TO-009-L1-AC03: Есть сырые2d6 и буквальное subtract–1; знак модификатора не уточнён. Порог hit уже известен:7+. Ведущий хочет вычислить исход расширения. → Нужное уточнение знака остаётся явным; порог больше не помечен неизвестным. Итог из сырых кубиков не выдуман.
ROOT-TO-009-L1-AC04: Для допустимого кандидата озера уже переданы скорректированные итоги6,7,10; знак модификатора в этом примере не вычисляется. Определить только условие hit. → 6 — не-hit;7 и10 — hit. Остальные условия расширения проверяются отдельно.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/ROOT-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/audits/ROOT-L1-runtime-2026-11-10.json) · проверка `ROOT-L1-runtime-2026-11-10-probes.mjs`

## ROOT-SCOPE-M01

**Крепость как конкретное место**

Ожидаемый результат — KнаходитсявA; новых полян и фракционного контроля не создано.

**Частично**. Именованная постройка или вход в выбранном месте и повторное открытие проверены через реальные команды POI. Специфичная связь с поляной, сценой или услугой из этого правила отдельно не подтверждена.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,60. Минимум по приёмке 0,00.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/ROOT-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/ROOT-scope-audit.json) · проверка `ROOT-L1-runtime-2026-11-10-probes.mjs`

## ROOT-SCOPE-M02

**Roost как укреплённая постройка**

Ожидаемый результат — BсодержитвыбранныйRoost; присутствие/контроль соседей не назначены.

**Частично**. Именованная постройка или вход в выбранном месте и повторное открытие проверены через реальные команды POI. Специфичная связь с поляной, сценой или услугой из этого правила отдельно не подтверждена.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,60. Минимум по приёмке 0,00.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/ROOT-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/ROOT-scope-audit.json) · проверка `ROOT-L1-runtime-2026-11-10-probes.mjs`

## ROOT-SCOPE-M03

**Выбранные постройки поляны**

Ожидаемый результат — ВAсохраненывыбранныепостройки; не созданы2NPC/2проблемы и не обещана полная108ячейковаятаблица.

**Частично**. CROWS runtime на том же SHA поставил и именовал две отдельные POI в одном регионе, сохранил обе. Привязка двух построек именно к одной поляне отдельной сущностью не доказана.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,60. Минимум по приёмке 0,00.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/ROOT-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/ROOT-scope-audit.json) · проверка `ROOT-L1-runtime-2026-11-10-probes.mjs`

## ROOT-SCOPE-M04

**Конкретное место и простое сведение о жителе**

Ожидаемый результат — SсохранёнвA; фактработыРинасохранён; мотивы/характер/конфликт/трекивреданесозданы.

**Частично**. Прямой тест score13-surface.mjs на релизе: неподвижное логово, признак и причина либо именованный склад и факт о Рине восстановлены при повторном открытии. Заметка принадлежит гексу, у признака отсутствует независимая видимость.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,60. Минимум по приёмке 0,00.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/ROOT-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/ROOT-scope-audit.json) · проверка `ROOT-L1-runtime-2026-11-10-probes.mjs`

## ROOT-SCOPE-M05

**Сад как конкретный объект**

Ожидаемый результат — ВCрасположенG; Outcast/присутствие/контрольневычислены.

**Частично**. Именованная постройка или вход в выбранном месте и повторное открытие проверены через реальные команды POI. Специфичная связь с поляной, сценой или услугой из этого правила отдельно не подтверждена.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,60. Минимум по приёмке 0,00.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/ROOT-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/ROOT-scope-audit.json) · проверка `ROOT-L1-runtime-2026-11-10-probes.mjs`

## ROOT-SCOPE-M06

**Торговый пост как место снабжения**

Ожидаемый результат — PсохранёнвD; экономика/цены/численностьфракциинепридуманы.

**Частично**. Именованная постройка или вход в выбранном месте и повторное открытие проверены через реальные команды POI. Специфичная связь с поляной, сценой или услугой из этого правила отдельно не подтверждена.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,60. Минимум по приёмке 0,00.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/ROOT-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/ROOT-scope-audit.json) · проверка `ROOT-L1-runtime-2026-11-10-probes.mjs`

## ROOT-SCOPE-M07

**Вход туннеля как место/проход**

Ожидаемый результат — ВходTотмеченвE; контроль/время/вместимость/конечнаятрассанепридуманы.

**Частично**. Именованная постройка или вход в выбранном месте и повторное открытие проверены через реальные команды POI. Специфичная связь с поляной, сценой или услугой из этого правила отдельно не подтверждена.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,60. Минимум по приёмке 0,00.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/ROOT-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/ROOT-scope-audit.json) · проверка `ROOT-L1-runtime-2026-11-10-probes.mjs`
