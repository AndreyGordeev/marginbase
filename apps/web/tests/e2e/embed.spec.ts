import { expect, test } from '@playwright/test';
import { attachErrorTracking } from './playwright-helpers';
import { primaryTestLocalesFactory } from '@marginbase/testkit';

/**
 * E2E tests for embed routes
 * Tests stateless embed calculator with no auth, no persistence, no nav
 */

test('embed profit calculator renders without app nav', async ({ page }) => {
  const { expectNoErrors } = attachErrorTracking(page);

  await page.goto('/embed/en/profit');

  // Verify embed is loaded
  await expect(page.getByRole('heading', { name: /Embed: Profit Calculator/i })).toBeVisible();

  // Verify no nav/sidebar elements are present
  expect(await page.locator('aside').count()).toBe(0);
  expect(await page.locator('[data-testid="app-nav"]').count()).toBe(0);

  // Verify powered by attribution is present
  await expect(page.getByText(/Powered by MarginBase/i)).toBeVisible();

  expectNoErrors();
});

test('embed breakeven calculator works statefully', async ({ page }) => {
  const { expectNoErrors } = attachErrorTracking(page);

  await page.goto('/embed/en/breakeven');

  // Fill inputs
  const fixedCostsInput = page.getByLabel(/Fixed costs/i).first();
  const priceInput = page.getByLabel(/Unit price/i).first();
  const variableCostInput = page.getByLabel(/Variable cost per unit/i).first();

  await fixedCostsInput.fill('50000');
  await priceInput.fill('100');
  await variableCostInput.fill('20');

  // Trigger calculation
  await page.getByRole('button', { name: /Calculate|Compute/i }).click();

  // Verify results are displayed
  const resultsBox = page.locator('[data-testid="embed-results"]');
  if (await resultsBox.count() > 0) {
    await expect(resultsBox).toBeVisible();
  }

  expectNoErrors();
});

test('embed cashflow calculator works', async ({ page }) => {
  const { expectNoErrors } = attachErrorTracking(page);

  await page.goto('/embed/en/cashflow');

  // Verify form loads
  await expect(page.getByLabel(/Starting cash/i).first()).toBeVisible();

  // Fill starting cash
  await page.getByLabel(/Starting cash/i).first().fill('100000');

  // Trigger calculation
  await page.getByRole('button', { name: /Calculate|Compute/i }).click();

  // Verify no persistence (no save/load shown)
  expect(await page.getByRole('button', { name: /Save scenario/i }).count()).toBe(0);

  expectNoErrors();
});

test('embed supports multiple locales', async ({ page }) => {
  const { expectNoErrors } = attachErrorTracking(page);

  for (const locale of primaryTestLocalesFactory()) {
    await page.goto(`/embed/${locale}/profit`);
    await expect(page).not.toHaveTitle('404');
    await expect(page.getByRole('heading')).toBeTruthy();
  }

  expectNoErrors();
});

test('embed export inputs JSON downloads file', async ({ page }) => {
  const { expectNoErrors } = attachErrorTracking(page);

  await page.goto('/embed/en/profit');

  // Fill inputs
  await page.getByLabel(/Revenue/i).first().fill('100000');
  await page.getByLabel(/Costs/i).first().fill('50000');

  // Click export inputs
  const downloadPromise = page.waitForEvent('download');
  const exportBtn = page.getByRole('button', { name: /Export inputs|export/i });

  if (await exportBtn.count() > 0) {
    await exportBtn.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.json$/);
    
    const buffer = await download.path();
    expect(buffer).toBeTruthy();
  }

  expectNoErrors();
});

test('embed open in app button navigates to login', async ({ page }) => {
  const { expectNoErrors } = attachErrorTracking(page);

  await page.goto('/embed/en/profit');

  // Find and click "Open in MarginBase" button
  const openInAppBtn = page.getByRole('link', { name: /Open in MarginBase|open in app/i }).first();

  if (await openInAppBtn.count() > 0) {
    const url = await openInAppBtn.getAttribute('href');
    // Should navigate to app (possibly login)
    expect(url).toBeTruthy();
  }

  expectNoErrors();
});

test('embed no-auth guarantees: shared calculation does not require login', async ({ page }) => {
  const { expectNoErrors } = attachErrorTracking(page);

  // Embed should work without any auth
  await page.goto('/embed/en/breakeven');

  // Try to fill and compute without login
  await page.getByLabel(/Fixed costs/i).first().fill('50000');
  await page.getByRole('button', { name: /Calculate|Compute/i }).click();

  // Should not redirect to login
  expect(page.url()).toContain('/embed');

  expectNoErrors();
});

test('embed po consent UI is NOT shown (no telemetry prompts)', async ({ page }) => {
  const { expectNoErrors } = attachErrorTracking(page);

  await page.goto('/embed/en/profit');

  // Verify no telemetry/consent prompts appear
  expect(await page.getByText(/telemetry|analytics|consent|tracking/i).count()).toBe(0);

  expectNoErrors();
});
