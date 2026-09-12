import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialWorld } from '../../domains/world/service';
import type { InventoryState } from '../../domains/inventory/model';
import type { PlayerProfile } from '../../domains/player/model';
import {
  createAppSave,
  downloadAppSaveFile,
  parseAppSave,
  readAppSaveFile,
  serializeAppSave,
} from '../../persistence/saveFile';

function makeInput(worldId = 'world-1') {
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
    resources: { block_brick_red: 12 },
    blocks: { block_brick_red: 12 },
    posters: {},
    cosmetics: {},
    slots: [
      {
        id: 'slot-hotbar-1',
        area: 'hotbar',
        index: 1,
        itemKind: 'block',
        itemId: 'block_brick_red',
        count: 12,
      },
    ],
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  const world = { ...createInitialWorld(player.id, 2, 4, 2), id: worldId };

  return { player, inventory, world };
}

describe('App save file serialization', () => {
  it('creates a save with an explicit savedAt timestamp', () => {
    const input = makeInput();
    const save = createAppSave(input, '2026-09-12T10:00:00.000Z');

    expect(save.player).toBe(input.player);
    expect(save.inventory).toBe(input.inventory);
    expect(save.world).toBe(input.world);
    expect(save.savedAt).toBe('2026-09-12T10:00:00.000Z');
  });

  it('uses ISO-8601 default for savedAt when omitted', () => {
    const save = createAppSave(makeInput());
    expect(save.savedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('round-trips serialize and parse for a valid save', () => {
    const input = makeInput();
    const save = createAppSave(input, '2026-05-17T12:00:00.000Z');
    const json = serializeAppSave(save);
    const parsed = parseAppSave(json);

    expect(parsed).toEqual(save);
  });

  it('accepts a legacy save string without savedAt and falls back to world.updatedAt', () => {
    const input = makeInput();
    const json = JSON.stringify({ player: input.player, inventory: input.inventory, world: input.world });
    const parsed = parseAppSave(json);

    expect(parsed?.savedAt).toBe(input.world.updatedAt);
    expect(parsed?.player).toEqual(input.player);
  });

  it('returns undefined for broken JSON', () => {
    expect(parseAppSave('{broken')).toBeUndefined();
  });

  it('returns undefined when player, inventory or world is missing', () => {
    const input = makeInput();

    expect(parseAppSave(JSON.stringify({ player: input.player, inventory: input.inventory }))).toBeUndefined();
    expect(parseAppSave(JSON.stringify({ player: input.player, world: input.world }))).toBeUndefined();
    expect(parseAppSave(JSON.stringify({ inventory: input.inventory, world: input.world }))).toBeUndefined();
  });
});

describe('downloadAppSaveFile', () => {
  const createObjectURL = vi.fn(() => 'blob:mock');
  const revokeObjectURL = vi.fn();
  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubGlobal('URL', { ...globalThis.URL, createObjectURL, revokeObjectURL });
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('creates a Blob URL, appends a temporary link and triggers a click', () => {
    const save = createAppSave(makeInput(), '2026-09-12T00:00:00.000Z');
    downloadAppSaveFile(save);

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();
  });
});

describe('readAppSaveFile', () => {
  it('parses a JSON text file into a save object', async () => {
    const input = makeInput();
    const save = createAppSave(input, '2026-06-01T00:00:00.000Z');
    const file = new File([serializeAppSave(save)], 'save.txt', { type: 'application/json' });

    const result = await readAppSaveFile(file);

    expect(result?.player.currencyCatCoins).toBe(10);
    expect(result?.world.id).toBe(input.world.id);
  });

  it('returns undefined for a file with invalid JSON', async () => {
    const file = new File(['{broken'], 'bad.txt', { type: 'application/json' });

    const result = await readAppSaveFile(file);

    expect(result).toBeUndefined();
  });
});
