import { Dexie, type Table } from 'dexie';
import type { PlayerProfile } from '../domains/player/model';
import type { LessonSession } from '../domains/learning/model';
import type { InventoryState } from '../domains/inventory/model';
import type { WorldState } from '../domains/world/model';
import type { CurrencyTxn } from '../domains/economy/model';

export class GamoDB extends Dexie {
  player!: Table<PlayerProfile, string>;
  lessons!: Table<LessonSession, string>;
  inventory!: Table<InventoryState, string>;
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
      meta: 'key',
    });
  }
}

export const db = new GamoDB();
