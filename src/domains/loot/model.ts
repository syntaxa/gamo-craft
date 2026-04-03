import type { EggTypeId, ItemId } from '../../shared/types/common';

export interface EggType {
  id: EggTypeId;
  priceCatCoins: number;
  lootTableId: string;
}

export interface LootEntry {
  itemId: ItemId;
  weight: number;
  duplicateCompensationCatCoins: number;
}
