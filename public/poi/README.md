# Точки интереса — SVG для оценки

38 значков для всех типов из `src/App.tsx`: 32 наземных и 6 водных. Дополнительно — общий маркер точки без назначенного типа.

Один цвет `#26332b`, прозрачный фон, `viewBox="0 0 64 64"`. Все элементы — векторная геометрия; без шрифтов, встроенных растров, фильтров и внешних ресурсов.

[Общий лист всех значков](preview.svg) · [Сопоставление типов и файлов](manifest.json)

![Обзор всех значков](preview.png)

После подключения в приложении пути будут начинаться с `/poi/`, например `/poi/land/village.svg` и `/poi/water/lair.svg`. Ключ `lair` намеренно имеет два разных рисунка для суши и воды.

## Наземные

| Тип | 64 px | 24 px | SVG |
|---|:---:|:---:|---|
| Столица | <img src="land/capital.svg" width="64" height="64" alt="Столица"> | <img src="land/capital.svg" width="24" height="24" alt="Столица"> | [capital.svg](land/capital.svg) |
| Город | <img src="land/city.svg" width="64" height="64" alt="Город"> | <img src="land/city.svg" width="24" height="24" alt="Город"> | [city.svg](land/city.svg) |
| Городок | <img src="land/town.svg" width="64" height="64" alt="Городок"> | <img src="land/town.svg" width="24" height="24" alt="Городок"> | [town.svg](land/town.svg) |
| Деревня | <img src="land/village.svg" width="64" height="64" alt="Деревня"> | <img src="land/village.svg" width="24" height="24" alt="Деревня"> | [village.svg](land/village.svg) |
| Логово | <img src="land/lair.svg" width="64" height="64" alt="Логово"> | <img src="land/lair.svg" width="24" height="24" alt="Логово"> | [lair.svg](land/lair.svg) |
| Руины | <img src="land/ruins.svg" width="64" height="64" alt="Руины"> | <img src="land/ruins.svg" width="24" height="24" alt="Руины"> | [ruins.svg](land/ruins.svg) |
| Проклятое место | <img src="land/cursed_place.svg" width="64" height="64" alt="Проклятое место"> | <img src="land/cursed_place.svg" width="24" height="24" alt="Проклятое место"> | [cursed_place.svg](land/cursed_place.svg) |
| Святое место | <img src="land/holy_place.svg" width="64" height="64" alt="Святое место"> | <img src="land/holy_place.svg" width="24" height="24" alt="Святое место"> | [holy_place.svg](land/holy_place.svg) |
| Подземелье | <img src="land/dungeon.svg" width="64" height="64" alt="Подземелье"> | <img src="land/dungeon.svg" width="24" height="24" alt="Подземелье"> | [dungeon.svg](land/dungeon.svg) |
| Лагерь | <img src="land/camp.svg" width="64" height="64" alt="Лагерь"> | <img src="land/camp.svg" width="24" height="24" alt="Лагерь"> | [camp.svg](land/camp.svg) |
| Замок | <img src="land/castle.svg" width="64" height="64" alt="Замок"> | <img src="land/castle.svg" width="24" height="24" alt="Замок"> | [castle.svg](land/castle.svg) |
| Пастбище | <img src="land/pasture.svg" width="64" height="64" alt="Пастбище"> | <img src="land/pasture.svg" width="24" height="24" alt="Пастбище"> | [pasture.svg](land/pasture.svg) |
| Пещера | <img src="land/cave.svg" width="64" height="64" alt="Пещера"> | <img src="land/cave.svg" width="24" height="24" alt="Пещера"> | [cave.svg](land/cave.svg) |
| Кладбище | <img src="land/graveyard.svg" width="64" height="64" alt="Кладбище"> | <img src="land/graveyard.svg" width="24" height="24" alt="Кладбище"> | [graveyard.svg](land/graveyard.svg) |
| Форт | <img src="land/fort.svg" width="64" height="64" alt="Форт"> | <img src="land/fort.svg" width="24" height="24" alt="Форт"> | [fort.svg](land/fort.svg) |
| Хижина | <img src="land/hut.svg" width="64" height="64" alt="Хижина"> | <img src="land/hut.svg" width="24" height="24" alt="Хижина"> | [hut.svg](land/hut.svg) |
| Рудник | <img src="land/mine.svg" width="64" height="64" alt="Рудник"> | <img src="land/mine.svg" width="24" height="24" alt="Рудник"> | [mine.svg](land/mine.svg) |
| Обелиск | <img src="land/obelisk.svg" width="64" height="64" alt="Обелиск"> | <img src="land/obelisk.svg" width="24" height="24" alt="Обелиск"> | [obelisk.svg](land/obelisk.svg) |
| Таверна | <img src="land/tavern.svg" width="64" height="64" alt="Таверна"> | <img src="land/tavern.svg" width="24" height="24" alt="Таверна"> | [tavern.svg](land/tavern.svg) |
| Башня | <img src="land/tower.svg" width="64" height="64" alt="Башня"> | <img src="land/tower.svg" width="24" height="24" alt="Башня"> | [tower.svg](land/tower.svg) |
| Портал | <img src="land/portal.svg" width="64" height="64" alt="Портал"> | <img src="land/portal.svg" width="24" height="24" alt="Портал"> | [portal.svg](land/portal.svg) |
| Мельница | <img src="land/mill.svg" width="64" height="64" alt="Мельница"> | <img src="land/mill.svg" width="24" height="24" alt="Мельница"> | [mill.svg](land/mill.svg) |
| Монастырь | <img src="land/monastery.svg" width="64" height="64" alt="Монастырь"> | <img src="land/monastery.svg" width="24" height="24" alt="Монастырь"> | [monastery.svg](land/monastery.svg) |
| Ферма | <img src="land/farm.svg" width="64" height="64" alt="Ферма"> | <img src="land/farm.svg" width="24" height="24" alt="Ферма"> | [farm.svg](land/farm.svg) |
| Статуя | <img src="land/statue.svg" width="64" height="64" alt="Статуя"> | <img src="land/statue.svg" width="24" height="24" alt="Статуя"> | [statue.svg](land/statue.svg) |
| Крепость | <img src="land/stronghold.svg" width="64" height="64" alt="Крепость"> | <img src="land/stronghold.svg" width="24" height="24" alt="Крепость"> | [stronghold.svg](land/stronghold.svg) |
| Пивоварня | <img src="land/brewery.svg" width="64" height="64" alt="Пивоварня"> | <img src="land/brewery.svg" width="24" height="24" alt="Пивоварня"> | [brewery.svg](land/brewery.svg) |
| Винокурня | <img src="land/distillery.svg" width="64" height="64" alt="Винокурня"> | <img src="land/distillery.svg" width="24" height="24" alt="Винокурня"> | [distillery.svg](land/distillery.svg) |
| Лесопилка | <img src="land/sawmill.svg" width="64" height="64" alt="Лесопилка"> | <img src="land/sawmill.svg" width="24" height="24" alt="Лесопилка"> | [sawmill.svg](land/sawmill.svg) |
| Каменоломня | <img src="land/stone_quarry.svg" width="64" height="64" alt="Каменоломня"> | <img src="land/stone_quarry.svg" width="24" height="24" alt="Каменоломня"> | [stone_quarry.svg](land/stone_quarry.svg) |
| Пасека | <img src="land/apiary.svg" width="64" height="64" alt="Пасека"> | <img src="land/apiary.svg" width="24" height="24" alt="Пасека"> | [apiary.svg](land/apiary.svg) |
| Карьер | <img src="land/quarry.svg" width="64" height="64" alt="Карьер"> | <img src="land/quarry.svg" width="24" height="24" alt="Карьер"> | [quarry.svg](land/quarry.svg) |

## Водные

| Тип | 64 px | 24 px | SVG |
|---|:---:|:---:|---|
| Водоворот | <img src="water/whirlpool.svg" width="64" height="64" alt="Водоворот"> | <img src="water/whirlpool.svg" width="24" height="24" alt="Водоворот"> | [whirlpool.svg](water/whirlpool.svg) |
| Подводные руины | <img src="water/underwater_ruins.svg" width="64" height="64" alt="Подводные руины"> | <img src="water/underwater_ruins.svg" width="24" height="24" alt="Подводные руины"> | [underwater_ruins.svg](water/underwater_ruins.svg) |
| Логово (водное) | <img src="water/lair.svg" width="64" height="64" alt="Логово (водное)"> | <img src="water/lair.svg" width="24" height="24" alt="Логово (водное)"> | [lair.svg](water/lair.svg) |
| Скалы | <img src="water/rocks.svg" width="64" height="64" alt="Скалы"> | <img src="water/rocks.svg" width="24" height="24" alt="Скалы"> | [rocks.svg](water/rocks.svg) |
| Подводная пещера | <img src="water/underwater_cave.svg" width="64" height="64" alt="Подводная пещера"> | <img src="water/underwater_cave.svg" width="24" height="24" alt="Подводная пещера"> | [underwater_cave.svg](water/underwater_cave.svg) |
| Кораблекрушение | <img src="water/shipwreck.svg" width="64" height="64" alt="Кораблекрушение"> | <img src="water/shipwreck.svg" width="24" height="24" alt="Кораблекрушение"> | [shipwreck.svg](water/shipwreck.svg) |

## Общий маркер

| Тип | 64 px | 24 px | SVG |
|---|:---:|:---:|---|
| Точка без типа | <img src="unknown.svg" width="64" height="64" alt="Точка без типа"> | <img src="unknown.svg" width="24" height="24" alt="Точка без типа"> | [unknown.svg](unknown.svg) |

## Состав набора

- Названия и ключи сверены с `CENTRAL_POI_DETAILS`, `POI_DETAILS` и `WATER_POI_DETAILS`.
- Центральные и обычные точки одного типа используют один файл.
- `manifest.json` содержит пути относительно этой папки и подписи RU/EN.
- `preview.svg` — обзор для оценки; отдельные рисунки находятся в `land/`, `water/` и `unknown.svg`.
- Размер 24 px в таблице нужен для оценки читаемости в масштабе карты.
