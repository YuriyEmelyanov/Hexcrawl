# Формализация L1 для топ‑20 создания карты

Модель 1.3‑rc8. Использована когорта **create** и 177 операций её игрового блока. [Индекс JSON](index.json) · [Модель и критерии](../../score/current-score.json) · [Матрица приёмки](../acceptance/L1-PR509/ledger.json).

На каждой строке сохранены ID исходной операции модели, ссылки на общие критерии и binding при наличии, первоисточник либо путь к исходному разбору, операционное требование и историческое evidence. Структурированные требования проверены по data-contract.json. Координаты, единицы, входы, выходы и исключения приводятся в пределах подтверждённого сценария. Текущая реализация требует проверки на выбранном SHA. Ссылки на смежные операции сохранены как аналоги.

| Место create | Игра | Операции | Структурировано | Требует формализации |
|---:|---|---:|---:|---:|
| 1 | [D&D 5e](games/DND5.json) | 16 | 15 | 1 |
| 2 | [Pathfinder 2](games/PF2.json) | 29 | 29 | 0 |
| 3 | [Knave 2e](games/KNAVE2.json) | 12 | 12 | 0 |
| 4 | [Shadowdark](games/SD.json) | 18 | 18 | 0 |
| 5 | [Mythic Bastionland](games/MB.json) | 7 | 7 | 0 |
| 6 | [Worlds Without Number](games/WWN.json) | 9 | 9 | 0 |
| 7 | [Root: The Roleplaying Game](games/ROOT.json) | 14 | 7 | 7 |
| 8 | [Old-School Essentials](games/OSE.json) | 4 | 4 | 0 |
| 9 | [Cairn 2e](games/CAIRN2.json) | 14 | 14 | 0 |
| 10 | [Pirate Borg](games/PIRATE.json) | 3 | 0 | 3 |
| 11 | [Crows: Fortune or Death](games/CROWS.json) | 13 | 13 | 0 |
| 12 | [Sundered Isles](games/SI.json) | 5 | 0 | 5 |
| 13 | [Ashes Without Number](games/AWN.json) | 4 | 0 | 4 |
| 14 | [Vaults of Vaarn](games/VAARN.json) | 2 | 2 | 0 |
| 15 | [Black Sword Hack Ultimate Chaos](games/BSH.json) | 2 | 0 | 2 |
| 16 | [Pathfinder 1](games/PF1.json) | 13 | 13 | 0 |
| 17 | [Swords & Wizardry Complete](games/SWC.json) | 4 | 0 | 4 |
| 18 | [Mausritter](games/MAUS.json) | 5 | 5 | 0 |
| 19 | [Salvage Union](games/SALV.json) | 2 | 0 | 2 |
| 20 | [Dungeon Crawl Classics](games/DCC.json) | 1 | 0 | 1 |

## Что проверено по первоисточнику

Для Mausritter описаны пять операций подготовки региона. В таблице поселений броски 2 и 5 дают Crossroads. В таблицах местности d6=5, d20=1 дают реку и шлюз, а d6=2 с d8=1 добавляет мышиную ферму как деталь. Для стартовой карты проверяется 25 гексов и поселение в центре. Физическая ось измерения одной мили открыта. Критерии приёмки сформулированы отдельно от правил SRD. [Первичный источник](https://mausritter.com/srd/hexcrawl-toolbox/) · [Пять операций](games/MAUS.json).

## Продолжение

29 операций требуют полноценного требования. Начать с привязки ресурсов к поселению в D&D 5e и семи объектов в Root. Отдельно проверить 14 строк без общего критерия и 51 строку без точной привязки к игровому правилу. Эти множества пересекаются. Баллы модели требуют процедуры приёмки и действующих разрешений владельца.
