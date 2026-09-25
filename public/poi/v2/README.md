# Точки интереса — версия 2

32 наземных значка, 6 водных и общий маркер. Простые силуэты объектов и характерных для них предметов.

[Первая версия](../README.md) · [Сравнить обе версии](comparison.svg) · [Обзор v2](preview.svg) · [Manifest](manifest.json)

![Обзор второй версии](preview.png)

Один цвет `#26332b`, прозрачный фон, `viewBox="0 0 64 64"`. По возможности смысл передаётся внешним контуром. Просветы оставлены у кружки, пилы, портала и черепа для узнаваемости. Входы в пещеры и другие открытые формы сохраняют смысловые выемки.

Первая версия в родительской папке сохранена целиком. Файлы второй версии доступны по пути `/poi/v2/…` после будущего подключения. Приложение пока не использует этот набор.

## Пример на карте

[Столица на лесном гексе — SVG](examples/capital-forest.svg) · [PNG](examples/capital-forest.png)

![Столица на лесном гексе](examples/capital-forest.png)

Макет использует текущий тайл `Lowland_deciduous_forest.png`, геометрию и границы гекса из приложения. Корона v2 показана без изменений, по центру, в предлагаемом размере 24 × 24 на гексе высотой 56. Слева увеличение ×4, справа ×2. Размер нового SVG пока выбран только для примера; текущий одиночный эмодзи в приложении имеет размер шрифта 16. Фоновый тайл встроен в SVG примера для автономного просмотра.

## Наземные

| Тип и символ | Было · 64 px | Стало · 64 px | Стало · 24 px | Файл v2 |
|---|:---:|:---:|:---:|---|
| Столица — Корона | <img src="../land/capital.svg" width="64" height="64" alt="Столица: v1"> | <img src="land/capital.svg" width="64" height="64" alt="Столица: v2"> | <img src="land/capital.svg" width="24" height="24" alt="Столица: v2"> | [capital.svg](land/capital.svg) |
| Город — Профиль города | <img src="../land/city.svg" width="64" height="64" alt="Город: v1"> | <img src="land/city.svg" width="64" height="64" alt="Город: v2"> | <img src="land/city.svg" width="24" height="24" alt="Город: v2"> | [city.svg](land/city.svg) |
| Городок — Дом с крутой крышей | <img src="../land/town.svg" width="64" height="64" alt="Городок: v1"> | <img src="land/town.svg" width="64" height="64" alt="Городок: v2"> | <img src="land/town.svg" width="24" height="24" alt="Городок: v2"> | [town.svg](land/town.svg) |
| Деревня — Широкая хижина | <img src="../land/village.svg" width="64" height="64" alt="Деревня: v1"> | <img src="land/village.svg" width="64" height="64" alt="Деревня: v2"> | <img src="land/village.svg" width="24" height="24" alt="Деревня: v2"> | [village.svg](land/village.svg) |
| Логово — След лапы | <img src="../land/lair.svg" width="64" height="64" alt="Логово: v1"> | <img src="land/lair.svg" width="64" height="64" alt="Логово: v2"> | <img src="land/lair.svg" width="24" height="24" alt="Логово: v2"> | [lair.svg](land/lair.svg) |
| Руины — Разрушенная стена | <img src="../land/ruins.svg" width="64" height="64" alt="Руины: v1"> | <img src="land/ruins.svg" width="64" height="64" alt="Руины: v2"> | <img src="land/ruins.svg" width="24" height="24" alt="Руины: v2"> | [ruins.svg](land/ruins.svg) |
| Проклятое место — Череп | <img src="../land/cursed_place.svg" width="64" height="64" alt="Проклятое место: v1"> | <img src="land/cursed_place.svg" width="64" height="64" alt="Проклятое место: v2"> | <img src="land/cursed_place.svg" width="24" height="24" alt="Проклятое место: v2"> | [cursed_place.svg](land/cursed_place.svg) |
| Святое место — Сияние | <img src="../land/holy_place.svg" width="64" height="64" alt="Святое место: v1"> | <img src="land/holy_place.svg" width="64" height="64" alt="Святое место: v2"> | <img src="land/holy_place.svg" width="24" height="24" alt="Святое место: v2"> | [holy_place.svg](land/holy_place.svg) |
| Подземелье — Ступени вниз | <img src="../land/dungeon.svg" width="64" height="64" alt="Подземелье: v1"> | <img src="land/dungeon.svg" width="64" height="64" alt="Подземелье: v2"> | <img src="land/dungeon.svg" width="24" height="24" alt="Подземелье: v2"> | [dungeon.svg](land/dungeon.svg) |
| Лагерь — Палатка | <img src="../land/camp.svg" width="64" height="64" alt="Лагерь: v1"> | <img src="land/camp.svg" width="64" height="64" alt="Лагерь: v2"> | <img src="land/camp.svg" width="24" height="24" alt="Лагерь: v2"> | [camp.svg](land/camp.svg) |
| Замок — Замок с двумя башнями | <img src="../land/castle.svg" width="64" height="64" alt="Замок: v1"> | <img src="land/castle.svg" width="64" height="64" alt="Замок: v2"> | <img src="land/castle.svg" width="24" height="24" alt="Замок: v2"> | [castle.svg](land/castle.svg) |
| Пастбище — Овца | <img src="../land/pasture.svg" width="64" height="64" alt="Пастбище: v1"> | <img src="land/pasture.svg" width="64" height="64" alt="Пастбище: v2"> | <img src="land/pasture.svg" width="24" height="24" alt="Пастбище: v2"> | [pasture.svg](land/pasture.svg) |
| Пещера — Вход в скале | <img src="../land/cave.svg" width="64" height="64" alt="Пещера: v1"> | <img src="land/cave.svg" width="64" height="64" alt="Пещера: v2"> | <img src="land/cave.svg" width="24" height="24" alt="Пещера: v2"> | [cave.svg](land/cave.svg) |
| Кладбище — Одно надгробие | <img src="../land/graveyard.svg" width="64" height="64" alt="Кладбище: v1"> | <img src="land/graveyard.svg" width="64" height="64" alt="Кладбище: v2"> | <img src="land/graveyard.svg" width="24" height="24" alt="Кладбище: v2"> | [graveyard.svg](land/graveyard.svg) |
| Форт — Щит | <img src="../land/fort.svg" width="64" height="64" alt="Форт: v1"> | <img src="land/fort.svg" width="64" height="64" alt="Форт: v2"> | <img src="land/fort.svg" width="24" height="24" alt="Форт: v2"> | [fort.svg](land/fort.svg) |
| Хижина — Хижина с трубой | <img src="../land/hut.svg" width="64" height="64" alt="Хижина: v1"> | <img src="land/hut.svg" width="64" height="64" alt="Хижина: v2"> | <img src="land/hut.svg" width="24" height="24" alt="Хижина: v2"> | [hut.svg](land/hut.svg) |
| Рудник — Вход с деревянными опорами | <img src="../land/mine.svg" width="64" height="64" alt="Рудник: v1"> | <img src="land/mine.svg" width="64" height="64" alt="Рудник: v2"> | <img src="land/mine.svg" width="24" height="24" alt="Рудник: v2"> | [mine.svg](land/mine.svg) |
| Обелиск — Обелиск | <img src="../land/obelisk.svg" width="64" height="64" alt="Обелиск: v1"> | <img src="land/obelisk.svg" width="64" height="64" alt="Обелиск: v2"> | <img src="land/obelisk.svg" width="24" height="24" alt="Обелиск: v2"> | [obelisk.svg](land/obelisk.svg) |
| Таверна — Кружка | <img src="../land/tavern.svg" width="64" height="64" alt="Таверна: v1"> | <img src="land/tavern.svg" width="64" height="64" alt="Таверна: v2"> | <img src="land/tavern.svg" width="24" height="24" alt="Таверна: v2"> | [tavern.svg](land/tavern.svg) |
| Башня — Одна башня | <img src="../land/tower.svg" width="64" height="64" alt="Башня: v1"> | <img src="land/tower.svg" width="64" height="64" alt="Башня: v2"> | <img src="land/tower.svg" width="24" height="24" alt="Башня: v2"> | [tower.svg](land/tower.svg) |
| Портал — Овальный портал | <img src="../land/portal.svg" width="64" height="64" alt="Портал: v1"> | <img src="land/portal.svg" width="64" height="64" alt="Портал: v2"> | <img src="land/portal.svg" width="24" height="24" alt="Портал: v2"> | [portal.svg](land/portal.svg) |
| Мельница — Мельница | <img src="../land/mill.svg" width="64" height="64" alt="Мельница: v1"> | <img src="land/mill.svg" width="64" height="64" alt="Мельница: v2"> | <img src="land/mill.svg" width="24" height="24" alt="Мельница: v2"> | [mill.svg](land/mill.svg) |
| Монастырь — Монастырская колокольня | <img src="../land/monastery.svg" width="64" height="64" alt="Монастырь: v1"> | <img src="land/monastery.svg" width="64" height="64" alt="Монастырь: v2"> | <img src="land/monastery.svg" width="24" height="24" alt="Монастырь: v2"> | [monastery.svg](land/monastery.svg) |
| Ферма — Колосок | <img src="../land/farm.svg" width="64" height="64" alt="Ферма: v1"> | <img src="land/farm.svg" width="64" height="64" alt="Ферма: v2"> | <img src="land/farm.svg" width="24" height="24" alt="Ферма: v2"> | [farm.svg](land/farm.svg) |
| Статуя — Бюст на постаменте | <img src="../land/statue.svg" width="64" height="64" alt="Статуя: v1"> | <img src="land/statue.svg" width="64" height="64" alt="Статуя: v2"> | <img src="land/statue.svg" width="24" height="24" alt="Статуя: v2"> | [statue.svg](land/statue.svg) |
| Крепость — Крепостные стены | <img src="../land/stronghold.svg" width="64" height="64" alt="Крепость: v1"> | <img src="land/stronghold.svg" width="64" height="64" alt="Крепость: v2"> | <img src="land/stronghold.svg" width="24" height="24" alt="Крепость: v2"> | [stronghold.svg](land/stronghold.svg) |
| Пивоварня — Бочка | <img src="../land/brewery.svg" width="64" height="64" alt="Пивоварня: v1"> | <img src="land/brewery.svg" width="64" height="64" alt="Пивоварня: v2"> | <img src="land/brewery.svg" width="24" height="24" alt="Пивоварня: v2"> | [brewery.svg](land/brewery.svg) |
| Винокурня — Перегонный куб | <img src="../land/distillery.svg" width="64" height="64" alt="Винокурня: v1"> | <img src="land/distillery.svg" width="64" height="64" alt="Винокурня: v2"> | <img src="land/distillery.svg" width="24" height="24" alt="Винокурня: v2"> | [distillery.svg](land/distillery.svg) |
| Лесопилка — Пила | <img src="../land/sawmill.svg" width="64" height="64" alt="Лесопилка: v1"> | <img src="land/sawmill.svg" width="64" height="64" alt="Лесопилка: v2"> | <img src="land/sawmill.svg" width="24" height="24" alt="Лесопилка: v2"> | [sawmill.svg](land/sawmill.svg) |
| Каменоломня — Кирка | <img src="../land/stone_quarry.svg" width="64" height="64" alt="Каменоломня: v1"> | <img src="land/stone_quarry.svg" width="64" height="64" alt="Каменоломня: v2"> | <img src="land/stone_quarry.svg" width="24" height="24" alt="Каменоломня: v2"> | [stone_quarry.svg](land/stone_quarry.svg) |
| Пасека — Пчела | <img src="../land/apiary.svg" width="64" height="64" alt="Пасека: v1"> | <img src="land/apiary.svg" width="64" height="64" alt="Пасека: v2"> | <img src="land/apiary.svg" width="24" height="24" alt="Пасека: v2"> | [apiary.svg](land/apiary.svg) |
| Карьер — Лопата | <img src="../land/quarry.svg" width="64" height="64" alt="Карьер: v1"> | <img src="land/quarry.svg" width="64" height="64" alt="Карьер: v2"> | <img src="land/quarry.svg" width="24" height="24" alt="Карьер: v2"> | [quarry.svg](land/quarry.svg) |

## Водные

| Тип и символ | Было · 64 px | Стало · 64 px | Стало · 24 px | Файл v2 |
|---|:---:|:---:|:---:|---|
| Водоворот — Спираль воды | <img src="../water/whirlpool.svg" width="64" height="64" alt="Водоворот: v1"> | <img src="water/whirlpool.svg" width="64" height="64" alt="Водоворот: v2"> | <img src="water/whirlpool.svg" width="24" height="24" alt="Водоворот: v2"> | [whirlpool.svg](water/whirlpool.svg) |
| Подводные руины — Разрушенный храм | <img src="../water/underwater_ruins.svg" width="64" height="64" alt="Подводные руины: v1"> | <img src="water/underwater_ruins.svg" width="64" height="64" alt="Подводные руины: v2"> | <img src="water/underwater_ruins.svg" width="24" height="24" alt="Подводные руины: v2"> | [underwater_ruins.svg](water/underwater_ruins.svg) |
| Водное логово — Морской зверь | <img src="../water/lair.svg" width="64" height="64" alt="Водное логово: v1"> | <img src="water/lair.svg" width="64" height="64" alt="Водное логово: v2"> | <img src="water/lair.svg" width="24" height="24" alt="Водное логово: v2"> | [lair.svg](water/lair.svg) |
| Скалы — Скалы над водой | <img src="../water/rocks.svg" width="64" height="64" alt="Скалы: v1"> | <img src="water/rocks.svg" width="64" height="64" alt="Скалы: v2"> | <img src="water/rocks.svg" width="24" height="24" alt="Скалы: v2"> | [rocks.svg](water/rocks.svg) |
| Подводная пещера — Пещера у воды | <img src="../water/underwater_cave.svg" width="64" height="64" alt="Подводная пещера: v1"> | <img src="water/underwater_cave.svg" width="64" height="64" alt="Подводная пещера: v2"> | <img src="water/underwater_cave.svg" width="24" height="24" alt="Подводная пещера: v2"> | [underwater_cave.svg](water/underwater_cave.svg) |
| Кораблекрушение — Разбитый корабль | <img src="../water/shipwreck.svg" width="64" height="64" alt="Кораблекрушение: v1"> | <img src="water/shipwreck.svg" width="64" height="64" alt="Кораблекрушение: v2"> | <img src="water/shipwreck.svg" width="24" height="24" alt="Кораблекрушение: v2"> | [shipwreck.svg](water/shipwreck.svg) |

## Общий маркер

| Тип и символ | Было · 64 px | Стало · 64 px | Стало · 24 px | Файл v2 |
|---|:---:|:---:|:---:|---|
| Точка без типа — Ромб | <img src="../unknown.svg" width="64" height="64" alt="Точка без типа: v1"> | <img src="unknown.svg" width="64" height="64" alt="Точка без типа: v2"> | <img src="unknown.svg" width="24" height="24" alt="Точка без типа: v2"> | [unknown.svg](unknown.svg) |

## Сравнение

Обе версии ниже показаны на одном фоне в одинаковых размерах 64 и 24 px.

![Предыдущая и новая версии](comparison.png)
