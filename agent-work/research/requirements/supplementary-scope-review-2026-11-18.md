# Дополнительные материалы: решения после ревизии

18 ноября 2026 года · [JSON](supplementary-scope-audit-2026-11-18.json)

Проверены все 50 рабочих примеров в 26 документах из сохранённого инвентаря. В заключительной сверке каталога requirements найден и проверен ещё один общий handoff о переносе POI с результатами таблицы. Источники, исходные операции, числа, evidence и immutable run reports сохранены; новые главы не читались.

## Что изменилось для приложения

Локальная тактическая сетка Cosmere и планетарные досье Void Atlas выведены из рабочего объёма. Карта игроков и темп путешествия отделены от L1. Сюжетные примеры, оправданные только записью текста, больше не служат требованиями. Сведения о конкретной библиотеке, таверне, хозяине или статической опасности допустимы в узкой операции наполнения выбранного места; общий генератор NPC, сюжета и боевых эффектов из этого не следует.

Старое условие отдельной 5-мильной сетки Crows заменено принятой совместимостью «5–6 миль». Стартовая деревня может содержать список услуг; уровни и экономика учреждений остаются исходными фактами, не управляющей подсистемой.

| Решение | Проверенных строк |
|---|---:|
| Для карты (L1) | 36 |
| Вне объёма | 5 |
| Не принято до решения | 4 |
| Отложено до ведения (L2) | 5 |
| Узкая внешняя граница (L3) | 1 |

Количество строк не является количеством функций, задач или баллов. Совпадающие жизненные циклы и операции разных источников переиспользуются. Неизвестная реализация не считается отсутствием.

## Правило или наблюдение → операция → решение

Большинство этих документов описывает практику мастеров или чужие инструменты, а не нормативные правила игры. Для исходного смысла и полного evidence указан неизменяемый blob SHA. Текущие суженные операции и их полные acceptance cases находятся в JSON.

### SUP-SCOPE-001 — Для карты (L1)

Материал: agent-work/research/market/CAIRN2-map-practice-2026-11-09.json/product_connection/operational_requirement · blob 2b28dc80756ceebdb1e190b1ec6fbc35dc48feb1

Выбранные места и реальные связи между ними образуют карту; точное переиспользование CAIRN2-PC-002-L1 без повторного источника.

Действие: Ведущий превращает отмеченные места исходной карты в сеть возможных переходов.

Проверяемый результат: Сеть содержит указанные ведущим связи с их видом; изолированные места видны как не имеющие соединений.

Приёмка: A–B соединены тропой, B–C водным маршрутом; D без соединений. → Подготовить сеть этих четырёх мест. → Сохранены тропа A–B и водный маршрут B–C; D обозначен без соединений, новая дорога к D не придумана.

Переиспользовано решение: agent-work/research/requirements/CAIRN2-scope-audit.json#CAIRN2-PC-002-L1

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-002 — Вне объёма

Материал: agent-work/research/market/COS-L1-2026-11-14.json/operational_requirement · blob dc2c8563c1028a86fa471ad5b9370eba16ba782d

Локальная квадратная сетка, диагонали, Slowed и blocked corners - тактический бой/VTT, прямо исключённый владельцем. Ярлык L3 не сохраняет его в объёме.

Из принятого L1 выведено; новая функция, архитектура или задача для сохранения строки не придумывается.

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-003 — Для карты (L1)

Материал: agent-work/research/market/DND-canon-map-2026-11-14.json/operational_requirements/0 · blob 8d88321e889b4abec003a2f720cd93b49e7b6773

Редактируется подготовленное конкретное место при сохранении его координат и состояния карты; не генератор сюжета или посещений.

Действие: Мастер уточняет содержание уже отмеченной башни на своей карте.

Проверяемый результат: Одна башня остаётся по прежней ссылке; обновлено только её содержание, посещение не произошло автоматически.

Приёмка: site-A/04.12, сторожевой пост; посещение неизвестно. → Заменить на обсерваторию и сохранить/открыть. → Та же site-A/04.12 с обсерваторией; статус посещения неизвестен.

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-004 — Не принято до решения

Материал: agent-work/research/market/DND-canon-map-2026-11-14.json/operational_requirements/1 · blob 8d88321e889b4abec003a2f720cd93b49e7b6773

Отдельный профиль0.5мили явно вне принятых размеров. Не добавлять режим/конверсию без решения; исходное наблюдение сохранить.

Из принятого L1 выведено; новая функция, архитектура или задача для сохранения строки не придумывается.

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-005 — Для карты (L1)

Материал: agent-work/research/market/DND5-map-reconciliation-2026-11-10.json/operational_requirement · blob 76638102670236e5853cd07d380b54df4c5aff59

Переносится уже подготовленная башня с именем и содержимым; конкретное действие редактирования карты, без повторной генерации.

Действие: Correct a previously prepared named tower from a chosen western hex to a chosen southern hex.

Проверяемый результат: One Tower at the selected southern hex with the same name and note; the former western placement no longer appears.

Приёмка: A named Tower with note N on selected western hex; chosen southern hex is empty and admissible → Accept moving the Tower to the southern hex → Exactly one Tower appears on the southern hex; name and note N remain; no Tower remains on the former hex

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-006 — Для карты (L1)

Материал: agent-work/research/market/DW-Warklegnaw-map-practice-2026-11-11.json/operational_fixtures/0/operational_requirement · blob fb2c468671b1ea2dce400911e019ccdd75a5419a

Одномильная правка конкретного объекта и сохранение физической позиции соответствуют принятой многоуровневой карте.

Действие: Мастер выбирает исходный6мильный гекс для одномильных правок.

Проверяемый результат: Одна сущность M с прежним ID; обзор не клонирует её и не теряет редактирование.

Приёмка: M в0702; выбран1mile слой; M перемещён в пределах0702 → Переключить6→1, сохранить и загрузить → M ровно1, та же детальная координата и ID; source fixture не задаёт число дочерних гексов

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-007 — Для карты (L1)

Материал: agent-work/research/market/DW-Warklegnaw-map-practice-2026-11-11.json/operational_fixtures/1/operational_requirement · blob fb2c468671b1ea2dce400911e019ccdd75a5419a

Расширение/правка вне принятого региона сохраняет географию и объекты; не включает скрытую переработку старой территории.

Действие: Мастер согласует географию вокруг сохранённого региона.

Проверяемый результат: Прежние внутренние ID/данные сохранены, внешние правки отделены.

Приёмка: A внутренний, B внешний; мастер изменяет B → Сохранить карту с внешним изменением → A неизменён; B изменён; конфликт стыка отмечен, не исправлен автоматически

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-008 — Не принято до решения

Материал: agent-work/research/market/DW-Warklegnaw-map-practice-2026-11-11.json/operational_fixtures/2/operational_requirement · blob fb2c468671b1ea2dce400911e019ccdd75a5419a

Индивидуальная калибровка17/18миль и совмещение внешней опорной карты не приняты как отдельный профиль. Не обязывать приложение новыми масштабами.

Из принятого L1 выведено; новая функция, архитектура или задача для сохранения строки не придумывается.

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-009 — Для карты (L1)

Материал: agent-work/research/market/LandEem-screen-2026-11-14.json/operational_requirement · blob 70af9aba892b39eb2e3e2a93488f36f21336ca99

Сохранить сведения о библиотеке как конкретной услуге существующего Junktown допустимо; «разыскать книгу» не становится сюжетной функцией.

Действие: Мастер указывает известную библиотеку как содержание конкретного Junktown.

Проверяемый результат: Junktown содержит библиотеку с локальной ссылкой; новый регион, квест или NPC-движок не создаются.

Приёмка: Существующий Junktown и известная библиотека #13. → Добавить сведения и сохранить/открыть карту. → Junktown и положение прежние; библиотека и #13 сохранены, квест поиска книги не создан.

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-010 — Отложено до ведения (L2)

Материал: agent-work/research/market/MOTH-Wolfram16-case-2026-11-11.json/operational_fixtures/0/operational_requirement · blob a9f5f9eeb82a5b4003184388a070124f1f04738c

2hex/day - темп путешествия L2; отсутствие физического масштаба остаётся неизвестным. Запись темпа не основание L1.

Из принятого L1 выведено; новая функция, архитектура или задача для сохранения строки не придумывается.

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-011 — Для карты (L1)

Материал: agent-work/research/market/MOTH-Wolfram16-case-2026-11-11.json/operational_fixtures/1/operational_requirement · blob a9f5f9eeb82a5b4003184388a070124f1f04738c

Положение и условный знак конкретного предварительного места относятся к подготовке карты; выдача/раскрытие игрокам отделены в L2.

Действие: Мастер оставляет предварительный знак вопроса у выбранной точки карты.

Проверяемый результат: Та же отметка lab01 вP с?; существование настоящей лаборатории и обнаружение не утверждены.

Приёмка: lab01 вP с? и описанием возможного строения. → Сохранить и повторно открыть карту мастера. → Та же отметка вP с?; статус обнаружения не изменён.

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-012 — Отложено до ведения (L2)

Материал: agent-work/research/market/MOTH-Wolfram16-case-2026-11-11.json/operational_fixtures/2/operational_requirement · blob a9f5f9eeb82a5b4003184388a070124f1f04738c

Региональная таблица встреч при входе в гекс относится к ведению L2. Событие по нужде сюжета и общий сценический генератор не включены.

Из принятого L1 выведено; новая функция, архитектура или задача для сохранения строки не придумывается.

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-013 — Для карты (L1)

Материал: agent-work/research/market/PIRATE-map-practice-2026-11-09.json/operational_requirement · blob 71a7c4c29a93281e70c6688e3ee8917f335457ab

Перенос уже подготовленного места с сохранением имени/описания - общее редактирование карты; новая игра не требует отдельной механики.

Действие: Move an existing prepared site to a chosen different hex

Проверяемый результат: Site A at1/0 with unchanged name/description; original placement at0/0 removed; other sites unchanged.

Приёмка: Site A at0/0 named Wreck with description D; target1/0 empty and admissible → Move A to1/0 → Exactly one A at1/0; no A at0/0; name Wreck and description D retained

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-014 — Для карты (L1)

Материал: agent-work/research/market/TOR2-map-boundary-2026-11-12.json/operational_requirements/0/operational_requirement · blob 42bcb47025367b26041c94feb01a971b49cd2cdc

Свойства выбранного участка и конкретная статическая опасность относятся к подготовке местности; численные эффекты/походный движок не включены.

Действие: Мастер добавляет собственную сложность и опасность к готовой карте.

Проверяемый результат: A остаётся лесом с авторскими свойствами; B остаётся прежним.

Приёмка: A — лес; B — равнина. → Для A задают авторскую опасность. → A остаётся лесом, опасность помечена авторской; B не изменён.

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-015 — Для карты (L1)

Материал: agent-work/research/market/TOR2-map-boundary-2026-11-12.json/operational_requirements/1/operational_requirement · blob 42bcb47025367b26041c94feb01a971b49cd2cdc

Подложка и отметки описывают подготовку карты; неизвестная поддержка/масштаб не считаются отсутствием. Это не разрешение восстановить027.

Действие: Мастер совмещает собственный гексовый слой с готовым референсом.

Проверяемый результат: A и B совпадают с исходными местами; визуальная сетка не присваивает физическую длину.

Приёмка: A(10,20), B(80,60) на подложке. → Включают сетку. → A и B остаются над прежними местами подложки.

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-016 — Не принято до решения

Материал: agent-work/research/market/TOR2-map-boundary-2026-11-12.json/operational_requirements/2/operational_requirement · blob 42bcb47025367b26041c94feb01a971b49cd2cdc

Оценка переносимости неполученного Wonderdraft-файла и счётчиков товаров - исследовательская классификация, не готовая операция карты. Формат импорта требует отдельного выбора.

Из принятого L1 выведено; новая функция, архитектура или задача для сохранения строки не придумывается.

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-017 — Для карты (L1)

Материал: agent-work/research/market/TW2000-create-zero-2026-11-12.json/operational_requirements/0/operational_requirement · blob 10dc20eaf3dcd9b42551020330c9d36c81609fab

Калибровка собственной подложки известным расстоянием прямо относится к созданию/наполнению карты; никакой обязательной игровой длины гекса не выводится.

Действие: Мастер готовит игровую карту реальной местности из собственной подложки.

Проверяемый результат: Контрольные концы соответствуют100km, середина50km; подложка и отметки остаются на месте.

Приёмка: Подложка100px; контрольные концы соответствуют100km → Мастер задаёт расстояние100km → Половина отрезка50km; исходные места концов сохранены.

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-018 — Вне объёма

Материал: agent-work/research/market/TW2000-create-zero-2026-11-12.json/operational_requirements/1/operational_requirement · blob 10dc20eaf3dcd9b42551020330c9d36c81609fab

Исходный пример требует только записать слух и сцену с беженцами. Нет самостоятельного принятого картографического результата; произвольная заметка не основание.

Из принятого L1 выведено; новая функция, архитектура или задача для сохранения строки не придумывается.

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-019 — Для карты (L1)

Материал: agent-work/research/resources/Eem-generators-2026-11-14.json/operational_requirement · blob 4c352e72319f17cddf2a6441c78b8b879d11948f

Простые сведения о выбранной таверне допустимы как содержание конкретного места. Полный генератор Town/NPC и фиксированные группы жителей не требуются.

Действие: Мастер сохраняет известную таверну и простые сведения о её хозяине у выбранного поселения.

Проверяемый результат: place-01 сохраняет таверну и сведения о хозяине; повторное открытие не создаёт жителей или посетителей.

Приёмка: place-01 с таверной B и известной ролью хозяина. → Сохранить карту, перебросить другое место, открыть сохранённую. → Таверна и роль хозяина неизменны; жители и посетители не сгенерированы.

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-020 — Вне объёма

Материал: agent-work/research/resources/MOTH-VoidAtlas-2026-11-11.json/operational_comparators/0/operational_requirement · blob e753b364c95b0965aaf3ce98ced643f5aca78263

Переброс hoursPerDay планетарного досье не относится к карте HexCrawl. Общий rule_id истории бросков не даёт основания новой планетарной подсистеме.

Из принятого L1 выведено; новая функция, архитектура или задача для сохранения строки не придумывается.

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-021 — Вне объёма

Материал: agent-work/research/resources/MOTH-VoidAtlas-2026-11-11.json/operational_comparators/1/operational_requirement · blob e753b364c95b0965aaf3ce98ced643f5aca78263

Сохранение/восстановление результатов планетарного досье без объекта региональной карты не является картографической функцией.

Из принятого L1 выведено; новая функция, архитектура или задача для сохранения строки не придумывается.

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-022 — Вне объёма

Материал: agent-work/research/resources/MOTH-VoidAtlas-2026-11-11.json/operational_comparators/2/operational_requirement · blob e753b364c95b0965aaf3ce98ced643f5aca78263

Редактирование выдачи планетарного досье игроку не имеет принятого объекта карты. Generic audience rule_id не доказывает применимость.

Из принятого L1 выведено; новая функция, архитектура или задача для сохранения строки не придумывается.

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-023 — Для карты (L1)

Материал: agent-work/research/resources/MOTH-WickedWorlds-2026-11-11.json/operational_requirement/0 · blob 9a6d1636f7d69261ef6b11ed97906054906e4bb5

Перенос конкретного шахтёрского лагеря с простой пометкой руды - редактирование места; экономика добычи из этого не следует.

Действие: Move an already prepared mobile mining camp to a GM-selected hex

Проверяемый результат: Exactly one camp-1 at 1/0; old hex has no copy; gem-ore note retained after save/reopen.

Приёмка: camp-1 at 0/0 with ore note gem ore; 1/0 available → Move camp-1 to 1/0, save and reopen → camp-1 exists once at 1/0; 0/0 contains no camp-1; note and source retained

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-024 — Для карты (L1)

Материал: agent-work/research/resources/MOTH-WickedWorlds-2026-11-11.json/operational_requirement/1 · blob 9a6d1636f7d69261ef6b11ed97906054906e4bb5

Красные грибы могут быть статической опасностью конкретной области. Body/3d10/50ft и исключение транспорта - локальные эффекты, не новые поля или радиус региональной опасности.

Действие: Мастер отмечает выбранную область красных грибов как конкретную статическую опасность.

Проверяемый результат: area-1 отмечена грибами и условием нарушения покрова; региональный размер не выводится из локального радиуса эффекта.

Приёмка: Область area-1 с выбранными красными грибами. → Сохранить и открыть карту. → area-1 и описание сохранены; Body-save/3d10/50ft не стали полями/радиусом регионального генератора.

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-025 — Для карты (L1)

Материал: agent-work/research/resources/MOTH-WickedWorlds-2026-11-11.json/operational_requirement/2 · blob 9a6d1636f7d69261ef6b11ed97906054906e4bb5

Трубопровод связывает конкретные места и имеет географическое описание; это не новая подсистема потоков, экономики или расчёта движения.

Действие: Prepare connections between pumping stations and a space elevator

Проверяемый результат: A-B and B-C remain pipeline links after save/reopen; no unprovided travel cost or road classification is generated.

Приёмка: Three prepared IDs A,B,C and links A-B,B-C of type pipeline → Save and reopen the preparation → Three IDs and two pipeline links retained; no A-C shortcut, physical length or road speed invented

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-026 — Для карты (L1)

Материал: agent-work/research/market/CROWS-packet-2026-11-15.json/operational_requirements/0 · blob 16194771e35c8007ff7c69bf1234f2a8ba358d27

Источник5across сохраняется, но владелец уже выбрал совместимый базовый режим5–6миль. Старый пакет не требует отдельной5-мильной сетки.

Действие: Выбрать совместимый базовый режим карты Crows

Проверяемый результат: Используется действующая базовая геометрия; режим обозначается5–6миль по решению владельца. Новая5-мильная сетка не добавлена; исходное5across сохранено отдельно как правило книги.

Приёмка: {"source_hex_miles":5,"source_axis":null,"project_baseline_miles":6,"display_label":"5–6 миль","zoom":1.3} → Выбрать совместимый базовый режим карты Crows; сохранить и повторно открыть карту → Используется действующая базовая геометрия; режим обозначается5–6миль по решению владельца. Новая5-мильная сетка не добавлена; исходное5across сохранено отдельно как правило книги.

Переиспользовано решение: agent-work/research/requirements/CROWS-PT3-scope-audit.json#CROWS-PT3-L1-002

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-027 — Для карты (L1)

Материал: agent-work/research/market/CROWS-packet-2026-11-15.json/operational_requirements/1 · blob 16194771e35c8007ff7c69bf1234f2a8ba358d27

Habitat выбранного гекса прямо задаёт местность, не меняя соседей; переиспользуется CROWS scope review.

Действие: Assign habitat to a selected hex

Проверяемый результат: HexA storesforest; another hex staysunchanged.

Приёмка: HexAforest,HexBmountain. → SetA to plains andsave/reopen. → Aplains,Bmountain; no encounter roll generated.

Переиспользовано решение: agent-work/research/requirements/CROWS-PT3-scope-audit.json#CROWS-PT3-L1-003

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-028 — Для карты (L1)

Материал: agent-work/research/market/CROWS-packet-2026-11-15.json/operational_requirements/2 · blob 16194771e35c8007ff7c69bf1234f2a8ba358d27

Одна домашняя деревня и простой список услуг допустимы; уровень1/улучшения/отношения персонажей не превращаются в управляющие подсистемы.

Действие: Разместить и назвать стартовую деревню с простым перечнем услуг

Проверяемый результат: На карте одна V с выбранным именем; у неё указаны пять исходных и одна выбранная служба. Повторная загрузка не создаёт вторую V.

Приёмка: {"village":"V","name":"GM choice","services":["blacksmith","crypt","general store","inn","temple"],"extra":"beacon"} → Разместить и назвать стартовую деревню с простым перечнем услуг; сохранить и повторно открыть карту → На карте одна V с выбранным именем; у неё указаны пять исходных и одна выбранная служба. Повторная загрузка не создаёт вторую V.

Переиспользовано решение: agent-work/research/requirements/CROWS-PT3-scope-audit.json#CROWS-PT3-L1-011

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-029 — Для карты (L1)

Материал: agent-work/research/market/CROWS-packet-2026-11-15.json/operational_requirements/3 · blob 16194771e35c8007ff7c69bf1234f2a8ba358d27

Лесопилка в принятом месте у реки - конкретное наполнение/привязка POI; не произвольная заметка и не бой внутри места.

Действие: Place an authored POI on an existing region

Проверяемый результат: One placedPOI retainsidentity and editeddescription.

Приёмка: Accepted region with river and test-sawmill record. → Revise millnote,save/reopen. → River andPOIpositionunchanged; descriptionupdated.

Переиспользовано решение: agent-work/research/requirements/CROWS-PT3-scope-audit.json#CROWS-PT3-L1-007

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-030 — Узкая внешняя граница (L3)

Материал: agent-work/research/market/CROWS-packet-2026-11-15.json/operational_requirements/4 · blob 16194771e35c8007ff7c69bf1234f2a8ba358d27

Для Scout переиспользована закрытая граница CROWS-R26-SCOUT: только подтверждённый внешний результат раскрывает существующие места; собственный resolver не разработан.

Из принятого L1 выведено; новая функция, архитектура или задача для сохранения строки не придумывается.

Переиспользовано решение: agent-work/research/requirements/CROWS-PT3-scope-audit.json#CROWS-R26-SCOUT

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-031 — Отложено до ведения (L2)

Материал: agent-work/research/market/CROWS-packet-2026-11-15.json/operational_requirements/5 · blob 16194771e35c8007ff7c69bf1234f2a8ba358d27

Фактический/намеренный маршрут заблудившейся партии относится к ведению L2, не к географии; CROWS-R27-LOST.

Из принятого L1 выведено; новая функция, архитектура или задача для сохранения строки не придумывается.

Переиспользовано решение: agent-work/research/requirements/CROWS-PT3-scope-audit.json#CROWS-R27-LOST

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-032 — Отложено до ведения (L2)

Материал: agent-work/research/market/CROWS-packet-2026-11-15.json/operational_requirements/6 · blob 16194771e35c8007ff7c69bf1234f2a8ba358d27

Дневная дистанция с дорогой/течением относится к ведению L2; CROWS-R24-PACE/SPEED. Проходимость не выводится из такого расчёта.

Из принятого L1 выведено; новая функция, архитектура или задача для сохранения строки не придумывается.

Переиспользовано решение: agent-work/research/requirements/CROWS-PT3-scope-audit.json#CROWS-R24-PACE

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-033 — Для карты (L1)

Материал: agent-work/research/market/KNAVE2-map-practice-2026-11-14.json/development/operational_requirement · blob 0dc561ec66eef20027e49be71873a421ac6929e9

Изменяется описание конкретной башни с ручной ссылкой на причал при неизменной географии; это принятое редактирование места, не отдельный Knave-редактор.

Действие: Мастер выбирает существующее местоA и заменяет его описание, сохраняя карту.

Проверяемый результат: A.description равен новому тексту с ручной ссылкой «см. B»; A/B и география сохранены. Структурированная связь объектов не требуется.

Приёмка: Synthetic fixtureA/B and terrain/routes as above; «см. B» is plain text. → ReplaceA.description; save and reopen. → A.description is exactly «Обсерватория; ключ у лодочника; см. B»; bothcoordinates,names,terrain,roads,rivers and placeB stay identical.

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-034 — Для карты (L1)

Материал: agent-work/research/market/PF2-map-workflows-2026-11-10.json/operational_requirement · blob 2d7c5b75191e237df7fd1c23f30ee09f9e3d7484

Добавление местности в пустоту и экспорт принятой карты - L1. Фиксированная рамка является ограниченным примером, не обязательным новым режимом всех экспортов.

Действие: Add prepared terrain in a blank area and export an updated image using an explicitly retained frame.

Проверяемый результат: Updated image remains2000×1000; Port stays at200,300 and the new forest appears at700,400.

Приёмка: Retained2000×1000 export frame, Port at200,300 and blank area700,400 → Add forest in that blank area and export in the same selected frame → Image remains2000×1000; Port stays at200,300; forest appears at700,400; no prior landmark disappears

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-035 — Для карты (L1)

Материал: agent-work/research/market/ROOT-GM-tool-choice-2026-11-09.json/development_handoff/operational_requirement · blob 31ed8b6bbd5b876b944767e9933cf8d0d7506e75

Корректировка связей существующих полян - редактирование дорог/путей. Ручная правка не объявляется новым броском.

Действие: Ведущий корректирует пути после подготовки карты по броскам.

Проверяемый результат: После удаления B–C и добавления A–C итог содержит A–B и A–C; названия полян сохранены.

Приёмка: A/B/C; пути A–B,B–C → Убрать B–C, добавить A–C → Пути A–B,A–C; B–C отсутствует; A/B/C сохранены.

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-036 — Для карты (L1)

Материал: agent-work/research/market/SD-Trendalor-2026-11-14.json/operational_requirements/0 · blob 8826443f6024d33b6384d47dd7497e1010ab9354

Явный кампанийный12-мильный масштаб не переписывает исходный6-мильный профиль; работа с физическим масштабом карты, не скоростью.

Действие: GM explicitly chooses a custom campaign scale

Проверяемый результат: Campaign document retains12mile; an independent core preset retains6mile; neither silently overwrites the other.

Приёмка: Independent core6mile document and custom Trendalor12mile document, geometry unresolved → Save/reload each selected profile → Core6 and campaign12 remain distinct; geometry remains unspecified unless separately chosen.

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-037 — Отложено до ведения (L2)

Материал: agent-work/research/market/SD-Trendalor-2026-11-14.json/operational_requirements/1 · blob 8826443f6024d33b6384d47dd7497e1010ab9354

Карта игроков и раскрытие найденных мест - L2 по решению владельца. Предыдущий ярлык L1 исправлен.

Из принятого L1 выведено; новая функция, архитектура или задача для сохранения строки не придумывается.

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-038 — Для карты (L1)

Материал: agent-work/research/market/WWN-Iadroth-practice-2026-11-10.json/operational_requirement · blob 0377f9b2521a9df18e14625debfdb0a1f09fb339

Экспорт текущего принятого изображения сохраняет ручные правки, местность и подписи; это создание/сохранение карты, не новый генератор.

Действие: After manually changing a generated map, export the current map as an image for further drawing or printing.

Проверяемый результат: The exported image contains the hills and New Port from the current view, with unchanged placement of the remaining features.

Приёмка: A map with an accepted forest-to-hills edit and Old Port renamed New Port → Export the current map image → Image shows hills and New Port at the selected locations; does not revert to the seed-generated forest/old name

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-039 — Для карты (L1)

Материал: agent-work/research/market/WWN-builder-screen-2026-11-10.json/operational_requirement · blob ec14313f4c01ac4004fb06b20f32aa026f029b71

Экспорт имени и простого содержания конкретного места вместе с картой относится к L1; нативный Obsidian-плагин/обратная синхронизация не следуют.

Действие: Мастер экспортирует текущую карту и сведения о выбранном месте.

Проверяемый результат: В экспортированном материале New Port уP с пометкой о работе гавани; Old Port не дублируется.

Приёмка: Old Port уP переименован вNew Port, указано Harbor closes at dusk. → Экспортировать текущий материал. → New Port уP с актуальной пометкой; дубликатOld Port не создан.

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-040 — Для карты (L1)

Материал: agent-work/research/resources/HexAtlas-footprint-fill-2026-11-12.json/operational_requirement · blob 08fe6de99a427aa4d7796e4f92bb95ca4e51f3cc

Физический охват места и заполнение свободной территории относятся к принятым масштабам/POI; размер значка не равен размеру места.

Действие: Set site dimensions or fill empty parts of an already mapped territory

Проверяемый результат: A0.2mi site andA2mi site can have different1mi-cell coverage regardless of icon zoom. An empty-area extension appends known newcells while old7cells remain byte-equivalent by content.

Приёмка: Matched landmark_2 at(-1,0),size1; seven country hexes,6forest andwater(1,-1) → Set Size6 (unitless art slider), compare large6.json to size-undo.json → Art-size alternative: only landmark.size changes; same anchor/terrain. A physical footprint would require separately evidenced dimensions and occupied cells.

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-041 — Для карты (L1)

Материал: agent-work/research/resources/HexAtlas-lifecycle-2026-11-11.json/operational_requirement · blob 89499f35fab4be95f06f1190fe56c142dfb1693f

Одна правка местности, отмена и переключение масштаба должны сохранять остальные объекты карты; общий жизненный цикл уже принят.

Действие: Change one terrain cell; Undo/Redo; switch level; save/reopen/import

Проверяемый результат: Edited cell(1,-1)mountain; Undo→plains;Redo→mountain. P1/road/note equal through view cycle/save/reopen/import. Explicit changed metadata allowlist, every added field reported.

Приёмка: Three fixed cells,P1 and road with note committed; baseline serialized → Paint(1,-1)mountain;Undo;Redo → Only target terrain changes and reverses; P1 IDs,coordinates,note and all road points equal

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-042 — Для карты (L1)

Материал: agent-work/research/resources/HexAtlas-local-cards-2026-11-12.json/operational_requirement · blob f7338df753246b5055196f70bf80f18ad8f53817

Карточка выбранного одномильного/крупного участка относится к принятому масштабу отображения; родительская карточка не заменяет локальные сведения.

Действие: Select a local cell or larger mixed cell while viewing the same map

Проверяемый результат: Fine Desert child→Desert local card; mixed7cellterritory→forest,mountain,water plusP1once; parent or center card is a different behavior.

Приёмка: Country forest(-1,0),mountain(1,-1),water(0,1),P1 atforest → Select mountain atCountry → Selected country(1,-1),Mountain; no forest/water/POI neighbor summary

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-043 — Для карты (L1)

Материал: agent-work/research/resources/HexAtlas-retained-lifecycle-2026-11-11.json/operational_requirement · blob 08480fe81e324d477be3934adecb48a0a8eed2db

Повторный retained lifecycle - evidence той же операции редактирования/истории, не дополнительная функция или новая игра.

Действие: Paint one cell, Undo/Redo, change grid settings and traverse levels, reload browser, export each stage; import only through working documented path.

Проверяемый результат: Exact terrain change and reversal; complete P1 fields including note/anchor and road fields/points retained across6exports. Every top-level difference enumerated; reload differs only inexportMetadata. No import pass until retained re-export.

Приёмка: Baseline three cells forest(-1,0),plains(1,-1),coast(0,1);P1 at(-1,0) with exact fixture note;path_1[-1,0]→[0,0]→[1,-1], offsets0 → Paint(1,-1)mountain and export → Only hexes[1].terrain changes; complete landmarks/paths equal; changed top-level keys exactlyhexes,saveRevision,exportMetadata

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-044 — Для карты (L1)

Материал: agent-work/research/resources/Worldographer-L1-2026-11-12.json/operational_requirements/0 · blob a1cfa0ead25e5864f1dfc395bc1de067f33980b1

Отличать физический размер от масштаба экрана - L1; документированные ratios3/6 и9/36тайлов не навязываются модели HexCrawl.

Действие: Мастер увеличивает изображение уже созданной карты, сохраняя её физический масштаб.

Проверяемый результат: Увеличилось изображение; физический масштаб, принятая местность и места прежние.

Приёмка: Country6mi, рисунок шириной40px. → Увеличить экранный зум до80px без переключения физического уровня. → Физические6mi прежние; принятая география не пересоздана.

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-045 — Для карты (L1)

Материал: agent-work/research/resources/Worldographer-L1-2026-11-12.json/operational_requirements/1 · blob a1cfa0ead25e5864f1dfc395bc1de067f33980b1

Географическая область из трёх смежных ячеек отличается от масштаба рисунка; соответствует принятому физическому охвату POI, не новой боевой зоне.

Действие: Resize art or draw geographical area

Проверяемый результат: Art width20/80px does not change occupied area; explicit3cellarea has one external border.

Приёмка: 40pxtile,50%feature → Render art → 20pxwidth;no mileage or occupied-cell count inferred

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-046 — Не принято до решения

Материал: agent-work/research/resources/Worldographer-L1-2026-11-12.json/operational_requirements/2 · blob a1cfa0ead25e5864f1dfc395bc1de067f33980b1

Независимые координаты по уровням и переключаемая синхронизация могут противоречить общей географии. До решения не включать этот vendor-профиль как требование.

Из принятого L1 выведено; новая функция, архитектура или задача для сохранения строки не придумывается.

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-047 — Для карты (L1)

Материал: agent-work/research/resources/Worldographer-L1-2026-11-12.json/operational_requirements/3 · blob a1cfa0ead25e5864f1dfc395bc1de067f33980b1

Заполнение допустимых пустот рядом с принятой местностью - наполнение карты; не перерисовывать занятые ячейки и не выдумывать seed.

Действие: Complete unspecified terrain near existing terrain

Проверяемый результат: Assigned cells and fixed prior cells reported separately;ties have allowed set,not guessedseed.

Приёмка: Four-celllineF,blank,blank,M;unique nearestneighbors;randomnessOFF → Applydocumentedblankcompletion → ExpectedF,F,M,M;oldF/M unchanged;testnotexecuted

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-048 — Для карты (L1)

Материал: agent-work/research/resources/Worldographer-L1-2026-11-12.json/operational_requirements/4 · blob a1cfa0ead25e5864f1dfc395bc1de067f33980b1

Расширение пустой территории относится к L1; импорт и разрушительная замена перекрытия другой картой остаются непринятым отдельным компонентом.

Действие: Мастер добавляет пустую территорию справа от уже подготовленной карты.

Проверяемый результат: Логический охват40×30;20новых столбцов пусты, прежняя левая часть не изменена.

Приёмка: Принятая область20×30. → Добавить справа20столбцов пространства. → Охват40×30; прежние20×30содержат те же объекты, новые клетки пусты.

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-049 — Для карты (L1)

Материал: agent-work/research/resources/Worldographer-L1-2026-11-12.json/operational_requirements/5 · blob a1cfa0ead25e5864f1dfc395bc1de067f33980b1

Сохранение редактируемой карты с местами/рекой/заметками и масштабами относится к L1; независимые географии четырёх vendor-уровней не предписываются.

Действие: Мастер сохраняет и повторно открывает принятую многоуровневую карту.

Проверяемый результат: P/N/R и принятая местность сохранены; разные представления относятся к той же территории.

Приёмка: Одна карта сP/N/R и принятыми масштабами. → Сохранить и открыть документ. → Те жеP/N/R и география; новыйseed не пересоздаёт карту.

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-050 — Для карты (L1)

Материал: agent-work/research/resources/scale-competition-2026-11-11.json/operational_requirement · blob ff30ec834b365c2b4391757816699033ab267cd0

Смена принятых масштабов, локальная карточка и достройка пустоты - существующий продуктовый контур. Архитектурные термины сравнения не становятся технической спецификацией.

Действие: Choose physical size,inspect,extend,save/reopen,UndoRedo

Проверяемый результат: Known unchangedM/S0 on view cycle; exact card sets; append-only extension and reversible history per cases

Приёмка: Fixed mapM,POIsP1/P2,riverR1,roadD1,geometry/IDs/anchors andRNG S0 recorded → Switch6→1→12→24→6; save/reopen without editing → Content/geometry/IDs/anchors/RNG exactly M/S0; explicit view fields may change; every extra key reported

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

### SUP-SCOPE-051 — Для карты (L1)

Материал: agent-work/research/requirements/L1-tagged-poi-lifecycle-v1.json/operational_requirement · blob cbc90c8cee99f14cf9d979bef8e7f04b89a645c6

Перенос конкретного POI с уже принятым содержимым, точная отмена/повтор и сохранение относятся к существующему редактору карты. MB lifecycle evidence не доказывает Knave-таблицу или актуальную поддержку.

Действие: Ведущий переносит нецентральный POI с уже сохранённым результатом таблицы и ручной интерпретацией, затем отменяет/повторяет перенос и сохраняет/загружает карту.

Проверяемый результат: Меняется принадлежность/адрес POI и связанного тега. Контент, происхождение, ручная интерпретация и случайные состояния сохраняются; история восстанавливает точные снимки.

Приёмка: M0: source owner poi:1:2,0; tag values [[1],[1]], entryId mb.monument:0, overrides ru=Мастер-X/en=GM-X, revision3, counters group2/entry4, worldRNG C0. → Перенести POI через UI в poi:2:3,0. → Один тег с новым owner; старого owner/counter-prefix нет. Values/entryId/text/overrides/revision=3 неизменны, counters2/4 перенесены на новый prefix; worldRNG C0 неизменён.

Поддержка на текущем SHA: **не проверено**. Исходные наблюдения и исторические ограниченные проверки сохранены отдельно.

## Компоненты и ограничения

**SUP-C01 / out_of_scope — Сюжет поиска книги / общий генератор NPC Town-Tavern.** Только конкретная библиотека/таверна и простые сведения о жителе оставлены; сюжет и массовое создание личностей исключены.

**SUP-C02 / out_of_scope — Red Cap Body-save/3d10/50ft/bike resolution.** Локальные персонажные/боевые эффекты не становятся региональной геометрией или обязательными полями.

**SUP-C03 / out_of_scope — Уровни/экономика учреждений и связи развития персонажа Crows.** Простой перечень услуг деревни не включает контроллер уровней/денег/NPC.

**SUP-C04 / out_of_scope — GM_scene_need как общий сюжетный триггер.** Отложена только региональная встреча во время путешествия, не сочинение/управление сценами.

**SUP-C05 / defer_L2 — Раскрытие предварительных отметок игрокам.** Подготовка знака? не означает известность/посещение; карта игроков позже.

**SUP-C06 / needs_owner_decision — Отдельный Wonderdraft/Obsidian импорт/экспортный формат, обратная синхронизация.** Обычный экспорт/подложка не доказывают поддержку чужого редактируемого формата или API; не восстановить027/029.

**SUP-C07 / needs_owner_decision — Новые коэффициенты подразделения3/6 и9/36дочерних тайлов.** Vendor-геометрия - факт сравнения, а не выбранный профиль HexCrawl.

**SUP-C08 / needs_owner_decision — Вставка второй карты с заменой перекрытия/обрезкой.** Добавление пустого пространства не разрешает разрушительную политику слияния.

**SUP-C09 / needs_owner_decision — Независимые географии и позиции объектов по уровням.** Сохранение карты не выбирает новую модель согласования нескольких миров.

## Полнота и продолжение

Ретроспектива заявленного набора существующих матриц 13 игр и рабочих примеров завершена по применимости к продукту. Это не принятие всей игры, полноты источников, численной методики, текущей поддержки или готовности к разработке. Спорные варианты выведены из принятого объёма до отдельного решения и не блокируют продолжение.

Далее — прежнее незавершённое выравнивание overall top5: DND5 остаётся с блокером полного DMG2014 без нового access signal; достижимое продолжение PF2 идёт по сохранённому источниковому остатку и действующему фильтру. Закрытые scope-срезы не повторяются без нового основания. Create-top10 начинается только после принятия top5. Рейтинг, score, общие реестры и продуктовая очередь не менялись.
