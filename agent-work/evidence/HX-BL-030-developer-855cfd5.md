# HX-BL-030 — R3 и завершение ограниченной матрицы приёмки

25.10.2026, программист; spec 1.0, действующая score-модель 1.1.
PR №472; base 6aaefa8896e7aac163cfcd5c2ca896ac60fc54d0; previous head c6923f37559a8ce00e0bb995e19c32fb22f3941c.
Передаваемый head:855cfd5b8cd2e70e1013d92b5dc9e6e21be063d0, tree 498d29de8e18bc62a329f3ede52f7073362a3a50.

## Изменение и отрицательная регрессия

До App-изменений новый R3-тест падает: actual action=add, expected regenerate. Лог run2-R3-negative.log сохранён. После исправления та же регрессия проходит; дополнительно controls меняются между тиками, а окончательный record сохраняет исходный locality. Полные JSON/RNG/undo/redo до и после ошибки совпадают; сохранённая запись не меняется после следующей генерации.

KingdomJob.actionContext хранит исходные action и категории controls. pendingRegen передаёт его в startKingdom; итоговые успех/отказ получают этот контекст явно, независимо от render и очищенного pendingRegen. Резервный снимок и RNG не смешиваются с контекстом диагностики. Распределения, RIV/ROAD, формат JSON и генерационные алгоритмы не менялись. Обновлены ADR и профильное описание диагностики.

## Дополнительная регрессия AC09 (R4, обнаружена программистом)

На промежуточном 7c5906f воспроизведено: capture tick A→A→B→старый A. Старый callback снова расходовал RNG и заменял два региона одним. geography3008567056/poi567105168 сменялись 2993414456/3534459927. Сохранены script и компактный отрицательный summary. Вместо ref только последнего job хранится App-local WeakSet уже выполненных job-объектов. Тест проверяет повтор сразу, после нового шага и после завершения, плюс полный мир с чистым контролем. Browser pending/kingdom tick также вызывается дважды во время перегенерации и сравнивается с контролем. Новые правила географии не введены.

## Evidence по AC

- AC01–03: прежние vectors/fresh triples/continuation на 8 seed/mode профилях сохранены.
- AC04: новый mixed manual POI/biome/name→delete/regenerate для classic/Mythic; точные полные JSON/RNG, delete checkpoint, undo/redo/repeat и последовательные regenerate. Имя редактируется существующим registry/state, поскольку текстового UI переименования в продукте нет; не утверждается наличие такого UI.
- AC05: оба режима, программный сбой после фактического расхода обоих потоков (assignWaterPoiLayer) и constraint отказ без commit: полный JSON и оба стека равны before с непустой картой/redo; следующий успешный action совпадает с чистым контролем. Проверки draw сделаны снаружи инъекции, чтобы assertion не был проглочен обработчиком ошибки. R3 отдельно проверяет поздний Mythic regenerate после 3 шагов. Есть prepare-regenerate ошибка и успешный attempts-exhausted tract fallback с сохранением расхода и точным undo. Отдельный некоммитящий outcome attempts-exhausted не выдуман: контракт текущей реализации при штатном исчерпании создаёт урочище; отказ без commit проверяется как constraint/programming-error.
- AC06: browser RNG suite расширен единой последовательностью Tile/Emoji/Color, POI SVG/emoji, RU/EN, zoom/pan/rotate с возвратом, PNG/JSON, затем сравнение следующего полного мира с контролем в обоих режимах. Возможная floating-point погрешность view при обратном wheel явно сопоставляется с контрольным view через import; RNG до этого проверяется отдельно. Registry rename→restore→next full world проверен handler-тестом. Изолированная независимость geography от дополнительных poi draw остаётся в RNG module tests.
- AC07: весь ранее закреплённый v2/v3 manifest/оба режима сохранён. Два старых fixture дают детерминированный отказ Mythic с полным rollback, это не объявляется успешным расширением.
- AC08: malformed v2/v3 matrix теперь начинается на непустой карте с redo; добавлена browser matrix value classes/версии/seed invalid/no-op/file cancellation с точным JSON/view и undo/redo.
- AC09: browser double-click обоих режимов, pause настоящего 0ms kingdom tick, запрет JSON busy, задержанный FileReader и запрет stale mutation во время import. Сравнивается одна генерация с отдельным control и точный undo/redo. Прежние handler duplicate pending/captured callback проверки сохранены; добавлены повтор настоящего paused effect tick в browser и R4-тест после выполнения другого тика. Production React содержит StrictMode; повтор полного dev-mode mount отдельно не заявляется.
- AC10:8 replay-сценариев (оба режима × add/regenerate × success/failure), исходный JSON и записанные original action/category, полное совпадение результата/RNG/outcome, проверка detached diagnostic. Для regenerate воспроизводится документированный префикс действий, создающий checkpoint: по TX04 история не экспортируется и голый импорт не разрешает regenerate. Это конкретизация тестового setup, не изменение save/import границы.
- AC11: новые unit cases автоматически включены npm test, новые UI cases — существующим test:browser:rng в CI; исходный test:browser сохранён.

## Ограничения и оценка

Это evidence программиста; приёмка и score_assessment остаются за независимым reviewer на точном новом SHA. Нет утверждения о полной проверке всех seeds, универсальной корректности или 10000/100000 карт.

S02-C01: опубликованный реестр G0/0; прогноз spec G1/7.5(+7.5) остаётся неподтверждённым. Доказательства: сохраняемые потоки, continuation, RNG checkpoints/rollback, R1/R2 и новые replay/R3/acceptance проверки. S02-C03 G1/5, S03-C05 G2/10, S04-C04 G2/7.5, S09-C04 G2/5: отдельный прирост не заявляется; проверки корпуса, malformed import, истории и busy rollback служат regression evidence. Текущие 186.25/1000 и unverified_weight70 не изменены. Предыдущее заключение c6923f3 на новый SHA не переносится.

Продолжен собственный незавершённый claim R3 после сверки owner/run_id, workspace и неизменного remote c6923f3. Ранее начатый запуск не имел подтверждённой end-проверки автоматизации; это записано как unchecked, без выдуманного enabled. Resume start подтвердил enabled=true. Новых затрат/API/автоматизаций не создавалось. Merge/main/deploy не выполнялись.

## Локальные проверки и пределы их использования

Node v24.22.1. Первые 16 новых acceptance tests прошли; исправленные assertions фактического расхода обоих потоков отдельно 2/2; финальная R4-регрессия 1/1; R3 отрицательный/положительный логи сохранены. TypeScript и browser-script syntax на окончательном коде проходят.

Локальный npm run check:233/233 + build завершился success, но запуск начат до R4 и изменения файлов во время его выполнения означают, что его нельзя выдавать за единый прогон окончательного дерева. Он сохраняется как промежуточное evidence; полную проверку финальных 234 тестов на точном SHA должен подтвердить frozen CI. Финальные types и targeted R4 проверены отдельно. Browser локально запущен после сборки и заблокирован отсутствующим Chromium executable; прежнюю неудачную установку браузера не повторяли, в CI он устанавливается самостоятельно.

## Итог frozen CI на передаваемом SHA

CI40157589419: все 3 job success. Check 234/234,0 fail/skip; TypeScript и production build проходят на Node24. Стандартный browser и расширенный world-random проходят на Chromium151.0.7922.34. Логи подтверждают R3, consumed Mythic tick,8 fresh/continuation профилей и AC06/08/09 обоих режимов. Проверенное checkout952d9b1e953039b420b73c9735b583b3a3fb8129 — synthetic merge855cfd5 в 6aaefa8; его tree 498d29de8e18bc62a329f3ede52f7073362a3a50 совпадает с head (проверено локальным git). Все новые acceptance включены в CI. Промежуточные CI98/99 заменены новым SHA, их отмена не объявляется падением продукта.

Статус R3 и дополнительной R4 — addressed_pending_independent_review. Следующий этап: независимый reviewer нового точного 855cfd5, заново score_assessment и оценка явно описанных ограничений (registry rename, checkpoint prefix, конечная выборка). Опубликованный продукт/оценка не изменены; release approval не запрошен.

[CI40157589419](https://github.com/YuriyEmelyanov/Hexcrawl/actions/runs/40157589419). [Артефакты и логи](HX-BL-030-developer-855cfd5/).
