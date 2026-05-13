import type { InventoryItemKind, InventorySlot } from './model';

export type InventorySlotAddress = Pick<InventorySlot, 'area' | 'index'>;

function slotId(area: InventorySlot['area'], index: number): string {
  return `slot-${area}-${index}`;
}

function stackLimitForSlot(kind: InventoryItemKind): number {
  return kind === 'poster' ? 16 : 64;
}

function sameAddress(a: InventorySlotAddress, b: InventorySlotAddress): boolean {
  return a.area === b.area && a.index === b.index;
}

function withAddress(slot: InventorySlot, address: InventorySlotAddress): InventorySlot {
  return {
    ...slot,
    id: slotId(address.area, address.index),
    area: address.area,
    index: address.index,
  };
}

export function applyInventoryAction(
  slots: InventorySlot[],
  cursor: InventorySlot | null,
  targetArea: 'hotbar' | 'main',
  targetIndex: number,
  splitMode = false,
): { slots: InventorySlot[]; cursor: InventorySlot | null } {
  const next = slots.map((slot) => ({ ...slot }));
  const targetIdx = next.findIndex((slot) => slot.area === targetArea && slot.index === targetIndex);
  const target = targetIdx >= 0 ? next[targetIdx] : null;

  if (!cursor) {
    if (!target) return { slots: next, cursor: null };
    if (splitMode && target.count > 1) {
      const half = Math.floor(target.count / 2);
      next[targetIdx] = { ...target, count: target.count - half };
      return { slots: next, cursor: { ...target, count: half, id: `cursor-${target.itemId}` } };
    }
    next.splice(targetIdx, 1);
    return { slots: next, cursor: { ...target, id: `cursor-${target.itemId}` } };
  }

  if (!target) {
    const placed = splitMode && cursor.count > 1 ? 1 : cursor.count;
    next.push({ ...cursor, id: slotId(targetArea, targetIndex), area: targetArea, index: targetIndex, count: placed });
    const remaining = cursor.count - placed;
    return { slots: next, cursor: remaining > 0 ? { ...cursor, count: remaining } : null };
  }

  if (target.itemId === cursor.itemId && target.itemKind === cursor.itemKind) {
    const limit = stackLimitForSlot(target.itemKind);
    const moved = Math.min(limit - target.count, splitMode ? 1 : cursor.count);
    if (moved > 0) {
      next[targetIdx] = { ...target, count: target.count + moved };
      const remaining = cursor.count - moved;
      return { slots: next, cursor: remaining > 0 ? { ...cursor, count: remaining } : null };
    }
  }

  next[targetIdx] = { ...cursor, id: target.id, area: targetArea, index: targetIndex, count: splitMode ? 1 : cursor.count };
  const remaining = splitMode ? cursor.count - 1 : target.count;
  const nextCursor = splitMode
    ? (remaining > 0 ? { ...cursor, count: remaining } : null)
    : { ...target, id: `cursor-${target.itemId}` };
  return { slots: next, cursor: nextCursor };
}

export function moveInventoryStack(
  slots: InventorySlot[],
  sourceAddress: InventorySlotAddress,
  targetAddress: InventorySlotAddress,
): InventorySlot[] {
  if (sameAddress(sourceAddress, targetAddress)) {
    return slots.map((slot) => ({ ...slot }));
  }

  const source = slots.find((slot) => sameAddress(slot, sourceAddress));
  if (!source) {
    return slots.map((slot) => ({ ...slot }));
  }

  const target = slots.find((slot) => sameAddress(slot, targetAddress)) ?? null;
  const next = slots
    .filter((slot) => !sameAddress(slot, sourceAddress) && !sameAddress(slot, targetAddress))
    .map((slot) => ({ ...slot }));

  if (!target) {
    next.push(withAddress(source, targetAddress));
    return next;
  }

  if (target.itemKind === source.itemKind && target.itemId === source.itemId) {
    const limit = stackLimitForSlot(target.itemKind);
    const moved = Math.min(source.count, limit - target.count);
    if (moved <= 0) {
      return slots.map((slot) => ({ ...slot }));
    }

    next.push({ ...target, count: target.count + moved });
    const remaining = source.count - moved;
    if (remaining > 0) {
      next.push({ ...source, count: remaining });
    }
    return next;
  }

  next.push(withAddress(source, targetAddress));
  next.push(withAddress(target, sourceAddress));
  return next;
}

export function deleteInventoryStack(
  slots: InventorySlot[],
  sourceAddress: InventorySlotAddress,
): InventorySlot[] {
  return slots
    .filter((slot) => !sameAddress(slot, sourceAddress))
    .map((slot) => ({ ...slot }));
}

export function deleteCarriedInventoryStack(
  slots: InventorySlot[],
): { slots: InventorySlot[]; cursor: null } {
  return {
    slots: slots.map((slot) => ({ ...slot })),
    cursor: null,
  };
}
