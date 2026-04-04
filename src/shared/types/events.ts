import type { EggTypeId } from './common';

export type AppEvent =
  | { type: 'lesson.started'; sessionId: string; programId: 'math-1' | 'orthography-1' }
  | { type: 'lesson.completed'; sessionId: string; accuracy: number; rewardCatCoins: number }
  | { type: 'currency.changed'; delta: number; balance: number; txnType: string }
  | { type: 'shop.purchase.completed'; shopItemId: string }
  | { type: 'egg.opened'; eggTypeId: EggTypeId; rewardItemId: string; duplicate: boolean }
  | { type: 'world.block.placed'; x: number; y: number; z: number; blockItemId: string }
  | { type: 'world.block.removed'; x: number; y: number; z: number; blockItemId?: string }
  | { type: 'save.completed'; scope: 'player' | 'inventory' | 'world' | 'all' };
