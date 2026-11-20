# Knave 2e · подготовка карты

Место 3 в топ-20 создания. 12 операций в этом срезе. Функциональная доля 54,17%, вклад в L1 9,03. Минимум со строгой приёмкой 0,00 балла L1. Полнота тематического корпуса открыта.

## KNAVE2-005-L1

**Хранить шестимильный физический профиль карты отдельно от zoom**

Ожидаемый результат — Физический профиль 6 mi, независимый от экранного приближения.

**Полностью**. В документе хранится профиль 6 миль с неопределённым способом измерения. При импорте одной карты с приближением 1× и 2× профиль и данные карты совпали.

Функциональная доля операции 100,00%. Вклад в общий функциональный ориентир 1,39. Минимум по приёмке 0,00.

Дополнительная приёмка из исходной матрицы — Given Новая карта с профилем Knave 2e When Сохранить и загрузить Expected Физическая длина 6 mile; convention=null/unknown, а не профиль PF2 с длиной 12.; Given Физический профиль 6 mile When Изменить zoom с 1 на 2 Expected Физическая длина остаётся 6 mile.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/KNAVE2-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/KNAVE2-L1-implementation.json) · проверка `KNAVE2-L1-implementation-probe.mjs`

## KNAVE2-006-L1

**Обозначать труднопроходимость отдельно от типа местности**

Ожидаемый результат — Труднопроходимость видна ведущему и сохраняется в документе.

**Полностью**. На выбранном хвойном гексе с замком сохранил труднопроходимость. Импорт восстановил её. Снятие флага и отмена сохранили биом, замок, геометрию и улику.

Функциональная доля операции 100,00%. Вклад в общий функциональный ориентир 1,39. Минимум по приёмке 0,00.

Дополнительная приёмка из исходной матрицы — Given H — лес, содержит POI A, difficult=false When Включить труднопроходимость H, сохранить и загрузить Expected H остаётся лесом с POI A, difficult=true.; Given То же состояние с difficult=true When Снять флаг, затем отменить действие Expected После снятия difficult=false, после undo=true; POI и рельеф прежние.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/KNAVE2-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/KNAVE2-L1-implementation.json) · проверка `KNAVE2-L1-implementation-probe.mjs`

## KNAVE2-010-L1

**Хранить секрет отдельно от улики и связывать их**

Ожидаемый результат — Секрет и подсказка — отдельные объекты или поля с управляемым раскрытием.

**Частично**. У живой точки сохраняются режим «секрет через взаимодействие» и поле улики. Ввод секрета без улики отклоняется без изменения карты; введённая улика переживает импорт.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,69. Минимум по приёмке 0,00.

Дополнительная приёмка из исходной матрицы — Given C связана с S; C открыта, S закрыт When Сформировать представление игрока Expected C видна; S и его секретные поля не переданы игроку.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/KNAVE2-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/KNAVE2-L1-implementation.json) · проверка `KNAVE2-L1-implementation-probe.mjs`

## KNAVE2-020-L1

**Наполнять выбранное место карты подсказками из таблиц и их сочетанием, сохраняя толкование ведущего.**

Ожидаемый результат — На выбранном участке карты есть описанное место; ведущему доступны выбранные подсказки и его собственное толкование.

**Частично**. Рабочий генератор создал точки из встроенного каталога. При seed 41 для одной точки получена строка «Локации» 1, свойство d100 перебросилось 25 → 14. Тип подсказки, номер строки и текст сохранены; переброс не менял исходное место или состояние генерации карты.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,69. Минимум по приёмке 0,00.

Дополнительная приёмка из исходной матрицы — Given H, таблица «Локации» p10, фиксированный бросок 1 When Добавить POI Expected Создан один POI типа «Пепелище», source=p10,row1.; Given H, таблица «Постройки» p11 с броском 1; таблица «Свойства мест» p11 с броском 1 When Добавить POI со свойством Expected Создано одно «Аббатство» со свойством «Пепельный»; оба источника и броска сохранены.; Given H, таблица «Подземелья» p16 с броском 1 When Добавить POI Expected Создан один POI «Лаборатория алхимии»; сетка комнат не генерируется автоматически.; Given Существующая карта содержит POI A When Добавить POI B в H, сохранить и загрузить Expected POI A сохранён; POI B находится в H с тем же ID; другие гексы и рельеф не перегенерированы.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/KNAVE2-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/KNAVE2-L1-implementation.json) · проверка `KNAVE2-L1-implementation-probe.mjs`

## KNAVE2-037-L1

**Связать святилище с покровителем и реликвиями**

Ожидаемый результат — На карте одно святилище S с указанной посвящённостью; переименование S не изменяет его положение.

**Частично**. У гекса сохраняются точка типа holy_place и имя святилища после импорта; дороги и адрес точки прежние.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,69. Минимум по приёмке 0,00.

Дополнительная приёмка из исходной матрицы — Given Создан P с2доменами; SпосвящёнP; RсвязанP When ПереименоватьS и сохранить/загрузить Expected S по устойчивомуID по-прежнему ведёткP; R связансP; доменовPдва.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/KNAVE2-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/KNAVE2-L1-implementation.json) · проверка `KNAVE2-L1-implementation-probe.mjs`

## KNAVE2-040-L1

**Привязать алхимический ресурс к опасному или затерянному месту**

Ожидаемый результат — У P есть выбранное растение; скрытое содержимое не выдано игрокам автоматически.

**Отсутствует**. Проверены KnaveLayer, схемы content/discovery и генерация четырёх таблиц. Для пары ресурс–место с состояниями yield/respawn записи и команды нет; свободная подпись не выполняет заданный исход.

Функциональная доля операции 0,00%. Вклад в общий функциональный ориентир 0,00. Минимум по приёмке 0,00.

Дополнительная приёмка из исходной матрицы — Given P—затерянные руины, выбран ресурсI, объёмдобычи неизвестен When Добавить ресурс и сохранить/загрузить Expected I привязанP; yield=null, respawn=null; таблица карты не заполняет все соседние гексы тем же растением.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/KNAVE2-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/KNAVE2-L1-implementation.json) · проверка `KNAVE2-L1-implementation-probe.mjs`

## KNAVE2-045-L1

**Разрешить выбранные вспомогательные таблицы для результата погоды, признака или места**

Ожидаемый результат — У P выбранное свойство «Ядовито-зелёный», локатор с.37/строка1; биом и соседние места прежние.

**Отсутствует**. Адаптер работает с Локациями, Постройками, Свойствами мест и Подземельями. Встроенные ссылки сохраняются как нерешённые; целевая таблица «Цвета», с. 37, в этом пути отсутствует.

Функциональная доля операции 0,00%. Вклад в общий функциональный ориентир 0,00. Минимум по приёмке 0,00.

Дополнительная приёмка из исходной матрицы — Given Признак места ссылается на таблицу «Цвет» p37; задан следующий бросок1. When Разрешить ссылку по общему правилу. Expected Сохранён «Ядовито-зеленый» и provenance p37/row1; биом и соседние места не изменены.; Given Первый переход привёл в «Качества» p28,row69, которая снова является ссылкой; выбрана рекомендованная политика следующей строки. When Применить общий resolver. Expected Выбрана строка70 той же таблицы, «Планарный»; исходная строка69 и сдвиг сохранены; третий бросок не выполняется.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/KNAVE2-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/KNAVE2-L1-implementation.json) · проверка `KNAVE2-L1-implementation-probe.mjs`

## KNAVE2-051-L1

**Добавить выбранному POI подсказки для названия таверны и меню.**

Ожидаемый результат — Existing P stores chosen name/menu prompts, not new map geometry or rations.

**Частично**. Ручное имя и тип таверны пережили экспорт и импорт. Общая работа с местом доступна.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,69. Минимум по приёмке 0,00.

Дополнительная приёмка из исходной матрицы — Given P selected; tavern1=2, tavern2=3, food_detail=1, food=1 When Generate requested values Expected Store name components Орущий + Топор and menu components Вяленый + Желудь; no ration inventory increment.; Given P.name has a manual edit When Reroll menu only to food_detail=100 and food=100 Expected Menu becomes Завернутый + Ямс; manual name preserved.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/KNAVE2-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/KNAVE2-L1-implementation.json) · проверка `KNAVE2-L1-implementation-probe.mjs`

## KNAVE2-070-L1

**Выбрать подсказку вручную или броском, уточнить её по связанной таблице и сохранить с толкованием у места.**

Ожидаемый результат — У места остаются исходные подсказки с указанием таблиц и строк и составленное ведущим описание.

**Частично**. У каждой принятой подсказки сохраняется номер исходной строки. Ссылки в каталоге помечены как нерешённые. Один переброс обновляет только выбранную часть, сохраняется в JSON и отменяется.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,69. Минимум по приёмке 0,00.

Дополнительная приёмка из исходной матрицы — Given Синтетическая таблица A: строка37 содержит payload37; местоP без содержимого. When Вручную выбрать строку37. Expected P получает payload37, provenance A/37; RNG не вызывается.; Given Синтетическая A[1] ссылается наB; B[7] содержит payloadB7. When Задать броски1 и7. Expected Сохранены A/1→B/7 и payloadB7; не выполняется третий бросок.; Given Синтетическая A[1]→B, B[8]→C, B[9] содержит payloadB9. When Задать броски1 и8 и включить рекомендованную политику следующей записи. Expected Выбран B/9, сохранены исходный8 и причина сдвига; таблицаC не бросается.; Given Индекс0,101 или дробь2.5 для таблицы100строк. When Попытаться применить результат. Expected Нет записи результата/измененияP; вход отвергнут как недопустимый.; Given A[1]→B; B[100] is another reference and no following row exists. When Apply recommended second-reference policy. Expected Show unresolved edge and preserve A/1→B/100; require an explicit manual choice. Do not silently wrap to B/1 or roll a third table.; Given A[1]→B; B[8]→C and next B[9] is also a reference. When Apply recommended second-reference policy. Expected Show unresolved edge and preserve provenance; no unbounded cascade or silent fabricated terminal value.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/KNAVE2-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/KNAVE2-L1-implementation.json) · проверка `KNAVE2-L1-implementation-probe.mjs`

## KNAVE2-071-L1

**Сочетать подсказки выбранных таблиц, включая повторное использование одной таблицы, и сохранить описание ведущего; две-три таблицы рекомендованы автором.**

Ожидаемый результат — У места сохранены все выбранные подсказки и итоговое описание; совпавшие результаты не затирают друг друга.

**Частично**. Одно место может иметь основную подсказку и независимое свойство. Оба результата сохраняются, а отдельный переброс свойства сохраняет основную подсказку.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,69. Минимум по приёмке 0,00.

Дополнительная приёмка из исходной матрицы — Given Синтетическая таблицаA; два вызоваA с индексами1и2, интерпретацияGM=X. When Сохранить сочетание уP. Expected УP два компонента A/1 иA/2 и описаниеX; второй не затирает первый.; Given Три синтетические таблицыA,B,C с индексами1,50,100. When Применить рецепт кP. Expected Сохранены ровно3 компонента в выбранном порядке; индекс100 не теряется и дополнительные броски не появляются.; Given Ведущий явно задаёт пользовательский рецепт A,A,B,C с четырьмя фиксированными индексами1,2,3,4. When Применить пользовательский рецепт кP. Expected Сохранены четыре компонента A/1,A/2,B/3,C/4; рекомендация2–3 таблицы не превращается в ошибку или усечение рецепта.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/KNAVE2-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/KNAVE2-L1-implementation.json) · проверка `KNAVE2-L1-implementation-probe.mjs`

## KNAVE2-072-L1

**Нанести и сохранить альтернативный путь к подготовленной области без удаления существующего пути.**

Ожидаемый результат — Два указанных ведущим пути к цели существуют одновременно и видны как разные соединения.

**Полностью**. Через обработчик дороги создал A–B и тропу A–C–B. Сохранились обе линии с разными ID, адреса трёх точек, JSON-загрузка и точные Undo/Redo.

Функциональная доля операции 100,00%. Вклад в общий функциональный ориентир 1,39. Минимум по приёмке 0,00.

Дополнительная приёмка из исходной матрицы — Given ОбластиA,B,C; существующий прямой путьA–B. When Добавить A–C и C–B как альтернативу. Expected Сохранены A–B и A–C–B; исходный путь не удалён; объектыA,B,C сохраняют IDs.; Given Карта с двумя указанными путями кB. When Сохранить и загрузить карту. Expected Оба пути и их условия доступны после загрузки без превращения в единую линию.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/KNAVE2-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/KNAVE2-L1-implementation.json) · проверка `KNAVE2-L1-implementation-probe.mjs`

## KNAVE2-073-L1

**Привязать наблюдаемый признак к подготовленной опасности и отделить его от скрытой механики.**

Ожидаемый результат — Игрок видит выбранное предупреждение, но не получает автоматически все скрытые параметры угрозы.

**Частично**. Ведущий может привязать и сохранить текст предупреждения к конкретной точке через поле улики.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,69. Минимум по приёмке 0,00.

Дополнительная приёмка из исходной матрицы — Given ОпасностьH с GM-механикойM, признакC помечен открытым. When Открыть представление игроков. Expected C присутствует, M отсутствует; в GM-виде доступны оба.; Given ОпасностьH и открытый признакC, GM вручную редактируетC→C2. When Сохранить и загрузить карту. Expected Связь C2→H сохранена, механизмM не изменён.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/KNAVE2-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/KNAVE2-L1-implementation.json) · проверка `KNAVE2-L1-implementation-probe.mjs`
