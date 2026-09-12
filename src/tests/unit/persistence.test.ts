import { describe, expect, it, vi } from 'vitest';
import { createInitialWorld } from '../../domains/world/service';
import type { InventoryState } from '../../domains/inventory/model';
import type { PlayerProfile } from '../../domains/player/model';
import {
  copyLocalAppSnapshotToClipboard,
  readLocalAppSnapshot,
  writeLocalAppSnapshot,
} from '../../persistence/localSnapshot';

function makeSnapshot(worldId = 'world-1') {
  const player: PlayerProfile = {
    id: 'player-1',
    nickname: 'Тестер',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    currencyCatCoins: 10,
    learning: {
      mathLevel: 'A',
      totalSolved: 0,
      totalCorrect: 0,
      currentStreak: 0,
      bestStreak: 0,
    },
  };
  const inventory: InventoryState = {
    playerId: player.id,
    resources: { block_brick_red: 1 },
    blocks: { block_brick_red: 1 },
    posters: {},
    cosmetics: {},
    slots: [
      {
        id: 'slot-hotbar-1',
        area: 'hotbar',
        index: 1,
        itemKind: 'block',
        itemId: 'block_brick_red',
        count: 1,
      },
    ],
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  const world = { ...createInitialWorld(player.id, 2, 4, 2), id: worldId };

  return { player, inventory, world };
}

describe('LocalStorage app snapshot', () => {
  it('writes and reads player, inventory and world together', () => {
    const snapshot = makeSnapshot();

    writeLocalAppSnapshot(snapshot);

    expect(readLocalAppSnapshot()).toMatchObject({
      player: snapshot.player,
      inventory: snapshot.inventory,
      world: snapshot.world,
    });
  });

  it('ignores broken JSON snapshots', () => {
    window.localStorage.setItem('gamo:app-snapshot:v1', '{broken');

    expect(readLocalAppSnapshot()).toBeUndefined();
  });

  it('rescues a valuable built world from being overwritten by a fresh starter world', () => {
    const built = makeSnapshot('built-world');
    built.world.voxels.push({ x: 1, y: 1, z: 1, blockId: 'block_brick_red' });
    writeLocalAppSnapshot(built);

    const starter = makeSnapshot('starter-world');
    writeLocalAppSnapshot(starter);

    expect(readLocalAppSnapshot()?.world.id).toBe('built-world');
    expect(readLocalAppSnapshot()?.world.voxels).toContainEqual({ x: 1, y: 1, z: 1, blockId: 'block_brick_red' });
  });

  it('writes the current snapshot and copies the same state JSON to the clipboard for debugging', async () => {
    const snapshot = makeSnapshot('debug-world');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const json = await copyLocalAppSnapshotToClipboard(snapshot, '2026-05-17T10:00:00.000Z');

    expect(JSON.parse(json)).toMatchObject({
      player: snapshot.player,
      inventory: snapshot.inventory,
      world: snapshot.world,
      savedAt: '2026-05-17T10:00:00.000Z',
    });
    expect(readLocalAppSnapshot()).toMatchObject({
      player: snapshot.player,
      inventory: snapshot.inventory,
      world: snapshot.world,
      savedAt: '2026-05-17T10:00:00.000Z',
    });
    expect(writeText).toHaveBeenCalledWith(json);
  });
});
