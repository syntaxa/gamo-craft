# Технический дизайн MVP

Документ детализирует реализацию концепта и архитектуры:
- структура проекта;
- интерфейсы модулей и use-case API;
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
- Persistence: Dexie + IndexedDB.
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
export type EggTypeId = 'egg_common' | 'egg_rare' | 'egg_epic';
export type LessonProgramId = 'math-1';
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
  updatedAt: string;
}
```

## 3.4. Учебные сущности
```ts
export interface MathTask {
  id: string;
  operation: 'add' | 'sub';
  a: number;
  b: number;
  answer: number;
  maxValue: 20;
  level: 'A' | 'B' | 'C';
}

export interface LessonSession {
  id: SessionId;
  playerId: PlayerId;
  programId: LessonProgramId;
  startedAt: string;
  finishedAt?: string;
  tasks: MathTask[];
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
  updatedAt: string;
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
    { "id": "block_brick_red", "name": "Красный кирпич", "icon": "brick_red.png", "kind": "block" }
  ]
}
```

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
    { "id": "egg_epic", "priceCatCoins": 100, "lootTableId": "loot_epic" }
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
        { "itemId": "block_glow_blue", "weight": 45, "duplicateCompensationCatCoins": 5 },
        { "itemId": "block_rainbow", "weight": 35, "duplicateCompensationCatCoins": 7 },
        { "itemId": "block_cat_gold", "weight": 20, "duplicateCompensationCatCoins": 10 }
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
    "C": { "range": [1, 20], "operations": ["add", "sub"], "mixed": true }
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

## 5. Application use-cases (публичные API)
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
- `removeBlock`: возвращение ресурса отключено в MVP (чтобы избежать эксплойтов), можно включить флагом в будущем.

## 6. Event Bus контракт
Внутренние события используются для синхронизации UI и аналитики.

```ts
type AppEvent =
  | { type: 'lesson.started'; sessionId: string; programId: 'math-1' }
  | { type: 'lesson.completed'; sessionId: string; accuracy: number; rewardCatCoins: number }
  | { type: 'currency.changed'; delta: number; balance: number; txnType: string }
  | { type: 'shop.purchase.completed'; shopItemId: string }
  | { type: 'egg.opened'; eggTypeId: EggTypeId; rewardItemId: string; duplicate: boolean }
  | { type: 'world.block.placed'; x: number; y: number; z: number; blockItemId: string }
  | { type: 'world.block.removed'; x: number; y: number; z: number; blockItemId?: string }
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
- Автосохранение после каждого критичного use-case:
  - `completeLesson`
  - `buyShopItem`
  - `openEgg`
  - `placeBlock`
  - `removeBlock`
- Debounce для частых действий строительства: 500-1000ms.
- Принудительный flush на `visibilitychange` (`hidden`).

## 7.3. Восстановление состояния
Порядок bootstrap:
1. Загрузить `player`.
2. Загрузить `inventory`.
3. Загрузить `world`.
4. Построить store.
5. Проверить консистентность (баланс >= 0, неотрицательные количества).

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

Ошибки:
```ts
class DomainError extends Error {
  code:
    | 'INSUFFICIENT_FUNDS'
    | 'INVALID_ITEM'
    | 'INVALID_LOOT_TABLE'
    | 'LESSON_ALREADY_REWARDED'
    | 'NO_RESOURCE'
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
- Desktop: `WASD` (движение), мышь (обзор), `Space` (прыжок опционально), клик (поставить), долгий клик/кнопка (удалить).
- Tablet: левый виртуальный джойстик (движение), правый свайп (обзор), кнопки `Поставить/Удалить`.
- Режим строительства включается отдельной кнопкой HUD для снижения случайных действий.

## 10. UI/UX технические требования
- Минимальный размер кнопок: 44x44 px.
- Ключевые зоны HUD строительства: минимум 56x56 px.
- Ограничить число одновременных CTA на экране до 3.
- Анимации открытия яйца: 400-900ms.
- Поддержка `prefers-reduced-motion`.

## 11. Логирование и диагностика
Минимальные события аналитики (локально в MVP, через консоль/таблицу meta):
- `session_start`
- `lesson_complete`
- `currency_earned`
- `currency_spent`
- `egg_open`
- `build_place_block`

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
- Расчет наград за урок и серии.
- Roll лута по весам и дубликаты.
- Инварианты экономики.

## 12.2. Component
- Экран урока: прохождение 5 задач и получение результата.
- Экран магазина: покупка при достаточном/недостаточном балансе.
- Экран яиц: корректное отображение результата открытия.

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
- Возвращать ли ресурс при удалении блока.
- Нужна ли механика прыжка в MVP.
- Чувствительность камеры для touch и mouse (пороги по умолчанию).
