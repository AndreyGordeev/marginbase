import { expect, test } from '@playwright/test';
import { attachErrorTracking } from './playwright-helpers';

test('smoke: app boots to login route', async ({ page }) => {
  const { expectNoErrors } = attachErrorTracking(page);

  await page.goto('/en/login');
  await expect(page.getByRole('heading', { name: 'SMB Finance Toolkit' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue as Guest' })).toBeVisible();

  expectNoErrors();
});

test('smoke: dashboard becomes visible after auth stub flow', async ({ page }) => {
  const { expectNoErrors } = attachErrorTracking(page);

  await page.goto('/en/login');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await page.getByRole('button', { name: 'Continue to Dashboard' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  expectNoErrors();
});
