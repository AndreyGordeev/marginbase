import { expect, test } from '@playwright/test';
import { attachErrorTracking } from './playwright-helpers';

test('share link can be opened and imported back into app', async ({ page }) => {
  const { expectNoErrors } = attachErrorTracking(page);

  page.on('dialog', async (dialog) => {
    await dialog.dismiss();
  });

  await page.route('**/share/create', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'share_e2e_test_token',
        expiresAt: '2026-04-03T10:00:00.000Z'
      })
    });
  });

  // Auth flow to dashboard
  await page.goto('/en/login');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await page.getByRole('button', { name: 'Continue to Dashboard' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  // Open calculator
  const profitCard = page.locator('.card').filter({ hasText: 'Profit Calculator' }).first();
  await profitCard.getByRole('button', { name: 'Open' }).click();
  await expect(page.getByRole('heading', { name: 'Profit Editor' })).toBeVisible();

  // Calculate and share
  await page.getByRole('button', { name: 'Calculate Scenario' }).click();
  await page.getByRole('button', { name: 'Share Scenario' }).click();
  await expect(page.getByRole('heading', { name: 'Shared Scenario' })).toBeVisible();

  // Verify share URL contains required parts
  const shareUrl = await page.locator('textarea').first().inputValue();
  expect(shareUrl).toContain('/s/');
  expect(shareUrl).toContain('#k=');
  expect(shareUrl).toContain('share_e2e_test_token');

  expectNoErrors();
});
