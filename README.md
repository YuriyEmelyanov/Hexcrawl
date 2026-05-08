# Hexcrawl Region Generator

React + TypeScript + Vite приложение для пошагового расширения hexcrawl-карты регионами.

## Механика

1. Для первого региона якорь (`anchorHex`) — стартовый гекс `0/0`.
2. Для следующих регионов якорь — гекс-кандидат, через который регион присоединяется к карте.
3. Размер каждого региона = `12dF + 1`, где каждый dF даёт `0..2`.
4. Регион всегда включает `anchorHex` и строится как связная область.
5. Добавляются только пустые соседние гексы текущего региона (без пересечений с уже занятыми).
6. Выбор кандидата для роста — **взвешенный случайный**:
   - ближе к `anchorHex` → выше шанс;
   - больше соседей уже внутри региона → выше шанс.
7. Перед добавлением кандидата выполняется проверка `wouldCreateEnclosedVoid`:
   - кандидат временно добавляется;
   - проверяется flood-fill для ближайших пустых гексов;
   - если нет выхода наружу, кандидат отвергается.
8. Если после фильтрации допустимых кандидатов нет, рост региона останавливается раньше целевого размера.
9. `centralHex` выбирается после генерации с весами `1 + sameRegionNeighborCount^2`, при этом `anchorHex` получает штраф `*0.25`.

## Основные функции

- `generateConnectedRegionFromAnchor(anchorHex, size, occupiedHexes)`
- `weightedPickCandidate(candidates, anchorHex, currentRegionHexes)`
- `wouldCreateEnclosedVoid(candidateHex, currentMap, currentRegionHexes)`
- `hasEscapeToOutside(startEmptyHex, temporaryOccupiedHexes)`
- `chooseRegionCenter(regionHexes, anchorHex)`
- `getRegionColor(regionId)`

## Интерфейс

- Каждый `regionId` рисуется своим цветом.
- `anchorHex` не выделяется отдельным цветом на карте (только в панели деталей).
- `centralHex` выделяется обводкой и точкой.
- Гексы-кандидаты рисуются нейтральным цветом.
- В панели информации отображаются:
  - значения последнего броска 12dF;
  - сумма броска;
  - целевой размер;
  - фактический размер.
- По клику по гексу показываются:
  - `q/r`;
  - `regionId`;
  - `centralHex` (да/нет);
  - `anchorHex` (да/нет).

## Запуск

```bash
npm install
npm run dev
```

## Проверка

```bash
npm run build
```
