# №474: ошибка получения скачанного файла — 26.10.2026

Run40382000933, source2ab6886cc745c742bd4e8acf1261d5bec2885bf6, artifact12679398333. ZIP SHA2564d18b1e33d6c10c56e083d73cfdcbf6fd8fb302dda4bb8c7c53d85540cd14048 подтверждён после скачивания. Raw и summary сохраняются в agent-operations/agent-work/evidence/HX-BL-003-run40382000933/.

## Причина
Первый warmup A/mythic-0-N1200 завершился на restore → snapshot → JSON download: "Path is not available when connecting remotely. Use saveAs() to save a local copy." В19:06:48Z записан artwork_ready, в19:06:50Z assets_fonts_ready. Затем JSON-снимок перед навигацией вызвал Download.path(). Это ошибка harness API, не подтверждённый дефект карты, CPU или её производительности.

BrowserSupervisor.start использует chromium.launchServer()+chromium.connect(wsEndpoint). Хотя сервер — локальный дочерний процесс, клиент Playwright считает подключение remote. Download.path() для него недоступен; это явно описано https://playwright.dev/docs/api/class-download#download-path . Download.saveAs сохраняет файл на стороне клиента и ждёт завершения загрузки: https://playwright.dev/docs/api/class-download#download-save-as .

Та же ошибка присутствовала ещё в PNG-ветке (до неё прогон не дошёл). Проверены оба callsite; snapshot сохраняется через saveAs в последовательный restore-snapshot.json, PNG — через saveAs в прежний stem.png. Данные читаются/хэшируются после завершения сохранения. Один BrowserServer для A/B, probes, input, guards, watchdog и product source не менялись.

## Почему прежние тесты не поймали
Четыре проверки supervision подменяют BrowserServer disposable Node-процессом: они проверяют kill/таймауты/ресурсы, но не вызывают настоящий Playwright Download через connect(). Их успешность не доказывала работу полного restore/download пути. Никакого нового результата latency/PNG из этих тестов не следует.

## Проверка и ограничения
Node24.22.1: node --check изменённого scripts/hx-bl-003-v2.mjs — exit0. Ровно два вызова await d.path() заменены, оставшихся нет. Нужны штатный CI конечного SHA и независимая проверка изменения; настоящая повторная загрузка через remote transport в этом диагностическом запуске не выполнялась. Новая measured-серия и PNG не запускались. Workflow V2 не меняется и по изменению mjs не запускается.

Счётчики существующего run: measured_actions_attempted0, warmups_attempted1 (error), png_click_attempts0. measurement_started=true означает вход в этап скрипта, не наличие успешных measured действий. Browser process exit подтверждён в raw. Причины старых180sPNG timeouts этот run не объясняет.

Тесты: +0 / −0 / изменено0. Диагноз подтверждён сохранённым raw, исходниками и контрактом API; механический unit-тест переписывания строки не добавляется. Обычный CI запускается на новом SHA, его результат фиксируется отдельно. Main/продукт/score не меняются; выпуск не разрешён. До нового измерения исправление проверяется отдельно, старые отрицательные данные не удаляются.
