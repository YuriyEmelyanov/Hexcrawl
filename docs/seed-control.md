# Поле seed мира

HX-FB-001, спецификация1.1: [операционный источник](https://github.com/YuriyEmelyanov/Hexcrawl/blob/agent-operations/agent-work/specs/HX-FB-001.md).

В панели поле расположено отдельным блоком после выгрузки/загрузки. Подпись слева и input справа находятся в одной строке на desktop и узком экране. Сообщения ошибки seed и старой карты располагаются ниже пары. Свёрнутое меню выгрузки не скрывает поле; общая панель сворачивается прежним способом.

Scoped стили согласованы с тёмными второстепенными полями. Focus-visible и сообщение ошибки различимы. Read-only значение можно выделять и копировать. Исходные readOnly/disabled guards, текстовый inputMode numeric, onBlur/applyWorldSeed, диапазон uint32 и состояние RNG не изменены.

Проверка UI: workflow HX-FB-001 UI acceptance строит опубликованный baseline103d31b и candidate, сохраняет фактические screenshots1500×1000/390×844 RU/EN и проверяет расположение, ввод, полный JSON/streams, undo/redo/import continuation. Набор измерений performance003 не запускается. Снимки в артефакте HX-FB-001-UI, raw результат reports/HX-FB-001/result.json. Это evidence разработчика, не независимое принятие или разрешение выпуска.
