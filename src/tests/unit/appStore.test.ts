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
  cosmetics: {},
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

  it('does not place a block without inventory or outside world bounds', () => {
    expect(useAppStore.getState().placeVoxel(1, 1, 1, 'block_glass')).toBe(false);
    expect(useAppStore.getState().placeVoxel(24, 1, 1, 'block_brick_red')).toBe(false);
    expect(useAppStore.getState().inventory.blocks.block_brick_red).toBe(24);
  });
});
