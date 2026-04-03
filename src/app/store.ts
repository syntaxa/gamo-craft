import { create } from 'zustand';
import type { PlayerProfile } from '../domains/player/model';
import type { InventoryState } from '../domains/inventory/model';
import type { WorldCell, WorldState } from '../domains/world/model';
import { createInitialWorld } from '../domains/world/service';

interface AppState {
  player: PlayerProfile;
  inventory: InventoryState;
  world: WorldState;
  addCatCoins: (amount: number) => void;
  spendCatCoins: (amount: number) => boolean;
  addInventoryItem: (itemId: string, count: number) => void;
  consumeBlockItem: (itemId: string, count?: number) => boolean;
  placeVoxel: (x: number, y: number, z: number, blockId: string) => boolean;
  removeVoxel: (x: number, y: number, z: number) => boolean;
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
  resources: { res_wood: 25, block_brick_red: 25 },
  blocks: { block_brick_red: 25 },
  cosmetics: {},
  updatedAt: new Date().toISOString(),
};

function inBounds(world: WorldState, x: number, y: number, z: number): boolean {
  return x >= 0 && y >= 0 && z >= 0 && x < world.sizeX && y < world.sizeY && z < world.sizeZ;
}

function voxelIndex(voxels: WorldCell[], x: number, y: number, z: number): number {
  return voxels.findIndex((v) => v.x === x && v.y === y && v.z === z);
}

export const useAppStore = create<AppState>((set, get) => ({
  player: initialPlayer,
  inventory: initialInventory,
  world: createInitialWorld('player-1', 24, 12, 24),

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
      inventory: {
        ...state.inventory,
        resources: {
          ...state.inventory.resources,
          [itemId]: (state.inventory.resources[itemId] ?? 0) + count,
        },
        blocks: {
          ...state.inventory.blocks,
          [itemId]: (state.inventory.blocks[itemId] ?? 0) + count,
        },
        updatedAt: new Date().toISOString(),
      },
    })),

  consumeBlockItem: (itemId, count = 1) => {
    let ok = false;
    set((state) => {
      const current = state.inventory.blocks[itemId] ?? 0;
      if (count <= 0 || current < count) return state;
      ok = true;
      return {
        inventory: {
          ...state.inventory,
          blocks: {
            ...state.inventory.blocks,
            [itemId]: current - count,
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
      next.splice(idx, 1);
      return {
        world: {
          ...state.world,
          voxels: next,
          updatedAt: new Date().toISOString(),
        },
      };
    });
    return true;
  },
}));
