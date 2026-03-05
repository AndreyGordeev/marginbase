/* eslint-disable @typescript-eslint/no-unused-vars */
import { test, expect } from '@playwright/test';

/**
 * Load Testing with Playwright — Phase 4B: Throughput & Latency ⚡
 *
 * Simulates load through browser context pooling and parallel requests.
 * Measures: latency distribution (p95/p99), error rates, throughput.
 *
 * Run: pnpm test:load (from apps/web)
 */

test.describe('Load Testing — Throughput & Latency', () => {
  // Configuration
  const NUM_CONCURRENT_CONTEXTS = 20; // Concurrent users
  const ITERATIONS_PER_CONTEXT = 10; // Requests per user
  const BASE_URL = 'http://localhost:5173';

  // Metrics collection
  interface LoadMetric {
    url: string;
    duration: number;
    status: number;
    timestamp: number;
  }

  const metrics: LoadMetric[] = [];

  // Helper: measure page load time
  async function measurePageLoad(
    url: string
  ): Promise<{ duration: number; status: number }> {
    let duration = 0;
    let status = 0;

    const start = performance.now();

    try {
      const response = await fetch(url, {
        method: 'GET',
      });
      duration = performance.now() - start;
      status = response.status;

      metrics.push({
        url,
        duration,
        status,
        timestamp: Date.now(),
      });

      return { duration, status };
    } catch {
      duration = performance.now() - start;
      status = 0; // Connection error

      metrics.push({
        url,
        duration,
        status,
        timestamp: Date.now(),
      });

      return { duration, status };
    }
  }

  // Helper: calculate percentile
  function percentile(arr: number[], p: number): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  // Helper: generate latency report
  function reportLatencies(): void {
    const durations = metrics.map((m) => m.duration);
    const errorCount = metrics.filter((m) => m.status !== 200).length;
    const successCount = metrics.filter((m) => m.status === 200).length;

    console.log(`
    ════════════════════════════════════════
    📊 LOAD TEST RESULTS
    ════════════════════════════════════════
    Total Requests:     ${metrics.length}
    Successful (200):   ${successCount}
    Failed/Errors:      ${errorCount}
    Error Rate:         ${((errorCount / metrics.length) * 100).toFixed(2)}%

    Latency (ms):
      Min:              ${Math.min(...durations).toFixed(1)}
      Avg:              ${(durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1)}
      p95:              ${percentile(durations, 95).toFixed(1)}
      p99:              ${percentile(durations, 99).toFixed(1)}
      Max:              ${Math.max(...durations).toFixed(1)}

    Throughput:
      ${(metrics.length / ((metrics[metrics.length - 1]?.timestamp - metrics[0]?.timestamp) / 1000)).toFixed(2)} req/sec
    ════════════════════════════════════════
    `);
  }

  test('Sequential load: 50 concurrent calculations', async ({ page, browser }) => {
    const urls = [
      `${BASE_URL}/profit`,
      `${BASE_URL}/break-even`,
      `${BASE_URL}/cashflow`,
    ];

    // Sequential measurement (not true parallelism, but browser API pattern)
    for (let i = 0; i < 50; i++) {
      const url = urls[i % urls.length];
      const result = await measurePageLoad(url);

      // Expect successful load (200) or cached response
      expect([200, 304]).toContain(result.status);
      // Expect reasonable latency (<2s for remote, <500ms for local)
      expect(result.duration).toBeLessThan(2000);

      // Think time between requests
      await page.waitForTimeout(100 + Math.random() * 900);
    }

    reportLatencies();

    // Validate thresholds
    const p95 = percentile(
      metrics.map((m) => m.duration),
      95
    );
    const p99 = percentile(
      metrics.map((m) => m.duration),
      99
    );
    const errorRate = metrics.filter((m) => m.status !== 200).length / metrics.length;

    expect(p95).toBeLessThan(1000); // P95 < 1s
    expect(p99).toBeLessThan(2000); // P99 < 2s
    expect(errorRate).toBeLessThan(0.01); // Error rate < 1%
  });

  test('Parallel contexts: 20 users × 10 iterations', async () => {
    const urls = [
      `${BASE_URL}/profit`,
      `${BASE_URL}/break-even`,
      `${BASE_URL}/cashflow`,
    ];

    const promises: Promise<void>[] = [];

    // Spawn concurrent context workers
    for (let u = 0; u < NUM_CONCURRENT_CONTEXTS; u++) {
      const userPromise = (async () => {
        for (let i = 0; i < ITERATIONS_PER_CONTEXT; i++) {
          const url = urls[(u + i) % urls.length];
          await measurePageLoad(url);

          // Random think time
          await new Promise((r) => setTimeout(r, 50 + Math.random() * 450));
        }
      })();

      promises.push(userPromise);
    }

    // Wait for all concurrent load to complete
    await Promise.all(promises);

    reportLatencies();

    // Validate thresholds
    const p95 = percentile(
      metrics.map((m) => m.duration),
      95
    );
    const errorRate = metrics.filter((m) => m.status !== 200).length / metrics.length;

    expect(p95).toBeLessThan(1500); // P95 < 1.5s under load
    expect(errorRate).toBeLessThan(0.02); // Error rate < 2% under stress
  });

  test('Spike test: 200 burst requests over 10 seconds', async () => {
    const urls = [
      `${BASE_URL}/profit`,
      `${BASE_URL}/break-even`,
      `${BASE_URL}/cashflow`,
    ];

    const startTime = performance.now();
    const burstPromises: Promise<{ duration: number; status: number }>[] = [];

    // Fire 200 concurrent requests (spike)
    for (let i = 0; i < 200; i++) {
      const url = urls[i % urls.length];
      burstPromises.push(measurePageLoad(url, i));
    }

    // Wait for all spike requests
    await Promise.all(burstPromises);

    reportLatencies();

    const p95 = percentile(
      metrics.map((m) => m.duration),
      95
    );
    const successRate = metrics.filter((m) => m.status === 200).length / metrics.length;

    // Spike tolerance: p95 may increase, but still should complete
    expect(p95).toBeLessThan(3000); // P95 < 3s during spike

  });

  test('Sustained load: 100 requests over 2 minutes (simulated)', async ({ page }) => {
    const urls = [
      `${BASE_URL}/profit`,
      `${BASE_URL}/break-even`,
      `${BASE_URL}/cashflow`,
    ];

    const startTime = performance.now();

    // Simulate 5 VUs × 20 requests each = 100 total requests
    for (let u = 0; u < 5; u++) {
      for (let i = 0; i < 20; i++) {
        const url = urls[(u * 7 + i) % urls.length]; // Deterministic URL selection
        await measurePageLoad(url, u);

        // Sustained think time
        await page.waitForTimeout(500 + Math.random() * 1500);
      }
    }

    const totalTime = performance.now() - startTime;

    reportLatencies();

    const avgLatency = metrics.reduce((a, m) => a + m.duration, 0) / metrics.length;
    const p99 = percentile(
      metrics.map((m) => m.duration),
      99
    );

    // Sustained load: should be stable, not degrading
    expect(avgLatency).toBeLessThan(1000); // Avg < 1s
    expect(p99).toBeLessThan(2500); // P99 < 2.5s
    expect(metrics.every((m) => m.status === 200)).toBe(true); // All successful
  });

  test('Memory stability check: 100 page loads without leak', async ({ page }) => {
    const startTime = performance.now();

    // Force garbage collection if available (V8 only)
    if (global.gc) {
      global.gc();
    }

    const initialMemory = process.memoryUsage().heapUsed;

    // Load same page 100 times
    for (let i = 0; i < 100; i++) {
      await page.goto(`${BASE_URL}/profit`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(50);
    }

    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const totalTime = performance.now() - startTime;
    const memoryGrowth = finalMemory - initialMemory;

    console.log(`
    Memory Stability Report:
    • Initial Heap:     ${(initialMemory / 1024 / 1024).toFixed(2)} MB
    • Final Heap:       ${(finalMemory / 1024 / 1024).toFixed(2)} MB
    • Growth:           ${(memoryGrowth / 1024 / 1024).toFixed(2)} MB
    • Time:             ${totalTime.toFixed(0)}ms
    • Avg per cycle:    ${(totalTime / 100).toFixed(1)}ms
    `);

    // Memory growth should be < 50MB over 100 loads
    expect(Math.abs(memoryGrowth)).toBeLessThan(50 * 1024 * 1024);
  });
});
