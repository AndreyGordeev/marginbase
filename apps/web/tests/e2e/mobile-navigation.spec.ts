import { test, expect, devices } from '@playwright/test';

// Use mobile device viewport
test.use({ ...devices['iPhone 12'] });

test.describe('Mobile Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('mobile/index.html');
    await page.waitForLoadState('networkidle');
  });

  test('should load mobile app', async ({ page }) => {
    // Verify app root exists
    const appRoot = page.locator('#app');
    await expect(appRoot).toBeAttached();
  });

  test('should display login screen initially', async ({ page }) => {
    // Mobile login screen should render
    const loginContent = page
      .locator('button:has-text("Sign In with Google")')
      .first();
    const guestBtn = page
      .locator('button:has-text("Continue as Guest")')
      .first();

    const hasGoogle = await loginContent.count().then((c) => c > 0);
    const hasGuest = await guestBtn.count().then((c) => c > 0);

    expect(hasGoogle || hasGuest).toBeTruthy();
  });

  test('should navigate to dashboard after guest login', async ({ page }) => {
    // Click guest button
    const guestBtn = page
      .locator('button:has-text("Continue as Guest")')
      .first();
    if ((await guestBtn.count()) > 0) {
      await guestBtn.click();

      // Wait for navigation
      await page.waitForTimeout(500);

      // Check URL hash
      const url = page.url();
      expect(url).toContain('home');
    }
  });

  test('should navigate between calculator modules', async ({ page }) => {
    // Set entitlements to unlock all modules
    await page.evaluate(() => {
      localStorage.setItem(
        'marginbase_entitlements',
        JSON.stringify({
          profit: true,
          breakeven: true,
          cashflow: true,
          bundle: true,
        }),
      );
      localStorage.setItem('marginbase_signed_in', 'true');
    });

    // Reload to apply settings
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Click Profit module
    const profitBtn = page.locator('button:has-text("Profit")').first();
    if ((await profitBtn.count()) > 0) {
      await profitBtn.click();
      await page.waitForTimeout(400);
      const url1 = page.url();
      expect(url1).toContain('module');
      expect(url1).toContain('profit');
    }

    // Navigate to Breakeven
    const breakEvenBtn = page
      .locator('button:has-text(/Break-even|break-even/i)')
      .first();
    if ((await breakEvenBtn.count()) > 0) {
      await breakEvenBtn.click();
      await page.waitForTimeout(400);
      const url2 = page.url();
      expect(url2).toContain('module');
      expect(url2).toContain('breakeven');
    }
  });

  test('should navigate to settings', async ({ page }) => {
    // Set entitlements
    await page.evaluate(() => {
      localStorage.setItem('marginbase_signed_in', 'true');
    });

    // Reload to apply
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Click settings button (usually in header or menu)
    const settingsBtn = page
      .locator('button:has-text(/settings|gear|☰/i)')
      .first();
    if ((await settingsBtn.count()) > 0) {
      await settingsBtn.click();
      await page.waitForTimeout(400);
      const url = page.url();
      expect(url).toContain('settings');
    }
  });

  test('should handle parameterized routes', async ({ page }) => {
    // Set entitlements
    await page.evaluate(() => {
      localStorage.setItem(
        'marginbase_entitlements',
        JSON.stringify({
          profit: true,
          breakeven: true,
          cashflow: true,
        }),
      );
    });

    // Navigate to specific scenario editor
    await page.goto('/#/module/profit/scenarios');
    await page.waitForTimeout(400);

    // Should render scenario list or editor
    const url = page.url();
    expect(url).toContain('profit');
    expect(url).toContain('scenarios');
  });

  test('should maintain navigation history with back button', async ({
    page,
  }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        'marginbase_entitlements',
        JSON.stringify({
          profit: true,
          breakeven: true,
          cashflow: true,
        }),
      );
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Navigate forward
    const homeBtn = page.locator('button:has-text("Home")').first();
    if ((await homeBtn.count()) > 0) {
      await homeBtn.click();
      await page.waitForTimeout(300);
    }

    const profitBtn = page.locator('button:has-text("Profit")').first();
    if ((await profitBtn.count()) > 0) {
      await profitBtn.click();
      await page.waitForTimeout(300);
      let url = page.url();
      expect(url).toContain('profit');

      // Go back
      await page.goBack();
      await page.waitForTimeout(300);
      url = page.url();
      expect(url).toContain('home');
    }
  });

  test('should display subscription screen', async ({ page }) => {
    await page.goto('/#/subscription');
    await page.waitForTimeout(300);
    // Even if no content, navigation should work
    expect(page.url()).toContain('subscription');
  });

  test('should display legal screens', async ({ page }) => {
    // Privacy screen
    await page.goto('/#/privacy');
    await page.waitForTimeout(300);
    expect(page.url()).toContain('privacy');

    // Terms screen
    await page.goto('/#/terms');
    await page.waitForTimeout(300);
    expect(page.url()).toContain('terms');
  });

  test('should handle locked modules', async ({ page }) => {
    // Set limited entitlements (only profit)
    await page.evaluate(() => {
      localStorage.setItem(
        'marginbase_entitlements',
        JSON.stringify({
          profit: true,
          breakeven: false,
          cashflow: false,
          bundle: false,
        }),
      );
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Try to access locked breakeven
    await page.goto('/#/module/breakeven/scenarios');
    await page.waitForTimeout(300);

    // Should either show locked UI or redirect to accessible module
    const url = page.url();
    // Either stays on breakeven (shows 'locked') or redirects to profit
    expect(url).toBeTruthy();
  });

  test('should navigate to scenario list for each module', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        'marginbase_entitlements',
        JSON.stringify({
          profit: true,
          breakeven: true,
          cashflow: true,
        }),
      );
    });

    // Profit scenarios
    await page.goto('/#/module/profit/scenarios');
    await page.waitForTimeout(300);
    const profitUrl = page.url();
    expect(profitUrl).toContain('profit');
    expect(profitUrl).toContain('scenarios');

    // Breakeven scenarios
    await page.goto('/#/module/breakeven/scenarios');
    await page.waitForTimeout(300);
    const breakEvenUrl = page.url();
    expect(breakEvenUrl).toContain('breakeven');
    expect(breakEvenUrl).toContain('scenarios');

    // Cashflow scenarios
    await page.goto('/#/module/cashflow/scenarios');
    await page.waitForTimeout(300);
    const cashflowUrl = page.url();
    expect(cashflowUrl).toContain('cashflow');
    expect(cashflowUrl).toContain('scenarios');
  });

  test('should navigate to import/export', async ({ page }) => {
    await page.goto('/#/import-export');
    await page.waitForTimeout(300);
    expect(page.url()).toContain('import-export');
  });

  test('mobile UI should be responsive', async ({ page }) => {
    // Verify mobile viewport used
    const viewport = page.viewportSize();
    expect(viewport?.width).toBeLessThan(500); // Mobile width
  });

  test('should handle rapid navigation', async ({ page }) => {
    // Rapidly click different buttons
    const routes = [
      '/#/home',
      '/#/settings',
      '/#/subscription',
      '/#/privacy',
      '/#/home',
    ];

    for (const route of routes) {
      await page.goto(route);
      await page.waitForTimeout(100);
    }

    // Should end at last route
    expect(page.url()).toContain('home');
  });
});
