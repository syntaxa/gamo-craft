import { describe, expect, it } from 'vitest';
import type { InventorySlot } from '../../domains/inventory/model';
import {
  applyInventoryAction,
  deleteCarriedInventoryStack,
  deleteInventoryStack,
  moveInventoryStack,
} from '../../domains/inventory/slotActions';

const slots: InventorySlot[] = [
  {
    id: 'slot-hotbar-1',
    area: 'hotbar',
    index: 1,
    itemKind: 'block',
    itemId: 'block_brick_red',
    count: 12,
  },
  {
    id: 'slot-main-0',
    area: 'main',
    index: 0,
    itemKind: 'block',
    itemId: 'block_glass',
    count: 8,
  },
];

describe('inventory slot actions', () => {
  it('moves a dragged stack from main inventory into an empty hotbar slot', () => {
    const result = moveInventoryStack(slots, { area: 'main', index: 0 }, { area: 'hotbar', index: 2 });

    expect(result).toContainEqual(
      expect.objectContaining({
        area: 'hotbar',
        index: 2,
        itemId: 'block_glass',
        count: 8,
      }),
    );
    expect(result.some((slot) => slot.area === 'main' && slot.index === 0)).toBe(false);
  });

  it('swaps dragged stacks between inventory and hotbar', () => {
    const result = moveInventoryStack(slots, { area: 'main', index: 0 }, { area: 'hotbar', index: 1 });

    expect(result).toContainEqual(
      expect.objectContaining({
        area: 'hotbar',
        index: 1,
        itemId: 'block_glass',
        count: 8,
      }),
    );
    expect(result).toContainEqual(
      expect.objectContaining({
        area: 'main',
        index: 0,
        itemId: 'block_brick_red',
        count: 12,
      }),
    );
  });

  it('merges a dragged stack into a compatible stack and leaves overflow in the source slot', () => {
    const result = moveInventoryStack(
      [
        ...slots,
        {
          id: 'slot-main-1',
          area: 'main',
          index: 1,
          itemKind: 'block',
          itemId: 'block_brick_red',
          count: 60,
        },
      ],
      { area: 'hotbar', index: 1 },
      { area: 'main', index: 1 },
    );

    expect(result).toContainEqual(
      expect.objectContaining({
        area: 'main',
        index: 1,
        itemId: 'block_brick_red',
        count: 64,
      }),
    );
    expect(result).toContainEqual(
      expect.objectContaining({
        area: 'hotbar',
        index: 1,
        itemId: 'block_brick_red',
        count: 8,
      }),
    );
  });

  it('keeps right-click split cursor visible as a carried partial stack', () => {
    const result = applyInventoryAction(slots, null, 'hotbar', 1, true);

    expect(result.cursor).toEqual(
      expect.objectContaining({
        itemId: 'block_brick_red',
        count: 6,
      }),
    );
    expect(result.slots).toContainEqual(
      expect.objectContaining({
        area: 'hotbar',
        index: 1,
        itemId: 'block_brick_red',
        count: 6,
      }),
    );
  });

  it('removes a stack when it is confirmed in the delete slot', () => {
    const result = deleteInventoryStack(slots, { area: 'main', index: 0 });

    expect(result.some((slot) => slot.area === 'main' && slot.index === 0)).toBe(false);
    expect(result).toContainEqual(
      expect.objectContaining({
        area: 'hotbar',
        index: 1,
        itemId: 'block_brick_red',
      }),
    );
  });

  it('destroys a carried cursor stack without changing placed slots', () => {
    const result = deleteCarriedInventoryStack(slots);

    expect(result.cursor).toBeNull();
    expect(result.slots).toEqual(slots);
  });
});
