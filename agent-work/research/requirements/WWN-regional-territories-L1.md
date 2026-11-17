# WWN: Разместить политические территории по географии, не приравнивая их к контролю

Ревизия 17 ноября 2026. **WWN-RU-REG-009-L1: needs_owner_decision.** Политическая территория/фактический контроль не равны существующей границе генерируемого королевства. Принятая функция отдельного политического слоя не установлена; заметка её не доказывает.

Источник WWN-RU-DELUXE-SUPPLIED-20261106, printed121/PDF124: step4 through paragraph preceding Создание карты королевства: На региональном наброске размещают значимых игроков; государственные/племенные границы в основном следуют естественным преградам. Внутри возможны необитаемые и неподчинённые земли; опасные земли могут пересекать границы. Города/руины детализируют позже.

Параметры:

```json
{
  "phase": "regionalstep4",
  "actors": [
    "states",
    "tribal_unions",
    "large_organizations",
    "other_GM_selected_major_actors"
  ],
  "boundary_guidance": "mostly_natural_defensible_barriers_not_hard_constraint",
  "barriers": [
    "rivers",
    "mountain_ranges",
    "dense_forests",
    "impassable_marshes",
    "other_defensible_terrain"
  ],
  "territory_implies_effective_control": false,
  "territory_implies_population": false,
  "poi_detail": "defer_new_cities_ruins_to_kingdom_detail",
  "war_history": "possible_explanation_not_required_simulation"
}
```

Связь с продуктом: Принятые границы регионов сохраняются; новый политический/контрольный слой вне объёма.

Из принятого рабочего объёма исключено до решения; прежняя предложенная операция сохранена в JSON только как вход ревизии.

Реализация: в этом запуске не перепроверена. Фактическая поддержка этого профиля не установлена существующим набором.

[Все решения](WWN-scope-audit.json) · [Текущая передача JSON](WWN-regional-territories-L1.json). Старые proposed/HX-BL ссылки не являются актуальной очередью. Исходные факты/старые операции/статусы сохранены; разрешений на разработку/публикацию и изменения score нет.
