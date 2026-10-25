# Независимая сверка CI и score-модели

Root verifier; точный head202570a4b97beb2090225ef4e485b00a43c34fb5,25.10.2026. GitHub API прочитаны повторно, утверждения программиста не использованы как результат проверки.

CI40164382105 completed/success: jobs browser121082303463,world-random121082303525,check121082303561 — всеcompleted/success. Полные логи получены через fetch_workflow_job_logs, а не из developer handoff. check:Node24.21.0,236/236,0fail/skip/cancel,types/build; Chromium151.0.7922.34. Browser:7наборов,fullcorpus/manualfamilies/100mixedUIundo/redo/failures/serialization/classic/Mythic/RUEN. RNG:8modes×seedprofiles,continuation/undo/invalidimport,hiddenclassiccontrols,visual/nextfullworld,malformednonemptyredo,doubleclick/pausedeffect/busyexport/delayedimport.

Каждый job checkout5dcec8324554ce2c7603d7d7511841374fcc68d2. Через свежий git fetch refs/pull/472/merge подтверждены родители main6aaefa8896e7aac163cfcd5c2ca896ac60fc54d0 + head202570a и деревоf2fc6c9a6519e63eb94b5bd30699146b733191ac — такое же, какуhead. Тестовый merge не опубликован вmain. ЛокальногоChromiumнет, локальныйbrowserповторнеутверждается.

Score registry:50уникальныхкритериев/1000; веса совпадают сmodel1.1 blobc05bffac61f425085e6878f7709c25e1dfc2ffb4;коэффициенты0/.25/.5/.75/1. Повторныйподсчёт186.25,unverified70. Это проверкасогласованности безначисления. Модель1.2 PR473невключена.

Свежий независимый агент проверяет исходники/handlers и frozencheck наотдельномworktree. ЗелёныйCIсампособенеявляетсязаключениемприёмки.
