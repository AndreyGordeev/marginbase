import { test, expect } from '@playwright/test';

/**
 * Performance & Load Tests — Phase 3: Latency Gates 🚀
 *
 * Validates system responds fast (P95 < 100ms) under load
 * Measures time for critical user paths
 * Ensures no memory leaks or resource exhaustion
 *
 * Run: pnpm test:performance (or: playwright test tests/e2e/performance.spec.ts)
 */

test.describe('Performance & Load Tests', () => {
  // Baseline metrics
  const P95_THRESHOLD = 100; // milliseconds
  const SEQUENTIAL_LOAD = 50; // consecutive calculations

  // Collect timing metrics
  interface TimingMetric {
    name: string;
    duration: number;
  }

  const timings: TimingMetric[] = [];

  // Helper: measure async operation
  async function measure(name: string, fn: () => Promise<void>): Promise<number> {
    const start = performance.now();
    await fn();
    const duration = performance.now() - start;
    timings.push({ name, duration });
    return duration;
  }

  // Helper: calculate percentiles
  function percentile(arr: number[], p: number): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  test('Profit calculator responds in <100ms (P95)', async ({ page }) => {
    const times: number[] = [];

    for (let i = 0; i < 20; i++) {
      const duration = await measure(`profit-calc-${i}`, async () => {
        await page.goto('http://localhost:5173/profit', { waitUntil: 'networkidle' });
        await page.fill('input[name=revenue]', String(10000 + i * 100));
        await page.fill('input[name=cost]', String(6000 + i * 50));
        await page.click('button:has-text("Calculate")');
        await expect(page.locator('text=Margin')).toBeVisible({ timeout: 5000 });
      });
      times.push(duration);
    }

    const p95 = percentile(times, 95);
    const p99 = percentile(times, 99);

    console.log(`Profit Calculator - P95: ${p95.toFixed(2)}ms, P99: ${p99.toFixed(2)}ms`);
    expect(p95).toBeLessThan(P95_THRESHOLD);
  });

  test('Break-even calculator responds in <100ms (P95)', async ({ page }) => {
    const times: number[] = [];

    for (let i = 0; i < 20; i++) {
      const duration = await measure(`breakeven-calc-${i}`, async () => {
        await page.goto('http://localhost:5173/break-even', { waitUntil: 'networkidle' });
        await page.fill('input[name=price]', String(1000 + i * 10));
        await page.fill('input[name=variable_cost]', String(400 + i * 5));
        await page.fill('input[name=fixed_cost]', String(50000 + i * 1000));
        await page.click('button:has-text("Calculate")');
        await expect(page.locator('text=Break-Even Quantity')).toBeVisible({ timeout: 5000 });
      });
      times.push(duration);
    }

    const p95 = percentile(times, 95);
    console.log(`Break-Even Calculator - P95: ${p95.toFixed(2)}ms`);
    expect(p95).toBeLessThan(P95_THRESHOLD);
  });

  test('Cashflow calculator responds in <100ms (P95)', async ({ page }) => {
    const times: number[] = [];

    for (let i = 0; i < 20; i++) {
      const duration = await measure(`cashflow-calc-${i}`, async () => {
        await page.goto('http://localhost:5173/cashflow', { waitUntil: 'networkidle' });
        await page.fill('input[name=starting_cash]', '50000');
        await page.fill('input[name=monthly_revenue]', String(10000 + i * 500));
        await page.fill('input[name=monthly_costs]', String(5000 + i * 250));
        await page.fill('input[name=forecast_months]', '12');
        await page.click('button:has-text("Project")');
        await expect(page.locator('text=Month 1')).toBeVisible({ timeout: 5000 });
      });
      times.push(duration);
    }

    const p95 = percentile(times, 95);
    console.log(`Cashflow Calculator - P95: ${p95.toFixed(2)}ms`);
    expect(p95).toBeLessThan(P95_THRESHOLD);
  });

  test('Sequential 50 calculations complete in <6s (avg <120ms)', async ({ page }) => {
    const times: number[] = [];

    for (let i = 0; i < SEQUENTIAL_LOAD; i++) {
      const duration = await measure(`sequential-load-${i}`, async () => {
        await page.goto('http://localhost:5173/profit', { waitUntil: 'networkidle' });
        await page.fill('input[name=revenue]', String(5000 + i * 100 % 10000));
        await page.fill('input[name=cost]', String(3000 + i * 50 % 5000));
        await page.click('button:has-text("Calculate")');
        await page.waitForTimeout(100); // Brief pause
      });
      times.push(duration);
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`Sequential Load (50x) - Avg: ${avg.toFixed(2)}ms, P95: ${percentile(times, 95).toFixed(2)}ms`);
    expect(avg).toBeLessThan(120); // Allow slight overhead under sequential load
  });

  test('Page load completes in <2s (P95)', async ({ page }) => {
    const times: number[] = [];

    for (let i = 0; i < 15; i++) {
      const duration = await measure(`page-load-${i}`, async () => {
        await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
      });
      times.push(duration);
    }

    const p95 = percentile(times, 95);
    console.log(`Page Load - P95: ${p95.toFixed(2)}ms`);
    expect(p95).toBeLessThan(2000); // 2 seconds
  });

  test('Export scenario to PDF in <3s', async ({ page }) => {
    const times: number[] = [];

    for (let i = 0; i < 5; i++) {
      const duration = await measure(`export-pdf-${i}`, async () => {
        await page.goto('http://localhost:5173/profit', { waitUntil: 'networkidle' });
        await page.fill('input[name=revenue]', '50000');
        await page.fill('input[name=cost]', '30000');
        await page.click('button:has-text("Calculate")');
        await page.click('button:has-text("Export")');

        // Wait for PDF download
        const downloadPromise = page.waitForEvent('download');
        await downloadPromise;
      });
      times.push(duration);
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`Export to PDF - Avg: ${avg.toFixed(2)}ms`);
    expect(avg).toBeLessThan(3000);
  });

  test('No memory leak over 100 calculations', async ({ page }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const memoryBefore = (await page.evaluate(() => (performance as any).memory?.usedJSHeapSize)) || 0;

    for (let i = 0; i < 100; i++) {
      await page.goto('http://localhost:5173/profit', { waitUntil: 'networkidle' });
      await page.fill('input[name=revenue]', String(10000 + i % 1000));
      await page.fill('input[name=cost]', String(6000 + i % 500));
      await page.click('button:has-text("Calculate")');
      await page.waitForTimeout(50);
    }


    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const memoryAfter = (await page.evaluate(() => (performance as any).memory?.usedJSHeapSize)) || 0;
    const memoryGrowth = memoryAfter - memoryBefore;
    const growthMB = memoryGrowth / 1024 / 1024;

    console.log(`Memory growth after 100 calculations: ${growthMB.toFixed(2)}MB`);
    // Allow up to 50MB growth (sign of leak would be >100MB)
    expect(growthMB).toBeLessThan(50);
  });

  test.afterAll(() => {
    if (timings.length > 0) {
      const durations = timings.map((t) => t.duration);
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      const p95 = percentile(durations, 95);
      const p99 = percentile(durations, 99);

      console.log(`\n📊 Performance Summary:`);
      console.log(`   Total operations: ${timings.length}`);
      console.log(`   Average: ${avg.toFixed(2)}ms`);
      console.log(`   P95: ${p95.toFixed(2)}ms`);
      console.log(`   P99: ${p99.toFixed(2)}ms`);
      console.log(`   Max: ${Math.max(...durations).toFixed(2)}ms`);
    }
  });
});
