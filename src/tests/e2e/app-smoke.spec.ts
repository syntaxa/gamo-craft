import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
});

test('app shell navigation @smoke', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('.currency-badge')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();

  await page.getByRole('link', { name: 'Учеба' }).click();
  await expect(page.getByRole('heading', { name: 'Учеба' })).toBeVisible();

  await page.getByRole('link', { name: 'Магазин' }).click();
  await expect(page.getByRole('heading', { name: 'Магазин ресурсов' })).toBeVisible();

  await page.getByRole('link', { name: 'Яйца' }).click();
  await expect(page.getByRole('heading', { name: 'Яйца с призами' })).toBeVisible();

  await page.getByRole('link', { name: 'Профиль' }).click();
  await expect(page.getByText(/Версия: v/)).toBeVisible();
  await expect(page.getByText(/Игрок|Тестер/)).toBeVisible();
});

test('orthography card flow @smoke', async ({ page }) => {
  await page.goto('/lesson');

  const easyCard = page.locator('.lesson-program-card').filter({ hasText: 'Учим слова - Легко' });
  await easyCard.getByRole('button', { name: 'Войти в урок' }).click();

  await expect(page.locator('.lesson-orth-task')).toHaveCount(3);
  const tasks = page.locator('.lesson-orth-task');
  for (let index = 0; index < 3; index += 1) {
    await expect(tasks.nth(index).getByRole('button')).toHaveCount(3);
    await tasks.nth(index).getByRole('button').first().click();
  }

  await page.getByRole('button', { name: 'Проверить' }).click();
  await expect(page.getByText(/Верно: \d\/3/)).toBeVisible();
  await page.getByRole('button', { name: 'Закрыть' }).click();
  await expect(page.getByText('Результат урока')).toBeHidden();
});

test('glass shop flow @smoke', async ({ page }) => {
  await page.goto('/shop');

  const glassLot = page.locator('.shop-lot').filter({ hasText: 'Стекло' });
  await expect(glassLot).toContainText('10 блоков');
  await glassLot.getByRole('button', { name: /50/ }).click();

  await expect(page.locator('.currency-badge')).toContainText('50');
  await page.getByRole('link', { name: 'Мир' }).click();
  await expect(page.locator('.hotbar-slot[title*="Стеклянный блок"]')).toBeVisible();
});

test('inventory closes by clicking outside the modal @smoke', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.hotbar')).toBeVisible();

  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e' }));
  });

  await expect(page.locator('.inventory-overlay')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.inventory-panel')).toBeVisible();

  await page.locator('.inventory-overlay').click({ position: { x: 8, y: 8 } });
  await expect(page.locator('.inventory-overlay')).toBeHidden({ timeout: 5000 });
});

test('egg economy guardrail @smoke', async ({ page }) => {
  await page.goto('/shop');
  await page.locator('.shop-lot').filter({ hasText: 'Стекло' }).getByRole('button', { name: /50/ }).click();
  await page.locator('.shop-lot').filter({ hasText: 'Кирпич' }).getByRole('button', { name: /30/ }).click();
  await page.locator('.shop-lot').filter({ hasText: 'Доски' }).getByRole('button', { name: /10/ }).click();
  await page.locator('.shop-lot').filter({ hasText: 'Доски' }).getByRole('button', { name: /10/ }).click();
  await expect(page.locator('.currency-badge')).toContainText('0');

  await page.getByRole('link', { name: 'Яйца' }).click();
  await page.getByRole('button', { name: 'Открыть обычное яйцо' }).click();
  await expect(page.getByText('Недостаточно котокоинов')).toBeVisible();
  await expect(page.locator('.currency-badge')).toContainText('0');
});
