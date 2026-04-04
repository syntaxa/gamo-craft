import { create } from 'zustand';
import type { PlayerProfile } from '../domains/player/model';
import type { InventoryState } from '../domains/inventory/model';
import type { WorldCell, WorldState } from '../domains/world/model';
import { createInitialWorld } from '../domains/world/service';
import { defaultResourcePackId, resourcePackRegistry } from '../theme/resourcePacks';

interface AppState {
  player: PlayerProfile;
  inventory: InventoryState;
  world: WorldState;
  activeResourcePackId: string;
  setActiveResourcePack: (packId: string) => void;
  addCatCoins: (amount: number) => void;
  spendCatCoins: (amount: number) => boolean;
  addInventoryItem: (itemId: string, count: number) => void;
  addBlockRewardItem: (itemId: string, count: number) => void;
  consumeBlockItem: (itemId: string, count?: number) => boolean;
  placeVoxel: (x: number, y: number, z: number, blockId: string) => boolean;
  removeVoxel: (x: number, y: number, z: number) => boolean;
}

function isBlockItem(itemId: string): boolean {
  return itemId.startsWith('block_') || itemId === 'res_planks';
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
  cosmetics: {},
  updatedAt: new Date().toISOString(),
};

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
    set((state) => ({
      inventory: (() => {
        const nextResources = {
          ...state.inventory.resources,
          [itemId]: (state.inventory.resources[itemId] ?? 0) + count,
        };

        const nextBlocks = { ...state.inventory.blocks };
        if (isBlockItem(itemId)) {
          nextBlocks[itemId] = (state.inventory.blocks[itemId] ?? 0) + count;
        }

        return {
          ...state.inventory,
          resources: nextResources,
          blocks: nextBlocks,
          updatedAt: new Date().toISOString(),
        };
      })(),
    })),

  addBlockRewardItem: (itemId, count) =>
    set((state) => {
      const nextBlocks = { ...state.inventory.blocks };
      if (isBlockItem(itemId)) {
        nextBlocks[itemId] = (state.inventory.blocks[itemId] ?? 0) + count;
      }

      return {
        inventory: {
          ...state.inventory,
          blocks: nextBlocks,
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  consumeBlockItem: (itemId, count = 1) => {
    let ok = false;
    set((state) => {
      const current = state.inventory.blocks[itemId] ?? 0;
      if (count <= 0 || current < count) return state;
      ok = true;
      const nextResourceCount = Math.max(0, (state.inventory.resources[itemId] ?? 0) - count);
      return {
        inventory: {
          ...state.inventory,
          blocks: {
            ...state.inventory.blocks,
            [itemId]: current - count,
          },
          resources: {
            ...state.inventory.resources,
            [itemId]: nextResourceCount,
          },
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
        ...state.world,
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
      const next = [...state.world.voxels];
      const [removed] = next.splice(idx, 1);
      const removedBlockId = removed?.blockId ?? null;

      const nextBlocks = { ...state.inventory.blocks };
      const nextResources = { ...state.inventory.resources };

      if (removedBlockId) {
        nextBlocks[removedBlockId] = (nextBlocks[removedBlockId] ?? 0) + 1;
        nextResources[removedBlockId] = (nextResources[removedBlockId] ?? 0) + 1;
      }

      return {
        world: {
          ...state.world,
          voxels: next,
          updatedAt: new Date().toISOString(),
        },
        inventory: {
          ...state.inventory,
          blocks: nextBlocks,
          resources: nextResources,
          updatedAt: new Date().toISOString(),
        },
      };
    });
    return true;
  },
}));

