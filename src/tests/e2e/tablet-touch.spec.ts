import { test, expect } from '@playwright/test';

const SNAPSHOT_KEY = 'gamo:app-snapshot:v1';

test.skip(({ isMobile }) => !isMobile, 'touch controls are tablet-only');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.goto('/');
  await page.waitForTimeout(800);
});

async function readTransform(page: import('@playwright/test').Page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw).world?.playerTransform ?? null;
  }, SNAPSHOT_KEY);
}

async function resumeByTappingStage(page: import('@playwright/test').Page) {
  if (await page.locator('.build-pause-hint').isVisible()) {
    const cdp = await page.context().newCDPSession(page);
    const box = await page.locator('.build-stage').boundingBox();
    expect(box).not.toBeNull();
    const x = box!.x + box!.width * 0.7;
    const y = box!.y + box!.height * 0.4;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 99 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  // Wait until the pause hint disappears (world resumed, look is armed).
  await expect(page.locator('.build-pause-hint')).toBeHidden({ timeout: 5000 });
}

test('touch controls and layout on tablet @smoke', async ({ page }) => {
  // Coarse pointer match (redundant but confirms tablet emulation)
  const isCoarse = await page.evaluate(() => window.matchMedia('(pointer: coarse)').matches);
  expect(isCoarse).toBe(true);

  // Touch controls visible
  await expect(page.locator('.touch-joystick')).toBeVisible();
  await expect(page.locator('.touch-actions')).toBeVisible();

  // Desktop hints hidden
  await expect(page.locator('.build-controls-hint')).toBeHidden();
  await expect(page.locator('.build-hud')).toBeHidden();

  // Touch hint chip visible
  await expect(page.locator('.build-touch-hint')).toBeVisible();

  // Nav and stage visible
  await expect(page.getByRole('link', { name: 'Мир' })).toBeVisible();
  await expect(page.locator('.build-stage')).toBeVisible();

  const stageBox = await page.locator('.build-stage').boundingBox();
  expect(stageBox).not.toBeNull();
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  expect(stageBox!.height).toBeGreaterThan(400);
  expect(stageBox!.y + stageBox!.height).toBeGreaterThan(viewportHeight - 30);
});

test('joystick moves the player via touch @smoke', async ({ page }) => {
  const spawn = await readTransform(page);
  expect(spawn).not.toBeNull();

  const pad = await page.locator('.touch-joystick').boundingBox();
  expect(pad).not.toBeNull();
  const cx = pad!.x + pad!.width / 2;
  const cy = pad!.y + pad!.height / 2;

  const cdp = await page.context().newCDPSession(page);
  // Hold forward
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: cx, y: cy, id: 1 }],
  });
  for (let i = 1; i <= 6; i += 1) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: cx, y: cy - 8 * i, id: 1 }],
    });
    await page.waitForTimeout(90);
  }
  await page.waitForTimeout(700);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await page.waitForTimeout(600);

  const after = await readTransform(page);
  expect(after).not.toBeNull();
  expect(after!.position.z).not.toBe(spawn!.position.z);
});

async function swipeLook(page: import('@playwright/test').Page) {
  const cdp = await page.context().newCDPSession(page);
  // Drag on a free stage area (above the hotbar / away from touch chips).
  const box = await page.locator('.build-stage').boundingBox();
  expect(box).not.toBeNull();
  const x = box!.x + box!.width * 0.7;
  const y = box!.y + box!.height * 0.45;
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y, id: 2 }],
  });
  for (let i = 1; i <= 5; i += 1) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: x - 14 * i, y, id: 2 }],
    });
    await page.waitForTimeout(70);
  }
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await page.waitForTimeout(600);
}

test('swipe rotates the camera @smoke', async ({ page }) => {
  const spawn = await readTransform(page);
  const startYaw = spawn!.rotation.yaw;
  let yaw = startYaw;

  // The first touch on a paused world only resumes it, and fresh look handlers
  // may briefly lag behind the resume. Retry until the yaw actually changes.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await resumeByTappingStage(page);
    await swipeLook(page);
    const after = await readTransform(page);
    yaw = after!.rotation.yaw;
    if (Math.abs(yaw - startYaw) > 0.01) break;
  }

  expect(Math.abs(yaw - startYaw)).toBeGreaterThan(0.01);
});
