# HexCrawl.ru

Генератор связных гекс-карт для подготовки и ведения исследовательских кампаний НРИ.
Приложение: https://app.hexcrawl.ru/ . React, TypeScript, Vite.

## Разработка

Node.js 24, зависимости из lock-файла:

```sh
npm ci
npm run dev
```

Перед передачей изменений — `npm run check`. При изменении генерации после сборки также `npm run test:browser`. Недоступные проверки отмечать явно.

## Документы

- [Индекс действующих источников](docs/index.md).
- [Видение](docs/strategy/vision.md) и [score-модель 1.1](docs/strategy/score-model.md), согласованные 22.10.2026.
- [Правила агентов](AGENTS.md), [инженерный процесс](docs/development-workflow.md).
- [Ежедневное планирование](docs/strategy/daily-planning.md); результаты — в ветке agent-operations, agent-work/latest.json.
- [Результат очистки](docs/strategy/cleanup-status.md).

Доменные правила не дублируются в README: актуальные спецификации перечислены в индексе. Прежние редакции в docs/archive — история, не задания.

## Публикация и диагностика

Push в main запускает GitHub Pages. Рабочие планы туда не записываются; merge/выпуск требуют отдельного согласования результата.
Подробные логи: `?generationDebug=1`, профайлер: `?profile=1`. Ошибки и существенные отказы не скрываются отключением подробных логов.

