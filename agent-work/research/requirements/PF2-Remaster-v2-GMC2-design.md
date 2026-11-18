# PF2 Remaster: проектирование игр и границы карты

18 ноября 2026. Проверены полные тела начального блока Chapter2: от введения63 до конца Encounter Design перед Variant Rules. Это завершённый тематический срез; вся глава/игра остаётся checkpoint.

**Вывод:** совет о тройном резерве встреч не является плотностью POI. Раздел Maps and Terrain внутри Encounter Design посвящён боевой сцене и не требует тактической сетки HexCrawl. Рецепты сюжетов, общий NPC и бюджет наград исключены. Не возвращаются ранее отозванные трактовки GMC1.

**Для карты:** только существующие размещение мест и совместное сохранение места с местностью/опасностью. Две операции ниже — уточняющие примеры принятого объёма, а не новые функции/задачи или доказательство реализации.

## PF2-GMC2-MAP-01

Источник: [Building a Sandbox sidebar](https://2e.aonprd.com/Rules.aspx?ID=2688). Песочница даёт игрокам исследуемую территорию с самостоятельными местами; когда и как посещать их, выбирают игроки. Для подготовки предлагается примерно тройной резерв встреч, распределённых между местами или фракциями; сложная область может потребовать больше. Подобласти сначала намечают кратко, детализируют по планам группы.

**Действие:** Мастер размещает выбранные независимые места в разных гексах территории. **Объект:** {"hexes":["H1","H2","H3"],"places":[{"id":"D","type":"dungeon","hex":"H1"},{"id":"V","type":"village","hex":"H3"}],"existing":{"id":"R","type":"river"}}. **Результат:** На карте D в H1, V в H3; H2 без дополнительного POI; R прежняя.

- Река R и пустые H1/H2/H3; мастер выбрал D@H1,V@H3 → Разместить оба места и сохранить/загрузить карту → D@H1,V@H3,R сохранены, H2 пуст.
- Сохранённая карта с D,V,R → Мастер не запрашивает новых мест → Карта не получает ещё4места и не заполняет H2 ради тройного резерва.

Ограничения: Число мест задаёт мастер; не умножать его на3 по совету о резерве встреч. Источник не задаёт новый режим или требование отдельного sandbox UI. Не создавать сцены, NPC, фракционные часы или маршрут партии.

Переиспользуются PF2-RM-003-L1-v2, PF2-RM-122-L1-v2. Поддержка: **не проверена**, не отсутствие. Конкретный SHA/runtime остаётся в общем остатке PF2.

## PF2-GMC2-MAP-02

Источник: [GM Core74 Locations](https://2e.aonprd.com/Rules.aspx?ID=2712). Физическое содержимое и опасности подбирают к месту: например, заросшие руины с колючими растениями, кислотные участки болот или магическая ловушка в гробнице. Это примеры уместного наполнения, не обязательные сочетания. Чувственные описания — отдельный совет, не механика.

**Действие:** Мастер размещает руины в выбранном заросшем опасном участке карты. **Объект:** {"hex":"H7","terrain":"dense_underbrush","danger":"thorns","place":{"id":"C","type":"ruins"}}. **Результат:** C находится в H7 совместно с зарослями/опасностью участка.

- H7 — заданный мастером участок густого подлеска с колючками → Разместить C и повторно открыть карту → C@H7 и прежняя местность/опасность сохранены.
- Руины V на обычной равнине без выбранной опасности → Создать V → Пример из книги не добавляет колючки автоматически.

Ограничения: Только уже принятая местность/проходимость и место; без нового движка ловушек. Не рассчитывать клеточную площадь, урон, противодействие или магию. Нет автоматического заселения всех руин колючками.

Переиспользуются PF2-RM-003-L1-v2, PF2-RM-072-L1-v2. Поддержка: **не проверена**, не отсутствие. Конкретный SHA/runtime остаётся в общем остатке PF2.

## Весь прочитанный блок: решения по применимости

| ID | Раздел и охват | Решение | Основание |
|---|---|---|---|
| PF2-GMC2-SCREEN-01 | [To Create or Adapt](https://2e.aonprd.com/Rules.aspx?ID=2666) | out_of_scope | Общий выбор метода подготовки; не восстанавливает исключённый GMC1-001 и не требует нового редактора. |
| PF2-GMC2-SCREEN-02 | [Scope of Changes](https://2e.aonprd.com/Rules.aspx?ID=2667) | out_of_scope | Свобода авторства не является требованием новой функции карты. |
| PF2-GMC2-SCREEN-03 | [Campaign Structure / Length / Basic Structures](https://2e.aonprd.com/Rules.aspx?ID=2668) — Campaign Length; Basic Structures; One-Shot; Brief Campaign; Extended Campaign; Epic Campaign | out_of_scope | Планирование кампании и развития персонажей исключено. |
| PF2-GMC2-SCREEN-04 | [Themes](https://2e.aonprd.com/Rules.aspx?ID=2668) | out_of_scope | Жанр и драматургия не дают функции карты. |
| PF2-GMC2-SCREEN-05 | [Linking Adventures](https://2e.aonprd.com/Rules.aspx?ID=2676) | out_of_scope | Повествовательная связь приключений не требует графа сюжета. Упоминание соседства не задаёт нового алгоритма географии. |
| PF2-GMC2-SCREEN-06 | [Player Goals](https://2e.aonprd.com/Rules.aspx?ID=2668) | out_of_scope | Цели персонажей и создание учреждений не принятая подсистема. |
| PF2-GMC2-SCREEN-07 | [Changing the World / Power Level](https://2e.aonprd.com/Rules.aspx?ID=2678) | out_of_scope | Совет показывать последствия и рост силы не даёт автосимуляции географии; не восстанавливает GMC1C-012. |
| PF2-GMC2-SCREEN-08 | [Recurring Villains / Villain Goals](https://2e.aonprd.com/Rules.aspx?ID=2668) — Recurring Villains; Villain Goals | out_of_scope | Общие NPC и управление сюжетом исключены. |
| PF2-GMC2-SCREEN-09 | [Starting the Campaign](https://2e.aonprd.com/Rules.aspx?ID=2668) — Starting the Campaign; At the First Session; Starting at a Higher Level | out_of_scope | Организация игры и персонажей; стартовая локация сама по себе не новая карта. |
| PF2-GMC2-SCREEN-10 | [Ending and Next Campaign](https://2e.aonprd.com/Rules.aspx?ID=2668) — Ending the Campaign; Dealing with Failure; The Next Campaign | out_of_scope | Эпилог и преемственность рассказа исключены; нет требования новой симуляции мира. |
| PF2-GMC2-SCREEN-11 | [Adventure Design introduction](https://2e.aonprd.com/Rules.aspx?ID=2688) | out_of_scope | Совет начать от места не самостоятельная операция; GMC1-002 не возвращается. |
| PF2-GMC2-SCREEN-12 | [Player Motivations / Theme and Feeling / Keeping it Varied](https://2e.aonprd.com/Rules.aspx?ID=2688) — Player Motivations; Theme and Feeling; Keeping it Varied | out_of_scope | Режиссура и эмоциональная композиция исключены. |
| PF2-GMC2-SCREEN-13 | [Adventure Recipes / Styles](https://2e.aonprd.com/Rules.aspx?ID=2688) — Adventure Recipes; Styles; Dungeon Crawl; Gritty Adventure; High Adventure; Horror; Intrigue; Military Adventure; Mystery; Planar Adventure; Romantic Adventure | out_of_scope | Рецепты сцен не задают плотность POI, сетку или генератор приключений. |
| PF2-GMC2-SCREEN-14 | [Threats](https://2e.aonprd.com/Rules.aspx?ID=2688) — Corruption; Devastation; Extremism; Mayhem; Subjugation | out_of_scope | Тематические угрозы и подбор противников не картографический генератор. |
| PF2-GMC2-SCREEN-15 | [Building a Sandbox — размещённые места](https://2e.aonprd.com/Rules.aspx?ID=2688) | keep_L1 | Несколько реально размещённых мест исследуемой территории относятся к наполнению карты; без генератора сюжета/фракций. |
| PF2-GMC2-SCREEN-16 | [Building a Sandbox — резерв и ход игры](https://2e.aonprd.com/Rules.aspx?ID=2688) | out_of_scope | Приблизительно тройной резерв относится к встречам, не POI. Подготовка по планам игроков не алгоритм плотности или автозаполнение. |
| PF2-GMC2-SCREEN-17 | [Motivations / Story Arcs](https://2e.aonprd.com/Rules.aspx?ID=2688) — Motivations; Story Arcs | out_of_scope | Цели антагонистов и развитие сюжета исключены. |
| PF2-GMC2-SCREEN-18 | [NPCs and Organizations](https://2e.aonprd.com/Rules.aspx?ID=2688) | out_of_scope | Общий генератор NPC/организаций не принят; наличие места не основание. |
| PF2-GMC2-SCREEN-19 | [Locations — чувственные подробности](https://2e.aonprd.com/Rules.aspx?ID=2712) | out_of_scope | Атмосферный текст не новая функция; GMC1-003 остаётся исключён. |
| PF2-GMC2-SCREEN-20 | [Locations — совместимое физическое содержимое](https://2e.aonprd.com/Rules.aspx?ID=2712) | keep_L1 | Только конкретный географически размещённый участок/опасность; полное разрешение ловушек и локальная боевая геометрия исключены. |
| PF2-GMC2-SCREEN-21 | [Encounters](https://2e.aonprd.com/Rules.aspx?ID=2713) | out_of_scope | Последовательность и обход сцен не алгоритм региональных дорог или движок встреч. |
| PF2-GMC2-SCREEN-22 | [Treasure](https://2e.aonprd.com/Rules.aspx?ID=2714) | out_of_scope | Бюджет и распределение наград исключены; не добавляется оптимизатор добычи. |
| PF2-GMC2-SCREEN-23 | [Combat Threats and budgets](https://2e.aonprd.com/Rules.aspx?ID=2715) — Combat Threats; XP Budget; Quick Adventure Groups; Choosing Creatures; Different Party Sizes; Tables10-1/10-2 | out_of_scope | Баланс боя, а не наполнение карты. |
| PF2-GMC2-SCREEN-24 | [Variety](https://2e.aonprd.com/Rules.aspx?ID=2715) — Variety | out_of_scope | Рекомендации о композиции встреч. |
| PF2-GMC2-SCREEN-25 | [Encounter Locations / Maps and Terrain](https://2e.aonprd.com/Rules.aspx?ID=2715) — Encounter Locations; Maps and Terrain; Inhabitant or Intruder? | out_of_scope | Локальная боевая сцена, укрытия и дальности; не региональная сетка. |
| PF2-GMC2-SCREEN-26 | [Wild Weather / Budgeting for Terrain](https://2e.aonprd.com/Rules.aspx?ID=2715) — Wild Weather; Budgeting for Terrain | out_of_scope | Влияние среды на бой и его XP; не новый региональный профиль. |
| PF2-GMC2-SCREEN-27 | [Enemy Motivations / Morale](https://2e.aonprd.com/Rules.aspx?ID=2715) — Enemy Motivations; Morale | out_of_scope | Поведение противников исключено. |
| PF2-GMC2-SCREEN-28 | [Dynamic Encounters](https://2e.aonprd.com/Rules.aspx?ID=2715) — Dynamic Encounters; Hazards in Combat; Evolving Battlefields; Combining and Separating Encounters; Pitfalls | out_of_scope | Динамика боя, локальные препятствия и подкрепления исключены. |
| PF2-GMC2-SCREEN-29 | [Tactics](https://2e.aonprd.com/Rules.aspx?ID=2715) — Time Pressure; Secondary Objectives; Opponent Synergy; Misdirection; Recurring Villains | out_of_scope | Тактика и сюжетные приёмы исключены. |
| PF2-GMC2-SCREEN-30 | [Social Encounters](https://2e.aonprd.com/Rules.aspx?ID=2715) — Social Encounters | out_of_scope | Социальные сцены и NPC исключены. |
| PF2-GMC2-SCREEN-31 | [Treasure by Encounter](https://2e.aonprd.com/Rules.aspx?ID=2715) — Treasure by Encounter; Table5-3,20rows | out_of_scope | Оптимизация бюджета наград исключена; таблица не оцифровывается. |

## Доказательства и продолжение

Общие механики и единственный game-bindings прочитаны на SHA, указанном в JSON. Пустой ответ fetch_file не оказался пустым реестром: git/blob вернул те же данные по тому же blob SHA. Ничего не переписано в реестрах. Новых задач, рейтинга, методики, score, кода и main нет.

Продолжить ту же цель полного тематического скрининга GMCoreChapter2: Variant Rules (переход Next из EncounterDesign Rules.aspx?ID=2715), далее, Afflictions, Environment, Hazards, Building Hazards, Building Creatures, Building Items, Building Worlds. Для ранее разобранных Environment/BuildingWorlds переиспользовать сохранённые источники/29keep_L1 и132исходных строк; закрытые главы/63–74 не перечитывать без нового основания. Все15блоков полного корпуса остаются на учёте, chapter2 пока partially_read. Затем остальные GMCore/PlayerCore блоки, сверка применимых crossrefs и runtime каждого принятого профиля на свежем SHA. DND5блокер сохраняется; create-top10 только после принятия overalltop5.

Полная RA-Q02 по игре и RA-Q10 остаются открыты. Схема двух operational_requirement проверена без ошибок; это проверка исследовательских данных, не приложения. Число строк не означает число функций.
