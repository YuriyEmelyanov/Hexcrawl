# HX-NEXT-001 — независимая проверка 459a813

Дата: 2026-10-24. Роль: независимый reviewer, внеплановое явное поручение владельца. Spec 1.0: agent-work/specs/HX-NEXT-001.md.
Результат: **changes_requested / return_to_developer**. Баллы не изменены.

## Проверенный пакет и изоляция

PR https://github.com/YuriyEmelyanov/Hexcrawl/pull/471
Head: `459a813168bba07d6196a279fbc7e807127f6a6c`.
Base/main: `f89530abe1e237493dddb533502bb772ae1ab4e5`.
API подтвердил head перед началом. Отдельный detached checkout hexcrawl-review; существующий hexcrawl-dev с рабочими изменениями не редактировался.
Node v24.22.1. Использованы существующие node_modules через symlink, без npm ci; npm ls подтвердил package versions (Playwright1.62.1, TypeScript5.9.3, Vite5.4.21, React18.3.1).
Claim взят отдельным expected_sha CAS: 38d89e01a27faf43b323e1494f05e7a23933ed87; до claim latest.active_claim и task.claim были null.
Прочитаны AGENTS, docs/index, vision/score, process, latest/backlog/approvals/budget, spec, developer result/evidence и lessons.

## F1 — P2: импорт допускает исчерпанные ID/counters, продолжение создаёт непригодное для загрузки сохранение

Место: src/saveValidation.ts:135 (проверяется max существующего ID, но не исчерпанный входной nextRoadId); uniqueIds/проверка namespace также допускает максимальный region ID без безопасной обработки следующего выделения.
Это не доказательство ошибки обычных небольших карт: триггер — специально подготовленное v2 с валидным safe integer на границе диапазона.

Воспроизведение A:
1. В test/fixtures/import-v2/baseline-classic.json заменить только counters.nextRoadId на 9007199254740991.
2. assertHexcrawlSaveData и настоящий handleImportJson успешно принимают файл.
3. Через production safelyAddRegionToMap(candidateHexes[0], {targetSize:8,coastalPreference:'mainland'}) добавить регион, harness seed42.
4. Операция сообщает success:true; экспорт содержит nextRoadId=9007199254740992.
5. Собственный валидатор отвергает экспорт: counters.nextRoadId: safe integer in range.

Воспроизведение B:
1. В manual-edit-map.json заменить regions[0].id на 9007199254740991 (roads/rivers отсутствуют).
2. Импорт успешен; тем же настоящим обработчиком добавить регион.
3. Операция успешна, IDs [9007199254740991,9007199254740992].
4. Повторный импорт экспорта отвергается: map.regions[1].id: safe integer in range.

Нарушены контракт безопасных counters/ID и проверяемого продолжения COMP-04; AC-01 overflow/AC-03 continuation не полностью выполнены.
Исправление должно сохранять валидность документа при исчерпании ID: подготовка/выделение ID обязаны обнаруживать overflow до commit, сохраняя карту и историю при отказе. Добавить regression для counters и выделяемых entity IDs, не менять географический алгоритм. Проверить и смежные namespace (river/kingdom/lake), без утверждения, что они уже воспроизведены.

Воспроизводимый script: [HX-NEXT-001-reviewer-extra-459a813.mjs](HX-NEXT-001-reviewer-extra-459a813.mjs).
Скачать script отдельно, checkout именно указанного SHA, запустить:
`node /path/to/HX-NEXT-001-reviewer-extra-459a813.mjs /absolute/checkout`.
Script ожидает воспроизведение дефекта текущего head; после исправления его assertions для exhaustion следует заменить на новый контракт отказа/безопасного продолжения.

Реальный stdout:
```
NEGATIVE_MATRIX_PASS 42 validation and actual import handler; map+both stacks unchanged
EXHAUSTION_REPRO {"family":"roadCounter","regionIds":[1,2],"counters":{"nextLakeId":1,"nextRoadId":9007199254740992},"reimportError":"counters.nextRoadId: safe integer in range"}
EXHAUSTION_REPRO {"family":"regionId","regionIds":[9007199254740991,9007199254740992],"counters":{"nextLakeId":2,"nextRoadId":1},"reimportError":"map.regions[1].id: safe integer in range"}
```

## Независимые проверки и границы

| Проверка | Факт |
|---|---|
| npm run check | PASS: tsc, 189/189 tests, Vite build на Node24.22.1 |
| Собственная negative matrix | 42/42 отказа валидатора и настоящего import handler; сохранены канонический save и оба стека с Map-содержимым; lock снят |
| Исчерпание counters/region IDs | FAIL: два воспроизводимых сценария F1 выше |
| История/корпус/rollback | Существующие tests независимо выполнены: full manifest hash/roundtrip/continuation+undo; manual edit families;100 mixed harness operations; generation checkpoint and rollback; Mythic scenarios |
| Проверка исходников | Validator, транзакции, preparation до setter, handler guards import/kingdom/pendingRegen, checkpoints и новые browser assertions прочитаны |
| Локальный test:browser | НЕ ВЫПОЛНЕН: после build запуск остановился до браузерных проверок — отсутствует Chromium headless-shell1234; бесплатная установка вернула invalid/truncated ZIP. Более ранний запуск до конца build также остановился на отсутствующем dist; это setup failure, не продуктовый дефект |
| Независимая проверка CI evidence | GitHub API/run job/logs: workflow40074304045/job120814283663 success, Node24.21.0; browser suite реально дошёл до Save/history acceptance passed in151.0.7922.34 (07:34:17Z) |
| Точность CI SHA | CI checkout — synthetic merge12f5dcf28abae9b78fa7b18e5e02773190a9502a, а не raw head. API и локальный git подтвердили одинаковый tree e72bc8b33bd056ebf93df7b7c763b5dc9b48dbb0 с проверяемым head. CI поэтому проверяет тот же код |
| Баллы/выпуск | Не начислялись; merge/deploy/main не изменялись |

AC-01 и AC-03: F1 блокирует приёмку. AC-02/04/05/06/07: есть независимый повтор Node harness и прочитанный UI/CI evidence; reviewer не заявляет собственный локальный UI repeat. AC-08: delayed-read сериализация проверена Node test и негативными import случаями; отдельного нового UI repeat для kingdomJob/pendingRegen нет. AC-09: Node check PASS, CI browser PASS на том же tree, локальный browser repeat blocked_environment.
Конечный набор прогонов не доказывает отсутствие иных дефектов. Успешный CI не снимает F1.

## Передача

Программисту: исправить F1 в пределах spec1.0, добавить regression, выполнить Node24 check и browser suite, передать новый точный head. Независимое одобрение на новый SHA не переносится автоматически. Затем новый review. Расписание остаётся disabled, paid expenses не выполнялись, main и публикация запрещены.

Формальный PR REQUEST_CHANGES отклонён GitHub422 (нельзя request changes на собственный PR подключённого аккаунта). Сохранён COMMENT review; это ограничение интерфейса, не изменение verdict.
