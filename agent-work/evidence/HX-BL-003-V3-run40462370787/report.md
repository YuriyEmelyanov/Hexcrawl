# HX-BL-003 V3 — конечный ограниченный результат

Точный head/harness: 58adcce787549ff6baa3d0dd9f14dac6b34b9a97; production A103d31b9f6f5c76b1f6b45d9d6664fe3f75dd63b / B739e3de36587533bf3d2f3196072270f4695fa8a. [PR474](https://github.com/YuriyEmelyanov/Hexcrawl/pull/474).

[Единственный run40462370787](https://github.com/YuriyEmelyanov/Hexcrawl/actions/runs/40462370787), attempt1: 27.10.2026 09:39–10:22 MSK. Контролируемая остановка по43мин soft deadline, общий job завершён до45мин; failure означает неполноту пакета, а не доказанный дефект продукта. Автоматического повторения нет.

## Навигация

Все20 measured actions,2 warmups и2 trace-only actions завершены. По240 кадров A/B на phase, nearest-rank p95 rank228, порядок AB/BA и5 первых позиций каждой версии соблюдены. Ничего не отброшено.

| Phase | A p95 ms | B p95 ms | delta ms | guard >10ms AND >10% |
|---|---:|---:|---:|---|
| zoom |233.368|83.254|-150.114|не превышен|
| pan |300.076|300.000|-0.076|не превышен|

Это конечная серия V3, а не универсальная оценка ускорения или доказанная причинная связь. V2 с превышением зума166.554→483.300ms сохраняется как отрицательное evidence; разные серии/runner не объединены. Две трассировки и source maps доступны в архиве. Causal attribution до независимого анализа unknown; decode completion и snapshot start напрямую wrapper не измеряет.

## Native history

Четыре строки начаты: seed0 A/B и seed123456789 A завершены локально, seed123456789 B получил timeout при ожидании готовности второго продолжения ровно на общем soft deadline. Всего8 continuation attempts,7 подтверждены snapshot;12 selection assertions;45 typed native snapshots. Последние4 selection cases не исполнены. Это не полная приёмка исходных56 исторических selection rows.

В самом workflow history_comparisons отсутствует: abort прервал выполнение перед compareHistories(). Поэтому локальные success3/4 не означают подтверждённые A/B соответствия. Данные всех полных и частичных шагов сохранены для отдельной offline-проверки. Изменять raw, подменять Map/Set пустымJSON, запускать недостающий сценарий повторно запрещено без нового решения.

Cleanup: SIGKILL07:22:14.266Z, подтверждённый выход процесса07:22:14.353Z; дочерний browser завершён. A/B production не меняли; отдельный history accessor только читает native состояние.

## Архив и проверки

- Итоговый artifact12716891482,67006202bytes,SHA2564aa164c531d13203959c5c8a325c72733f647daf1efa79457278897c50aae753. ZIPскачан, хэш и99manifest entries проверены. [Artifact](https://github.com/YuriyEmelyanov/Hexcrawl/actions/runs/40462370787/artifacts/12716891482).
- Preflight artifact12715147362,SHA256a11115d814314c93b5a31adf1527581c821a7ddba1ca799098a83b89e5de6ec3 проверен до окончательного результата;744source entries соответствуют закреплённым source, кроме двух явно сохранённых read-only App observation patches.
- Штатный exact-head [Check40461625216](https://github.com/YuriyEmelyanov/Hexcrawl/actions/runs/40461625216): Node240/240,TypeScript/build,browser,RNGpassed. Независимый offline harness gate58adcce accepted; первоначальные два замечания7f4ee86 сохранены и исправлены до единственного замера.
- Полные raw/environment/manifest сохранены рядом lossless gzip+base64. Декодирование: base64 decode, затем gzip decompress; байты после восстановления сверять с artifacts-manifest. Полный архив содержит45native snapshots, JSON, traces/source maps и immutable environment.

Следующий этап: независимая offline-проверка этого точного SHA/архива и score_assessment1.2. Программист не объявляет баллы подтверждёнными. Продукт не принят, main/сайт не изменены, разрешения выпуска474 нет. Обязательное score-событие опубликованного475 остаётся отдельным pending стратегу.
