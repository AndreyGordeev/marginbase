import { expect, test } from '@playwright/test';
import { attachErrorTracking } from './playwright-helpers';

const loginAndContinueToDashboard = async (page: import('@playwright/test').Page): Promise<void> => {
  await page.goto('/en/login');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await page.getByRole('button', { name: 'Continue to Dashboard' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
};

const screenshotOptions = {
  animations: 'disabled' as const,
  caret: 'hide' as const
};

test('visual: dashboard module cards', async ({ page }) => {
  const { expectNoErrors } = attachErrorTracking(page);
  await loginAndContinueToDashboard(page);
  await expect(page.locator('.grid-3')).toBeVisible();
  await expect(page.locator('.grid-3')).toHaveScreenshot('visual-dashboard-modules.png', screenshotOptions);
  expectNoErrors();
});

test('visual: profit workspace filled', async ({ page }) => {
  const { expectNoErrors } = attachErrorTracking(page);
  await loginAndContinueToDashboard(page);
  const profitCard = page.locator('.card').filter({ hasText: 'Profit Calculator' }).first();
  await profitCard.getByRole('button', { name: 'Open' }).click();

  await expect(page.getByRole('heading', { name: 'Profit Editor' })).toBeVisible();
  await page.getByRole('button', { name: 'Calculate Scenario' }).click();
  await expect(page.getByText('Results')).toBeVisible();

  await expect(page.locator('main.main')).toHaveScreenshot('visual-profit-workspace.png', screenshotOptions);
  expectNoErrors();
});

test('visual: paywall locked module', async ({ page }) => {
  const { expectNoErrors } = attachErrorTracking(page);
  await loginAndContinueToDashboard(page);
  await page.goto('/en/login#/cashflow');
  await expect(page.getByText('This module requires an active subscription.')).toBeVisible();

  await expect(page.locator('main.main')).toHaveScreenshot('visual-paywall-cashflow.png', screenshotOptions);
  expectNoErrors();
});

test('visual: settings telemetry card', async ({ page }) => {
  const { expectNoErrors } = attachErrorTracking(page);
  await loginAndContinueToDashboard(page);
  await page.goto('/en/login#/settings');

  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page.locator('main.main')).toHaveScreenshot('visual-settings.png', screenshotOptions);
  expectNoErrors();
});

test('visual: share dialog after link creation', async ({ page }) => {
  const { expectNoErrors } = attachErrorTracking(page);
  await page.route('**/share/create', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'share_visual_token',
        expiresAt: '2026-04-03T10:00:00.000Z'
      })
    });
  });

  await loginAndContinueToDashboard(page);
  const profitCard = page.locator('.card').filter({ hasText: 'Profit Calculator' }).first();
  await profitCard.getByRole('button', { name: 'Open' }).click();
  await page.getByRole('button', { name: 'Calculate Scenario' }).click();
  await page.getByRole('button', { name: 'Share Scenario' }).click();

  await expect(page.getByRole('heading', { name: 'Shared Scenario' })).toBeVisible();
  await expect(page.locator('.card').filter({ hasText: 'Shared Scenario' }).first()).toHaveScreenshot('visual-share-dialog.png', {
    ...screenshotOptions,
    maxDiffPixelRatio: 0.02
  });
  expectNoErrors();
});

test('visual: data export options', async ({ page }) => {
  const { expectNoErrors } = attachErrorTracking(page);
  await loginAndContinueToDashboard(page);
  await page.goto('/en/login#/data');

  await expect(page.getByRole('heading', { name: 'Data & Backup' })).toBeVisible();
  await expect(page.locator('main.main')).toHaveScreenshot('visual-data-export.png', screenshotOptions);
  expectNoErrors();
});

test('visual: login screen', async ({ page }) => {
  const { expectNoErrors } = attachErrorTracking(page);
  await page.goto('/en/login');
  await expect(page.getByRole('heading', { name: 'SMB Finance Toolkit' })).toBeVisible();

  await expect(page.locator('body')).toHaveScreenshot('visual-login.png', screenshotOptions);
  expectNoErrors();
});

test('visual: subscription screen', async ({ page }) => {
  const { expectNoErrors } = attachErrorTracking(page);
  await loginAndContinueToDashboard(page);
  await page.goto('/en/login#/subscription');
  await expect(page.getByRole('heading', { name: 'Subscription' })).toBeVisible();

  await expect(page.locator('main.main')).toHaveScreenshot('visual-subscription.png', screenshotOptions);
  expectNoErrors();
});
