import { Dexie, type Table } from 'dexie';
import type { PlayerProfile } from '../domains/player/model';
import type { LessonSession } from '../domains/learning/model';
import type { InventoryState } from '../domains/inventory/model';
import type { WorldState } from '../domains/world/model';
import type { CurrencyTxn } from '../domains/economy/model';
import { createDefaultPlayerTransform } from '../domains/world/service';
import { DB_VERSION } from './schema';

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

    this.version(DB_VERSION)
      .stores({
        player: 'id, updatedAt',
        lessons: 'id, playerId, programId, startedAt, finishedAt',
        inventory: 'playerId, updatedAt',
        worlds: 'id, playerId, updatedAt',
        txns: 'id, playerId, type, createdAt',
        meta: 'key',
      })
      .upgrade(async (tx) => {
        await tx
          .table('worlds')
          .toCollection()
          .modify((world) => {
            const typedWorld = world as WorldState;
            if (!typedWorld.playerTransform) {
              typedWorld.playerTransform = createDefaultPlayerTransform();
            }
          });

        await tx.table('meta').put({
          key: 'storageSchemaVersion',
          value: String(DB_VERSION),
        });
      });
  }
}

export const db = new GamoDB();
