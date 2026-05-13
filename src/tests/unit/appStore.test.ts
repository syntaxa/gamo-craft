import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from '../../app/store';
import { createInitialWorld } from '../../domains/world/service';
import type { InventoryState } from '../../domains/inventory/model';
import type { PlayerProfile } from '../../domains/player/model';

const player: PlayerProfile = {
  id: 'player-1',
  nickname: 'Тестер',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  currencyCatCoins: 100,
  learning: {
    mathLevel: 'A',
    totalSolved: 0,
    totalCorrect: 0,
    currentStreak: 0,
    bestStreak: 0,
  },
};

const inventory: InventoryState = {
  playerId: 'player-1',
  resources: { block_brick_red: 24 },
  blocks: { block_brick_red: 24 },
  posters: {},
  cosmetics: {},
  slots: [
    {
      id: 'slot-hotbar-1',
      area: 'hotbar',
      index: 1,
      itemKind: 'block',
      itemId: 'block_brick_red',
      count: 24,
    },
  ],
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function resetStore(): void {
  useAppStore.setState({
    player,
    inventory,
    world: createInitialWorld('player-1', 24, 24, 24),
    activeResourcePackId: 'cartoon-blocky-v1',
  });
}

describe('app store economy and build invariants', () => {
  beforeEach(resetStore);

  it('does not allow cat coin balance to go below zero', () => {
    expect(useAppStore.getState().spendCatCoins(150)).toBe(false);
    expect(useAppStore.getState().player.currencyCatCoins).toBe(100);

    expect(useAppStore.getState().spendCatCoins(40)).toBe(true);
    expect(useAppStore.getState().player.currencyCatCoins).toBe(60);
  });

  it('keeps egg rewards in blocks without increasing resources', () => {
    useAppStore.getState().addBlockRewardItem('block_coin', 2);

    expect(useAppStore.getState().inventory.blocks.block_coin).toBe(2);
    expect(useAppStore.getState().inventory.resources.block_coin).toBeUndefined();
  });

  it('places and removes a block symmetrically across world and inventory', () => {
    const before = useAppStore.getState().inventory.blocks.block_brick_red;

    expect(useAppStore.getState().placeVoxel(1, 1, 1, 'block_brick_red')).toBe(true);
    expect(useAppStore.getState().inventory.blocks.block_brick_red).toBe(before - 1);
    expect(useAppStore.getState().inventory.resources.block_brick_red).toBe(before - 1);
    expect(useAppStore.getState().world.voxels).toContainEqual({ x: 1, y: 1, z: 1, blockId: 'block_brick_red' });

    expect(useAppStore.getState().removeVoxel(1, 1, 1)).toBe(true);
    expect(useAppStore.getState().inventory.blocks.block_brick_red).toBe(before);
    expect(useAppStore.getState().inventory.resources.block_brick_red).toBe(before);
    expect(useAppStore.getState().world.voxels).not.toContainEqual({ x: 1, y: 1, z: 1, blockId: 'block_brick_red' });
  });

  it('adds poster rewards into inventory slots and places posters from the hotbar like blocks', () => {
    useAppStore.getState().addPosterItem('poster_meme_cat_1', 2);

    expect(useAppStore.getState().inventory.posters.poster_meme_cat_1).toBe(2);
    expect(useAppStore.getState().inventory.slots).toContainEqual(
      expect.objectContaining({
        area: 'hotbar',
        itemKind: 'poster',
        itemId: 'poster_meme_cat_1',
        count: 2,
      }),
    );

    useAppStore.setState((state) => ({
      world: {
        ...state.world,
        voxels: [
          ...state.world.voxels,
          { x: 2, y: 1, z: 2, blockId: 'block_brick_red' },
        ],
      },
    }));

    expect(
      useAppStore.getState().placePoster({
        itemId: 'poster_meme_cat_1',
        anchor: { x: 3, y: 1, z: 2 },
        faceNormal: { x: 1, y: 0, z: 0 },
        widthBlocks: 2,
        heightBlocks: 2,
      }),
    ).toBe(true);

    expect(useAppStore.getState().inventory.posters.poster_meme_cat_1).toBe(1);
    expect(useAppStore.getState().world.posters).toContainEqual(
      expect.objectContaining({ itemId: 'poster_meme_cat_1', anchor: { x: 3, y: 1, z: 2 } }),
    );
  });

  it('removes a placed poster and returns it to poster inventory slots', () => {
    useAppStore.getState().addPosterItem('poster_meme_cat_1', 1);
    useAppStore.setState((state) => ({
      world: {
        ...state.world,
        voxels: [
          ...state.world.voxels,
          { x: 2, y: 1, z: 2, blockId: 'block_brick_red' },
        ],
      },
    }));

    expect(
      useAppStore.getState().placePoster({
        itemId: 'poster_meme_cat_1',
        anchor: { x: 3, y: 1, z: 2 },
        faceNormal: { x: 1, y: 0, z: 0 },
        widthBlocks: 2,
        heightBlocks: 2,
      }),
    ).toBe(true);

    const posterId = useAppStore.getState().world.posters[0].id;
    expect(useAppStore.getState().inventory.posters.poster_meme_cat_1).toBe(0);

    expect(useAppStore.getState().removePoster(posterId)).toBe(true);

    expect(useAppStore.getState().world.posters).toEqual([]);
    expect(useAppStore.getState().inventory.posters.poster_meme_cat_1).toBe(1);
    expect(useAppStore.getState().inventory.slots).toContainEqual(
      expect.objectContaining({
        itemKind: 'poster',
        itemId: 'poster_meme_cat_1',
        count: 1,
      }),
    );
  });

  it('overflows new rewards from full hotbar into main inventory slots', () => {
    const hotbarFull = Array.from({ length: 8 }, (_, idx) => ({
      id: `slot-hotbar-${idx + 1}`,
      area: 'hotbar' as const,
      index: idx + 1,
      itemKind: 'block' as const,
      itemId: `block_fill_${idx + 1}`,
      count: 64,
    }));

    useAppStore.setState((state) => ({
      inventory: {
        ...state.inventory,
        slots: hotbarFull,
        blocks: Object.fromEntries(hotbarFull.map((slot) => [slot.itemId, slot.count])),
        resources: Object.fromEntries(hotbarFull.map((slot) => [slot.itemId, slot.count])),
      },
    }));

    useAppStore.getState().addBlockRewardItem('block_coin', 3);

    expect(useAppStore.getState().inventory.slots).toContainEqual(
      expect.objectContaining({
        area: 'main',
        index: 0,
        itemKind: 'block',
        itemId: 'block_coin',
        count: 3,
      }),
    );
  });

  it('returns removed block to hotbar first when compatible stack exists', () => {
    useAppStore.setState((state) => ({
      inventory: {
        ...state.inventory,
        slots: [
          {
            id: 'slot-hotbar-1',
            area: 'hotbar',
            index: 1,
            itemKind: 'block',
            itemId: 'block_brick_red',
            count: 63,
          },
          {
            id: 'slot-main-0',
            area: 'main',
            index: 0,
            itemKind: 'block',
            itemId: 'block_brick_red',
            count: 10,
          },
        ],
        blocks: { block_brick_red: 73 },
        resources: { block_brick_red: 73 },
      },
      world: {
        ...state.world,
        voxels: [{ x: 5, y: 1, z: 5, blockId: 'block_brick_red' }],
      },
    }));

    expect(useAppStore.getState().removeVoxel(5, 1, 5)).toBe(true);

    expect(useAppStore.getState().inventory.slots).toContainEqual(
      expect.objectContaining({
        area: 'hotbar',
        index: 1,
        itemKind: 'block',
        itemId: 'block_brick_red',
        count: 64,
      }),
    );
  });

  it('recalculates item totals when inventory slots are reassigned', () => {
    const store = useAppStore.getState() as ReturnType<typeof useAppStore.getState> & {
      setInventorySlots?: (slots: InventoryState['slots']) => void;
    };

    expect(store.setInventorySlots).toBeTypeOf('function');

    store.setInventorySlots?.([
      {
        id: 'slot-hotbar-1',
        area: 'hotbar',
        index: 1,
        itemKind: 'block',
        itemId: 'block_brick_red',
        count: 7,
      },
      {
        id: 'slot-main-0',
        area: 'main',
        index: 0,
        itemKind: 'poster',
        itemId: 'poster_meme_cat_1',
        count: 2,
      },
    ]);

    expect(useAppStore.getState().inventory.blocks).toEqual({ block_brick_red: 7 });
    expect(useAppStore.getState().inventory.resources).toEqual({ block_brick_red: 7 });
    expect(useAppStore.getState().inventory.posters).toEqual({ poster_meme_cat_1: 2 });
  });

  it('does not place a block without inventory or outside world bounds', () => {
    expect(useAppStore.getState().placeVoxel(1, 1, 1, 'block_glass')).toBe(false);
    expect(useAppStore.getState().placeVoxel(24, 1, 1, 'block_brick_red')).toBe(false);
    expect(useAppStore.getState().inventory.blocks.block_brick_red).toBe(24);
  });
});
