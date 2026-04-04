import { db } from '../db';
import type { InventoryState } from '../../domains/inventory/model';

export async function upsertInventory(inventory: InventoryState): Promise<void> {
  await db.inventory.put(inventory);
}

export async function getInventory(playerId: string): Promise<InventoryState | undefined> {
  return db.inventory.get(playerId);
}