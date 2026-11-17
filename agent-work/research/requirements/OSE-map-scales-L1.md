# OSE: ревизия OSE-map-scales-L1

17 ноября 2026. Этот рабочий обзор заменяет старые исследовательские предложения; источник и история сохранены в JSON.

## OSE-ORR-2026-001-L1: Готовить обзорную и подробную карты с типичными масштабами24и6миль

**keep_L1**. Создание и детализация одной карты на нескольких физических масштабах относятся к принятому назначению HexCrawl.

Источник: OSE-OFFICIAL-ORR-2026-EN; HTML256; page lastmodified2026/08/02. Обычная последовательность подготовки — обзорная карта24миль на гекс, затем более подробные карты выбранных областей6миль на гекс.

Параметры и исключения:

```json
{
  "recommended_overview_hex_miles": 24,
  "recommended_detail_hex_miles": 6,
  "normative_force": "typically_not_mandatory",
  "geometric_measurement_convention": "unknown",
  "child_hex_tessellation": "unknown",
  "scope": "selected_areas_finer_detail_not_all_maps"
}
```

Связь с продуктом: Существующие масштабы24/базовый5–6миль и детализация, без нового OSE-режима.

Действие: Выбрать обзорный масштаб24мили и детализировать выбранную область в принятом базовом масштабе, сохранив крупные объекты и прежние правки.

Входы: Обзорная карта24мили; областьK; крупная рекаR и городT; добавленная локальная детальD.

Ожидается: При детализацииK объектыR/T остаются в соответствующих местах; D не заменяет крупную географию. Изменение zoom не меняет физический масштаб; повторное открытие не перебрасывает содержимое.

Поддержка на текущей версии не перепроверена. Исторический статус published_scale_workflow_absent_051_accepted_unpublished наSHA 1962fb9a835a9c310e55c1a09415fe180f22cca9: Published document has displayzoom and the strict Knave6mile profile, not OSE24→6 nested maps. Existing051 at9aa is independently accepted but unpublished; source gives no tessellation or measurement convention. Do not duplicate042/051 or infer16childhexes.

[Полная ревизия](OSE-scope-audit.json). [Исторический аудит](../audits/OSE-L1-runtime-2026-11-10.json) не переносится на новую версию автоматически. Текст у гекса не доказывает перенос сведений сPOI; ручная подготовка не равна полноценной связанной модели. Старые proposed/HX-BLссылки — история, не очередь. Полнота игры/текущая поддержка не заявлены.
