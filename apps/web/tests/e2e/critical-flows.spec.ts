import { expect, test } from '@playwright/test';
import { attachErrorTracking } from './playwright-helpers';

const loginAndContinueToDashboard = async (
  page: import('@playwright/test').Page,
): Promise<void> => {
  // Critical flow tests validate calculators and gating, not OAuth UI.
  // Seed auth state directly to avoid device-profile-specific login flakiness.
  await page.goto('/en/login');
  await page.evaluate(() => {
    localStorage.setItem('marginbase_signed_in', 'true');
    localStorage.setItem(
      'marginbase_signed_in_user_id',
      'critical_flows_e2e_user',
    );
    localStorage.removeItem('marginbase_google_id_token');
  });

  await page.goto('/en/login#/dashboard');
  await expect(page).toHaveURL(/dashboard/, { timeout: 20000 });
};

test('profit compute flow works end-to-end', async ({ page }) => {
  const { expectNoErrors } = attachErrorTracking(page);
  await loginAndContinueToDashboard(page);

  const profitCard = page
    .locator('.card')
    .filter({ hasText: 'Profit Calculator' })
    .first();
  await profitCard.getByRole('button', { name: 'Open' }).click();
  await expect(
    page.getByRole('heading', { name: 'Profit Editor' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Calculate Scenario' }).click();
  await expect(
    page.locator('.results-summary-label').filter({ hasText: 'Net Profit' }),
  ).toBeVisible();

  expectNoErrors();
});

test('soft gate blocks locked module and routes to subscription', async ({
  page,
}) => {
  const { expectNoErrors } = attachErrorTracking(page);
  await loginAndContinueToDashboard(page);

  await page.goto('/en/login#/cashflow');
  await expect(
    page.getByText('This module requires an active subscription.'),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Go to Subscription' }).click();
  await expect(
    page.getByRole('heading', { name: 'Subscription' }),
  ).toBeVisible();

  expectNoErrors();
});

test('upgrade flow unlocks locked module via local bundle activation', async ({
  page,
}) => {
  const { expectNoErrors } = attachErrorTracking(page);
  await loginAndContinueToDashboard(page);

  await page.goto('/en/login#/cashflow');
  await expect(
    page.getByText('This module requires an active subscription.'),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Go to Subscription' }).click();
  await page.evaluate(() => {
    localStorage.setItem(
      'marginbase_entitlements',
      JSON.stringify({
        entitlementSet: {
          bundle: true,
          profit: true,
          breakeven: true,
          cashflow: true,
        },
        lastVerifiedAt: new Date().toISOString(),
      }),
    );
  });
  await page.goto('/en/login#/dashboard');
  await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });

  await page.goto('/en/login#/cashflow');
  await expect(
    page.getByRole('heading', { name: 'Cashflow Editor' }),
  ).toBeVisible();
  await expect(
    page.getByText('This module requires an active subscription.'),
  ).toHaveCount(0);

  expectNoErrors();
});

test('data export triggers local JSON download', async ({ page }) => {
  const { expectNoErrors } = attachErrorTracking(page);
  await loginAndContinueToDashboard(page);

  await page.getByRole('button', { name: 'Data & Backup' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Export all scenarios (JSON)' })
    .click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('marginbase-export.json');
  expectNoErrors();
});

test('share scenario flow creates and renders local share dialog', async ({
  page,
}) => {
  const { expectNoErrors } = attachErrorTracking(page);
  await page.route('**/share/create', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'share_token_e2e',
        expiresAt: '2026-04-03T10:00:00.000Z',
      }),
    });
  });

  await loginAndContinueToDashboard(page);

  const profitCard = page
    .locator('.card')
    .filter({ hasText: 'Profit Calculator' })
    .first();
  await profitCard.getByRole('button', { name: 'Open' }).click();
  await expect(
    page.getByRole('heading', { name: 'Profit Editor' }),
  ).toBeVisible();

  await page
    .getByRole('button', { name: 'Calculate Scenario' })
    .click({ force: true });
  await page.getByRole('button', { name: 'Share Scenario' }).click({ force: true });

  await expect(
    page.getByRole('heading', { name: 'Shared Scenario' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy link' })).toBeVisible();

  expectNoErrors();
});

test('legal center navigation works from login screen', async ({ page }) => {
  await page.goto('/en/login');
  await page.getByRole('button', { name: 'Legal Center' }).click();
  await expect(
    page.getByRole('heading', { name: 'Legal documents' }),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Privacy Policy' }).first().click();
  await expect(
    page.getByRole('heading', { name: 'Privacy Policy' }),
  ).toBeVisible();
});
