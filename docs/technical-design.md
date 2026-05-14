# Технический дизайн MVP

Документ детализирует реализацию концепта и архитектуры:
- структура проекта;
- интерфейсы модулей, текущий Zustand-store API и целевой use-case API;
- контракт событий;
- схема хранения в IndexedDB;
- контракты контента (ресурсы, яйца, лут, задания);
- правила качества, тестов и релизной готовности.

## 1. Технологический baseline
- Язык: TypeScript.
- UI: React.
- Сборка: Vite.
- State: Zustand.
- Рендер мира: Three.js + React Three Fiber (3D voxel, FPV).
- Persistence: Dexie + IndexedDB, плюс синхронный LocalStorage-снимок для критичных изменений мира.
- Unit/Component тесты: Vitest + Testing Library.
- E2E: Playwright.

## 2. Структура директорий
```txt
/src
  /app
    App.tsx
    main.tsx
    router.tsx
    providers/
      StoreProvider.tsx
  /shared
    /types
      common.ts
      events.ts
    /lib
      rng.ts
      math.ts
      time.ts
      id.ts
    /ui
      Button.tsx
      Card.tsx
      CurrencyBadge.tsx
  /domains
    /player
      model.ts
      service.ts
    /economy
      model.ts
      service.ts
      transactions.ts
    /learning
      model.ts
      generators/
        mathAdd.ts
        mathSub.ts
      service.ts
    /inventory
      model.ts
      service.ts
    /loot
      model.ts
      service.ts
    /world
      model.ts
      service.ts
      voxelGrid.ts
      raycast.ts
  /features
    /lesson
      LessonScreen.tsx
      LessonResultScreen.tsx
      useLessonController.ts
    /shop
      ShopScreen.tsx
      useShopController.ts
    /eggs
      EggsScreen.tsx
      EggOpenModal.tsx
      useEggController.ts
    /build
      BuildScreen.tsx
      BuildHUD.tsx
      VirtualJoystick.tsx
      useBuildController.ts
    /profile
      ProfileScreen.tsx
  /content
    catalogs/
      items.resources.v1.json
      items.posters.v1.json
      items.cosmetics.v1.json
      eggs.v1.json
      lootTables.v1.json
      shop.v1.json
    learning/
      math-1.v1.json
  /persistence
    db.ts
    schema.ts
    repositories/
      playerRepo.ts
      lessonRepo.ts
      worldRepo.ts
      inventoryRepo.ts
      txnRepo.ts
  /application
    useCases/
      completeLesson.ts
      buyShopItem.ts
      openEgg.ts
      placeBlock.ts
      removeBlock.ts
    eventBus.ts
  /tests
    unit/
    component/
    e2e/
```

## 3. Основные типы и контракты
## 3.1. Core ID aliases
```ts
export type PlayerId = string;
export type ItemId = string;
export type EggTypeId = 'egg_common' | 'egg_rare' | 'egg_epic' | 'egg_meme';
export type LessonProgramId = 'math-1' | 'math-bronze' | 'orthography-1';
export type TxnId = string;
export type SessionId = string;
```

## 3.2. Профиль и прогресс
```ts
export interface PlayerProfile {
  id: PlayerId;
  nickname: string;
  createdAt: string;
  updatedAt: string;
  currencyCatCoins: number;
  learning: {
    mathLevel: 'A' | 'B' | 'C';
    totalSolved: number;
    totalCorrect: number;
    currentStreak: number;
    bestStreak: number;
  };
}
```

## 3.3. Инвентарь
```ts
export interface InventoryState {
  playerId: PlayerId;
  resources: Record<ItemId, number>;
  blocks: Record<ItemId, number>;
  cosmetics: Record<ItemId, number>;
  posters: Record<ItemId, number>;
  slots: InventorySlot[];
  updatedAt: string;
}

export interface InventorySlot {
  id: string;
  area: 'hotbar' | 'main';
  index: number;
  itemKind: 'block' | 'poster' | 'resource' | 'cosmetic';
  itemId: ItemId;
  count: number;
}
```

Минимальный runtime-контракт Minecraft-style операций:
- `pickupStack`
- `placeStack`
- `dragStack`
- `swapStacks`
- `mergeStacks`
- `splitStack`
- `deleteStack`
- `assignHotbarSlot`

Stack operations должны работать для блоков, ресурсов и poster-предметов. Hotbar является ссылкой/назначением на те же item stacks, а не отдельным независимым счетчиком.

## 3.4. Учебные сущности
```ts
export interface MathTask {
  id: string;
  operation: 'add' | 'sub';
  a: number;
  b: number;
  answer: number;
  maxValue: 20 | 40;
  level: 'A' | 'B' | 'C' | 'bronze';
}

export interface OrthographyTask {
  id: string;
  type: 'choice_3';
  ruleId:
    | 'zhi_shi'
    | 'cha_sha'
    | 'chu_shu'
    | 'unstressed_vowel_root'
    | 'paired_consonants'
    | 'unpronounceable_consonants'
    | 'hard_soft_sign'
    | 'double_consonants';
  prompt: string;
  options: [string, string, string];
  correctOptionIndex: 0 | 1 | 2;
  level: 'A' | 'B' | 'C';
}

export interface LessonSession {
  id: SessionId;
  playerId: PlayerId;
  programId: LessonProgramId;
  startedAt: string;
  finishedAt?: string;
  tasks: Array<MathTask | OrthographyTask>;
  answers: Array<{
    taskId: string;
    value: number;
    isCorrect: boolean;
    attempts: number;
  }>;
  reward?: {
    baseCatCoins: number;
    streakBonusCatCoins: number;
    lessonBonusCatCoins: number;
    totalCatCoins: number;
  };
}
```

## 3.5. Мир
```ts
export interface WorldCell {
  x: number;
  y: number;
  z: number;
  blockId: ItemId | null;
}

export interface WorldState {
  id: string;
  playerId: PlayerId;
  sizeX: number;
  sizeY: number;
  sizeZ: number;
  voxels: WorldCell[];
  decorations: Array<{ id: string; x: number; y: number; z: number }>;
  posters: PosterPlacement[];
  playerTransform: {
    position: { x: number; y: number; z: number };
    rotation: { yaw: number; pitch: number };
    isFlying: boolean;
  };
  playerPhysics: PlayerPhysicsState;
  updatedAt: string;
}

export interface PlayerPhysicsState {
  velocityY: number;
  isGrounded: boolean;
}

export interface PosterPlacement {
  id: string;
  itemId: ItemId;
  anchor: { x: number; y: number; z: number };
  faceNormal: { x: -1 | 0 | 1; y: 0; z: -1 | 0 | 1 };
  sizeBlocks: { width: 2; height: 2 };
}
```

## 3.6. Транзакции экономики
```ts
export type TxnType =
  | 'lesson_reward'
  | 'streak_bonus'
  | 'lesson_bonus'
  | 'shop_purchase'
  | 'egg_purchase'
  | 'duplicate_compensation';

export interface CurrencyTxn {
  id: TxnId;
  playerId: PlayerId;
  type: TxnType;
  amount: number; // + начисление, - списание
  balanceAfter: number;
  meta?: Record<string, string | number | boolean>;
  createdAt: string;
}
```

## 4. Контракты каталогов контента
Каталоги лежат в `/src/content` и версионируются через суффикс `vN`.

## 4.1. Ресурсы и косметика
`items.resources.v1.json`
```json
{
  "version": 1,
  "items": [
    { "id": "res_wood", "name": "Дерево", "icon": "wood.png", "kind": "resource" },
    { "id": "block_brick_red", "name": "Красный кирпич", "icon": "brick_red.png", "kind": "block" },
    { "id": "block_coin", "name": "Монетный блок", "icon": "block_coin.png", "kind": "block" },
    { "id": "block_glass", "name": "Стеклянный блок", "icon": "block_glass.svg", "kind": "block" },
    {
      "id": "poster_meme_cat_1",
      "name": "Мемный кот",
      "kind": "poster",
      "image": "/assets/posters/transparent/poster_meme_cat_1.png",
      "widthBlocks": 2,
      "heightBlocks": 2,
      "stackLimit": 16
    }
  ]
}
```

Картинки meme cats для poster items хранятся локально в `public/assets/posters/transparent` и подключаются через `items.posters.v1.json`. Исходники набора могут лежать в `public/assets`, но runtime-каталог должен ссылаться на нормализованные PNG с прозрачным canvas. Пополнение набора выполняется добавлением нормализованного файла, записи poster item в каталог и при необходимости записи в `loot_meme_posters`. Runtime-загрузка внешних изображений не входит в контракт.

`items.cosmetics.v1.json`
```json
{
  "version": 1,
  "items": [
    { "id": "sticker_cat_star", "name": "Кот-звезда", "kind": "sticker", "rarity": "common" },
    { "id": "skin_hat_blue", "name": "Синяя шапка", "kind": "skin", "rarity": "rare" }
  ]
}
```

## 4.2. Яйца и лут
`eggs.v1.json`
```json
{
  "version": 1,
  "eggs": [
    { "id": "egg_common", "priceCatCoins": 20, "lootTableId": "loot_common" },
    { "id": "egg_rare", "priceCatCoins": 50, "lootTableId": "loot_rare" },
    { "id": "egg_epic", "priceCatCoins": 100, "lootTableId": "loot_epic" },
    { "id": "egg_meme", "priceCatCoins": 200, "lootTableId": "loot_meme_posters" }
  ]
}
```

`lootTables.v1.json`
```json
{
  "version": 1,
  "tables": [
    {
      "id": "loot_common",
      "entries": [
        { "itemId": "block_glow_blue", "weight": 35, "duplicateCompensationCatCoins": 5 },
        { "itemId": "block_rainbow", "weight": 30, "duplicateCompensationCatCoins": 7 },
        { "itemId": "block_cat_gold", "weight": 20, "duplicateCompensationCatCoins": 10 },
        { "itemId": "block_coin", "weight": 15, "duplicateCompensationCatCoins": 8 }
      ]
    },
    {
      "id": "loot_meme_posters",
      "entries": [
        { "itemId": "poster_meme_cat_1", "weight": 100, "duplicateCompensationCatCoins": 20 }
      ]
    }
  ]
}
```

## 4.3. Магазин
`shop.v1.json`
```json
{
  "version": 1,
  "items": [
    {
      "id": "pack_basic",
      "type": "resource-pack",
      "priceCatCoins": 15,
      "payload": { "res_wood": 20, "block_brick_red": 10 }
    },
    {
      "id": "lot_glass_10",
      "type": "resource-pack",
      "priceCatCoins": 50,
      "payload": { "block_glass": 10 }
    }
  ]
}
```

## 4.4. Учебная программа
`math-1.v1.json`
```json
{
  "version": 1,
  "programId": "math-1",
  "levels": {
    "A": { "range": [1, 10], "operations": ["add", "sub"] },
    "B": { "range": [1, 20], "operations": ["add", "sub"] },
    "C": { "range": [1, 20], "operations": ["add", "sub"], "mixed": true },
    "bronze": { "range": [1, 40], "operations": ["add"], "displayName": "Математика - бронзовый" }
  },
  "lesson": {
    "minTasks": 5,
    "maxTasks": 10,
    "reward": {
      "correctAnswer": 2,
      "streak5": 5,
      "lessonAccuracy80": 10
    }
  }
}
```

Для текущего 5-task UI `Математика - бронзовый` использует повышенную награду: `correctAnswer = 4`, `lessonAccuracy80 = 20`, максимум `40` котокоинов.

`orthography-1.v1.json`
```json
{
  "version": 1,
  "programId": "orthography-1",
  "lesson": {
    "minTasks": 5,
    "maxTasks": 10,
    "taskType": "choice_3"
  },
  "rules": [
    "zhi_shi",
    "cha_sha",
    "chu_shu",
    "unstressed_vowel_root",
    "paired_consonants",
    "unpronounceable_consonants",
    "hard_soft_sign",
    "double_consonants"
  ],
  "taskInvariant": {
    "optionsCount": 3,
    "correctAnswersPerTask": 1
  }
}
```

## 5. Application use-cases (публичные API)
Этот раздел описывает целевой application-слой. В текущей MVP-реализации рабочая оркестрация находится в React-экранах и `src/app/store.ts`; файлы `src/application/useCases/*.ts` и `src/features/*/use*Controller.ts` пока являются scaffold и не используются продуктивным UI.

Активный runtime-контракт MVP:
- `LessonScreen` генерирует и проверяет уроки через `src/domains/learning/service.ts`, затем начисляет валюту через `useAppStore.addCatCoins`.
- `ShopScreen` покупает лоты через `useAppStore.spendCatCoins` и `useAppStore.addInventoryItem`.
- `EggsScreen` списывает цену через `useAppStore.spendCatCoins`, роллит локальный loot pool и добавляет строительную награду через `useAppStore.addBlockRewardItem`.
- `BuildScreen` ставит и удаляет блоки через `useAppStore.placeVoxel` и `useAppStore.removeVoxel`.

Требование к дальнейшему развитию: если логика будет переноситься в `src/application/useCases`, сначала нужно перенести туда фактическое поведение из store/UI, затем подключить экраны к этим функциям и только после этого считать use-case API активным контрактом.

## 5.1. Complete Lesson
```ts
interface CompleteLessonInput {
  sessionId: SessionId;
  answers: Array<{ taskId: string; value: number }>;
}

interface CompleteLessonResult {
  correct: number;
  total: number;
  accuracy: number;
  rewardCatCoins: number;
  newBalance: number;
}

declare function completeLesson(input: CompleteLessonInput): Promise<CompleteLessonResult>;
```

Правила:
- Награда начисляется один раз на сессию.
- Если сессия уже `finishedAt != null`, повторное начисление запрещено.

## 5.2. Buy Shop Item
```ts
interface BuyShopItemInput {
  playerId: PlayerId;
  shopItemId: string;
}

declare function buyShopItem(input: BuyShopItemInput): Promise<{ newBalance: number }>;
```

Правила:
- Проверка достаточного баланса.
- Атомарно: списание монет + пополнение инвентаря.

## 5.3. Open Egg
```ts
interface OpenEggInput {
  playerId: PlayerId;
  eggTypeId: EggTypeId;
}

interface OpenEggResult {
  rewardItemId: ItemId;
  rewardWasDuplicate: boolean;
  duplicateCompensationCatCoins: number;
  newBalance: number;
}

declare function openEgg(input: OpenEggInput): Promise<OpenEggResult>;
```

Правила:
- Сначала списываем цену яйца.
- Затем roll по `lootTable`.
- В MVP `rewardItemId` из яйца должен быть предметом, применимым в FPV-строительстве (тип `block`).
- При дубликате начисляем компенсацию.

## 5.4. Place / Remove Block
```ts
declare function placeBlock(input: {
  playerId: PlayerId;
  worldId: string;
  x: number;
  y: number;
  z: number;
  blockItemId: ItemId;
}): Promise<void>;

declare function removeBlock(input: {
  playerId: PlayerId;
  worldId: string;
  x: number;
  y: number;
  z: number;
}): Promise<void>;
```

Правила:
- `placeBlock`: проверка ресурса > 0, затем декремент.
- `removeBlock`: удаление возвращает блок в соответствующий слот инвентаря и увеличивает остаток ресурса.

## 6. Event Bus контракт
Внутренние события используются для синхронизации UI и аналитики.

```ts
type AppEvent =
  | { type: 'lesson.started'; sessionId: string; programId: 'math-1' | 'math-bronze' | 'orthography-1' }
  | { type: 'lesson.completed'; sessionId: string; accuracy: number; rewardCatCoins: number }
  | { type: 'currency.changed'; delta: number; balance: number; txnType: string }
  | { type: 'shop.purchase.completed'; shopItemId: string }
  | { type: 'egg.opened'; eggTypeId: EggTypeId; rewardItemId: string; duplicate: boolean }
  | { type: 'world.block.placed'; x: number; y: number; z: number; blockItemId: string }
  | { type: 'world.block.removed'; x: number; y: number; z: number; blockItemId?: string }
  | { type: 'world.poster.placed'; itemId: string; x: number; y: number; z: number }
  | { type: 'world.poster.removed'; itemId: string; x: number; y: number; z: number }
  | { type: 'save.completed'; scope: 'player' | 'inventory' | 'world' | 'all' };
```

Требования:
- События должны быть иммутабельными.
- Порядок `currency.changed` должен совпадать с порядком транзакций.

## 7. Persistence: IndexedDB схема
БД: `gamo_db`.
Версия MVP: `1`.

## 7.1. Таблицы Dexie
```ts
export class GamoDB extends Dexie {
  player!: Table<PlayerProfile, string>;
  lessons!: Table<LessonSession, string>;
  inventory!: Table<InventoryState, string>; // key = playerId
  worlds!: Table<WorldState, string>;
  txns!: Table<CurrencyTxn, string>;
  meta!: Table<{ key: string; value: string }, string>;

  constructor() {
    super('gamo_db');
    this.version(1).stores({
      player: 'id, updatedAt',
      lessons: 'id, playerId, programId, startedAt, finishedAt',
      inventory: 'playerId, updatedAt',
      worlds: 'id, playerId, updatedAt',
      txns: 'id, playerId, type, createdAt',
      meta: 'key'
    });
  }
}
```

## 7.2. Политика сохранения
- Автосохранение после каждого критичного игрового сценария. В текущей MVP-реализации сценарии выполняются через React-экраны и Zustand-store:
  - завершение урока (`LessonScreen` + `addCatCoins`);
  - покупка в магазине (`ShopScreen` + `spendCatCoins`/`addInventoryItem`);
  - открытие яйца (`EggsScreen` + `spendCatCoins`/`addBlockRewardItem`);
  - постановка блока (`BuildScreen` + `placeVoxel`);
  - удаление блока (`BuildScreen` + `removeVoxel`);
  - размещение/удаление плаката.
- После активации слоя `src/application/useCases` политика должна быть перенесена на функции `completeLesson`, `buyShopItem`, `openEgg`, `placeBlock`, `removeBlock`, `placePoster`, `removePoster`.
- Build-режим сериализует в `world` также `playerTransform` (`position`, `rotation`, `isFlying`), чтобы восстановить состояние игрока после перезагрузки.
- Build-режим сериализует `playerPhysics`, включая `velocityY` и `isGrounded`.
- После каждого изменения `world` приложение синхронно записывает в `localStorage` снимок `player + inventory + world`, чтобы закрыть окно потери данных между изменением мира и завершением асинхронной записи IndexedDB.
- При bootstrap приложение сравнивает `world.updatedAt` из IndexedDB и LocalStorage-снимка; если LocalStorage свежее, восстанавливаются `player`, `inventory` и `world` из одного локального снимка.
- Bootstrap выбирает LocalStorage-снимок вместо IndexedDB, если в нем больше пользовательских вокселей, даже если IndexedDB имеет более свежий `updatedAt`.
- Запись LocalStorage не должна затирать snapshot с пользовательскими вокселями новым стартовым миром с другим `world.id`; старый snapshot сохраняется под rescue-ключом.
- Debounce для частых действий строительства: 500-1000ms.
- Принудительный flush на `visibilitychange` (`hidden`).

## 7.3. Восстановление состояния
Порядок bootstrap:
1. Загрузить `player`.
2. Загрузить `inventory`.
3. Загрузить `world`.
4. Построить store.
5. Проверить консистентность (баланс >= 0, неотрицательные количества).
6. Если в legacy-сохранении нет `playerTransform`, использовать fallback spawn-point по умолчанию.
7. Если в legacy-сохранении нет `playerPhysics`, использовать `velocityY = 0` и вычислить `isGrounded` по стартовой позиции.

## 7.4. Миграции
Принцип:
- Любое изменение схемы -> новая версия Dexie.
- Обязательная функция миграции.

Шаблон:
```ts
this.version(2).stores({
  // updated schema
}).upgrade((tx) => {
  // data transformation
});
```

## 8. Валидация и инварианты
Проверки на уровне доменных сервисов:
- Баланс не уходит ниже нуля.
- Количество предметов в инвентаре не уходит ниже нуля.
- Любой `itemId` из лута должен существовать в каталоге.
- Любой `shopItem.payload` должен ссылаться только на существующие `itemId`.
- Для задач вычитания выполняется `a >= b`.
- Для `Математика - бронзовый` выполняется `operation === 'add'`, `maxValue === 40`, а карточка доступна без unlock prerequisites.
- Для active poster item выбранная грань должна быть вертикальной (`faceNormal.y === 0`).
- Для плаката достаточно одного supporting block face под курсором; итоговая область `2x2` не должна пересекать существующие poster/decor occupancy или твердые блоки мира.
- Невалидное размещение плаката показывает invalid wireframe и не списывает предмет из инвентаря.
- В Build world постер рендерится как тонкая основа с лицевой картинкой; прозрачные области poster image показывают основу постера, а не текстуру блока за ним.
- Каждый frame Build-режима применяет gravity к `velocityY`, интегрирует вертикальное движение и выполняет collision resolution с твердыми блоками. Запрещена логика мгновенного переноса игрока на нижнюю поверхность при потере опоры.
- Для `orthography-1` distractor-варианты проходят quality-filter:
  - генерация сначала по целевому `ruleId`, затем по ограниченному `allowedRuleChain` для этого правила;
  - каждый кандидат проходит `isRulePlausible(ruleId, correct, candidate)`;
  - кандидаты, совпадающие с любым `lexicon.correct`, отбрасываются;
  - если после фильтра нельзя получить 2 distractor-варианта, задача/слово считаются невалидными для выдачи.

Ошибки:
```ts
class DomainError extends Error {
  code:
    | 'INSUFFICIENT_FUNDS'
    | 'INVALID_ITEM'
    | 'INVALID_LOOT_TABLE'
    | 'LESSON_ALREADY_REWARDED'
    | 'NO_RESOURCE'
    | 'INVALID_POSTER_PLACEMENT'
    | 'INVALID_COORDINATE';
}
```

## 9. Input layer (mouse + touch)
Техническая реализация:
- Базовое API: `pointerdown`, `pointermove`, `pointerup`, `pointercancel`.
- Нормализация состояния указателя:
```ts
interface PointerState {
  id: number;
  x: number;
  y: number;
  isPrimary: boolean;
  pointerType: 'mouse' | 'touch' | 'pen';
}
```

Контролы MVP (FPV):
- Desktop: `WASD` (движение), `Space` (одинарный прыжок), удержание ПКМ + мышь (free camera view), ЛКМ выполняет действие активного слота hotbar.
- Tablet: левый виртуальный джойстик (движение), touch-кнопка прыжка, правый свайп (обзор), кнопки `Поставить/Удалить`.
- Jump срабатывает только при `playerPhysics.isGrounded === true`.
- При `window.blur` и `document.visibilitychange -> hidden` Build-режим ставится на паузу, а состояние клавиш принудительно сбрасывается (защита от «залипания» движения).
- При клике/контекстном меню вне области `.build-stage` Build-режим также ставится на паузу с тем же сбросом клавиш.
- Сброс клавиш реализуется без перемонтирования сцены: ввод движения «разоружается» до следующего `keydown` управляющей клавиши, поэтому позиция игрока не откатывается.
- Режим строительства включается отдельной кнопкой HUD для снижения случайных действий.
- Концепция центра-экрана/прицела не используется: постановка идет по позиции курсора/касания.
- Превью постановки: тонкая рамка только по ребрам (без диагоналей), рассчитывается тем же raycast-контуром, что и фактическое действие слота.
- Для active poster item Build preview рендерит `2x2` wireframe на вертикальной поверхности. Existing one-block placement preview остается для block items.
- Hotbar: 9 слотов, где слот 1 = ластик, слоты 2-9 = ресурсы/пусто. По умолчанию выбирается слот с первым ресурсом; если ресурсов нет, активен пустой слот 2 и ЛКМ не выполняет действие.

## 10. UI/UX технические требования
- Минимальный размер кнопок: 44x44 px.
- Ключевые зоны HUD строительства: минимум 56x56 px.
- Ограничить число одновременных CTA на экране до 3.
- Анимации открытия яйца: 400-900ms.
- Карточка награды после открытия яйца должна начинать fade-out через `2` секунды и автоматически скрываться.
- Поддержка `prefers-reduced-motion`.
- Hotbar должен быть доступен мышью и горячими клавишами `1..9`.
- Full inventory UI использует Minecraft-style baseline: main storage grid, visible hotbar row, item icons, stack counts, selected/hover states, drag-and-drop movement for whole stacks, visible carried-stack feedback under the pointer for drag/split operations, and large cells suitable for mouse and touch.
- UI результата урока показывает earned currency в формате `value + coin icon`.
- `EggsScreen` рендерит последний reward через классы витрины магазина: `shop-lot`, `shop-lot-iso`, `shop-cube-*`, `shop-lot-count`.
- `ShopScreen` рендерит боковые грани preview через `side`-текстуру и применяет `faceTextureRotationDeg.side` из resource-pack.

## 11. Логирование и диагностика
Минимальные события аналитики (локально в MVP, через консоль/таблицу meta):
- `session_start`
- `lesson_complete`
- `currency_earned`
- `currency_spent`
- `egg_open`
- `build_place_block`
- `build_place_poster`

Формат записи:
```ts
interface AnalyticsEvent {
  id: string;
  name: string;
  ts: string;
  payload: Record<string, string | number | boolean>;
}
```

## 12. Тестовая стратегия
## 12.1. Unit
- Генерация задач математики (границы 1..20).
- Генерация задач `Математика - бронзовый`: только сложение, границы до `40`, повышенная награда до `40` котокоинов в текущем 5-task flow.
- Генерация задач орфографии (`choice_3`) с инвариантом: ровно `1` правильный вариант и `2` distractor-варианта.
- Расчет наград за урок и серии.
- Roll лута по весам и дубликаты.
- Инварианты экономики.
- Minecraft-style inventory operations: pickup/place, drag-and-drop whole-stack movement, swap, merge, split, delete slot, hotbar synchronization, and visible carried-stack feedback for drag/split operations.
- Jump/fall physics: grounded-only jump and continuous falling without teleport.
- Poster placement validation: vertical face, one supporting block face, no overlap with existing posters, decor, or solid blocks, no inventory consumption on invalid placement.

## 12.2. Component
- Экран урока: прохождение 5 задач и получение результата.
- Экран урока: повторное нажатие «Начать мини-урок» генерирует новый набор задач.
- Экран орфографии: рендер `3` вариантов написания слова и проверка выбора корректного варианта.
- Экран урока: карточка `Математика - бронзовый` доступна сразу и запускает сложение до `40`.
- Экран магазина: покупка при достаточном/недостаточном балансе.
- Экран яиц: корректное отображение результата открытия.
- Экран яиц: `egg_meme` стоит `200` котокоинов и выдает poster item.
- Экран инвентаря: базовые операции со стаками работают для блоков, ресурсов и poster items.

## 12.3. E2E
Сценарий `happy path`:
1. Стартовый профиль.
2. Пройти урок.
3. Получить кото-монетки.
4. Купить яйцо.
5. Открыть яйцо.
6. Купить ресурсы.
7. Поставить блок в мире.
8. Перезагрузить страницу.
9. Проверить восстановление прогресса.

## 13. Performance budget (MVP)
- JS bundle (initial): до 400KB gzip (цель), до 600KB максимум.
- Первый meaningful render: до 2.5s на desktop, до 3.5s на среднем планшете.
- Build mode render: не ниже 30 FPS.

## 14. Безопасность и приватность
- Без внешнего чата/UGC в MVP.
- Персональные данные не отправляются на сервер.
- Локальные данные очищаются только явным действием взрослого.

## 15. План внедрения по спринтам
## Sprint 1
- Scaffold проекта, стор, маршруты, каталоги.
- Базовая IndexedDB.
- Экран профиля с балансом кото-монеток.

## Sprint 2
- Learning module `math-1`.
- Награды и транзакции.
- Тесты unit для математики и экономики.

## Sprint 3
- Магазин и яйца.
- Лут и дубликаты.
- Интеграция наград из яиц в FPV-инвентарь блоков.
- Component-тесты экранов магазина/яиц.

## Sprint 4
- Build mode (3D voxel, FPV, установка/удаление).
- Использование наград из яиц в строительстве (выбор блока и установка).
- Input abstraction desktop/tablet (WASD+mouse, joystick+swipe).
- Автосохранение мира.

## Sprint 5
- E2E `happy path`.
- Балансировка экономики.
- UX полировка и bugfix.

## Sprint 6 (Post-MVP)
- Переключение камеры FPV/3PV.
- Базовый аватар.
- Применение украшений (скины/аксессуары) к аватару.

## 16. Критерии готовности к реализации
Разработка может стартовать, если:
1. Утверждены каталоги `v1`.
2. Подтверждены формулы наград в кото-монетках.
3. Подтвержден рендерер Three.js + R3F для FPV.
4. Согласованы размеры мира в MVP (например, 32x32x32).

---

## Что уточнить перед кодингом (минимум)
- Размер мира по умолчанию: 24x24, 32x32 или 48x48.
- Чувствительность камеры для touch и mouse (пороги по умолчанию).

## 17. Resource Pack contract
### 17.1. Цель
Отвязать визуальные ассеты (мир + HUD) от геймплейной логики и обеспечить расширение через паки.

### 17.2. Базовый контракт
```ts
type ResourcePackSpec = {
  id: string;
  displayName: string;
  license: string;
  sources: string[];
  world: {
    skyTextureUrl: string;
    groundTextureUrl: string;
    defaultBlock: BlockMaterialSpec;
    blocks: Record<string, BlockMaterialSpec>;
  };
  ui: {
    fontFamily: string;
    textures: {
      appBg: string;
      card: string;
      button: string;
      hudPanel: string;
      hotbarSlot: string;
      hotbarSlotSelected: string;
      coinIcon: string;
    };
  };
};
```

`BlockMaterialSpec` может задавать `transparent` и `opacity` для материалов, которым нужна полупрозрачность (например, `block_glass`).
Для `block_glass` дефолтный материал использует `transparent: true`, `opacity: 0.42`, а текстура содержит тонкую темно-серую рамку по ребрам.

### 17.3. Реализация MVP
- Реестр паков: `src/theme/resourcePacks.ts`.
- Активный pack id: `app/store.ts` (`activeResourcePackId`).
- Применение UI-темы: CSS variables через `applyResourcePack()`.
- Рендер мира: загрузка текстур из пака и маппинг по `blockId` в `BuildScreen`.
- `ShopScreen` рендерит боковые грани preview через `side`-текстуру и применяет `faceTextureRotationDeg.side` из resource-pack.

### 17.4. Дефолтный пак
- `cartoon-blocky-v1`
- Источники: Kenney `voxel pack` + `ui pack` (CC0).
- Файлы ассетов: `public/resource-packs/cartoon-blocky-v1/*`.
- Обязательные world assets: `block_coin.png`, `block_glass.svg`, текстуры граней `block_grass_dirt`.


## 18. Технические детали: твердые блоки
- Block id `block_grass_dirt` присутствует в каталоге ресурсов.
- `createInitialWorld()` создает базовый слой вокселей `block_grass_dirt` по всем `x,z` на `y=0`.
- В `BuildScreen` коллизии игрока выполняются перед применением шага движения.
- Используется проверка пересечения player AABB с AABB каждого вокселя; при коллизии шаг по оси блокируется (с попыткой скольжения по свободной оси).
- Блок `block_grass_dirt` использует раздельные текстуры граней в стиле Minecraft: `top=grass`, `bottom=dirt`, `side=grass+dirt`.
- Hotbar отображает иконки блоков из активного resource-pack (берется `top`-текстура блока; fallback на базовую textureUrl).
- Базовый размер мира по оси `Y` равен `24`, чтобы верхняя граница постановки блоков была `y < 24`.
- Вертикальная физика хранит `velocityY` и `isGrounded`; прыжок доступен только из grounded-состояния, падение интегрируется по кадрам с gravity и collision resolution.

## 19. Реестр требований
- Единый структурированный реестр требований: `docs/requirements-registry.md`.
- Текущий контракт Build UI: `VirtualJoystick` рендерится только при `matchMedia('(pointer: coarse)')`.
- При `placeBlock` списывается не только `blocks`, но и соответствующий `resources`-остаток.
- Награды из обычных строительных яиц добавляются только в `blocks` без прироста `resources`; poster-награды добавляются в poster item kind.
- Базовый seed `initialInventory`: `resources = { block_brick_red: 24 }`, `blocks = { block_brick_red: 24 }`, пустые poster/cosmetics collections и слотированное представление hotbar/main inventory.
- При `db.delete()` и следующем запуске применяется тот же стартовый seed.
