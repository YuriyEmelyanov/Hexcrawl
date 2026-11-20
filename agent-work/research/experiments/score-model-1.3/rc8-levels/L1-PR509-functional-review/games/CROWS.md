# Crows: Fortune or Death · подготовка карты

Место 11 в топ-20 создания. 13 операций в этом срезе. Функциональная доля 46,15%, вклад в L1 7,69. Минимум со строгой приёмкой 0,00 балла L1. Полнота тематического корпуса открыта.

## CROWS-PT3-L1-001

**Свой мир или Cornath**

Ожидаемый результат — Можно подготовить собственный мир без обязательной географии и названий Cornath. Это само по себе не отключает выбранные игровые подсистемы.

**Полностью**. Классическая карта создаётся с нуля и загружается повторно без обязательной карты Корната.

Функциональная доля операции 100,00%. Вклад в общий функциональный ориентир 1,28. Минимум по приёмке 0,00.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/CROWS-PT3-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/CROWS-PT3-L1-implementation.json) · проверка `CROWS-PT3-L1-implementation-probe.mjs`

## CROWS-PT3-L1-002

**Физический размер гекса**

Ожидаемый результат — Используется действующая базовая геометрия; режим обозначается5–6миль по решению владельца. Новая5-мильная сетка не добавлена; исходное5across сохранено отдельно как правило книги.

**Частично**. Базовый шаг 6 миль сохраняет геометрию и одномильную детализацию. Движок сетки использует 6 миль между сторонами; отдельного шага 5 миль нет, как и предусмотрено решением владельца.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,64. Минимум по приёмке 0,00.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/CROWS-PT3-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/CROWS-PT3-L1-implementation.json) · проверка `CROWS-PT3-L1-implementation-probe.mjs`

## CROWS-PT3-L1-003

**Среда и климат гекса**

Ожидаемый результат — На карте остаётся лес; холодный климат указан отдельно. Не создана выдуманная единственная категория «холод» вместо всех видов местности.

**Частично**. Хвойный лес сохранился как отдельный биом гекса вместе с прежней деревней после JSON-загрузки.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,64. Минимум по приёмке 0,00.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/CROWS-PT3-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/CROWS-PT3-L1-implementation.json) · проверка `CROWS-PT3-L1-implementation-probe.mjs`

## CROWS-PT3-L1-004

**Дороги, реки и переправы**

Ожидаемый результат — Мост, дорога и река сохраняются после загрузки. Этот случай не помечен как переход без моста; расчёт дневной дистанции остаётся L2.

**Полностью**. Существующий брод сменил на мост. При повторном открытии сохранились родительские ID дороги и реки, ребро пересечения и тип bridge. Отмена точно восстанавливает брод.

Функциональная доля операции 100,00%. Вклад в общий функциональный ориентир 1,28. Минимум по приёмке 0,00.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/CROWS-PT3-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/CROWS-PT3-L1-implementation.json) · проверка `CROWS-PT3-L1-implementation-probe.mjs`

## CROWS-PT3-L1-005

**Что известно игрокам**

Ожидаемый результат — Представление игроков показывает разрешённую деревню и не раскрывает тайник/ловушку; истинные сведения ведущего сохранены.

**Отсутствует**. Проверка реализации штатных выходов: PNG копирует SVG мастера и удаляет служебные элементы; JSON сохраняет полную карту. Выборочная выдача по признаку известности игрокам отсутствует в режиме/контракте экспорта. Проверка кода, отдельное изображение для игроков не предъявлено.

Функциональная доля операции 0,00%. Вклад в общий функциональный ориентир 0,00. Минимум по приёмке 0,00.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/CROWS-PT3-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/d6daa2cdbc1c17b942d51fe050fac51752cf9fee/src/App.tsx) · проверка `CROWS-PT3-L1-implementation-probe.mjs`

## CROWS-PT3-L1-007

**Выбранные POI и их содержание**

Ожидаемый результат — На карте одна выбранная лесопилка у R с именем и краткими признаками; остальные7готовыхмест не добавлены.

**Частично**. Лесопилка с именем сохранена в гексе, который имеет общее ребро с рекой. Появилась только выбранная точка. Такой же тип принимается и на карте без реки.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,64. Минимум по приёмке 0,00.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/CROWS-PT3-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/CROWS-PT3-L1-implementation.json) · проверка `CROWS-PT3-L1-implementation-probe.mjs`

## CROWS-PT3-L1-009

**Карта и связанный тайник**

Ожидаемый результат — Для A/B сохранена географическая связь и предел2гекса; для второго тайника предел не выдуман.

**Отсутствует**. Проверенные записи POI и операции карты не содержат сохраняемой связи лесопилка → тайник с числовым пределом. Осевой расчёт даёт «2 допустимо, 3 за пределом» как исследовательский критерий.

Функциональная доля операции 0,00%. Вклад в общий функциональный ориентир 0,00. Минимум по приёмке 0,00.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/CROWS-PT3-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/CROWS-PT3-L1-implementation.json) · проверка `CROWS-PT3-L1-implementation-probe.mjs`

## CROWS-PT3-L1-011

**Домашняя деревня**

Ожидаемый результат — На карте одна V с выбранным именем; у неё указаны пять исходных и одна выбранная служба. Повторная загрузка не создаёт вторую V.

**Частично**. Уже существующую деревню можно именовать с сохранением её единственного объекта по тому же адресу. JSON-восстановление не создаёт копию.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,64. Минимум по приёмке 0,00.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/CROWS-PT3-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/CROWS-PT3-L1-implementation.json) · проверка `CROWS-PT3-L1-implementation-probe.mjs`

## CROWS-PT3-L1-017

**Зона маяка**

Ожидаемый результат — На полной сетке радиусы1/2/5/6 охватывают7/19/91/127гексов. Обозначение зоны не меняет биомы, реки и POI; перекрытие двух источников не исчезает при удалении одного.

**Отсутствует**. Для исходного гекса получен контрольный ряд 7, 19, 91, 127 клеток для радиусов 1, 2, 5, 6. Заданные зоны с источниками и пересечениями в текущем контракте карты отсутствуют.

Функциональная доля операции 0,00%. Вклад в общий функциональный ориентир 0,00. Минимум по приёмке 0,00.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/CROWS-PT3-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/CROWS-PT3-L1-implementation.json) · проверка `CROWS-PT3-L1-implementation-probe.mjs`

## CROWS-PT3-L1-019

**Новая деревня и смена базы**

Ожидаемый результат — P обозначено как деревня B на прежнем месте; A и её содержимое сохраняются. Мастер может выбрать B новой базой.

**Частично**. Руина вручную меняется на деревню в том же гексе. Существующая деревня и её имя сохраняются. Новое имя и тип загружаются из JSON; отмена возвращает тип руины.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,64. Минимум по приёмке 0,00.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/CROWS-PT3-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/CROWS-PT3-L1-implementation.json) · проверка `CROWS-PT3-L1-implementation-probe.mjs`

## CROWS-PT3-L1-022

**Готовая карта или перенос мест**

Ожидаемый результат — Сохраняются выбранные места, имена и содержание. Импорт картинки и перенос данных вместе с объектом оцениваются отдельно; генерация всего Cornath не предполагается.

**Частично**. Общие инструменты сохраняют выбранные именованные POI. Штатный тест переносит POI вместе с её собственными данными между гексами одного документа.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,64. Минимум по приёмке 0,00.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/CROWS-PT3-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/CROWS-PT3-L1-implementation.json) · проверка `CROWS-PT3-L1-implementation-probe.mjs`

## CROWS-PT3-L1-023

**Четыре готовые деревни**

Ожидаемый результат — На карте Farcliffe в бывшей шахте; выбранные исходные услуги относятся к ней. Шаблон стартовых6служб другой деревни не подставлен автоматически.

**Частично**. Именованные деревни привязаны к отдельным гексам и не получают новых объектов при импорте.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,64. Минимум по приёмке 0,00.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/CROWS-PT3-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/CROWS-PT3-L1-implementation.json) · проверка `CROWS-PT3-L1-implementation-probe.mjs`

## CROWS-PT3-L1-024

**Региональные входы в подземелья**

Ожидаемый результат — Оба региональных места различимы и сохраняют условия подхода. Комнаты и высоты в футах не стали региональными гексами.

**Частично**. Blood Library и Floating Manor вручную сохранены как разные региональные входы по двум адресам. Имя и тип POI сохранились, дорожная и речная геометрия совпали после импорта.

Функциональная доля операции 50,00%. Вклад в общий функциональный ориентир 0,64. Минимум по приёмке 0,00.

[Правило / матрица](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/CROWS-PT3-scope-audit.json) · [Проверка реализации](https://github.com/YuriyEmelyanov/Hexcrawl/blob/9ec69e0682c562dca5ae229fcf09bdc4e5a9ee4b/agent-work/research/requirements/CROWS-PT3-L1-implementation.json) · проверка `CROWS-PT3-L1-implementation-probe.mjs`
