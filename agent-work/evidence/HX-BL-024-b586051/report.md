# HX-BL-024 — реализация готова к независимой проверке

PR [476](https://github.com/YuriyEmelyanov/Hexcrawl/pull/476), head `b586051ccb3a7cb219b77e9908ddd79b97febd51`, tree `d6ac6f261b6638d274233be51582bd84ca4b31e7`; база main `02c2fd5fcbdb2042f2708709ce4f20dfd7354787`. Spec1.0: agent-work/specs/HX-BL-024.md. Начало approved; release approval отсутствует, main не менялся.

## Результат
Plain-text заметки у существующих гексов суши/воды: Save/Cancel, один commit в общую историю, exact Undo/Redo, dirty/busy/revision guards. JSON v4 читает v2/v3/v4, валидирует заметки атомарно и заменяет весь слой при импорте. Орфаны/неканонические ключи/нестроковые значения отвергаются. Заметки не попадают в SVG/PNG и не расходуют RNG.

Delete сохраняет актуальный текст surviving-гексов, а не текст старого generation checkpoint. Delete/reset подтверждают потерю, Undo возвращает текст. Regenerate временно сохраняет полный слой; конечный proposal сверяется с исходным backup, потеря отмеченного гекса вызывает rollback всего действия, RNG и обеих историй. Новый UI-05 сценарий воспроизвёл отсутствие панели на water-only карте; условие показа исправлено, случай включён в существующий React runner.

Основной сценарий по актуальному видению: **Развить имеющееся**; дополнительный — **Играть прямо сейчас**, ограниченно ручными сведениями ведущего. DW/FL/MB — общая запись авторских зацепок у места; нет доказательства полноты игровых процедур, карточек, топ5/10/20 или автоматического объединения модулей. Новый рейтинг не является разрешением расширить задачу.

## Проверки
[CI40568440359](https://github.com/YuriyEmelyanov/Hexcrawl/actions/runs/40568440359): check/browser/world-random — success на точном head. Локально Node24.22.1: npm run check — 247/247, skipped0, tsc/build pass. Chromium153: весь browser набор проверен; первоначальная остановка navigation была отсутствующим executable, после исправления окружения navigation/large-navigation прошли. На конечном дереве заново выполнен save/history с water-only regression; CI независимо исполнил все три штатных задания на том же SHA. Логи рядом; старые неуспешные прогоны не подменяются успехом последнего.

AC01/02 — новые notes transactions + реальный редактор, точный текст и whole-document сравнение, dirty/no-op/cancel/clear, redo.
AC03/04 — notes v4 round-trip, legacy corpus, versions2/3/4; старый base validator src/saveValidation.ts:54 допускает только [2,3], безопасно отвергает4.
AC05 — malformed notes через production import, прежние preparation/read/atomic failure checks.
AC06/07 — актуальные заметки surviving-региона, подтверждение удаления, fault injection production generation finalizers с исчезновением отмеченной воды; safelyAddRegionToMap восстанавливает полный документ/RNG/checkpoints/оба стека. Существующие classic/Mythic продолжения/rollback сохранены.
AC08 — notes-only whole JSON equality кроме notes; SVG не содержит текст; прежние PNG/RNG checks.
AC09 — desktop/390px RU/EN dirty/busy, water-only; временная UI диагностика проверила отрицательную воду вне региона, пустой мир, beforeunload, hide/show, язык, reset cancel/confirm/undo (не рост постоянного набора).
AC10 — штатные CI команды на точном SHA, результаты выше.

## Тестовые изменения
Diff base→head: Node **+11 / −0 / изменено2**. Семь notes-malformed параметров, один format/text case, три notes transaction cases; два прежних cases обновлены для текущего v4 и malformed RNG. Внутри существующего Node case +30 v4 вариантов, не ещё30 runner cases.
Browser save/history: +2 ограниченных сценария (редактор и sea-only) внутри прежнего runner, без второго 100-history набора. RNG: два прежних режима matrix расширены на30 v4 вариантов каждый, +60 подслучаев; не складывать их с Node. Instrumentation harness — не тестовый case. [Rationale в PR](https://github.com/YuriyEmelyanov/Hexcrawl/blob/b586051ccb3a7cb219b77e9908ddd79b97febd51/reports/HX-BL-024/test-rationale.md). Проверяющий независимо оценивает полезность, дублирование и чувствительность проверок.

## Интерфейс и ограничения
[Снимки точного дерева](ui/manifest.json): desktop RU/EN,390px,empty/dirty/busy. Реальный UI предъявлен владельцу в чате; отдельного дизайн-согласования не ждём. До изменения — main02c2fd5 screenshots в reports/HX-BL-024/before-main-desktop.png и before-main-narrow.png в PR. У локального Chromium153 неполный набор emoji fonts; не заявлена полнота глифов. Сохранение в документе не равно файлу/облаку: для переноса между сеансами нужен JSON. Полный JSON содержит все заметки и не является экспортом для игроков.

## Score1.2 и следующий шаг
Передать отдельные evidence для S05-C01 (ручной вклад, не полная карточка), S03-C05 (обратимость), S04-C04 (формат/round-trip), S09-C04 (безопасность данных), S02-C01 (RNG guard). До/после/delta **unknown/null** до независимого score_assessment1.2; баллы программистом не повышались. Веса50/1000 и модель не изменены.
Следующий — независимый проверяющий точного b586051: свежий агент по правилу роли, перепроверка AC/рисков/полезности тестов, качество/широта/ограничения и score_assessment1.2. Затем исправления либо отдельное разрешение владельца на конкретный проверенный выпуск. PR474 не включён.
