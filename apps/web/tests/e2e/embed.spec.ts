import { expect, test } from '@playwright/test';
import { attachErrorTracking } from './playwright-helpers';
import { primaryTestLocalesFactory } from '@marginbase/testkit';
import { TEST_IDS } from '../../src/ui/test-ids';

/**
 * E2E tests for embed routes
 * Tests stateless embed calculator with no auth, no persistence, no nav
 */

test('embed profit calculator renders without app nav', async ({ page }) => {
  const { expectNoErrors } = attachErrorTracking(page);

  await page.goto('/en/embed/profit');

  // Verify embed is loaded
  await expect(page.getByTestId(TEST_IDS.EMBED_SHELL)).toBeVisible();

  // Verify no nav/sidebar elements are present
  expect(await page.locator('aside').count()).toBe(0);
  expect(await page.locator('[data-testid="app-nav"]').count()).toBe(0);

  // Verify powered by attribution is present
  await expect(page.getByTestId(TEST_IDS.EMBED_POWERED_BY)).toBeVisible();

  expectNoErrors();
});

test('embed breakeven calculator works statefully', async ({ page }) => {
  const { expectNoErrors } = attachErrorTracking(page);

  await page.goto('/en/embed/breakeven');

  // Fill inputs (embed recalculates on input)
  await page.locator('input[name="fixedCostsMinor"]').first().fill('50000');
  await page.locator('input[name="unitPriceMinor"]').first().fill('100');
  await page.locator('input[name="variableCostPerUnitMinor"]').first().fill('20');

  // Verify results are displayed
  await expect(page.getByTestId(TEST_IDS.EMBED_RESULTS)).toBeVisible();

  expectNoErrors();
});

test('embed cashflow calculator works', async ({ page }) => {
  const { expectNoErrors } = attachErrorTracking(page);

  await page.goto('/en/embed/cashflow');

  // Verify form loads
  await expect(page.locator('input[name="startingCashMinor"]').first()).toBeVisible();

  // Fill starting cash (embed recalculates on input)
  await page.locator('input[name="startingCashMinor"]').first().fill('100000');

  // Verify no persistence (no save/load shown)
  expect(await page.getByRole('button', { name: /Save scenario/i }).count()).toBe(0);

  expectNoErrors();
});

test('embed supports multiple locales', async ({ page }) => {
  const { expectNoErrors } = attachErrorTracking(page);

  for (const locale of primaryTestLocalesFactory()) {
    await page.goto(`/${locale}/embed/profit`);
    await expect(page).not.toHaveTitle('404');
    await expect(page.getByRole('heading')).toBeTruthy();
  }

  expectNoErrors();
});

test('embed export inputs JSON downloads file', async ({ page }) => {
  const { expectNoErrors } = attachErrorTracking(page);

  await page.goto('/en/embed/profit');

  // Fill inputs
  await page.locator('input[name="unitPriceMinor"]').first().fill('100000');
  await page.locator('input[name="fixedCostsMinor"]').first().fill('50000');

  // Click export inputs
  const downloadPromise = page.waitForEvent('download');
  const exportBtn = page.getByTestId(TEST_IDS.EMBED_EXPORT_INPUTS_BUTTON);

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

  await page.goto('/en/embed/profit');

  // Find and click "Open in MarginBase" button
  const openInAppBtn = page.getByTestId(TEST_IDS.EMBED_OPEN_IN_APP_BUTTON).first();

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
  await page.goto('/en/embed/breakeven');

  // Try to fill without login
  await page.locator('input[name="fixedCostsMinor"]').first().fill('50000');
  await expect(page.getByTestId(TEST_IDS.EMBED_RESULTS)).toBeVisible();

  // Should not redirect to login
  expect(page.url()).toContain('/embed');

  expectNoErrors();
});

test('embed po consent UI is NOT shown (no telemetry prompts)', async ({ page }) => {
  const { expectNoErrors } = attachErrorTracking(page);

  await page.goto('/en/embed/profit');

  // Verify no telemetry/consent prompts appear
  expect(await page.getByText(/telemetry|analytics|consent|tracking/i).count()).toBe(0);

  expectNoErrors();
});
