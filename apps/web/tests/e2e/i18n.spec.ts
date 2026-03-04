import { expect, test } from '@playwright/test';

const languageSelect = (page: import('@playwright/test').Page) => page.locator('select[name="language"]');

test('language switch to pl is applied and persisted after reload', async ({ page }) => {
  await page.goto('/login');
  await expect(languageSelect(page)).toBeVisible();

  await languageSelect(page).selectOption('pl');
  await expect(page).toHaveURL(/\/pl\/login/);

  await expect(page.getByRole('heading', { name: 'Zestaw finansowy dla MŚP' })).toBeVisible();
  await expect(languageSelect(page)).toHaveValue('pl');

  await page.getByRole('button', { name: 'Kontynuuj jako gość' }).click();
  await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
});

test('language switch to ru is applied and persisted after reload', async ({ page }) => {
  await page.goto('/login');
  await expect(languageSelect(page)).toBeVisible();

  await languageSelect(page).selectOption('ru');
  await expect(page).toHaveURL(/\/ru\/login/);

  await expect(page.getByRole('heading', { name: 'Финансовый набор для малого бизнеса' })).toBeVisible();
  await expect(languageSelect(page)).toHaveValue('ru');

  await page.getByRole('button', { name: 'Продолжить как гость' }).click();
  await expect(page.getByRole('heading', { name: 'Панель' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Панель' })).toBeVisible();
});
