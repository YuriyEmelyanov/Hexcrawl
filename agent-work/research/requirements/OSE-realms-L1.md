# OSE: ревизия OSE-realms-L1

17 ноября 2026. Этот рабочий обзор заменяет старые исследовательские предложения; источник и история сохранены в JSON.

## OSE-ORR-2026-002-L1: Владения людей и их правители

**needs_owner_decision**. Отдельная политическая область и правящая сторона не равны биому или прямоугольнику генерируемого королевства; одной возможности написать текст недостаточно.

Источник: OSE-OFFICIAL-ORR-2026-EN; HTML257–261; paragraphs controlled areas / Government / Base town. Нанести владения людей с учётом потребностей цивилизации, указать правящую сторону; базовый город обычно находится в одном из них.

Параметры и исключения:

```json
{
  "realm_kind": "human_controlled",
  "civilisation_context": [
    "rivers",
    "farmland"
  ],
  "ruler_examples": [
    "lord",
    "king",
    "league_of_merchants"
  ],
  "base_town_location": "typically_in_human_realm_not_mandatory",
  "numeric_thresholds": "unspecified"
}
```

Связь с продуктом: Текущие границы генерации сохраняются; независимый политический слой не принят.

Вне принятого рабочего объёма до решения; прежняя операция не является утверждённой функцией.

Поддержка на текущей версии не перепроверена. Исторический статус partial_manual_prose_no_political_overlay наSHA 1962fb9a835a9c310e55c1a09415fe180f22cca9: Accepted area/ruler/context can be recorded and ruler edited in prose without changing geography. No independent political-area layer is established; a biome region or Mythic144hex kingdom is not automatically a human realm.

## OSE-ORR-2026-003-L1: Владения разумных нечеловеческих видов: чёткие и приблизительные области

**needs_owner_decision**. Нечёткий ареал народа — отдельная пространственная функция. Её принятие не установлено, а заметка не доказывает отображение ареала.

Источник: OSE-OFFICIAL-ORR-2026-EN; HTML262–265; intelligent species and Nomads paragraphs only; monster clause266 excluded. Нанести владения разумных нечеловеческих видов с учётом среды и образа жизни; различать определённые границы и приблизительные области кочевников.

Параметры и исключения:

```json
{
  "realm_kind": "intelligent_nonhuman",
  "environment_and_way_of_life": "GM supplied setting context",
  "extent_variants": [
    "well_defined_domain",
    "vague_nomadic_hunting_or_raiding_area"
  ],
  "movement_procedure": "not_given",
  "nonintelligent_monster_territories": "separate_optional_clause_not_extracted"
}
```

Связь с продуктом: Вне принятого рабочего объёма до решения о политических/приблизительных областях.

Вне принятого рабочего объёма до решения; прежняя операция не является утверждённой функцией.

Поддержка на текущей версии не перепроверена. Исторический статус partial_manual_prose_no_approximate_overlay наSHA 1962fb9a835a9c310e55c1a09415fe180f22cca9: Nomad/habitat/approximate-area language and unknown local control persist literally. No separate fuzzy-extent overlay or distinction rendered as an area type is verified. No movement/raid engine is required by this source.

[Полная ревизия](OSE-scope-audit.json). [Исторический аудит](../audits/OSE-L1-runtime-2026-11-10.json) не переносится на новую версию автоматически. Текст у гекса не доказывает перенос сведений сPOI; ручная подготовка не равна полноценной связанной модели. Старые proposed/HX-BLссылки — история, не очередь. Полнота игры/текущая поддержка не заявлены.
