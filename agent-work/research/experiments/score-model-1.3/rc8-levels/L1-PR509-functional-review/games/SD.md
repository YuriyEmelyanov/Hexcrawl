# Shadowdark · подготовка карты

Место 4 в топ-20 создания. 18 операций в этом срезе. Функциональная доля 47,22%, вклад в L1 7,87. Минимум со строгой приёмкой 0,00 балла L1. Полнота тематического корпуса открыта.

## SD-CORE-001-L1

**Физический размер гекса**

Ожидаемый результат — Карта с устойчивым масштабом и явно указанной неопределённостью геометрии.

**Частично**. Базовая сетка использует 6 миль между сторонами. Повторное открытие той же карты с приближением 1× и 2× меняет только состояние камеры. Отдельным тестом прошла одномильная проекция и загрузка.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,46. Минимум по приёмке 0,00.

Дополнительная приёмка из исходной матрицы — Given Новая карта, профиль Shadowdark, геометрия не выбрана When Задать масштаб и сохранить/открыть Expected hex_across=6 mile восстановлен; face-to-face/vertex-to-vertex не назначен без решения.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/SD-CORE-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/SD-CORE-L1-implementation.json) · проверка `SD-CORE-L1-implementation-probe.mjs + SD 2026-11-20 probes`

## SD-CORE-002-L1

**Стоимость пересечения гекса по способу и местности**

Ожидаемый результат — H отмечен труднопроходимым; исходный лес и соседние гексы сохраняются после загрузки.

**Частично**. Хвойный биом и логово сохранились вместе. Контроль на карте Knave показывает отдельный difficult без изменения биома и точки.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,46. Минимум по приёмке 0,00.

Дополнительная приёмка из исходной матрицы — Given Гекс H17: forest; GM выбирает normal When Сохранить/открыть Expected Биом forest и travel_difficulty=normal сохранены; категория не изменена автоматически.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/SD-CORE-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/SD-CORE-L1-implementation.json) · проверка `SD-CORE-L1-implementation-probe.mjs + SD 2026-11-20 probes`

## SD-CORE-031-L1

**Наблюдаемые признаки, сведения и телеграфирование угроз**

Ожидаемый результат — Два представления одного места с явно выбранной доступностью.

**Частично**. Самостоятельное поле признака недоступно. Необязательный признак можно пропустить. Мастер независимо редактирует улику у POI и причину в заметке гекса. Обе переживают отдельные импорты; при переносе POI оказываются по разным адресам.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,46. Минимум по приёмке 0,00.

Дополнительная приёмка из исходной матрицы — Given GM записал у пещеры tell «сломанные кости у входа» и secret «внутри мантикора»; tell разрешён игрокам When Открыть player view Expected Показаны сломанные кости; секрет об обитателе не показан.; Given GM не задал tell для места When Сохранить место Expected Место сохраняется; совет о большинстве угроз не принуждает создать признак.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/SD-CORE-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/SD-CORE-L1-working-matrix-2026-11-20.json) · проверка `SD-CORE-L1-implementation-probe.mjs + SD 2026-11-20 probes`

## SD-CORE-041-L1

**Пассивные опасности и сочетание категорий**

Ожидаемый результат — У H есть выбранная опасность и её наблюдаемый признак; соседняя география не перегенерирована.

**Частично**. Прямой тест score13-surface.mjs на релизе: неподвижное логово, признак и причина либо именованный склад и факт о Рине восстановлены при повторном открытии. Заметка принадлежит гексу, у признака отсутствует независимая видимость.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,46. Минимум по приёмке 0,00.

Дополнительная приёмка из исходной матрицы — Given GM выбрал movement=quicksand и weaken=antimagic как явно смешанный hazard When Сохранить Expected У опасности две категории и оба выбранных описания; damage/DC/tick не придуманы.; Given У строки нет numerical damage When Экспортировать паспорт Expected damage=null; неизвестное не заменяется0 или arbitrary die.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/SD-CORE-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/SD-CORE-L1-implementation.json) · проверка `SD-CORE-L1-implementation-probe.mjs + SD 2026-11-20 probes`

## SD-CORE-043-L1

**Приключение и название linked site из выбранных деталей**

Ожидаемый результат — У P имя «Чёрная Башня» с выбранными деталями; второй объект не переименован.

**Полностью**. Одной башне задано составленное мастером имя «Чёрная Башня». Сравнение карты до и после показало изменение только имени выбранного объекта. После импорта имя осталось.

Функциональная доля операции 100,00%. Вклад в общий функциональный ориентир 0,93. Минимум по приёмке 0,00.

Дополнительная приёмка из исходной матрицы — Given Site name колонки1/2/3 выбраны3/7/13 When Скомбинировать и вручную исправить связь слов Expected Сохранено название башни у лесного болота с исходными3/7/13; редактор разрешил изменить предлог.; Given GM выбрал только колонку1 приключения, результат1 When Сохранить черновик Expected Разрешено сохранить неполный крючок о спасении; не требуются остальные колонки.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/SD-CORE-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/SD-CORE-L1-implementation.json) · проверка `SD-CORE-L1-implementation-probe.mjs + SD 2026-11-20 probes`

## SD-CORE-046-L1

**Данж как linked site; внутренняя раскладка вне регионального движка**

Ожидаемый результат — На карте один вход D с именем и справочной ссылкой; комнаты не создаются как региональные гексы.

**Частично**. Проверен один именованный региональный вход типа dungeon. После импорта сохранились его координаты, имя, тип и остальная география.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,46. Минимум по приёмке 0,00.

Дополнительная приёмка из исходной матрицы — Given Региональное местоA; linked dungeonD; size=medium; type=cave When Связать Expected A→D; descriptor medium/source_room_dice8d10; внутренняя карта не создаётся.; Given GM приложил внешний планD When Открыть linked site Expected Доступна ссылка на внешний план; региональная позицияA не заменяется внутренними координатами.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/SD-CORE-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/SD-CORE-L1-implementation.json) · проверка `SD-CORE-L1-implementation-probe.mjs + SD 2026-11-20 probes`

## SD-CORE-047-L1

**Начальная местность overland и взвешенный выбор**

Ожидаемый результат — Гекс с категорией, исходными костями/выбором и необязательным уточнением.

**Частично**. Геометрический минимум моря не допускает отображения отдельного океанического гекса этим инструментом. Бросок и категория не сохраняются как профильный результат Classic.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,46. Минимум по приёмке 0,00.

Дополнительная приёмка из исходной матрицы — Given Начальный hex; dice1+1 When Сгенерировать terrain Expected category=desert_or_arctic; subtype=null до выбораGM.; Given Начальный hex; dice3+4 When Сгенерировать terrain Expected category=forest_or_jungle; никакой автоматический forest/jungle tie-break не выполняется.; Given GM вручную выбрал mountain When Создать стартовый гекс Expected category=mountain; random dice не требуются.; Given Фиксированные 36 упорядоченных пар (a,b), a,b ∈ {1,2,3,4,5,6}; каждый исход используется ровно один раз. When Разрешить Hex Terrain для всех 36 пар. Expected Числа по семи упорядоченным категориям: [1,2,12,11,7,2,1]. Uniform d12 не проходит этот тест.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/SD-CORE-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/SD-CORE-L1-overland-editor-2026-11-20.json) · проверка `SD-CORE-L1-implementation-probe.mjs + SD 2026-11-20 probes`

## SD-CORE-048-L1

**Генерация пустого гекса и циклические шаги по строкам terrain**

Ожидаемый результат — Назначенная категория нового гекса с точным происхождением и без перезаписи готового гекса.

**Частично**. Сохранён только ручной результат. Из этой проверки не следует поддержка события входа в пустой гекс или штатного кольцевого перехода.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,46. Минимум по приёмке 0,00.

Дополнительная приёмка из исходной матрицы — Given current=mountain; empty destination; dice1+1 =>2 When Создать новый hex Expected +1 category row с wrap даёт desert_or_arctic.; Given current=ocean; dice4+5 =>9 When Создать новый hex Expected +2 category rows: ocean→mountain→desert_or_arctic.; Given current=mountain; dice5+5 =>10 When Создать новый hex Expected +2 rows даёт swamp; не арифметический total14.; Given NewHex dice6+6; отдельный terrain dice6+6 When Создать новый hex Expected Сработал reroll; итогmountain; записаны две пары костей.; Given Гекс уже имеет grassland и linked POI; поступила команда генерации When Применить защиту продукта Expected Содержимое сохранено; требуется явное GM overwrite, если оно вообще поддерживается.; Given Фиксированные 36 упорядоченных пар двух d6; current terrain произвольна; повторный terrain roll при 12 фиксирован отдельно. When Разрешить New Hex для всех 36 пар. Expected Числа действий: +1 строка=3, same=23, +2 строки=9, новый terrain roll=1. Uniform d12 неэквивалентен.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/SD-CORE-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/SD-CORE-L1-overland-editor-2026-11-20.json) · проверка `SD-CORE-L1-implementation-probe.mjs + SD 2026-11-20 probes`

## SD-CORE-049-L1

**Назначаемый danger profile гекса и источник таблицы**

Ожидаемый результат — Назначенный danger profile без выдуманной частоты назначения.

**Отсутствует**. В проверенной схеме общего редактора и активных режимах нет отдельной сохраняемой оценки safe/unsafe/risky/deadly для гекса.

Функциональная доля операции 0,00%. Вклад в общий функциональный ориентир 0,00. Минимум по приёмке 0,00.

Дополнительная приёмка из исходной матрицы — Given GM вызвал Danger Level; die1 When Назначить гексуA Expected A.danger=safe; encounter_cadence не подставляется.; Given GM вызвал Danger Level; die5 When Назначить гексуB Expected B.danger=risky.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/SD-CORE-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/SD-CORE-L1-implementation.json) · проверка `SD-CORE-L1-implementation-probe.mjs + SD 2026-11-20 probes`

## SD-CORE-050-L1

**Плотность POI: один объект на успешномd6**

Ожидаемый результат — Ноль или одна POI slot с исходом броска.

**Частично**. Состояние «проверен и пуст» и исходы d6 не создаются ручной командой. Утверждённый профиль, автоматически создающий слот, этим тестом не подтверждается.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,46. Минимум по приёмке 0,00.

Дополнительная приёмка из исходной матрицы — Given Новый гексA; die1 When Проверить POI presence Expected Создана ровно1POI slot.; Given Новый гексB; die6 When Проверить POI presence Expected По этому рецепту создано0POI, не6.; Given ГексA уже содержит результатcheck1 When Повторно открыть генератор Expected Нет скрытого повторного броска и новогоPOI; повторная генерация возможна только явно по решениюGM.; Given Шесть новых гексов и фиксированные POI presence outcomes [1,2,3,4,5,6]. When Разрешить по одной presence check на гекс. Expected Числа созданных POI slots [1,0,0,0,0,0], всего один POI; повторная обработка не скрыто перебрасывается.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/SD-CORE-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/SD-CORE-L1-overland-editor-2026-11-20.json) · проверка `SD-CORE-L1-implementation-probe.mjs + SD 2026-11-20 probes`

## SD-CORE-051-L1

**POI location/development и смысловые связи**

Ожидаемый результат — POI с независимыми source coordinates, рецептом и linked content.

**Частично**. Структурированная связь POI→POI, прикрепление отдельной схемы и происхождение двух результатов таблицы не подтверждены в проверенном пути. Выбор рецепта генерации остаётся неопределённым.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,46. Минимум по приёмке 0,00.

Дополнительная приёмка из исходной матрицы — Given Product profile явно same_roll; roll2 When Создать POI Expected Location=укреплённый keep; development=связь с большим tomb; recipe=same_roll recorded, source certainty=unresolved.; Given Product profile явно independent; location roll7,development20 When Создать POI Expected Location=деревня; development=дверь в иной plane; оба результата сохранены отдельно.; Given Рецепт не выбран When Попросить полностью автоматическую генерацию Expected Возвращён unresolved_column_policy; same/independent не назначены молча.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/SD-CORE-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/SD-CORE-L1-poi-location-development-2026-11-20.json) · проверка `SD-CORE-L1-implementation-probe.mjs + SD 2026-11-20 probes`

## SD-CORE-052-L1

**Катаклизм как результат POI development**

Ожидаемый результат — Тема относится только к P; её источник сохранён, неизвестные радиус/урон/длительность не выдуманы.

**Отсутствует**. В проверенной модели POI нет операции выбрать результат Cataclysm и сохранить его исходную строку как тему конкретного места.

Функциональная доля операции 0,00%. Вклад в общий функциональный ориентир 0,00. Минимум по приёмке 0,00.

Дополнительная приёмка из исходной матрицы — Given POI development1; cataclysm roll4 When Разрешить follow-up Expected УPOI записан storm; trace133:development1→132:cataclysm4; цепочка завершена.; Given Cataclysm roll6 When Разрешить Expected Записан war как сюжетный катаклизм; состав армий/зона боёв не сгенерированы.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/SD-CORE-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/SD-CORE-L1-implementation.json) · проверка `SD-CORE-L1-implementation-probe.mjs + SD 2026-11-20 probes`

## SD-CORE-053-L1

**Имя поселения по его выбранному масштабу**

Ожидаемый результат — Поселение с именем и сохранённым типом.

**Частично**. Проверено, что изменение имени городка сохраняет тип town и тот же адрес после загрузки.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,46. Минимум по приёмке 0,00.

Дополнительная приёмка из исходной матрицы — Given type=village; roll1 When Назвать Expected Имя=Bruga’s Hold; type остаётсяvillage.; Given type=metropolis; roll8 When Назвать Expected Имя=Rahgbat изcity/metropolis колонки; численность жителей неизвестна.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/SD-CORE-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/SD-CORE-L1-implementation.json) · проверка `SD-CORE-L1-implementation-probe.mjs + SD 2026-11-20 probes`

## SD-CORE-058-L1

**Таверна: название, меню и разные кости drinks**

Ожидаемый результат — T названа «У моста», предлагаются хлеб и пиво; никаких цен/рационов/персонажных эффектов не рассчитано.

**Частично**. Именованная таверна «У моста» сохраняет тип и координаты после импорта.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,46. Минимум по приёмке 0,00.

Дополнительная приёмка из исходной матрицы — Given quality=standard; drink dice(1,1),(3,4),(6,6) When Создать меню Expected 3drink entries с суммами[2,7,12]; неd12. Food slots:1poor,2standard.; Given quality=poor; drink rolls[1,6] When Создать меню Expected 2drink entries; food slots3poor. Drink roll7 этим рецептом недопустим.; Given quality=wealthy; selected food row1; food price die5 When Разрешитьwealthyfood Expected Выбраны fried basilisk eyes; цена5gp; численные эффекты drink не активированы.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/SD-CORE-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/SD-CORE-L1-implementation.json) · проверка `SD-CORE-L1-implementation-probe.mjs + SD 2026-11-20 probes`

## SD-CORE-059-L1

**Магазины и посетители как связанный контент**

Ожидаемый результат — У S имя «Медная лавка» и специализация инструменты; случайный посетитель и ассортимент не созданы.

**Частично**. Именованная постройка или вход в выбранном месте и повторное открытие проверены через реальные команды POI. Специфичная связь с поляной, сценой или услугой из этого правила отдельно не подтверждена.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,46. Минимум по приёмке 0,00.

Дополнительная приёмка из исходной матрицы — Given quality=standard; shop roll7 When Создать магазин Expected Специализация=shipwright/carpenter; доступность конкретной лодки не установлена.; Given customer row1,col2; nested d10 roll7 When Создать visitor descriptor Expected Получено7детей; trace139:(1,2)→d10=7.; Given quality=wealthy; shop roll12 When Проверитьinput Expected Ошибка:wealthy shop используетd10; результат12 недопустим.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/SD-CORE-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/SD-CORE-L1-implementation.json) · проверка `SD-CORE-L1-implementation-probe.mjs + SD 2026-11-20 probes`

## SD-CORE-063-L1

**Статические признаки и места внутри случайной сцены**

Ожидаемый результат — На H один колодец W, связанный с исходной сценой E; повторное сохранение не создаёт дубля.

**Частично**. Именованная постройка или вход в выбранном месте и повторное открытие проверены через реальные команды POI. Специфичная связь с поляной, сценой или услугой из этого правила отдельно не подтверждена.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,46. Минимум по приёмке 0,00.

Дополнительная приёмка из исходной матрицы — Given Forest92–93 выбрана; ведущий закрепляет её вhexH When Создать место Expected ВH появляется заброшенная часовня с признакомsafe_shelter и ссылкойForest92–93; соседние гексы не меняются.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/SD-CORE-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/SD-CORE-L1-implementation.json) · проверка `SD-CORE-L1-implementation-probe.mjs + SD 2026-11-20 probes`

## SD-CORE-074-L1

**Биомные предпочтения и фиксированные логова из каталога**

Ожидаемый результат — Логово L связано с лесной местностью и внешней ссылкой обитателя; численность/статблок/популяция не создаются.

**Частично**. Лесное логово сохранено в выбранном гексе с хвойным биомом. Рост карты и загрузка сохранили тип, координаты, имя и биом.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,46. Минимум по приёмке 0,00.

Дополнительная приёмка из исходной матрицы — Given Fire giant из 218; кандидат volcanoV. When Показать совместимость. Expected Есть прямое источниковое основание для анклава в volcanoV.; Given Roc из 248; кандидат remote mountainM. When Разместить по выбору ведущего. Expected Гнездо закреплено в M; остальные популяции не размещены.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/SD-CORE-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/SD-CORE-L1-implementation.json) · проверка `SD-CORE-L1-implementation-probe.mjs + SD 2026-11-20 probes`

## SD-CORE-079-L1

**Следы, сигналы и особые чувства для исследования**

Ожидаемый результат — Признак с местом, происхождением и видимостью.

**Частично**. Прямой тест score13-surface.mjs на релизе: неподвижное логово, признак и причина либо именованный склад и факт о Рине восстановлены при повторном открытии. Заметка принадлежит гексу, у признака отсутствует независимая видимость.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,46. Минимум по приёмке 0,00.

Дополнительная приёмка из исходной матрицы — Given В месте есть desert dragon; ведущий раскрывает запах озона. When Показать признак. Expected Игрокам известен запах; имя дракона и логово автоматически не раскрыты.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/SD-CORE-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/SD-CORE-L1-implementation.json) · проверка `SD-CORE-L1-implementation-probe.mjs + SD 2026-11-20 probes`
