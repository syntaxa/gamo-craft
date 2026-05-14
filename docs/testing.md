# Стратегия автоматического тестирования

## 1. Статус документа
Документ актуализирован под текущую структуру проекта и может использоваться как основа для разработки автотестов.

Базовая тестовая инфраструктура установлена: `package.json` содержит Vitest, Testing Library, Playwright, `jsdom`, `fake-indexeddb`, `@vitest/coverage-v8` и npm-скрипты `test:*`; `vite.config.ts` содержит конфигурацию Vitest, а `src/tests/setup.ts` настраивает `jsdom`, jest-dom matchers, fake IndexedDB и очистку browser storage.

Первый unit-набор находится в `src/tests/unit` и покрывает инварианты `math-1`, `orthography-1`, каталогов, store-экономики/строительства, стартового мира и LocalStorage-снимка.

Component/integration набор находится в `src/tests/component` и покрывает `LessonScreen`, `ShopScreen`, `EggsScreen` и App Shell navigation с реальным Zustand-store. Для App Shell теста WebGL Build-экран заменяется легкой границей, потому что проверяется маршрутизация, а не R3F-рендер.

E2E smoke-набор находится в `src/tests/e2e` и запускается Playwright на desktop Chromium и tablet Chromium. Сейчас покрыты: навигация shell, `orthography-card-flow`, `glass-shop-flow` и `egg-economy-guardrail`. Полные e2e-сценарии `happy-path-mvp`, `persistence-reopen` и `inventory-management-flow` требуют дальнейшего расширения продукта/тестов.

Рабочая MVP-оркестрация находится в React-экранах и Zustand-store (`src/app/store.ts`). Файлы `src/application/useCases/*.ts` и `src/features/*/use*Controller.ts` являются scaffold под возможный будущий рефакторинг и не считаются активным продуктивным слоем. Тесты должны покрывать реальные пути исполнения: доменные сервисы, Zustand-store, UI-обработчики и e2e-сценарии. Unit-тесты для `application/useCases` добавляются только после переноса туда рабочей логики.

`docs/requirements-registry.md` является каноническим источником требований для тестового покрытия. При заведении или изменении тестов нужно сначала проверить активные `REQ-*` в реестре и убедиться, что для каждого продуктового инварианта есть хотя бы один уровень покрытия: unit, component/integration, e2e, CI/контентная валидация или явно зафиксированная ручная проверка.

## 2. Цели
- Защитить ключевой цикл MVP: `урок -> кото-монетки -> яйца -> FPV-строительство -> сохранение`.
- Быстро ловить регрессии в экономике, генерации заданий, луте, строительстве и сохранениях.
- Покрыть обе учебные программы: `math-1` и `orthography-1`.
- Поддерживать предсказуемую скорость разработки: быстрые unit, стабильные component/integration, минимальный набор e2e.

## 3. Принципы
- Пирамида тестов: много unit, меньше component/integration, немного критичных e2e.
- Детерминизм: random, время и источники ID должны контролироваться в тестах.
- Проверка инвариантов домена важнее визуальных деталей.
- E2E покрывают только критичные сквозные сценарии и устройства.
- Запрещено подменять функционал проекта имитациями там, где тест может вызвать реальный код проекта.

## 4. Слои тестирования
### 4.1. Unit (Vitest)
Тестируем чистую бизнес-логику без UI:
- генерация математических задач: `src/domains/learning/generators/mathAdd.ts`, `mathSub.ts`, `src/domains/learning/service.ts`;
- генерация орфографии: `src/domains/learning/generators/orthography.ts`;
- расчет наград орфографических карточек: `calculateOrthographyCardReward`;
- экономика: `src/domains/economy/service.ts`, `transactions.ts`;
- инвентарь: `src/domains/inventory/service.ts`;
- лут: `src/domains/loot/service.ts`;
- world-операции и ограничения координат: `src/domains/world/service.ts`, `voxelGrid.ts`, `raycast.ts`;
- Zustand-store сценарии: `src/app/store.ts` (`spendCatCoins`, `addInventoryItem`, `addBlockRewardItem`, `placeVoxel`, `removeVoxel`);
- active use-case функции после их реализации/переноса в `src/application/useCases/*.ts`;
- LocalStorage-снимок: `src/persistence/localSnapshot.ts`.
- каталожные инварианты: наличие обязательных buildable blocks и shop-позиций из `docs/requirements-registry.md`.

Обязательные unit-инварианты:
- `math-1`: сложение и вычитание в диапазоне до 20, для вычитания `a >= b`;
- `orthography-1`: каждая задача имеет тип `choice_3`, ровно `3` уникальных варианта, `1` правильный ответ и `2` distractor-варианта;
- distractor-варианты не совпадают со словарными корректными словами и проходят rule-plausibility фильтр;
- баланс кото-монеток и количества предметов не уходят ниже нуля;
- лут из яйца ссылается на существующий строительный `block`;
- `placeBlock` списывает ресурс/блок, `removeBlock` возвращает ресурс в инвентарь;
- стартовый инвентарь после bootstrap/reset содержит `24` `block_brick_red`;
- `writeLocalAppSnapshot` пишет `player + inventory + world`, `readLocalAppSnapshot` игнорирует битый JSON.
- hotbar и full inventory используют одни и те же данные инвентаря; перемещение между слотами не меняет количество предметов;
- overflow-инвентарь не теряет новые ресурсы, когда hotbar заполнен;
- операции inventory management поддерживают swap, merge compatible stacks, split stack и child-safe delete slot;
- `block_glass` есть в каталоге ресурсов, продается в магазине как `10` блоков за `50` котокоинов и ссылается на texture asset ресурс-пака.
- Minecraft-style inventory supports baseline stack operations: pickup/place, swap, merge, split, delete slot, and hotbar synchronization with the same inventory data.
- Build physics supports a grounded-only single jump and continuous falling; falling must not teleport the player to the next lower surface.
- `egg_meme` costs `200` котокоинов and grants local poster items that can be stored in inventory.
- Poster placement accepts only vertical faces, previews a `2x2` wireframe, requires one supporting block face, rejects overlap with existing posters, decor, or solid blocks, and does not consume inventory on invalid placement.
- `Математика - бронзовый` is available immediately, generates addition tasks up to `40`, and can award up to `40` котокоинов in the current 5-task lesson flow.

Цель покрытия:
- доменные модули: >= 90% line coverage;
- активные store/use-case сценарии: >= 80% line coverage. Неактивный scaffold `src/application/useCases/*.ts` не входит в обязательную цель покрытия до переноса туда рабочей логики.

### 4.2. Component/Integration (Testing Library + Vitest)
Тестируем React-экраны с реальным Zustand-store и реальными доменными модулями. До переноса логики в `src/application/useCases` UI-сценарии проверяются через фактический путь `screen -> store/domain`:
- `LessonScreen`: прохождение математического мини-урока, результат, начисление валюты один раз;
- `LessonScreen`: карточки `Учим слова - Легко/Средне/Сложно`, генерация `3` заданий `choice_3`, расчет награды `20/40/80` со штрафами за ошибки;
- `EggsScreen`: покупка яйца, выдача FPV-награды, визуальный результат, fade-out карточки лута через 2 секунды;
- `BuildScreen`: выбор блока, установка/удаление, расход и возврат инвентаря;
- `BuildScreen hotbar`: слот 1 = ластик, слоты 2-9 читаются из общего `inventory.slots` и могут содержать блоки или poster items, поведение пустого слота при пустом инвентаре;
- `BuildScreen full inventory`: клавиша `E` открывает/закрывает инвентарь, `Esc` закрывает его, camera controls при открытии отпускаются/ставятся на паузу;
- `Inventory UI`: storage grid, hotbar row, selected/hover states, stack counts, delete slot с подтверждением;
- `ShopScreen`: покупка при достаточном и недостаточном балансе;
- `ShopScreen`: покупка `10` `block_glass` за `50` котокоинов и отображение стеклянного блока как semi-transparent preview с рамкой;
- App Shell: роутинг и базовая навигация между `Мир`, `Учеба`, `Магазин`, `Яйца`, `Профиль`.

Цель покрытия:
- критичные экраны MVP: >= 70% line coverage.

### 4.3. E2E (Playwright)
Минимальный стабильный набор для релизной уверенности:

1. `happy-path-mvp`
- пройти урок;
- получить кото-монетки;
- купить яйцо;
- получить FPV-блок;
- поставить блок в мире;
- перезагрузить страницу;
- проверить восстановление прогресса.

2. `economy-guardrails`
- попытка купить яйцо без средств;
- баланс не уходит в минус;
- UI показывает корректную ошибку.

3. `touch-tablet-core`
- tablet viewport с touch-эмуляцией;
- открыть урок, магазин/яйца, вернуться в FPV;
- выполнить базовое действие строительства.

4. `persistence-reopen`
- серия действий: урок + яйцо + стройка;
- закрытие/открытие контекста;
- проверка восстановления из IndexedDB;
- отдельная проверка: блок, поставленный непосредственно перед закрытием вкладки, восстанавливается из LocalStorage-снимка, если IndexedDB не успела записаться.

5. `orthography-card-flow`
- открыть `Учим слова - Легко`;
- увидеть ровно `3` задания;
- выбрать варианты;
- проверить result card, награду и закрытие результата.

6. `inventory-management-flow`
- открыть Build-режим;
- нажать `E`, проверить открытие full inventory и паузу/освобождение camera controls;
- переместить stack между grid и hotbar;
- закрыть `E` или `Esc`;
- перезагрузить страницу;
- проверить сохранение layout и количества предметов.

7. `glass-block-flow`
- купить стеклянные блоки в магазине;
- проверить списание `50` котокоинов и добавление `10` `block_glass`;
- поставить стеклянный блок в мире;
- перезагрузить страницу;
- проверить восстановление блока и инвентаря.

## 5. Правило "без имитации вместо функционала"
- В тестах обязательно вызывать реальный код проекта: доменные сервисы, active use-case/store, UI-обработчики.
- Запрещено заменять тестируемый модуль на мок/заглушку, если его можно вызвать напрямую.
- Допустимо мокать только внешние границы:
  - сеть/HTTP;
  - браузерные API, отсутствующие в тестовой среде;
  - системное время, RNG, генератор ID;
  - WebGL/R3F canvas в component-тестах, если проверяется не визуальный рендер, а событие/команда.
- При любом моке в PR должно быть краткое объяснение, почему без него тест невозможен или нестабилен.

## 6. Что считаем критичным в MVP
Обязательные инварианты, которые должны быть тестами:
- баланс кото-монеток никогда не отрицательный;
- награда урока начисляется один раз за сессию;
- награды из яиц в MVP всегда применимы в FPV-строительстве;
- блок нельзя поставить без ресурса в инвентаре;
- удаление блока ластиком возвращает ресурс в соответствующий слот инвентаря;
- прогресс сохраняется и восстанавливается из IndexedDB;
- после каждого изменения `world` пишется синхронный LocalStorage-снимок;
- при bootstrap LocalStorage-снимок свежее IndexedDB восстанавливает `player`, `inventory` и `world` вместе;
- слот 1 hotbar всегда выполняет удаление блока;
- при пустом инвентаре активен пустой слот 2 и ЛКМ не выполняет действие;
- `orthography-1` не выдает задачу без 2 валидных distractor-вариантов.
- открытие full inventory через `E` не оставляет Build-камеру в активном захвате управления;
- hotbar является quick-access представлением того же инвентаря, а не отдельным источником количества;
- overflow-инвентарь сохраняет ресурсы, которые не помещаются в hotbar;
- удаление предметов через delete slot требует child-safe двухшагового подтверждения;
- изменения раскладки инвентаря и удаленные ресурсы переживают reload;
- `block_glass` доступен для покупки, визуально отличим как стеклянный блок и может быть поставлен в мире.

## 7. Тестовые данные и фикстуры
Рекомендуется завести:
- `src/tests/fixtures/catalogs/*.json` для egg/loot/shop/math/orthography;
- `src/tests/fixtures/player/*.json` для баланса, инвентаря, мира;
- фабрики сущностей: `makePlayer`, `makeInventory`, `makeLessonSession`, `makeWorld`;
- `src/tests/setup.ts` для `jsdom`, очистки Zustand-store, fake timers и IndexedDB/localStorage cleanup.

Правила фикстур:
- короткие и читаемые;
- отдельные фикстуры для edge-cases: 0 валюты, пустой инвентарь, дубликаты лута, невалидные distractors;
- не переиспользовать один гигантский fixture для всех сценариев.

## 8. Детерминизм: random/time/id
- RNG инжектируется через интерфейс или seed, в тестах используется предсказуемая последовательность.
- Время фиксируется через fake timers или `now()`-абстракцию.
- ID стабилизируются через провайдер или мок внешней границы генерации ID.

Для орфографии:
- unit-тесты должны проверять seed-генерацию `generateOrthographyLesson(level, count, seed)`;
- CLI `npm run orth:samples -- --count 30 --seed 42 --level A --mode balanced` используется как QA-проверка качества пачек, но не заменяет unit-тесты.

Для лута:
- unit-тесты на фиксированных последовательностях RNG;
- статистический тест распределения весов держать вне обязательного PR-gate или помечать как slow.

## 9. IndexedDB и persistence тесты
- Unit для репозиториев на `fake-indexeddb`.
- Integration: полный цикл `запись -> reload state -> чтение`.
- E2E: после перезагрузки браузера состояние совпадает с ожидаемым.

Ключевые проверки:
- автосохранение после `completeLesson`, `openEgg`, `placeBlock`, `removeBlock`;
- синхронная запись LocalStorage-снимка после каждого изменения `world`;
- выбор LocalStorage-снимка при bootstrap, если он свежее IndexedDB;
- консистентность: нет отрицательных количеств/баланса;
- миграции схемы при повышении версии DB.

## 10. FPV/3D и UI тесты
- Бизнес-правила строительства тестировать на уровне домена/store, а не через пиксели.
- Для 3D-canvas в component-тестах проверять команды/события и состояние, а не визуальный рендер.
- Для e2e достаточно smoke-проверок взаимодействия: наведение курсора, установка блока, удержание ПКМ для free camera view.
- Отдельный тест на превью установки: рамка показывает именно ту клетку, куда блок встанет по клику.
- Отдельный тест на визуальную форму рамки: только ребра, без диагональных линий на гранях.
- Touch-only элементы, включая `VirtualJoystick`, отображаются только при coarse pointer.

## 11. Npm-скрипты и зависимости
Текущие обязательные команды проекта:
- `npm run lint`;
- `npm run build`;
- `npm run orth:build`;
- `npm run orth:validate`;
- `npm run orth:program`;
- `npm run orth:samples -- --count 30 --seed 42 --level A --mode balanced`.

Установленные dev-dependencies для автотестов:
- `vitest`;
- `@testing-library/react`;
- `@testing-library/user-event`;
- `@testing-library/jest-dom`;
- `jsdom`;
- `fake-indexeddb`;
- `@playwright/test`;
- `@vitest/coverage-v8`.

Npm-скрипты:
- `test`: запуск unit + component;
- `test:unit`;
- `test:component`;
- `test:e2e:smoke`;
- `test:e2e:full`;
- `test:coverage`;
- `test:orthography:samples`: короткий alias для стабильной QA-пачки `orth:samples`.

## 12. CI-гейты
Рекомендуемый pipeline GitHub Actions:
1. `typecheck` через `npm run build` или отдельный `tsc -b --noEmit`;
2. `lint`;
3. `orth:validate`;
4. `unit`;
5. `component`;
6. `e2e-smoke` на PR;
7. `e2e-full` nightly/main.

Merge в `main` разрешать только при успешном прохождении обязательных шагов 1-6.

## 13. Кроссплатформенная матрица
Обязательная матрица перед релизом MVP:
- Desktop Chromium: mouse + keyboard;
- Tablet viewport: touch-эмуляция в Playwright;
- дополнительно вручную: Android-планшет, реальный smoke.

## 14. Приоритизация внедрения
Порядок внедрения тестов:
1. Unit для математики, орфографии, экономики, инвентаря, лута.
2. Unit для world/store/persistence-инвариантов; use-case unit добавлять после активации слоя `src/application/useCases`.
3. Component для `LessonScreen`, `EggsScreen`, `BuildScreen`, `ShopScreen`.
4. E2E `happy-path-mvp`.
5. Persistence тесты: `fake-indexeddb` + e2e reopen + LocalStorage-snapshot priority.
6. Touch/tablet e2e smoke.

## 15. Критерии готовности тестовой системы для MVP
Система тестирования для MVP считается достаточной, если:
1. Критичные инварианты покрыты автоматическими тестами.
2. Есть минимум 1 стабильный сквозной e2e-сценарий полного цикла.
3. CI блокирует merge при падении lint/typecheck/test.
4. Есть отдельные проверки сохранения и восстановления прогресса.
5. Есть отдельные проверки `orthography-1` и QA-команд словаря.

## 16. Связь с правилами проекта
Этот документ должен обновляться при изменении требований тестируемости.

При изменении MVP-области необходимо синхронизировать:
- `docs/concept.md`;
- `docs/architecture.md`;
- `docs/technical-design.md`;
- `docs/requirements-registry.md`;
- `docs/testing.md`.
