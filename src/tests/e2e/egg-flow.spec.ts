import { expect, test, type Page } from '@playwright/test';

const SNAPSHOT_KEY = 'gamo:app-snapshot:v1';

function buildSnapshot(currencyCatCoins: number) {
  return {
    player: {
      id: 'player-1',
      nickname: 'Тестер',
      createdAt: '2026-09-12T00:00:00.000Z',
      updatedAt: '2026-09-12T00:00:00.000Z',
      currencyCatCoins,
      learning: {
        mathLevel: 'A',
        totalSolved: 0,
        totalCorrect: 0,
        currentStreak: 0,
        bestStreak: 0,
      },
    },
    inventory: {
      playerId: 'player-1',
      resources: { block_brick_red: 24 },
      blocks: { block_brick_red: 24 },
      posters: {},
      cosmetics: {},
      slots: [
        { id: 'slot-hotbar-1', area: 'hotbar', index: 1, itemKind: 'block', itemId: 'block_brick_red', count: 24 },
      ],
      updatedAt: '2026-09-12T00:00:00.000Z',
    },
    world: {
      id: 'seed-world',
      playerId: 'player-1',
      sizeX: 24,
      sizeY: 24,
      sizeZ: 24,
      voxels: [],
      decorations: [],
      posters: [],
      playerTransform: { position: { x: 0, y: 2, z: 0 }, rotation: { yaw: 0, pitch: 0 }, isFlying: false },
      playerPhysics: { velocityY: 0, isGrounded: true },
      updatedAt: '2026-09-12T00:00:00.000Z',
    },
    savedAt: '2026-09-12T00:00:00.000Z',
  };
}

function seedProfile(page: Page, currencyCatCoins: number) {
  return page.addInitScript(
    ({ key, snapshot }) => {
      window.localStorage.setItem(key, JSON.stringify(snapshot));
    },
    { key: SNAPSHOT_KEY, snapshot: buildSnapshot(currencyCatCoins) },
  );
}

async function readPersistedCoinsAndPosters(page: Page) {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      player?: { currencyCatCoins?: number };
      inventory?: { posters?: Record<string, number>; slots?: Array<{ itemKind?: string; itemId?: string; count?: number }> };
    };
    return { coins: parsed.player?.currencyCatCoins, posters: parsed.inventory?.posters, slots: parsed.inventory?.slots };
  }, SNAPSHOT_KEY);
}

test('Super bear egg reward lands in inventory slots', async ({ page }) => {
  await seedProfile(page, 500);
  await page.goto('/eggs');

  await page.getByRole('button', { name: 'Открыть яйцо Super bear' }).click();
  await expect(page.getByRole('dialog', { name: 'Открытие яйца' })).toBeVisible();
  await expect(page.locator('.egg-spin-reward')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.egg-spin-reward')).toContainText(/Super bear adventure/);

  await page.waitForTimeout(1000);

  const persisted = await readPersistedCoinsAndPosters(page);
  expect(persisted).not.toBeNull();
  expect(persisted!.coins).toBe(100);

  const sbearPosterIds = Array.from({ length: 13 }, (_, i) => `poster_meme_cat_${21 + i}`);
  const wonPosters = sbearPosterIds.filter((id) => (persisted!.posters?.[id] ?? 0) > 0);
  expect(wonPosters).toHaveLength(1);
  expect(persisted!.slots).toContainEqual(
    expect.objectContaining({ itemKind: 'poster', itemId: wonPosters[0], count: 1 }),
  );
});

test('cat egg reward still lands in inventory slots', async ({ page }) => {
  await seedProfile(page, 500);
  await page.goto('/eggs');

  await page.getByRole('button', { name: 'Открыть котовое яйцо' }).click();
  await expect(page.getByRole('dialog', { name: 'Открытие яйца' })).toBeVisible();
  await expect(page.locator('.egg-spin-reward')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('.egg-spin-reward')).toContainText(/Мемный кот/);

  await page.waitForTimeout(1000);

  const persisted = await readPersistedCoinsAndPosters(page);
  expect(persisted).not.toBeNull();
  expect(persisted!.coins).toBe(300);
  expect(Object.values(persisted!.posters ?? {}).some((count) => count > 0)).toBe(true);
});

test('egg does not spend coins when the player has too few cat coins', async ({ page }) => {
  await seedProfile(page, 100);
  await page.goto('/eggs');

  await page.getByRole('button', { name: 'Открыть яйцо Super bear' }).click();

  await expect(page.getByText('Недостаточно котокоинов')).toBeVisible();

  await page.waitForTimeout(1000);

  const persisted = await readPersistedCoinsAndPosters(page);
  expect(persisted).not.toBeNull();
  expect(persisted!.coins).toBe(100);
  expect(persisted!.posters).toEqual({});
});