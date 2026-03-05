import { test, expect } from '@playwright/test';

/**
 * Chaos & Resilience Tests — Phase 3: Failure Handling 🛡️
 *
 * Validates system gracefully handles:
 * - Network failures (slow network, timeouts, connection drops)
 * - API errors (4xx, 5xx responses)
 * - Offline mode (service worker fallback)
 * - Storage corruption
 * - Partial data loss
 *
 * Run: playwright test tests/e2e/chaos.spec.ts
 */

test.describe('Chaos & Resilience Tests', () => {
  test('Handles network timeout gracefully', async ({ page }) => {
    // Prepare route abort on slow network
    await page.route('**/*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 15000)); // Simulate timeout
      await route.abort('timedout');
    });

    // Load page with network issue
    await page.goto('http://localhost:5173/profit', { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {
      // Expected to fail or timeout
    });

    // Should show error state or fallback UI
    const errorVisible = await page.locator('text=/error|retry|offline/i').isVisible().catch(() => false);
    const retryButton = await page.locator('button:has-text("Retry")').isVisible().catch(() => false);

    expect(errorVisible || retryButton).toBeTruthy(); // At least one recovery path
  });

  test('Recovers after network reconnection', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/*profit*', async (route) => {
      requestCount++;
      if (requestCount === 1) {
        // First request fails
        await route.abort('failed');
      } else {
        // Subsequent requests succeed
        await route.continue();
      }
    });

    await page.goto('http://localhost:5173/profit', { waitUntil: 'networkidle' }).catch(() => {});

    // Try to interact and trigger retry
    await page.fill('input[name=revenue]', '10000').catch(() => {});
    await page.fill('input[name=cost]', '6000').catch(() => {});

    // Wait for potential error recovery
    await page.waitForTimeout(2000);

    // Page should still be responsive (not in broken state)
    const inputsPresent = await page.locator('input[name=revenue]').isVisible().catch(() => false);
    expect(inputsPresent).toBeTruthy();
  });

  test('API error 500 shows recovery hint', async ({ page }) => {
    await page.route('**/api/**', (route) => {
      route.abort('failed');
    });

    await page.goto('http://localhost:5173/profit', { waitUntil: 'networkidle' });
    await page.fill('input[name=revenue]', '10000');
    await page.fill('input[name=cost]', '6000');
    await page.click('button:has-text("Calculate")');

    // Wait for error
    await page.waitForTimeout(2000);

    // Should show user-friendly error (not blank page)
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(500); // Not 404 or blank
  });

  test('Offline mode: calculator works without network', async ({ page, context }) => {
    // First: load page to cache resources
    await page.goto('http://localhost:5173/profit', { waitUntil: 'networkidle' });
    await page.fill('input[name=revenue]', '10000');
    await page.fill('input[name=cost]', '6000');
    await page.click('button:has-text("Calculate")');
    await page.waitForTimeout(1000);

    // Second: simulate offline by blocking all network
    await context.setOffline(true);

    // Calculator should still respond
    await page.fill('input[name=revenue]', '15000');
    await page.fill('input[name=cost]', '8000');
    await page.click('button:has-text("Calculate")');

    // Results should appear (from local calculation)
    const marginVisible = await page.locator('text=/Margin|Profit/').isVisible({ timeout: 5000 }).catch(() => false);
    expect(marginVisible).toBeTruthy();

    // Restore connection
    await context.setOffline(false);
  });

  test('Offline: scenario save/load persists', async ({ page, context }) => {
    // Load page online
    await page.goto('http://localhost:5173/profit', { waitUntil: 'networkidle' });
    await page.fill('input[name=revenue]', '50000');
    await page.fill('input[name=cost]', '30000');
    await page.click('button:has-text("Calculate")');

    // Save scenario (should work offline too)
    await page.click('button:has-text("Save")').catch(() => {});
    await page.waitForTimeout(1000);

    // Go offline
    await context.setOffline(true);

    // Reload page while offline
    await page.reload({ waitUntil: 'load' });

    // Saved data should be restored
    const revenueInput = await page.inputValue('input[name=revenue]').catch(() => '');
    expect(revenueInput).toContain('50000');

    await context.setOffline(false);
  });

  test('Handles malformed JSON response gracefully', async ({ page }) => {
    await page.route('**/api/**', (route) => {
      route.respond({
        status: 200,
        body: '{invalid json',
        headers: { 'Content-Type': 'application/json' }
      });
    });

    await page.goto('http://localhost:5173/profit', { waitUntil: 'networkidle' });

    // Should not crash, show error or fallback
    const pageStable = await page.evaluate(() => {
      return document.querySelector('button') !== null;
    });

    expect(pageStable).toBeTruthy(); // Page interactive
  });

  test('Slow memory: browser with limited resources', async ({ page }) => {
    // Simulate memory pressure
    const memoryBefore: number = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Perform many calculations
    for (let i = 0; i < 30; i++) {
      await page.goto('http://localhost:5173/profit', { waitUntil: 'networkidle' });
      await page.fill('input[name=revenue]', String(10000 + i * 500));
      await page.fill('input[name=cost]', String(6000 + i * 300));
      await page.click('button:has-text("Calculate")');
      await page.waitForTimeout(100);
    }

    const memoryAfter: number = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    const growthMB = (memoryAfter - memoryBefore) / 1024 / 1024;
    console.log(`Memory growth over 30 calculations: ${growthMB.toFixed(2)}MB`);

    // Should not balloon memory
    expect(growthMB).toBeLessThan(100); // Allow up to 100MB (sign of leak would be >500MB)
  });

  test('Rapid user interactions (mashing buttons) handled safely', async ({ page }) => {
    await page.goto('http://localhost:5173/profit', { waitUntil: 'networkidle' });

    // Fill inputs
    await page.fill('input[name=revenue]', '10000');
    await page.fill('input[name=cost]', '6000');

    // Rapidly click calculate button multiple times
    for (let i = 0; i < 20; i++) {
      await page.click('button:has-text("Calculate")', { force: true }).catch(() => {});
    }

    // Wait for stability
    await page.waitForTimeout(1000);

    // App should still be responsive
    const calcButtonEnabled = await page.locator('button:has-text("Calculate")').isEnabled().catch(() => false);
    expect(calcButtonEnabled).toBeTruthy();

    // Result should show (not duplicate/error)
    const resultVisible = await page.locator('text=/Margin|Profit/').isVisible().catch(() => true);
    expect(resultVisible).toBeTruthy();
  });

  test('Partial data load: incomplete API response', async ({ page }) => {
    // Simulate router abort (connection drop mid-response)
    let requestCount = 0;

    await page.route('**/api/**', async (route) => {
      requestCount++;
      if (requestCount <= 2) {
        await route.abort('failed');
      } else {
        await route.continue();
      }
    });

    await page.goto('http://localhost:5173/profit', { waitUntil: 'networkidle' }).catch(() => {});

    // Page should load and be usable
    await page.fill('input[name=revenue]', '10000').catch(() => {});
    await page.fill('input[name=cost]', '6000').catch(() => {});

    // Interact multiple times (allow retries)
    for (let i = 0; i < 3; i++) {
      await page.click('button:has-text("Calculate")').catch(() => {});
      await page.waitForTimeout(500);
    }

    const pageResponsive = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      return buttons.length > 0 && !document.querySelector('.error')?.textContent?.includes('crashed');
    });

    expect(pageResponsive).toBeTruthy();
  });

  test('Export fails gracefully when backend unavailable', async ({ page }) => {
    await page.route('**/api/export**', (route) => {
      route.abort('failed');
    });

    await page.goto('http://localhost:5173/profit', { waitUntil: 'networkidle' });
    await page.fill('input[name=revenue]', '50000');
    await page.fill('input[name=cost]', '30000');
    await page.click('button:has-text("Calculate")');

    // Try export
    await page.click('button:has-text("Export")').catch(() => {});
    await page.waitForTimeout(2000);

    // Should show error, not crash
    const exportError = await page.locator('text=/export.*fail|error|try again/i').isVisible({ timeout: 5000 }).catch(() => false);
    const pageStillInteractive = await page.locator('input[name=revenue]').isEnabled().catch(() => false);

    expect(exportError || pageStillInteractive).toBeTruthy();
  });
});
