import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { attachErrorTracking } from './playwright-helpers';

const expectNoSeriousOrCriticalViolations = async (page: import('@playwright/test').Page): Promise<void> => {
  const results = await new AxeBuilder({ page }).analyze();
  const seriousOrCritical = results.violations.filter((violation) =>
    violation.impact === 'serious' || violation.impact === 'critical'
  );

  expect(seriousOrCritical).toEqual([]);
};

const loginAsGuest = async (page: import('@playwright/test').Page): Promise<void> => {
  await page.goto('/en/login');
  await page.getByRole('button', { name: 'Continue as Guest' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
};

test('a11y smoke: dashboard has no serious/critical violations', async ({ page }) => {
  const { expectNoErrors } = attachErrorTracking(page);
  await loginAsGuest(page);
  await expectNoSeriousOrCriticalViolations(page);
  expectNoErrors();
});

test('a11y smoke: profit workspace has no serious/critical violations', async ({ page }) => {
  const { expectNoErrors } = attachErrorTracking(page);
  await loginAsGuest(page);
  await page.getByRole('button', { name: 'Profit' }).click();
  await expect(page.getByRole('heading', { name: 'Profit Editor' })).toBeVisible();
  await expectNoSeriousOrCriticalViolations(page);
  expectNoErrors();
});

test('a11y smoke: locked cashflow paywall has no serious/critical violations', async ({ page }) => {
  const { expectNoErrors } = attachErrorTracking(page);
  await loginAsGuest(page);
  await page.goto('/en/login#/cashflow');
  await expect(page.getByText('This module requires an active subscription.')).toBeVisible();
  await expectNoSeriousOrCriticalViolations(page);
  expectNoErrors();
});

test('a11y smoke: settings has no serious/critical violations', async ({ page }) => {
  const { expectNoErrors } = attachErrorTracking(page);
  await loginAsGuest(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expectNoSeriousOrCriticalViolations(page);
  expectNoErrors();
});
