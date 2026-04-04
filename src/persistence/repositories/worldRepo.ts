import { db } from '../db';
import type { WorldState } from '../../domains/world/model';

export async function upsertWorld(world: WorldState): Promise<void> {
  await db.worlds.put(world);
}

export async function getLatestWorld(playerId: string): Promise<WorldState | undefined> {
  const worlds = await db.worlds.where('playerId').equals(playerId).toArray();
  if (worlds.length === 0) return undefined;

  worlds.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  return worlds[worlds.length - 1];
}