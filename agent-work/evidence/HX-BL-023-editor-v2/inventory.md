# HX-BL-023 — инвентаризация2, 29.10.2026

База main a7a8cc58987e97c4495c405374c6a4145f3bc9ff (gitclone exactHEAD). Чтение кода/правил; продуктовые тесты заново не исполнялись. Предыдущие результаты/claim/release сохранены, чужой claim отсутствовал.

| Объект / источник | Фактическое состояние | Утверждённый пробел → этап |
|---|---|---|
| App13318–13329/14543+ | Биом одного гекса назначается/сбрасывается через biomeOverrideByHexKey | Региональный биомE2, высота отдельноE7. Batch1.0 не главный приоритет. |
| App13330–13361 | POI land/central/water type, add/delete noncentral/water существуют | Сохранить; переносE8, не выдавать смену типа за перенос. |
| App1298/getToponymEntities,13844/renderToponym | Реестр region,settlement,river,lake и только выводstrong. Kingdom.name отдельно. Названия поUI не редактируются. | E1: реальныеcontrols+общаяистория, включаякаталогвсехобъектов. **Утверждениеauditv1 о modal/inline rename ошибочно**, не подтвержденоsource. |
| src/toponyms.ts109+/test/toponyms.test.mjs58+ | renameToponym trim/80/unique и tests уже есть, helper не импортированApp | Переиспользоватьhelper, не повторять unit-проверкикопией. НовыйрискReact/kingdom/stale/history. |
| App Road/RoadSegment,docs/road-model.md01–10 | Геометрия путей/road-trail kinds/river crossings есть, ручныхpublichandlersнет | E3: posteditgraph и crossing-ссылки;не трактоватьсоседствокаксоединение. |
| src/modes/obstacles.ts/persistence.ts | ПрепятствияkingdomId+парагексов+edgeKey.24генерируютсявнутриобласти;безводы/riveredge/roadpair | E4: UIadd/remove/move;Classicпока нетвалидноймоделибезkingdom, нужнаspecмиграции,неfakeID. |
| App River/Sector,river-model.md/core/integration | Руслоvertices,sectorsF,delta/parent,controlPoints;жёсткиеграницы/слияния/озёра | E5: ручныеоперациивалидируютвсеэтисвязи,непересчитываютвесьмирскрыто. |
| riverRapids.ts/riverWaterfalls.ts/App11522+ | Маркерыderived/stablerandomизконтекста,waterfalleligibilityисключаетsource/confluence/lake | E5: явноесохраняемоеприсутствие/подавление,неудалениеSVG;формат/миграциидоспекаэтапа. |
| terrainByHexKey/lakeId,docs/natural-lakes.md | Водаимеетданные;естественныйконтуртолькопредставление | E6: сохранностьriverconnections/POI/notes/region;визуальнаяперекрасканедостаточна. |
| Region.heightLevel/hexes/center/anchor,kingdoms.ts | Высотаотдельнаотбиома,гексыпринадлежатсвязнымрегионам/kingdom | E7: переносбезorphanrefs/дублей/потериимениPOI. |
| captureDocument/commitManualMap12750–12853 | Общаяистория,notesgroup,RNG,checkpoints,stale/busyguards | Всеэтапыпереиспользуютмеханизм,непараллельнуюисторию. |

ПрочитаныоперационныеAGENTS/index/process/vision/model1.2/backlog/approvals/budget/feedback/lessons/последнийanalystresult и DND5boundedpass(оннепереставляетeditorpriority). Main: docs/toponym-generation.md,road-model.md,river-model.md,poi-display.md,natural-lakes.md,map-navigation.md;кодназваний/объектныхтипов/обstacles/валидации/rapid-waterfall. ОставшиесяRIVintegration/audit иROADaudit обязательны перед подробнойspec/реализациейE3/E5, не объявляютсяпровереннымивэтомпроходе.

UIпредложение используетснимокреальноготекущегоmainизпредыдущегоаналитическогопрохода (agent-work/evidence/HX-BL-023-analysis/current-desktop.png),cropкарты и новые vector-controls. Новыйliveпродукт не запускался;SVG/PNG — макет, не screenshotimplementation. Значения «Равнэльв→Эринин» иллюстративны. Размеры1440desktop/390narrow, состоянияформы/ошибки/dirty/сохранения. ИсходныеSVGврепозиториипозволяютвоспроизвестирендер.

Вывод: переименование даёт новый контроль над текущимименованнымматериалом; дорогостоящиетопологическиеоперации неотменены, распределеныпозависимостям. НебольшойпервыйPRнеравенготовому023/приглашениюведущих. Новыхбаллов/поддержкиНРИнеустановлено.
