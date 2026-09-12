import { create } from 'zustand';
import type { PlayerProfile } from '../domains/player/model';
import type { InventoryItemKind, InventorySlot, InventoryState } from '../domains/inventory/model';
import type { PlayerPhysicsState, PlayerTransformState, PosterPlacement, WorldCell, WorldState } from '../domains/world/model';
import {
  canPlacePoster,
  createDefaultPlayerPhysics,
  createDefaultPlayerTransform,
  createInitialWorld,
  placePosterInWorld,
} from '../domains/world/service';
import { defaultResourcePackId, resourcePackRegistry } from '../theme/resourcePacks';
import posterItemsCatalog from '../content/catalogs/items.posters.v1.json';
import type { AppSave } from '../persistence/saveFile';

interface AppState {
  player: PlayerProfile;
  inventory: InventoryState;
  world: WorldState;
  activeResourcePackId: string;
  setActiveResourcePack: (packId: string) => void;
  addCatCoins: (amount: number) => void;
  spendCatCoins: (amount: number) => boolean;
  addInventoryItem: (itemId: string, count: number) => void;
  addBlockRewardItem: (itemId: string, count: number) => boolean;
  addPosterItem: (itemId: string, count: number) => boolean;
  consumeBlockItem: (itemId: string, count?: number) => boolean;
  consumePosterItem: (itemId: string, count?: number) => boolean;
  placeVoxel: (x: number, y: number, z: number, blockId: string) => boolean;
  removeVoxel: (x: number, y: number, z: number) => boolean;
  placePoster: (placement: Omit<PosterPlacement, 'id'>) => boolean;
  removePoster: (posterId: string) => boolean;
  setPlayerTransform: (playerTransform: PlayerTransformState) => void;
  setPlayerPhysics: (playerPhysics: PlayerPhysicsState) => void;
  setInventorySlots: (slots: InventorySlot[]) => void;
  restoreSave: (save: AppSave) => void;
}

const POSTER_ITEM_IDS = new Set(posterItemsCatalog.items.map((item) => item.id));
const HOTBAR_INVENTORY_SLOT_COUNT = 8;
const MAIN_INVENTORY_SLOT_COUNT = 27;

function isBlockItem(itemId: string): boolean {
  return itemId.startsWith('block_') || itemId === 'res_planks';
}

function isPosterItem(itemId: string): boolean {
  return POSTER_ITEM_IDS.has(itemId);
}

function stackLimitFor(itemKind: InventoryItemKind, itemId: string): number {
  if (itemKind === 'poster') {
    return posterItemsCatalog.items.find((item) => item.id === itemId)?.stackLimit ?? 16;
  }

  return 64;
}

function sortSlots(slots: InventorySlot[]): InventorySlot[] {
  return [...slots].sort((a, b) => {
    if (a.area !== b.area) return a.area === 'hotbar' ? -1 : 1;
    return a.index - b.index;
  });
}

function sumItemCount(slots: InventorySlot[], itemKind: InventoryItemKind, itemId: string): number {
  return slots
    .filter((slot) => slot.itemKind === itemKind && slot.itemId === itemId)
    .reduce((acc, slot) => acc + slot.count, 0);
}

function findFreeSlot(slots: InventorySlot[]): Pick<InventorySlot, 'area' | 'index'> | null {
  for (let index = 1; index <= HOTBAR_INVENTORY_SLOT_COUNT; index += 1) {
    if (!slots.some((slot) => slot.area === 'hotbar' && slot.index === index)) {
      return { area: 'hotbar', index };
    }
  }

  for (let index = 0; index < MAIN_INVENTORY_SLOT_COUNT; index += 1) {
    if (!slots.some((slot) => slot.area === 'main' && slot.index === index)) {
      return { area: 'main', index };
    }
  }

  return null;
}

function addToSlots(
  slots: InventorySlot[],
  itemKind: InventoryItemKind,
  itemId: string,
  count: number,
  preferredArea: 'hotbar' | 'main' | null = null,
): InventorySlot[] {
  let remaining = count;
  const limit = stackLimitFor(itemKind, itemId);
  const nextSlots = sortSlots(slots).map((slot) => ({ ...slot }));

  const mergeOrder = preferredArea
    ? [
        ...nextSlots.filter((slot) => slot.area === preferredArea),
        ...nextSlots.filter((slot) => slot.area !== preferredArea),
      ]
    : nextSlots;

  for (const slot of mergeOrder) {
    if (remaining <= 0) break;
    if (slot.itemKind !== itemKind || slot.itemId !== itemId || slot.count >= limit) continue;

    const addable = Math.min(remaining, limit - slot.count);
    slot.count += addable;
    remaining -= addable;
  }

  while (remaining > 0) {
    const freeSlot = findFreeSlot(nextSlots);
    if (!freeSlot) break;

    const nextCount = Math.min(remaining, limit);
    nextSlots.push({
      id: `slot-${freeSlot.area}-${freeSlot.index}`,
      area: freeSlot.area,
      index: freeSlot.index,
      itemKind,
      itemId,
      count: nextCount,
    });
    remaining -= nextCount;
  }

  return sortSlots(nextSlots);
}

function consumeFromSlots(
  slots: InventorySlot[],
  itemKind: InventoryItemKind,
  itemId: string,
  count: number,
): InventorySlot[] | null {
  const available = slots
    .filter((slot) => slot.itemKind === itemKind && slot.itemId === itemId)
    .reduce((acc, slot) => acc + slot.count, 0);

  if (count <= 0 || available < count) return null;

  let remaining = count;
  const nextSlots: InventorySlot[] = [];
  for (const slot of sortSlots(slots)) {
    if (remaining > 0 && slot.itemKind === itemKind && slot.itemId === itemId) {
      const consumed = Math.min(remaining, slot.count);
      remaining -= consumed;
      const nextCount = slot.count - consumed;
      if (nextCount > 0) {
        nextSlots.push({ ...slot, count: nextCount });
      }
      continue;
    }

    nextSlots.push(slot);
  }

  return nextSlots;
}

function seedInitialSlots(): InventorySlot[] {
  return [
    {
      id: 'slot-hotbar-1',
      area: 'hotbar',
      index: 1,
      itemKind: 'block',
      itemId: 'block_brick_red',
      count: 24,
    },
  ];
}

const initialPlayer: PlayerProfile = {
  id: 'player-1',
  nickname: 'Игрок',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  currencyCatCoins: 100,
  learning: {
    mathLevel: 'A',
    totalSolved: 0,
    totalCorrect: 0,
    currentStreak: 0,
    bestStreak: 0,
  },
};

const initialInventory: InventoryState = {
  playerId: 'player-1',
  resources: { block_brick_red: 24 },
  blocks: { block_brick_red: 24 },
  posters: {},
  cosmetics: {},
  slots: seedInitialSlots(),
  updatedAt: new Date().toISOString(),
};

function recalculateInventoryFromSlots(inventory: InventoryState, slots: InventorySlot[]): InventoryState {
  const nextSlots = sortSlots(slots.filter((slot) => slot.count > 0).map((slot) => ({ ...slot })));
  const blocks: Record<string, number> = {};
  const posters: Record<string, number> = {};

  for (const slot of nextSlots) {
    if (slot.itemKind === 'block') {
      blocks[slot.itemId] = (blocks[slot.itemId] ?? 0) + slot.count;
    } else if (slot.itemKind === 'poster') {
      posters[slot.itemId] = (posters[slot.itemId] ?? 0) + slot.count;
    }
  }

  return {
    ...inventory,
    resources: blocks,
    blocks,
    posters,
    slots: nextSlots,
    updatedAt: new Date().toISOString(),
  };
}

function inBounds(world: WorldState, x: number, y: number, z: number): boolean {
  return x >= 0 && y >= 0 && z >= 0 && x < world.sizeX && y < world.sizeY && z < world.sizeZ;
}

function voxelIndex(voxels: WorldCell[], x: number, y: number, z: number): number {
  return voxels.findIndex((v) => v.x === x && v.y === y && v.z === z);
}

const WORLD_SIZE_X = 24;
const WORLD_SIZE_Y = 24;
const WORLD_SIZE_Z = 24;

export const useAppStore = create<AppState>((set, get) => ({
  player: initialPlayer,
  inventory: initialInventory,
  world: createInitialWorld('player-1', WORLD_SIZE_X, WORLD_SIZE_Y, WORLD_SIZE_Z),
  activeResourcePackId: defaultResourcePackId,

  setActiveResourcePack: (packId) =>
    set(() => ({
      activeResourcePackId: resourcePackRegistry[packId] ? packId : defaultResourcePackId,
    })),

  addCatCoins: (amount) =>
    set((state) => ({
      player: {
        ...state.player,
        currencyCatCoins: state.player.currencyCatCoins + Math.max(0, amount),
        updatedAt: new Date().toISOString(),
      },
    })),

  spendCatCoins: (amount) => {
    let ok = false;
    set((state) => {
      if (amount <= 0 || state.player.currencyCatCoins < amount) return state;
      ok = true;
      return {
        player: {
          ...state.player,
          currencyCatCoins: state.player.currencyCatCoins - amount,
          updatedAt: new Date().toISOString(),
        },
      };
    });
    return ok;
  },

  addInventoryItem: (itemId, count) =>
    set((state) => {
      const itemKind: InventoryItemKind = isBlockItem(itemId) ? 'block' : 'resource';
      const nextResources = {
        ...state.inventory.resources,
        [itemId]: (state.inventory.resources[itemId] ?? 0) + count,
      };

      const nextBlocks = { ...state.inventory.blocks };
      if (itemKind === 'block') {
        nextBlocks[itemId] = (state.inventory.blocks[itemId] ?? 0) + count;
      }

      return {
        inventory: {
          ...normalizeInventoryState(state.inventory),
          resources: nextResources,
          blocks: nextBlocks,
          slots: addToSlots(normalizeInventoryState(state.inventory).slots, itemKind, itemId, count),
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  addBlockRewardItem: (itemId, count) => {
    let ok = false;
    set((state) => {
      if (!isBlockItem(itemId)) return state;
      const inventory = normalizeInventoryState(state.inventory);
      const before = sumItemCount(inventory.slots, 'block', itemId);
      const nextSlots = addToSlots(inventory.slots, 'block', itemId, count);
      ok = before + count <= sumItemCount(nextSlots, 'block', itemId);
      const nextBlockCount = ok ? (inventory.blocks[itemId] ?? 0) + count : (inventory.blocks[itemId] ?? 0);

      return {
        inventory: {
          ...inventory,
          blocks: {
            ...inventory.blocks,
            [itemId]: nextBlockCount,
          },
          slots: nextSlots,
          updatedAt: new Date().toISOString(),
        },
      };
    });
    return ok;
  },

  addPosterItem: (itemId, count) => {
    let ok = false;
    set((state) => {
      if (!isPosterItem(itemId)) return state;
      const inventory = normalizeInventoryState(state.inventory);
      const before = sumItemCount(inventory.slots, 'poster', itemId);
      const nextSlots = addToSlots(inventory.slots, 'poster', itemId, count);
      ok = before + count <= sumItemCount(nextSlots, 'poster', itemId);
      const nextPosterCount = ok ? (inventory.posters[itemId] ?? 0) + count : (inventory.posters[itemId] ?? 0);

      return {
        inventory: {
          ...inventory,
          posters: {
            ...inventory.posters,
            [itemId]: nextPosterCount,
          },
          slots: nextSlots,
          updatedAt: new Date().toISOString(),
        },
      };
    });
    return ok;
  },

  consumeBlockItem: (itemId, count = 1) => {
    let ok = false;
    set((state) => {
      const inventory = normalizeInventoryState(state.inventory);
      const current = inventory.blocks[itemId] ?? 0;
      const nextSlots = consumeFromSlots(inventory.slots, 'block', itemId, count);
      if (count <= 0 || current < count || !nextSlots) return state;
      ok = true;
      const nextResourceCount = Math.max(0, (inventory.resources[itemId] ?? 0) - count);
      return {
        inventory: {
          ...inventory,
          blocks: {
            ...inventory.blocks,
            [itemId]: current - count,
          },
          resources: {
            ...inventory.resources,
            [itemId]: nextResourceCount,
          },
          slots: nextSlots,
          updatedAt: new Date().toISOString(),
        },
      };
    });
    return ok;
  },

  consumePosterItem: (itemId, count = 1) => {
    let ok = false;
    set((state) => {
      const inventory = normalizeInventoryState(state.inventory);
      const current = inventory.posters[itemId] ?? 0;
      const nextSlots = consumeFromSlots(inventory.slots, 'poster', itemId, count);
      if (count <= 0 || current < count || !nextSlots) return state;
      ok = true;
      return {
        inventory: {
          ...inventory,
          posters: {
            ...inventory.posters,
            [itemId]: current - count,
          },
          slots: nextSlots,
          updatedAt: new Date().toISOString(),
        },
      };
    });
    return ok;
  },

  placeVoxel: (x, y, z, blockId) => {
    const { world, consumeBlockItem } = get();
    if (!inBounds(world, x, y, z)) return false;
    if (voxelIndex(world.voxels, x, y, z) !== -1) return false;
    if (!consumeBlockItem(blockId, 1)) return false;

    set((state) => ({
      world: {
        ...normalizeWorldState(state.world),
        voxels: [...state.world.voxels, { x, y, z, blockId }],
        updatedAt: new Date().toISOString(),
      },
    }));
    return true;
  },

  removeVoxel: (x, y, z) => {
    const { world } = get();
    const idx = voxelIndex(world.voxels, x, y, z);
    if (idx === -1) return false;
    set((state) => {
      const inventory = normalizeInventoryState(state.inventory);
      const next = [...state.world.voxels];
      const [removed] = next.splice(idx, 1);
      const removedBlockId = removed?.blockId ?? null;

      let nextInventory = inventory;
      if (removedBlockId) {
        nextInventory = {
          ...inventory,
          blocks: {
            ...inventory.blocks,
            [removedBlockId]: (inventory.blocks[removedBlockId] ?? 0) + 1,
          },
          resources: {
            ...inventory.resources,
            [removedBlockId]: (inventory.resources[removedBlockId] ?? 0) + 1,
          },
          slots: addToSlots(inventory.slots, 'block', removedBlockId, 1, 'hotbar'),
          updatedAt: new Date().toISOString(),
        };
      }

      return {
        world: {
          ...normalizeWorldState(state.world),
          voxels: next,
          updatedAt: new Date().toISOString(),
        },
        inventory: nextInventory,
      };
    });
    return true;
  },

  placePoster: (placement) => {
    const { world, consumePosterItem } = get();
    const normalizedWorld = normalizeWorldState(world);
    if (!canPlacePoster(normalizedWorld, placement)) return false;
    if (!consumePosterItem(placement.itemId, 1)) return false;

    set(() => ({
      world: placePosterInWorld(normalizedWorld, placement),
    }));
    return true;
  },

  removePoster: (posterId) => {
    let ok = false;
    set((state) => {
      const world = normalizeWorldState(state.world);
      const poster = world.posters.find((item) => item.id === posterId);
      if (!poster) return state;

      ok = true;
      const inventory = normalizeInventoryState(state.inventory);

      return {
        world: {
          ...world,
          posters: world.posters.filter((item) => item.id !== posterId),
          updatedAt: new Date().toISOString(),
        },
        inventory: {
          ...inventory,
          posters: {
            ...inventory.posters,
            [poster.itemId]: (inventory.posters[poster.itemId] ?? 0) + 1,
          },
          slots: addToSlots(inventory.slots, 'poster', poster.itemId, 1),
          updatedAt: new Date().toISOString(),
        },
      };
    });
    return ok;
  },

  setPlayerTransform: (playerTransform) =>
    set((state) => ({
      world: {
        ...normalizeWorldState(state.world),
        playerTransform,
        updatedAt: new Date().toISOString(),
      },
    })),

  setPlayerPhysics: (playerPhysics) =>
    set((state) => ({
      world: {
        ...normalizeWorldState(state.world),
        playerPhysics,
        updatedAt: new Date().toISOString(),
      },
    })),

  setInventorySlots: (slots) =>
    set((state) => ({
      inventory: recalculateInventoryFromSlots(normalizeInventoryState(state.inventory), slots),
    })),

  restoreSave: (save) =>
    set(() => ({
      player: save.player,
      inventory: normalizeInventoryState(save.inventory),
      world: normalizeWorldState(save.world),
    })),
}));

export function normalizeInventoryState(inventory: InventoryState): InventoryState {
  const normalized = {
    ...inventory,
    posters: inventory.posters ?? {},
    slots: inventory.slots ?? [],
  };

  if (normalized.slots.length > 0) {
    return normalized;
  }

  let slots: InventorySlot[] = [];
  for (const [itemId, count] of Object.entries(normalized.blocks)) {
    if (count > 0) {
      slots = addToSlots(slots, 'block', itemId, count);
    }
  }
  for (const [itemId, count] of Object.entries(normalized.posters)) {
    if (count > 0) {
      slots = addToSlots(slots, 'poster', itemId, count);
    }
  }

  return {
    ...normalized,
    slots,
  };
}

export function normalizeWorldState(world: WorldState): WorldState {
  return {
    ...world,
    posters: world.posters ?? [],
    playerTransform: world.playerTransform ?? createDefaultPlayerTransform(),
    playerPhysics: world.playerPhysics ?? createDefaultPlayerPhysics(),
  };
}
