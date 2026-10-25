# Выпуск HX-BL-030 — 25.10.2026

Владелец разрешил выпуск сообщением «Разрешаю выпуск» после принятия PR472 exact202570a. Решение owner-release-2026-10-25-HX-BL-030 сохранено в approvals.json до merge.

Approved/reviewed head:202570a4b97beb2090225ef4e485b00a43c34fb5. Merge/main:103d31b9f6f5c76b1f6b45d9d6664fe3f75dd63b. Tree:f2fc6c9a6519e63eb94b5bd30699146b733191ac — совпадает с заключением независимого проверяющего. Родители merge:6aaefa8 и202570a. PR473 не включён.

[Pages deployment40173164222](https://github.com/YuriyEmelyanov/Hexcrawl/actions/runs/40173164222), attempt2:success, exact mergeSHA. Build job121110326152:Node24,236/236,0fail,types/build и полный test:browser success; deploy job121112133522 success. Оба полных лога сохранены рядом. Rng-browser ранее принят на том же tree вCI40164382105.

Attempt1 cancelled после615сек при job timeout10мин:236/236 и build прошли, browser не завершился, Pages не запускался. Сохранён отрицательный лог; один повтор без изменения SHA завершился успешно. Причина соответствует временному превышению лимита job, а не доказанному дефекту продукта. Это не гарантия прохождения будущих deployment за10мин.

Live site:https://app.hexcrawl.ru/ — HTML200; JS/assets/index-izFvywi0.js200, SHA256a8390a97521812e2df6aea91c14ee1013252b0303996d9294cf4fa181862c647; CSS/assets/index-By-3o-dh.css200, SHA256d03bf3994907097f223df69b1a92c2e2523d7026da390d3d00d6919e2896952c. Хеши равны frozen build принятого202570a; прежний сайт использовал index-Cw-wxDhb.js. HTTP проверка не является дополнительной ручной browser acceptance.

Score не начислялся программистом:186.25/1000,unverified70. Передача score_update_pending стратегу: assessment agent-work/results/2026-10-25-reviewer-HX-BL-030-202570a.json, model1.1,S02-C01G0→G1/+7.5, четыре смежныхdelta0. Стратег должен сверить releaseSHA/tree, обновить current-score/history/latest с защитой от повторного начисления и затем в том же запуске предложить конкретную следующую задачу. Модель1.2 вPR473 не подменяет1.1.

Откат при подтверждённой регрессии: reviewed revert merge103d31b с parent1 отдельным пакетом; откат сейчас не выполнялся.
