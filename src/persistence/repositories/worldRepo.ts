import { db } from '../db';
import type { WorldState } from '../../domains/world/model';

export async function upsertWorld(world: WorldState): Promise<void> {
  await db.worlds.put(world);
}
