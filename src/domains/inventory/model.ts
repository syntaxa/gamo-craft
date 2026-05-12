import type { ItemId, PlayerId } from '../../shared/types/common';

export type InventoryItemKind = 'block' | 'poster' | 'resource' | 'cosmetic';

export interface InventorySlot {
  id: string;
  area: 'hotbar' | 'main';
  index: number;
  itemKind: InventoryItemKind;
  itemId: ItemId;
  count: number;
}

export interface InventoryState {
  playerId: PlayerId;
  resources: Record<ItemId, number>;
  blocks: Record<ItemId, number>;
  posters: Record<ItemId, number>;
  cosmetics: Record<ItemId, number>;
  slots: InventorySlot[];
  updatedAt: string;
}
