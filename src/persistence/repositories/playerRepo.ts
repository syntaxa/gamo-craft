import { db } from '../db';
import type { PlayerProfile } from '../../domains/player/model';

export async function upsertPlayer(player: PlayerProfile): Promise<void> {
  await db.player.put(player);
}
