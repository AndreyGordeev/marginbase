import { expect, test } from '@playwright/test';

const loginAndContinueToDashboard = async (page: import('@playwright/test').Page): Promise<void> => {
  await page.goto('/en/login');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await page.getByRole('button', { name: 'Continue to Dashboard' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
};

test('profit compute flow works end-to-end', async ({ page }) => {
  await loginAndContinueToDashboard(page);

  await page.getByRole('button', { name: 'Open Profit Calculator' }).click();
  await expect(page.getByRole('heading', { name: 'Profit Editor' })).toBeVisible();

  await page.getByRole('button', { name: 'Calculate Scenario' }).click();
  await expect(page.locator('.results-summary-label', { hasText: 'Net Profit' })).toBeVisible();
});

test('soft gate blocks locked module and routes to subscription', async ({ page }) => {
  await loginAndContinueToDashboard(page);

  await page.goto('/en/login#/cashflow');
  await expect(page.getByText('This module requires an active subscription.')).toBeVisible();

  await page.getByRole('button', { name: 'Go to Subscription' }).click();
  await expect(page.getByRole('heading', { name: 'Subscription' })).toBeVisible();
});

test('data export triggers local JSON download', async ({ page }) => {
  await loginAndContinueToDashboard(page);

  await page.getByRole('button', { name: 'Data & Backup' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export all scenarios (JSON)' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('marginbase-export.json');
});

test('legal center navigation works from login screen', async ({ page }) => {
  await page.goto('/en/login');
  await page.getByRole('button', { name: 'Legal Center' }).click();
  await expect(page.getByRole('heading', { name: 'Legal documents' })).toBeVisible();

  await page.getByRole('link', { name: 'Privacy Policy' }).first().click();
  await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible();
});
