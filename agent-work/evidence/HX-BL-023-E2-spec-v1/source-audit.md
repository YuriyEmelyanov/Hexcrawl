# E2 — ограниченная инвентаризация для спецификации

База8f7d17266c53e31428da7c0da6dbbf1afe01d035, не новый полный аудит продукта. Исходники получены через GitHub и прочитаны до написания spec; локальный git checkout после обслуживания workspace отсутствовал. Никакие исходники main не изменялись.

| Источник на base | Blob / место | Подтверждённое поведение и следствие |
|---|---|---|
| src/App.tsx | a5865fb04e4fdca51e61eba88eb1772d8afc660e;155–205,587–611 | 24биома; высоты12/6/6; Region хранит base ID и4metadata, height/landType отдельно |
| src/App.tsx |13336–13354,14673–14708 | Существующий hex override/reset; все24варианта; onChange немедленно коммитит; E2 переводит только эту форму в draft/Apply |
| src/App.tsx |12776–12878 | Общие snapshot/revision/notes/history; commitManualMap синхронизирует names; нужно доказать invariance при изменении биома |
| src/App.tsx |1373–1389 | Симметричные dead-forest exceptions и canonical isBiomesCompatible; E2 использует тот же helper для новых региональных base IDs |
| src/App.tsx |1491–1542 | Автовыбор учитывает веса/высоту/соседей, fallback может ослаблять соседство; не использовать random selector для ручного Apply |
| src/App.tsx |11759–11764 | Metadata: biomeId; label=biome.label; primaryEmoji; copied secondaryEmojis; emojiLabel=primary+secondary.join('') |
| docs/region-generation.md |2ffebfaff0a6cd3154ca7396f66d3c9606daf37e | Ручной выбор доступен независимо от веса; автоматические нулевые веса остаются нулевыми; woodlandStyle сохраняется |
| src/saveValidation.ts |5d6e024b0e064daec44eb8ab02180805abded6ef | Проверяет region height1–3, известные biomeID; override требует region hex, не отдельное море; нет новой schema для E2 |
| src/toponyms.ts |d748053073e663d10589d1279e6027e9a9982a07 | Synchronize сохраняет известные уникальные имена; не считать его случайное изменение registry допустимым при biome-only операции |
| src/modes/woodlandStyle.ts |94202784904c172bf3502ee0ff6261eef36533f9 | Сохранённый стиль имеет приоритет; без поля fallback по прежним соседям/anchor, не новый draw RNG |
| test/mapTransactions.test.mjs |a44592e7f80440a005093862835d1133102c7e64 | Есть реальные App manual families, mixed100, stale/atomic import, corpus/continuation — расширять, не дублировать весь набор |
| test/browser/save-history.smoke.mjs |5821c61e3f4049c7526c5c954949c55f07aeb7a4 | Существующий production lifecycle и E1 UI; добавить ограниченный E2 блок, не новый runner |

## Принятые детали внутри E2

Регион меняет растительность в пределах сохранённой высоты, не меняет wild/settled/POI/RIV. Нулевой автоматический вес не запрещает ручной выбор. Новый canonical ID проверяется на соседние canonical regions; совпадение ID не запрещено генерационным предпочтением разнообразия. Старые противоречия не ремонтируются скрыто. Для одного гекса сохраняется прежний набор24локальных вариантов, без изменения региональной высоты. Clear снимает только собственные записи, включая подводные, с показанным последствием; не удаляет воду.

HX-FB-005 рассмотрено: текстовый вход E2 вместо ещё одного карандаша; общий Edit/Done и current-language-only rename остаются отдельным неутверждённым предложением. Ошибки/notes/import/history изучены в пределах изменения, без общего тест-аудита или новых замеров производительности.

## Ограничения этого запуска

Это source-based аналитика, не проверка реализации E2. Первоначальная exec transport ошибка оказалась временной, доступ восстановился. Попытка загрузки Playwright Chromium завершилась ошибкой truncated zip; это не доказательство дефекта продукта. Проверка предлагаемого HTML и возможность visual QA отражаются в отдельной preview-QA записи. Product/npm/browser suites здесь не запускались, их результаты не заявляются.
