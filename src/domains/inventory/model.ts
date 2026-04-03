import type { ItemId, PlayerId } from '../../shared/types/common';

export interface InventoryState {
  playerId: PlayerId;
  resources: Record<ItemId, number>;
  blocks: Record<ItemId, number>;
  cosmetics: Record<ItemId, number>;
  updatedAt: string;
}
