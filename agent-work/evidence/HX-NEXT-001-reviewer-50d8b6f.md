# HX-NEXT-001 — независимая повторная проверка

2026-10-24; spec 1.0; роль reviewer, отдельный агент со свежим контекстом, не автор реализации.
PR: https://github.com/YuriyEmelyanov/Hexcrawl/pull/471
Проверенный SHA: **50d8b6f2414faa1f204cdd2a7ed936533707592c**.
Base/main: f89530abe1e237493dddb533502bb772ae1ab4e5.
Tree: 1b9b9d438edb03ffc86bd65b26804e7439ca437b.
CAS claim: 1ba2a294daeadfef2143e334041d9115024832b2, expected head e78ccbcd7aeafebbf0a2e469a4ffae619ccc475c; проверено чтением GitHub latest.

## Заключение
**accepted для этого SHA/spec**, переход в awaiting_release_approval. Блокирующих замечаний в проверенной выборке не обнаружено; прежний F1 закрыт независимым повторением. Прежний changes_requested на459a813 остаётся историей, не был автоматически перенесён. Это техническая приёмка, не разрешение merge/deploy и не пользовательский тест мастером. Score не изменён.

## Источники и метод
Прочитаны AGENTS.md, docs/index.md, утверждённые vision1.0/score1.1/development-workflow, agent-operations latest/backlog/approvals/budget/lessons/process, канонический HX-NEXT-001 spec1.0 и developer F1 evidence. Решения владельца24.10 снимают старые usage gates, но сохраняют запрет дополнительных расходов/выпуска без разрешения. Claim отсутствовал в обоих реестрах; повторная проверка текущего head сделана перед завершением. Проверены весь product diff18 файлов, структурный валидатор, настоящие обработчики, отделение generation checkpoints и исправления старых тестовых данных (POI теперь внутри своего региона; тестовые center/anchor соответствуют hexes). Правила не ослаблены; Pages workflow не изменён.

Отдельный detached checkout точного SHA. Node24.22.1, имеющиеся зависимости Playwright1.62.1/TS5.9.3/Vite5.4.21; чистая повторная npm ci не выполнялась. Production code не изменялся. Независимые scripts сохранены рядом с этим evidence; они вызывают production handlers через существующий VM harness (useEffect не выполняется, вызовы advance/finish делаются явно). Это отличается от браузера и отдельно отмечено.

## Повторные проверки
- `npm run check`: PASS195/195, fail0; tsc и production build PASS; `git diff --check f89530a HEAD` PASS. Build предупреждает о chunk>500kB; это не новый функциональный отказ.
- Независимая отрицательная матрица42 случаев: schema/version, типы всех слоёв, ID/координаты, ссылки/геометрия рек, дороги/переправы, enums/ключи/UI/counters. Через actual import handler каждый отказ сохраняет карту и оба стека, снимает busy. PASS.
- Собственные F1 сценарии: импорт nextRoadId и region.id при MAX_SAFE_INTEGER-1 и MAX_SAFE_INTEGER. MAX-1 даёт валидный commit; MAX отказывает, сохраняя **весь DocumentSnapshot и оба стека**, после ручной правки/undo с непустым redo. Экспорт проходит структурную загрузку во всех четырёх случаях. PASS.
- В новом check отдельно прошли границы всех namespace/counters, lake/river continuation, exhausted kingdom start. Статически проверено: assertGeneratedIds вызывается до первого map/history setter, включая внутренние Mythic шаги; startKingdom отвергает overflow до job.
- Собственные Mythic seeds16/29: create → exact undo/redo; ручной biome edit → regenerate → exact undo/redo; delete-last → exact undo/redo. Сравнение **всего DocumentSnapshot** (карта, crossings, имена, seed/counters, selection/view/mode, generation checkpoints), без потери массивов/Map. PASS. Существующий check дополнительно проверяет Mythic seeds7/42/103.
- Собственный concurrent import при kingdomJob и pendingRegen: readTextFile не вызван, job/pending и документ/оба стека остаются прежними. PASS.

## Приёмка spec1.0
| AC | Evidence и результат |
|---|---|
| AC-01 | Новый валидатор +195-check и независимые42 malformed cases: PASS. Полный гидрологический аудит старых карт не добавлен. |
| AC-02 | mapTransactions и независимые отказы: PASS; UI read/preparation/export recovery в проверенном CI: PASS. |
| AC-03 | Все8 manifest entries, SHA256, сохранение слоёв/имён, normalized round-trip и production continuation/undo: PASS в локальном check и CI UI. manual-edit fixture дополнительно используется acceptance. |
| AC-04 | Все ручные семейства, import/reset и точные before/after: локальный harness и CI UI PASS. |
| AC-05 | Локальные100 mixed harness операций PASS; полные100 смешанных UI операций (включая generation, центральные/водные POI) +100 undo/+100 redo, каждый snapshot сравнивается: CI PASS. |
| AC-06 | No-op/error/cancel сохраняют redo, fresh edit очищает, selection/export не транзакции: local+CI PASS. |
| AC-07 | Generation checkpoints/rollback/regenerate, classic и Mythic: local+CI PASS; независимые whole-document Mythic checks16/29 PASS. |
| AC-08 | Delayed file serialization локально/CI; свои kingdomJob/pendingRegen blocking checks PASS. |
| AC-09 | Локальный Node24 check PASS; browser повтор после build blocked_environment, CI полный suite PASS на идентичном tree. |

## Browser и CI: происхождение evidence
Локальный `npm run test:browser` повторён **после завершившегося production build**: остановился до тестов, отсутствует `/root/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell`. Первый преждевременный вызов до окончания check остановился из-за отсутствовавшего dist; он не принят за проверку, после сборки выполнен повтор. Поиск установленного Chromium executable результата не дал. `npx playwright install chromium` также завершился отказом: Download failure code=1; скачанное с cdn.playwright.dev не является корректным ZIP (End of central directory record signature not found). Повторные штатные retries установщика не помогли. Установка/браузер не объявлены PASS.

Независимо получены через GitHub connector decoded logs job120887104458:
https://github.com/YuriyEmelyanov/Hexcrawl/actions/runs/40099004854
CI checkout0630deb10839cab859f4a281e73fd6e24587b407; локально fetch обоих commits и git rev-parse подтвердили **одинаковый tree1b9b9d438edb03ffc86bd65b26804e7439ca437b**. Logs показывают195/pass195/fail0, сборку и все7 browser suites; 13:43:40Z Save/history acceptance passed, Chromium151.0.7922.34. Это наблюдаемый результат CI на том же коде, а не независимый локальный браузерный запуск и не вера утверждению разработчика.
Отрицательный CI40098442242 на промежуточном71b62fc сохранён developer evidence. В финальном коде finalCrossings вычисляется единожды и используется для recordGenerated/setCrossings; собственные snapshot проверки не нашли прежнего расхождения.

## Ограничения и остаточный риск
Конечная выборка не доказывает отсутствие любых дефектов. Независимый локальный browser repeat недоступен; UI опирается на проверенные CI logs/идентичное дерево. Не измерялись память100 snapshots на больших картах, mobile/Android, неизвестные старые форматы, 100000 fuzz, пользовательское подтверждение/G3/G4. Корпус ограничен текущими поддержанными v2 fixtures/экспортами. Никаких новых географических правил, master RNG либо обещания совпадения undo→новая генерация. Main, approvals, budget, process, score, product branch и автоматизация не изменены. Следующее действие — решение владельца о выпуске конкретного SHA, либо ожидание; иных задач этот review не разрешает.
