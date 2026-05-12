# Реестр требований (MVP)

Документ фиксирует актуальные требования в структурированном виде (ID + формулировка + статус).
Изменения требований в проекте должны сопровождаться обновлением этого реестра и синхронизацией `concept.md`, `architecture.md`, `technical-design.md`.

Все требования реестра имеют статус `ACTIVE`, если явно не указано иное.

## 1. Продукт и аудитория
1. `REQ-PROD-001` Игра предназначена для детей 6-9 лет (основная аудитория).
2. `REQ-PROD-002` Основной цикл: обучение -> награда -> трата -> строительство.
3. `REQ-PROD-003` Тон UX: позитивный, без наказаний за ошибки.

## 2. Платформа и ввод
1. `REQ-PLAT-001` Платформа MVP: браузерная игра.
2. `REQ-PLAT-002` Поддерживаемые устройства: desktop + Android планшет.
3. `REQ-INPUT-001` Desktop управление: `WASD` + обзор мышью (удержание ПКМ), ЛКМ по активному слоту hotbar.
4. `REQ-INPUT-002` Touch-элементы управления показываются только на устройствах с coarse pointer.
5. `REQ-INPUT-003` На desktop тач-джойстик не отображается.
6. `REQ-INPUT-004` При потере фокуса окна/вкладки в Build-режиме мир должен переходить на паузу и сбрасывать состояние зажатых клавиш, чтобы исключить бесконечное движение.
7. `REQ-INPUT-005` На desktop клавиша `E` переключает полный экран инвентаря. Открытие инвентаря отпускает/ставит на паузу Build camera controls; повторное нажатие `E` или `Esc` закрывает инвентарь и возвращает предыдущий Build interaction mode.
8. `REQ-INPUT-006` Build mode должен поддерживать одинарный прыжок: `Space` на desktop и эквивалентный touch-control на устройствах с coarse pointer.

## 3. Обучение
1. `REQ-LEARN-001` Обучение MVP: сложение/вычитание до 20.
2. `REQ-LEARN-002` Мини-урок содержит 5-10 задач.
3. `REQ-LEARN-003` После завершения мини-урока экран результата должен показывать количество полученных котокоинов и иконку валюты.
4. `REQ-LEARN-004` Каждое нажатие «Начать мини-урок» должно запускать новую генерацию набора задач для проверки (без повторного использования предыдущего набора).
5. `REQ-LEARN-005` Program `orthography-1` uses task format `choice_3`: exactly `3` options per task (`1` correct + `2` orthography distractors).
6. `REQ-LEARN-006` Distractor generation in `orthography-1` must support 8 rule groups: `zhi_shi`, `cha_sha`, `chu_shu`, `unstressed_vowel_root`, `paired_consonants`, `unpronounceable_consonants`, `hard_soft_sign`, `double_consonants`.
7. `REQ-LEARN-007` For `orthography-1`, distractors must be generated from rule-bound transformations and pass a `rule plausibility` check.
8. `REQ-LEARN-008` Distractor candidates that match any dictionary `correct` word from the active lexicon must be rejected.
9. `REQ-LEARN-009` Learning screen must include 3 orthography cards: `Учим слова - Легко`, `Учим слова - Средне`, `Учим слова - Сложно`.
10. `REQ-LEARN-010` Each orthography card starts a mini-lesson with exactly `3` tasks in `choice_3` format.
11. `REQ-LEARN-011` After checking a lesson, the Learning screen must show a result card with per-task correctness markers (`✓` for correct, `✕` for wrong).
12. `REQ-LEARN-012` Lesson result card stays visible until the user presses `Закрыть`.
13. `REQ-LEARN-013` Earned reward is shown inside the lesson result card, not as a separate persistent reward badge on the Learning screen.
14. `REQ-LEARN-014` Learning screen must include a math level/card `Математика - бронзовый`, available immediately without unlock prerequisites.
15. `REQ-LEARN-015` `Математика - бронзовый` contains only addition tasks with operands/results in the range up to `40`.
16. `REQ-LEARN-016` `Математика - бронзовый` uses the same mini-lesson size pattern as basic math (`5-10` tasks; current UI may start with `5` tasks).

## 4. Экономика и яйца
1. `REQ-ECO-001` Игровая валюта: кото-монетки.
2. `REQ-ECO-002` Кото-монетки тратятся на ресурсы и яйца.
3. `REQ-ECO-003` Награды из яиц пополняют только строительные блоки (`inventory.blocks`) и не увеличивают `inventory.resources`, если конкретный тип награды не описан как отдельный inventory item kind.
4. `REQ-ECO-004` Orthography card base rewards are fixed to `20`/`40`/`80` cat coins for easy/medium/hard.
5. `REQ-ECO-005` Orthography card reward penalties depend on mistakes count: `0` mistakes -> `100%` reward; `1` mistake -> `-10%`; `2` mistakes -> `-30%`; `3` mistakes -> `0` reward.
6. `REQ-ECO-006` Shop must sell `10` `block_glass` blocks for `50` cat coins.
7. `REQ-ECO-007` `Математика - бронзовый` rewards are twice the current maximum reward of the hardest existing math lesson: current implementation target is up to `40` cat coins per 5-task mini-lesson via `4` cat coins per correct answer plus `20` cat coins bonus at `80%+` accuracy.
8. `REQ-EGG-001` После открытия яйца награда должна отображаться визуально карточкой блока в стиле витрины магазина (изометрический preview + количество).
9. `REQ-EGG-002` После отображения награды из яйца карточка лута должна запускать плавное исчезновение через `2` секунды и убираться с экрана.
10. `REQ-EGG-003` Common egg loot table must include `block_coin` (`Монетный блок`) so the block can be obtained from eggs and used in build mode.
11. `REQ-EGG-007` A new expensive egg type `egg_meme` (`Мемное яйцо`) must be available for `200` cat coins.
12. `REQ-EGG-008` `egg_meme` rewards must be poster items with meme cat images from a curated local asset set provided to the project; the game must not load external meme images at runtime.

## 5. Мир, строительство и инвентарь
1. `REQ-WORLD-001` Мир в MVP — воксельный.
2. `REQ-WORLD-002` Стартовая сцена строится из блока `block_grass_dirt`.
3. `REQ-WORLD-003` Блоки в мире твердые для игрока (нельзя проходить сквозь блоки).
4. `REQ-WORLD-004` При коллизии разрешено скольжение вдоль свободной оси.
5. `REQ-WORLD-005` Hotbar: 9 слотов, слот 1 — ластик, слоты 2-9 — ресурсы/пусто.
6. `REQ-WORLD-006` В хотбаре ресурсы отображаются визуальными иконками блоков.
7. `REQ-WORLD-007` Для `block_grass_dirt` в хотбаре используется текстура боковой грани.
8. `REQ-WORLD-008` Удаление блока ластиком возвращает блок в инвентарь.
9. `REQ-WORLD-009` Цикл `place -> erase` не должен генерировать бесконечный прирост ресурсов; постановка и удаление блока симметричны по ресурсному балансу.
10. `REQ-WORLD-010` При первом запуске и после локального сброса стартовый инвентарь содержит только `24` блока `block_brick_red`.
11. `REQ-WORLD-011` Верхний предел высоты постановки блоков в мире увеличен до `24` (в 2 раза относительно прежнего значения `12`).
12. `REQ-WORLD-012` Build save data must persist and restore player transform: camera position, yaw/pitch, and flying mode survive reload.
13. `REQ-WORLD-013` Every `world` state change must synchronously write a LocalStorage snapshot containing `player`, `inventory`, and `world`.
14. `REQ-WORLD-014` On bootstrap, if the LocalStorage snapshot has a newer `world.updatedAt` than IndexedDB, the app must restore `player`, `inventory`, and `world` from that single snapshot.
15. `REQ-WORLD-015` Resource catalog must include `block_glass` (`Стеклянный блок`) as a buildable block.
16. `REQ-WORLD-016` Hotbar remains the quick-access row for Build mode and is backed by the same inventory data as the full inventory. Moving an item between the inventory grid and hotbar changes only its slot assignment, not the item count.
17. `REQ-WORLD-017` Inventory storage must support overflow beyond the 9-slot hotbar so newly earned, bought, or restored resources are not lost when the hotbar is full. New stackable blocks/resources should first merge into an existing compatible stack, then fill the first free hotbar or inventory-grid slot.
18. `REQ-WORLD-018` Inventory interactions must support basic item management: picking up a stack, placing it into an empty slot, swapping stacks between slots, merging compatible stacks up to the stack limit, and splitting stacks for partial moves.
19. `REQ-WORLD-019` The inventory screen must include a dedicated delete slot. Placing a stack into this slot destroys the stack and removes it from inventory after an explicit confirmation action or equivalent child-safe two-step gesture.
20. `REQ-WORLD-020` Closing the inventory must persist the updated inventory layout and item counts through the existing persistence flow so hotbar assignments, grid contents, and deleted resources survive reload.
21. `REQ-WORLD-021` On bootstrap, a LocalStorage snapshot with more user-built voxels than the IndexedDB world must win over IndexedDB even when IndexedDB has a newer `updatedAt`.
22. `REQ-WORLD-022` LocalStorage persistence must not overwrite a snapshot containing user-built voxels with a different starter world containing no user-built voxels; the older valuable snapshot must be kept under a rescue key.
23. `REQ-WORLD-023` Jumping is allowed only while the player is grounded on a solid block/surface; double jump and air jump are not part of the requirement.
24. `REQ-WORLD-024` Falling must be simulated as continuous gravity-driven movement over time, not as an instant teleport to the nearest lower surface.
25. `REQ-WORLD-025` Minecraft-style inventory operations for MVP include picking up a stack, placing it into an empty slot, swapping stacks, merging compatible stacks up to the stack limit, splitting stacks for partial moves, deleting via the dedicated delete slot, and keeping hotbar assignments synchronized with the same inventory data.
26. `REQ-WORLD-026` Poster rewards are inventory items and must support all ordinary inventory operations defined for Minecraft-style inventory items.
27. `REQ-WORLD-027` A poster is a placeable world item with visual size `2x2` blocks and may be placed only on vertical surfaces.
28. `REQ-WORLD-028` Poster placement requires one valid supporting vertical block face under the placement cursor; it does not require four supporting blocks behind the whole `2x2` area.
29. `REQ-WORLD-029` Posters cannot be placed over other posters or overlapping poster/decor occupancy.

## 6. UI и визуалы
1. `REQ-UI-001` Lesson cards in the Learning catalog must fill available horizontal space using a responsive multi-column layout.
2. `REQ-UI-002` All lesson cards use a unified structure: title, one-line description, one-line reward row with coin icon and numeric value.
3. `REQ-UI-003` Reward coin icon in lesson cards must use the same visual size as the top-bar player currency icon.
4. `REQ-UI-004` The inventory screen must follow the familiar Minecraft-like layout: a main storage grid, a visible hotbar row, item icons with stack counts, clear selected/hover states, and large enough cells for mouse and touch interaction.
5. `REQ-UI-005` The full inventory requirement is extended as the baseline Minecraft-style inventory: main storage grid, visible hotbar row, item icons, stack counts, selected/hover states, and large cells suitable for mouse and touch.
6. `REQ-VIS-001` В проекте используется механизм `resource pack`.
7. `REQ-VIS-002` Пак по умолчанию: `cartoon-blocky-v1`.
8. `REQ-VIS-003` Источники ассетов для MVP: бесплатные с лицензией, совместимой с коммерческим использованием (CC0).
9. `REQ-VIS-004` Карточки UI (`card`) в текущем паке без текстуры.
10. `REQ-VIS-005` Для `block_grass_dirt` используются раздельные текстуры граней: `top = grass`, `bottom = dirt`, `side = grass+dirt`.
11. `REQ-VIS-006` Текстура неба текущего пака: `sky_fading_night.png`.
12. `REQ-VIS-007` Фон hotbar полупрозрачный (`opacity ~30%`).
13. `REQ-VIS-008` Первый слот hotbar содержит иконку ластика с тенью.
14. `REQ-VIS-009` Витрина магазина должна отображать ориентацию текстур граней блока консистентно с миром (в т.ч. поворот `side`-текстуры для `res_planks`).
15. `REQ-VIS-010` Resource-pack `cartoon-blocky-v1` must provide texture asset `world/block_coin.png` for `block_coin`.
16. `REQ-VIS-011` `block_glass` must render as a semi-transparent block in the shop preview and Build world, with thin dark-gray edge framing for visibility.
17. `REQ-VIS-012` Resource-pack `cartoon-blocky-v1` must provide texture asset `world/block_glass.svg` for `block_glass`.
18. `REQ-VIS-013` The fall process must be visually animated so the player sees smooth downward motion until landing.
19. `REQ-VIS-014` Poster placement must show a `2x2` wireframe placement preview; the preview communicates valid and invalid placement states before confirmation.

## 7. Технические ограничения и качество
1. `REQ-TECH-001` Стек: React + TypeScript + Vite.
2. `REQ-TECH-002` Требуемое окружение: Node `>=24.14.0`, npm `>=11.11.0`.
3. `REQ-TECH-003` Линт и сборка должны проходить после изменений (`npm run lint`, `npm run build`).
4. `REQ-TECH-004` Любое изменение требований должно синхронно отражаться в документации.
5. `REQ-TECH-005` Offline lexicon pipeline must include commands `orth:build`, `orth:validate`, `orth:program` and produce `src/content/learning/orthography-1.v1.json`.
6. `REQ-TECH-006` QA sample mode must be available via `orth:samples` and save JSON batches to `tmp/orthography/samples/`.
7. `REQ-TECH-007` If a word cannot produce 2 valid distractors after filtering, it must not be emitted into a lesson/sample batch.
