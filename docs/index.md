# Действующие источники HexCrawl.ru

Актуализировано25.10.2026. Читать по задаче; архивы и книги не перечитывать при каждом запуске.

## Управление

| Источник | Роль |
|---|---|
| [Видение](strategy/vision.md) | Утверждено22.10: цель, приоритеты, роли, бюджет, согласования |
| [Score-модель1.2](strategy/score-model.md) | Основа22.10 и поправка25.10: 50 критериев/1000; требования четырёх НРИ уже учитываются, топ-5/10/20 не определён; производительность по числу гексов |
| [Планирование](strategy/daily-planning.md) | Результаты в agent-operations/agent-work/latest.json |
| [Разработка](development-workflow.md) | Проверки, evidence, приёмка и откат |
| agent-operations/agent-work/backlog.json | Единый реестр кандидатов/статусов; не разрешение начать работу |
| [Очистка](strategy/cleanup-status.md) | Переносы, замены и ограничения |

## Доменные правила

| Область | Действующий документ |
|---|---|
| Регионы, сохранения, диагностика | [region-generation.md](region-generation.md) |
| Правила рек RIV | [river-model.md](river-model.md) |
| API ядра и подключение рек | [river-model-core.md](river-model-core.md), [river-model-integration.md](river-model-integration.md) |
| Дороги ROAD | [road-model.md](road-model.md) |
| Режим Mythic Bastionland | [mythic-bastionland.md](mythic-bastionland.md) |
| Подложки и накладки | [biome-color.md](biome-color.md) |
| Лес и редколесье | [forest-rendering.md](forest-rendering.md) |
| Озёра и вода | [natural-lakes.md](natural-lakes.md) |
| POI и экспорт | [poi-display.md](poi-display.md) |
| Топонимы | [toponym-generation.md](toponym-generation.md) |
| Навигация/отрисовка | [map-navigation.md](map-navigation.md), [rendering-performance.md](rendering-performance.md) |

## История и референсы

[Архив до очистки](archive/2026-10-22/README.md), старые Handbook и июльский аудит в reports не задают текущий бэклог. Прежние gates350/500/650 заменены утверждённым порядком зависимостей видения.
[Аудит рек](river-model-audit.md) и [аудит дорог](road-model-audit.md) — датированные наблюдения со статусами исправлений, а не список открытых багов.

Whitepaper — справочная методика, его примеры лимитов/полномочий не действуют вместо правил HexCrawl.
WWN, Mythic Bastionland и Dolmenwood Maps Book — игровые референсы; исключения владельца имеют приоритет над книгой.
«След Тигрейн» и Wheel-of-Time hex-transfer-rules — отдельный сценарий фиксированного мира. Масштаб50км/эпоха/несколько POI не становятся общими правилами.
HTML-прототипы, JSON карты и изображения — материалы приёмки/fixtures; это не main и не доказательство текущего дефекта.

Порядок источников: решение владельца → утверждённое видение/версия модели → профильные правила/ADR → утверждённая задача → план → архив/референсы. Расхождение кода и требования регистрировать; не менять правило ради удобства.

