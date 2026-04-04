import { db } from '../db';
import type { PlayerProfile } from '../../domains/player/model';

export async function upsertPlayer(player: PlayerProfile): Promise<void> {
  await db.player.put(player);
}

export async function getPlayer(playerId: string): Promise<PlayerProfile | undefined> {
  return db.player.get(playerId);
}