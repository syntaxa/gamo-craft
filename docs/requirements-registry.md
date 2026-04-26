# Реестр требований (MVP)

Документ фиксирует актуальные требования в структурированном виде (ID + формулировка + статус).
Изменения требований в проекте должны сопровождаться обновлением этого реестра и синхронизацией `concept.md`, `architecture.md`, `technical-design.md`.

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

## 3. Обучение и экономика
1. `REQ-LEARN-001` Обучение MVP: сложение/вычитание до 20.
2. `REQ-LEARN-002` Мини-урок содержит 5-10 задач.
3. `REQ-LEARN-004` Каждое нажатие «Начать мини-урок» должно запускать новую генерацию набора задач для проверки (без повторного использования предыдущего набора).
4. `REQ-ECO-001` Игровая валюта: кото-монетки.
5. `REQ-ECO-002` Кото-монетки тратятся на ресурсы и яйца.

## 4. Мир и строительство
1. `REQ-WORLD-001` Мир в MVP — воксельный.
2. `REQ-WORLD-002` Стартовая сцена строится из блока `block_grass_dirt`.
3. `REQ-WORLD-003` Блоки в мире твердые для игрока (нельзя проходить сквозь блоки).
4. `REQ-WORLD-004` При коллизии разрешено скольжение вдоль свободной оси.
5. `REQ-WORLD-005` Hotbar: 9 слотов, слот 1 — ластик, слоты 2-9 — ресурсы/пусто.
6. `REQ-WORLD-006` В хотбаре ресурсы отображаются визуальными иконками блоков.
7. `REQ-WORLD-007` Для `block_grass_dirt` в хотбаре используется текстура боковой грани.
8. `REQ-WORLD-008` Удаление блока ластиком возвращает блок в инвентарь.

## 5. Визуалы и ресурс-паки
1. `REQ-VIS-001` В проекте используется механизм `resource pack`.
2. `REQ-VIS-002` Пак по умолчанию: `cartoon-blocky-v1`.
3. `REQ-VIS-003` Источники ассетов для MVP: бесплатные с лицензией, совместимой с коммерческим использованием (CC0).
4. `REQ-VIS-004` Карточки UI (`card`) в текущем паке без текстуры.
5. `REQ-VIS-005` Для `block_grass_dirt` используются раздельные текстуры граней:
`top = grass`, `bottom = dirt`, `side = grass+dirt`.
6. `REQ-VIS-006` Текстура неба текущего пака: `sky_fading_night.png`.
7. `REQ-VIS-007` Фон hotbar полупрозрачный (`opacity ~30%`).
8. `REQ-VIS-008` Первый слот hotbar содержит иконку ластика с тенью.

## 6. Технические ограничения и качество
1. `REQ-TECH-001` Стек: React + TypeScript + Vite.
2. `REQ-TECH-002` Требуемое окружение: Node `>=24.14.0`, npm `>=11.11.0`.
3. `REQ-TECH-003` Линт и сборка должны проходить после изменений (`npm run lint`, `npm run build`).
4. `REQ-TECH-004` Любое изменение требований должно синхронно отражаться в документации.

## 7. Статус
- Все требования реестра выше: `ACTIVE`.
- `REQ-WORLD-009` Цикл `place -> erase` не должен генерировать бесконечный прирост ресурсов; постановка и удаление блока симметричны по ресурсному балансу.
- `REQ-ECO-003` Награды из яиц пополняют только строительные блоки (`inventory.blocks`) и не увеличивают `inventory.resources`.
- `REQ-WORLD-010` При первом запуске и после локального сброса стартовый инвентарь содержит только `24` блока `block_brick_red`.
- `REQ-WORLD-011` Верхний предел высоты постановки блоков в мире увеличен до `24` (в 2 раза относительно прежнего значения `12`).
- `REQ-LEARN-003` После завершения мини-урока экран результата должен показывать количество полученных котокоинов и иконку валюты.
- `REQ-EGG-001` После открытия яйца награда должна отображаться визуально карточкой блока в стиле витрины магазина (изометрический preview + количество).
- `REQ-EGG-002` После отображения награды из яйца карточка лута должна запускать плавное исчезновение через `2` секунды и убираться с экрана.
- `REQ-VIS-009` Витрина магазина должна отображать ориентацию текстур граней блока консистентно с миром (в т.ч. поворот `side`-текстуры для `res_planks`).

## Update 2026-04-05
- `REQ-LEARN-005` Program `orthography-1` uses task format `choice_3`: exactly `3` options per task (`1` correct + `2` orthography distractors).
- `REQ-LEARN-006` Distractor generation in `orthography-1` must support 8 rule groups: `zhi_shi`, `cha_sha`, `chu_shu`, `unstressed_vowel_root`, `paired_consonants`, `unpronounceable_consonants`, `hard_soft_sign`, `double_consonants`.
- `REQ-TECH-005` Offline lexicon pipeline must include commands `orth:build`, `orth:validate`, `orth:program` and produce `src/content/learning/orthography-1.v1.json`.
- `REQ-TECH-006` QA sample mode must be available via `orth:samples` and save JSON batches to `tmp/orthography/samples/`.
## Update 2026-04-05 (Distractor Quality Filter)
- `REQ-LEARN-007` For `orthography-1`, distractors must be generated from rule-bound transformations and pass a `rule plausibility` check.
- `REQ-LEARN-008` Distractor candidates that match any dictionary `correct` word from the active lexicon must be rejected.
- `REQ-TECH-007` If a word cannot produce 2 valid distractors after filtering, it must not be emitted into a lesson/sample batch.
## Update 2026-04-05 (Lesson Cards Layout)
- `REQ-UI-001` Lesson cards in the Learning catalog must fill available horizontal space using a responsive multi-column layout.
- `REQ-UI-002` All lesson cards use a unified structure: title, one-line description, one-line reward row with coin icon and numeric value.
- `REQ-UI-003` Reward coin icon in lesson cards must use the same visual size as the top-bar player currency icon.
## Update 2026-04-05 (Lesson Result Card)
- `REQ-LEARN-011` After checking a lesson, the Learning screen must show a result card with per-task correctness markers (`✓` for correct, `✕` for wrong).
- `REQ-LEARN-012` Lesson result card stays visible until the user presses `Закрыть`.
- `REQ-LEARN-013` Earned reward is shown inside the lesson result card, not as a separate persistent reward badge on the Learning screen.
## Update 2026-04-05 (Orthography Lesson Cards)
- `REQ-LEARN-009` Learning screen must include 3 orthography cards: `Учим слова - Легко`, `Учим слова - Средне`, `Учим слова - Сложно`.
- `REQ-LEARN-010` Each orthography card starts a mini-lesson with exactly `3` tasks in `choice_3` format.
- `REQ-ECO-004` Orthography card base rewards are fixed to `20`/`40`/`80` cat coins for easy/medium/hard.
- `REQ-ECO-005` Orthography card reward penalties depend on mistakes count:
  - `0` mistakes: `100%` reward;
  - `1` mistake: `-10%`;
  - `2` mistakes: `-30%`;
  - `3` mistakes: `0` reward.

## Update 2026-04-05 (Coin Block In Eggs)
- `REQ-EGG-003` Common egg loot table must include `block_coin` (`Монетный блок`) so the block can be obtained from eggs and used in build mode.
- `REQ-VIS-010` Resource-pack `cartoon-blocky-v1` must provide texture asset `world/block_coin.png` for `block_coin`.
## Update 2026-04-05 (Build Player Restore)
- `REQ-WORLD-012` Build save data must persist and restore player transform: camera position, yaw/pitch, and flying mode survive reload.

## Update 2026-04-26 (Build Local Snapshot)
- `REQ-WORLD-013` Every `world` state change must synchronously write a LocalStorage snapshot containing `player`, `inventory`, and `world`.
- `REQ-WORLD-014` On bootstrap, if the LocalStorage snapshot has a newer `world.updatedAt` than IndexedDB, the app must restore `player`, `inventory`, and `world` from that single snapshot.
- `REQ-WORLD-021` On bootstrap, a LocalStorage snapshot with more user-built voxels than the IndexedDB world must win over IndexedDB even when IndexedDB has a newer `updatedAt`.
- `REQ-WORLD-022` LocalStorage persistence must not overwrite a snapshot containing user-built voxels with a different starter world containing no user-built voxels; the older valuable snapshot must be kept under a rescue key.

## Update 2026-04-26 (Inventory Screen)
- `REQ-INPUT-005` On desktop, pressing `E` toggles the full inventory screen. Opening inventory releases/pauses Build camera controls; pressing `E` again or `Esc` closes the inventory and returns to the previous Build interaction mode.
- `REQ-UI-004` The inventory screen must follow the familiar Minecraft-like layout: a main storage grid, a visible hotbar row, item icons with stack counts, clear selected/hover states, and large enough cells for mouse and touch interaction.
- `REQ-WORLD-016` Hotbar remains the quick-access row for Build mode and is backed by the same inventory data as the full inventory. Moving an item between the inventory grid and hotbar changes only its slot assignment, not the item count.
- `REQ-WORLD-017` Inventory storage must support overflow beyond the 9-slot hotbar so newly earned, bought, or restored resources are not lost when the hotbar is full. New stackable blocks/resources should first merge into an existing compatible stack, then fill the first free hotbar or inventory-grid slot.
- `REQ-WORLD-018` Inventory interactions must support basic item management: picking up a stack, placing it into an empty slot, swapping stacks between slots, merging compatible stacks up to the stack limit, and splitting stacks for partial moves.
- `REQ-WORLD-019` The inventory screen must include a dedicated delete slot. Placing a stack into this slot destroys the stack and removes it from `inventory.blocks`/`inventory.resources` after an explicit confirmation action or equivalent child-safe two-step gesture.
- `REQ-WORLD-020` Closing the inventory must persist the updated inventory layout and item counts through the existing persistence flow so hotbar assignments, grid contents, and deleted resources survive reload.

## Update 2026-04-26 (Glass Block)
- `REQ-WORLD-015` Resource catalog must include `block_glass` (`Стеклянный блок`) as a buildable block.
- `REQ-VIS-011` `block_glass` must render as a semi-transparent block in the shop preview and Build world, with thin dark-gray edge framing for visibility.
- `REQ-ECO-006` Shop must sell `10` `block_glass` blocks for `50` cat coins.
- `REQ-VIS-012` Resource-pack `cartoon-blocky-v1` must provide texture asset `world/block_glass.svg` for `block_glass`.
