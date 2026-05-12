import { createInitialWorld } from '../domains/world/service';
import type { InventoryState } from '../domains/inventory/model';
import type { PlayerProfile } from '../domains/player/model';
import { useAppStore } from '../app/store';

export const testPlayer: PlayerProfile = {
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

export const testInventory: InventoryState = {
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

export function resetAppStore(overrides?: {
  player?: Partial<PlayerProfile>;
  inventory?: Partial<InventoryState>;
}): void {
  useAppStore.setState({
    player: { ...testPlayer, ...overrides?.player },
    inventory: { ...testInventory, ...overrides?.inventory },
    world: createInitialWorld('player-1', 24, 24, 24),
    activeResourcePackId: 'cartoon-blocky-v1',
  });
}
