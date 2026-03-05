import { expect, test } from '@playwright/test';
import { attachErrorTracking } from './playwright-helpers';

const languageSelect = (page: import('@playwright/test').Page) => page.locator('select[name="language"]');

test('language switch to pl is applied and persisted after reload', async ({ page, browserName }) => {
  const { expectNoErrors } = attachErrorTracking(page);
  await page.goto('/login');
  await expect(languageSelect(page)).toBeVisible();

  await languageSelect(page).selectOption('pl');
  await expect(page).toHaveURL(/\/pl\/login/);

  await expect(page.getByRole('heading', { name: 'Zestaw finansowy dla MŚP' })).toBeVisible();
  await expect(languageSelect(page)).toHaveValue('pl');

  await page.getByRole('button', { name: 'Kontynuuj jako gość' }).click();
  await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();

  if (browserName === 'firefox') {
    // Firefox has slower reload on i18n
    await page.waitForTimeout(500);
  }
  
  await page.reload();
  await expect(page).toHaveURL(/\/pl\//);
  await expect(page.getByRole('heading', { name: 'Pulpit' }), { timeout: 20000 }).toBeVisible();
  
  expectNoErrors();
});

test('language switch to ru is applied and persisted after reload', async ({ page }) => {
  const { expectNoErrors } = attachErrorTracking(page);
  await page.goto('/login');
  await expect(languageSelect(page)).toBeVisible();

  await languageSelect(page).selectOption('ru');
  await expect(page).toHaveURL(/\/ru\/login/);

  await expect(page.getByRole('heading', { name: 'Финансовый набор для малого бизнеса' })).toBeVisible();
  await expect(languageSelect(page)).toHaveValue('ru');

  await page.getByRole('button', { name: 'Продолжить как гость' }).click();
  await expect(page.getByRole('heading', { name: 'Панель' })).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(/\/ru\//);
  await expect(page.getByRole('heading', { name: 'Панель' }), { timeout: 20000 }).toBeVisible();
  
  expectNoErrors();
});
