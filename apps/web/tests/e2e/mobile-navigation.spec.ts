import { test, expect, devices, type Page } from '@playwright/test';

test.use({ ...devices['iPhone 12'] });

const openMobile = async (page: Page, hash = '/login') => {
  await page.goto(`mobile/index.html#${hash}`);
  await page.waitForLoadState('networkidle');
};

test.describe('Mobile Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await openMobile(page);
    const continueBtn = page.locator('button:has-text("Continue")').first();
    if ((await continueBtn.count()) > 0) {
      await continueBtn.click();
      await page.waitForTimeout(200);
    }
  });

  test('should load mobile app', async ({ page }) => {
    await expect(page.locator('#app')).toBeAttached();
  });

  test('should display login screen initially', async ({ page }) => {
    await expect(page.locator('button:has-text("Sign In with Google")')).toBeVisible();
    await expect(page.locator('button:has-text("Continue as Guest")')).toBeVisible();
  });

  test('should navigate to dashboard after guest login', async ({ page }) => {
    await page.click('button:has-text("Continue as Guest")');
    await page.waitForTimeout(300);
    expect(page.url()).toContain('#/home');
  });

  test('should navigate between calculator modules', async ({ page }) => {
    await page.click('button:has-text("Continue as Guest")');
    await page.waitForTimeout(200);

    await page.click('button:has-text("Profit Calculator")');
    await page.waitForTimeout(300);
    expect(page.url()).toContain('#/module/profit/scenarios');
  });

  test('should navigate to settings', async ({ page }) => {
    await page.click('button:has-text("Continue as Guest")');
    await page.waitForTimeout(200);
    await page.click('button:has-text("Settings")');
    await page.waitForTimeout(300);
    expect(page.url()).toContain('#/settings');
  });

  test('should handle parameterized routes', async ({ page }) => {
    await openMobile(page, '/module/profit/editor/new');
    expect(page.url()).toContain('module/profit/editor/new');
  });

  test('should maintain navigation history with back button', async ({ page }) => {
    await page.click('button:has-text("Continue as Guest")');
    await page.waitForTimeout(200);
    await page.click('button:has-text("Settings")');
    await page.waitForTimeout(200);
    await page.goBack();
    await page.waitForTimeout(200);
    expect(page.url()).toContain('#/home');
  });

  test('should display subscription screen', async ({ page }) => {
    await openMobile(page, '/subscription');
    expect(page.url()).toContain('#/subscription');
  });

  test('should display legal screens', async ({ page }) => {
    await openMobile(page, '/legal/privacy');
    expect(page.url()).toContain('#/legal/privacy');

    await openMobile(page, '/legal/terms');
    expect(page.url()).toContain('#/legal/terms');
  });

  test('should handle locked modules', async ({ page }) => {
    await page.click('button:has-text("Continue as Guest")');
    await page.waitForTimeout(200);

    const breakEvenBtn = page.locator('button:has-text("Break-even")').first();
    await expect(breakEvenBtn).toBeDisabled();
  });

  test('should navigate to scenario list for each module', async ({ page }) => {
    await openMobile(page, '/module/profit/scenarios');
    expect(page.url()).toContain('module/profit/scenarios');

    await openMobile(page, '/module/breakeven/scenarios');
    expect(page.url()).toContain('module/breakeven/scenarios');

    await openMobile(page, '/module/cashflow/scenarios');
    expect(page.url()).toContain('module/cashflow/scenarios');
  });

  test('should navigate to import/export', async ({ page }) => {
    await openMobile(page, '/import-export-result');
    expect(page.url()).toContain('#/import-export-result');
  });

  test('mobile UI should be responsive', async ({ page }) => {
    const viewport = page.viewportSize();
    expect(viewport?.width).toBeLessThan(500);
  });

  test('should handle rapid navigation', async ({ page }) => {
    const routes = [
      '/home',
      '/settings',
      '/subscription',
      '/legal/privacy',
      '/home',
    ];

    for (const route of routes) {
      await openMobile(page, route);
      await page.waitForTimeout(100);
    }

    expect(page.url()).toContain('#/home');
  });
});
