import { test, expect, Page } from '@playwright/test';

const clickCalculate = async (page: Page): Promise<void> => {
  const calculateByTestId = page.getByTestId('calculate-button');
  if ((await calculateByTestId.count()) > 0) {
    await calculateByTestId.first().click();
    return;
  }
  await page.click('button:has-text("Calculate")').catch(() => {});
};

const fillProfitInputs = async (page: Page, revenue: string, cost: string): Promise<void> => {
  const numberInputs = page.locator('input[type="number"]');
  const inputCount = await numberInputs.count();

  if (inputCount > 0) {
    await numberInputs.first().fill(revenue);
  }
  if (inputCount > 1) {
    await numberInputs.nth(1).fill(cost);
  }
};

/**
 * Visual Regression Tests — Phase 2: Extended Coverage 🎨
 *
 * Captures visual snapshots across all calculators and dialogs.
 * Detects unintended layout/styling changes that unit tests miss.
 * Snapshots taken across desktop, tablet, mobile viewports.
 *
 * Run: pnpm test:e2e:visual
 * Update: pnpm test:e2e:visual -- --update-snapshots
 */

test.describe('Visual Regression: Calculators & Dialogs', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterEach(async () => {
    await page.context().close();
  });

  // ============================================================================
  // SECTION 1: Profit Calculator — Visual Snapshots
  // ============================================================================

  test.describe('1: Profit Calculator', () => {
    test('1A: Desktop (1280px) - default state', async () => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('http://localhost:5173/profit');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('profit-desktop-default.png', {
        mask: [
          page.locator('[class*="timestamp"]'),
          page.locator('[class*="loading"]'),
        ],
        maxDiffPixels: 200,
      });
    });

    test('1B: Desktop (1280px) - with values entered', async () => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('http://localhost:5173/profit');

      // Fill form if fields are present
      await fillProfitInputs(page, '10000', '6000');
      await clickCalculate(page);
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('profit-desktop-filled.png', {
        mask: [
          page.locator('[class*="timestamp"]'),
          page.locator('[class*="result-value"]'), // Results may vary slightly
        ],
        maxDiffPixels: 300,
      });
    });

    test('1C: Tablet (768px) - default state', async () => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('http://localhost:5173/profit');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('profit-tablet-default.png', {
        mask: [page.locator('[class*="timestamp"]')],
        maxDiffPixels: 200,
      });
    });

    test('1D: Tablet (768px) - with values', async () => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('http://localhost:5173/profit');

      await fillProfitInputs(page, '50000', '30000');
      await clickCalculate(page);
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('profit-tablet-filled.png', {
        maxDiffPixels: 300,
      });
    });

    test('1E: Mobile (360px) - default state', async () => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto('http://localhost:5173/profit');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('profit-mobile-default.png', {
        maxDiffPixels: 150,
      });
    });

    test('1F: Mobile (360px) - with values', async () => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto('http://localhost:5173/profit');

      await fillProfitInputs(page, '5000', '3000');
      await clickCalculate(page);
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('profit-mobile-filled.png', {
        maxDiffPixels: 200,
      });
    });

    test('1G: Long scenario name variant (50+ chars)', async () => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('http://localhost:5173/profit');

      // Set a long scenario name if possible
      const nameInput = page.locator('input[placeholder*="name"], input[name*="name"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill('This is a very long scenario name that should not overflow or break layout');
      }

      await expect(page).toHaveScreenshot('profit-desktop-long-name.png', {
        maxDiffPixels: 200,
      });
    });

    test('1H: Very large numbers variant', async () => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('http://localhost:5173/profit');

      await fillProfitInputs(page, '999999999', '500000000');
      await clickCalculate(page);
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('profit-tablet-large-numbers.png', {
        maxDiffPixels: 300,
      });
    });
  });

  // ============================================================================
  // SECTION 2: Break-Even Calculator — Visual Snapshots
  // ============================================================================

  test.describe('2: Break-Even Calculator', () => {
    test('2A: Desktop (1280px) - default state', async () => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('http://localhost:5173/break-even');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('breakeven-desktop-default.png', {
        maxDiffPixels: 200,
      });
    });

    test('2B: Desktop (1280px) - with values', async () => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('http://localhost:5173/break-even');

      const inputs = page.locator('input[type="number"]');
      if ((await inputs.count()) > 0) {
        await inputs.nth(0).fill('5000'); // Fixed cost
        if (await inputs.nth(1).isVisible()) {
          await inputs.nth(1).fill('50'); // Price
        }
        if (await inputs.nth(2).isVisible()) {
          await inputs.nth(2).fill('30'); // Variable cost
        }
      }

      await page.click('button:has-text("Calculate")').catch(() => {});
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('breakeven-desktop-filled.png', {
        maxDiffPixels: 300,
      });
    });

    test('2C: Tablet (768px) - default state', async () => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('http://localhost:5173/break-even');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('breakeven-tablet-default.png', {
        maxDiffPixels: 200,
      });
    });

    test('2D: Mobile (360px) - default state', async () => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto('http://localhost:5173/break-even');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('breakeven-mobile-default.png', {
        maxDiffPixels: 150,
      });
    });

    test('2E: Mobile (360px) - chart rendering', async () => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto('http://localhost:5173/break-even');

      const inputs = page.locator('input[type="number"]');
      if ((await inputs.count()) >= 3) {
        await inputs.nth(0).fill('1000');
        await inputs.nth(1).fill('25');
        await inputs.nth(2).fill('15');

        await page.click('button:has-text("Calculate")').catch(() => {});
        await page.waitForTimeout(500);
      }

      await expect(page).toHaveScreenshot('breakeven-mobile-with-chart.png', {
        maxDiffPixels: 250,
      });
    });
  });

  // ============================================================================
  // SECTION 3: Cashflow Calculator — Visual Snapshots
  // ============================================================================

  test.describe('3: Cashflow Calculator', () => {
    test('3A: Desktop (1280px) - default state', async () => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto('http://localhost:5173/cashflow');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('cashflow-desktop-default.png', {
        maxDiffPixels: 200,
      });
    });

    test('3B: Desktop (1280px) - with initial values', async () => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto('http://localhost:5173/cashflow');

      const inputs = page.locator('input[type="number"]');
      if ((await inputs.count()) > 0) {
        await inputs.first().fill('10000');
      }

      await page.click('button:has-text("Calculate")').catch(() => {});
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('cashflow-desktop-filled.png', {
        maxDiffPixels: 300,
      });
    });

    test('3C: Desktop - projection table display', async () => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto('http://localhost:5173/cashflow');

      // Fill and calculate
      const inputs = page.locator('input[type="number"]');
      if ((await inputs.count()) > 0) {
        await inputs.first().fill('5000');
        await page.click('button:has-text("Calculate")').catch(() => {});
        await page.waitForTimeout(500);

        // Check if table is visible
        const table = page.locator('table, [role="table"], [class*="table"]').first();
        if (await table.isVisible()) {
          // Scroll down to see table
          await table.scrollIntoViewIfNeeded();
          await page.waitForTimeout(300);
        }
      }

      await expect(page).toHaveScreenshot('cashflow-desktop-table.png', {
        maxDiffPixels: 350,
      });
    });

    test('3D: Tablet (768px) - default state', async () => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('http://localhost:5173/cashflow');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('cashflow-tablet-default.png', {
        maxDiffPixels: 200,
      });
    });

    test('3E: Mobile (360px) - scroll state', async () => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto('http://localhost:5173/cashflow');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('cashflow-mobile-scroll-top.png', {
        maxDiffPixels: 150,
      });

      // Scroll down to see more
      await page.evaluate(() => window.scrollBy(0, 300));
      await page.waitForTimeout(200);

      await expect(page).toHaveScreenshot('cashflow-mobile-scroll-bottom.png', {
        maxDiffPixels: 150,
      });
    });

    test('3F: Many months variant (12+ months)', async () => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto('http://localhost:5173/cashflow');

      const inputs = page.locator('input[type="number"]');
      if ((await inputs.count()) > 0) {
        await inputs.first().fill('5000');
      }

      // Try to add more months
      const addButton = page.locator('button:has-text("Add"), button:has-text("+")').first();
      if (await addButton.isVisible()) {
        for (let i = 0; i < 3; i++) {
          await addButton.click();
          await page.waitForTimeout(100);
        }
      }

      await page.click('button:has-text("Calculate")').catch(() => {});
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('cashflow-desktop-many-months.png', {
        maxDiffPixels: 400,
      });
    });
  });

  // ============================================================================
  // SECTION 4: Dialogs & Overlays — Visual Snapshots
  // ============================================================================

  test.describe('4: Dialogs & Overlays', () => {
    test('4A: Share dialog - desktop', async () => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('http://localhost:5173/profit');

      // Trigger share dialog
      const shareButton = page.locator('button:has-text("Share")').first();
      if (await shareButton.isVisible()) {
        await shareButton.click();
        await page.waitForTimeout(300);

        const dialog = page.locator('[role="dialog"], .modal, [class*="dialog"]').first();
        if (await dialog.isVisible()) {
          await expect(page).toHaveScreenshot('dialog-share-desktop.png', {
            maxDiffPixels: 250,
          });
        }
      }
    });

    test('4B: Share dialog - mobile', async () => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto('http://localhost:5173/profit');

      const shareButton = page.locator('button:has-text("Share")').first();
      if (await shareButton.isVisible()) {
        await shareButton.click();
        await page.waitForTimeout(300);

        const dialog = page.locator('[role="dialog"], .modal, [class*="dialog"]').first();
        if (await dialog.isVisible()) {
          await expect(page).toHaveScreenshot('dialog-share-mobile.png', {
            maxDiffPixels: 200,
          });
        }
      }
    });

    test('4C: Export dialog - desktop', async () => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('http://localhost:5173/profit');

      const exportButton = page.locator('button:has-text("Export")').first();
      if (await exportButton.isVisible()) {
        await exportButton.click();
        await page.waitForTimeout(300);

        const dialog = page.locator('[role="dialog"], .modal, [class*="dialog"]').first();
        if (await dialog.isVisible()) {
          await expect(page).toHaveScreenshot('dialog-export-desktop.png', {
            maxDiffPixels: 250,
          });
        }
      }
    });

    test('4D: Confirmation dialog - desktop', async () => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('http://localhost:5173/profit');

      // Try to trigger delete or other confirmation
      const deleteButton = page.locator('button:has-text("Delete")').first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        await page.waitForTimeout(300);

        const dialog = page.locator('[role="dialog"], .modal, [class*="dialog"], [class*="confirm"]').first();
        if (await dialog.isVisible()) {
          await expect(page).toHaveScreenshot('dialog-confirm-desktop.png', {
            maxDiffPixels: 200,
          });
        }
      }
    });
  });

  // ============================================================================
  // SECTION 5: Embed Calculators — Visual Snapshots
  // ============================================================================

  test.describe('5: Embed Calculators', () => {
    test('5A: Embed profit calculator - all locales (desktop)', async () => {
      const locales = ['en', 'de', 'fr', 'es'];

      for (const locale of locales) {
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.goto(`http://localhost:5173/embed/${locale}/profit`);
        await page.waitForLoadState('networkidle');

        await expect(page).toHaveScreenshot(`embed-profit-${locale}-desktop.png`, {
          maxDiffPixels: 200,
        });
      }
    });

    test('5B: Embed break-even calculator - mobile', async () => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto('http://localhost:5173/embed/en/break-even');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('embed-breakeven-mobile.png', {
        maxDiffPixels: 150,
      });
    });

    test('5C: Embed cashflow calculator - tablet', async () => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('http://localhost:5173/embed/en/cashflow');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('embed-cashflow-tablet.png', {
        maxDiffPixels: 200,
      });
    });

    test('5D: Embed calculator - dark mode variant (if available)', async () => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('http://localhost:5173/embed/en/profit');

      // Try to toggle dark mode
      const themeToggle = page.locator('[aria-label*="theme"], [class*="theme"], button:has-text("Dark")').first();
      if (await themeToggle.isVisible()) {
        await themeToggle.click();
        await page.waitForTimeout(300);
      }

      await expect(page).toHaveScreenshot('embed-profit-dark-variant.png', {
        maxDiffPixels: 250,
      });
    });
  });

  // ============================================================================
  // SECTION 6: Error States & Edge Cases — Visual Snapshots
  // ============================================================================

  test.describe('6: Error States & Edge Cases', () => {
    test('6A: Invalid input (letters in number field)', async () => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('http://localhost:5173/profit');

      const input = page.locator('input[type="number"]').first();
      if (await input.isVisible()) {
        await input.fill('abc'); // Invalid
        await page.click('button:has-text("Calculate")').catch(() => {});
        await page.waitForTimeout(300);
      }

      await expect(page).toHaveScreenshot('error-invalid-input.png', {
        maxDiffPixels: 200,
      });
    });

    test('6B: Negative values variant', async () => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('http://localhost:5173/profit');

      await fillProfitInputs(page, '-5000', '2000');
      await clickCalculate(page);
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot('edge-negative-values.png', {
        mask: [page.locator('[class*="warning"]')], // Warning may be dynamic
        maxDiffPixels: 200,
      });
    });

    test('6C: All fields zero', async () => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('http://localhost:5173/profit');

      await fillProfitInputs(page, '0', '0');
      await clickCalculate(page);
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot('edge-zero-values.png', {
        maxDiffPixels: 200,
      });
    });

    test('6D: Maximum allowed values', async () => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('http://localhost:5173/profit');

      await fillProfitInputs(page, '999999999', '999999998');
      await clickCalculate(page);
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot('edge-maximum-values.png', {
        maxDiffPixels: 200,
      });
    });
  });

  // ============================================================================
  // SECTION 7: Font Scaling & Locale Variants — Visual Snapshots
  // ============================================================================

  test.describe('7: Font Scaling & Locales', () => {
    test('7A: Desktop with 150% font scale', async () => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto('http://localhost:5173/profit');

      // Apply font scaling
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '16px'; // Base
        document.body.style.fontSize = '24px'; // 150% scale
      });

      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('font-scale-150-desktop.png', {
        maxDiffPixels: 250,
      });
    });

    test('7B: German locale - calculation page', async () => {
      await page.setViewportSize({ width: 1280, height: 720 });
      // Navigation to German locale (depends on implementation)
      await page.goto('http://localhost:5173/profit?lang=de');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('locale-de-profit.png', {
        maxDiffPixels: 200,
      });
    });

    test('7C: Japanese locale - mobile view', async () => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto('http://localhost:5173/profit?lang=ja');
      await page.waitForLoadState('networkidle');

      await expect(page).toHaveScreenshot('locale-ja-profit-mobile.png', {
        maxDiffPixels: 150,
      });
    });
  });
});
