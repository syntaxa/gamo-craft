import type { InventoryState } from './model';

export function hasResource(inv: InventoryState, itemId: string): boolean {
  return (inv.resources[itemId] ?? 0) > 0 || (inv.blocks[itemId] ?? 0) > 0;
}
