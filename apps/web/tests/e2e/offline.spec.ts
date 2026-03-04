import { expect, test } from '@playwright/test';

test('saved scenario remains usable when browser goes offline', async ({ page, context }) => {
  const scenarioName = 'Offline Persistence Scenario';

  await page.goto('/en/login');
  await page.getByRole('button', { name: 'Continue as Guest' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  const profitCard = page.locator('.card', { hasText: 'Profit Calculator' }).first();
  await profitCard.getByRole('button', { name: 'Open' }).click();
  await expect(page.getByRole('heading', { name: 'Profit Editor' })).toBeVisible();

  await page.locator('input[name="scenarioName"]').fill(scenarioName);
  await page.getByRole('button', { name: 'Calculate Scenario' }).click();
  await expect(page.locator('.scenario-item', { hasText: scenarioName })).toBeVisible();

  await context.setOffline(true);

  await page.getByRole('button', { name: 'Dashboard' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  await page.getByRole('button', { name: 'Profit' }).click();
  await expect(page.getByRole('heading', { name: 'Profit Editor' })).toBeVisible();
  await expect(page.locator('.scenario-item', { hasText: scenarioName })).toBeVisible();

  await page.getByRole('button', { name: 'Calculate Scenario' }).click();
  await expect(page.locator('.results-summary-label', { hasText: 'Net Profit' })).toBeVisible();

  await context.setOffline(false);
});
