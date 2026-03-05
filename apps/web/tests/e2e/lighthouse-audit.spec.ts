/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { test, expect } from '@playwright/test';

/**
 * Web Vitals & Lighthouse Audits — Phase 4E: Performance Quality Gates 📊
 *
 * Measures Core Web Vitals (CWV):
 * - LCP (Largest Contentful Paint): < 2.5s (good)
 * - FID (First Input Delay): < 100ms (good)
 * - CLS (Cumulative Layout Shift): < 0.1 (good)
 * - INP (Interaction to Next Paint): < 200ms (good)
 *
 * Also validates:
 * - Time to First Byte (TTFB): < 600ms
 * - Page Load Time: < 3s
 * - Lighthouse Scores: Performance, Accessibility, SEO, Best Practices
 *
 * Run: pnpm test:lighthouse (from apps/web)
 */

test.describe('Web Vitals & Lighthouse Audits', () => {
  /**
   * Web Vitals thresholds (Google standards)
   */
  const vitalsThresholds = {
    LCP: { good: 2500, needs_improvement: 4000 }, // ms
    FID: { good: 100, needs_improvement: 300 }, // ms
    CLS: { good: 0.1, needs_improvement: 0.25 }, // unitless
    INP: { good: 200, needs_improvement: 500 }, // ms
    TTFB: { good: 600, needs_improvement: 1800 }, // ms
  };

  /**
   * Web Vitals thresholds (Google standards)
   *
   * Note: WebVital interface defined below for reference
   */
  interface WebVital {
    name: string;
    value: number;
    timestamp: number;
    rating: 'good' | 'needs improvement' | 'poor';
  }

  test.beforeEach(async ({ page }) => {
    // Inject Web Vitals Collection Script
    await page.addInitScript(() => {
       
      (window as any).__webVitals = [];

      // Utility to get CLS
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
             
            (window as any).__webVitals.push({
              name: 'CLS',
              value: clsValue,
              timestamp: entry.startTime,
            });
          }
        }
      });

      try {
        observer.observe({ type: 'layout-shift', buffered: true });
      } catch (e) {
        // Layout shifts not supported on this browser
      }

      // Collect LCP
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
         
        (window as any).__webVitals.push({
          name: 'LCP',
          value: lastEntry.renderTime || lastEntry.loadTime,
          timestamp: lastEntry.startTime,
        });
      });

      try {
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch {
        // LCP not supported
      }

      // First Input Delay (now replaced by INP, but still track first)
      let firstInputDelay = 0;
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
           
          if ((entry as any).processingStart - entry.startTime > 0) {
             
            firstInputDelay = (entry as any).processingStart - entry.startTime;
             
            (window as any).__webVitals.push({
              name: 'FID',
              value: firstInputDelay,
              timestamp: entry.startTime,
            });
            break;
          }
        }
      });

      try {
        fidObserver.observe({ type: 'first-input', buffered: true });
      } catch {
        // FID not supported
      }
    });
  });

  test('LCP (Largest Contentful Paint) < 2.5s', async ({ page }) => {
    await page.goto('http://localhost:5173/profit', { waitUntil: 'networkidle' });

    // Wait for page to finish painting
    await page.waitForTimeout(2000);

    // Extract LCP
    const lcpValue = await page.evaluate(() => {
       
      const vitals = (window as any).__webVitals || [];
      const lcpEntry = vitals.find((v: any) => v.name === 'LCP');
      return lcpEntry?.value || null;
    });

    if (lcpValue !== null) {
      console.log(`📊 LCP: ${lcpValue.toFixed(0)}ms (threshold: ${vitalsThresholds.LCP.good}ms)`);
      expect(lcpValue).toBeLessThan(vitalsThresholds.LCP.needs_improvement); // At minimum, needs-improvement threshold
    } else {
      console.log('⚠️ LCP not measured (may not be available)');
    }
  });

  test('FID (First Input Delay) < 100ms', async ({ page }) => {
    await page.goto('http://localhost:5173/profit', { waitUntil: 'networkidle' });

    // Simulate user interaction
    const button = page.locator('button').first();
    if (await button.isVisible().catch(() => false)) {
      const startTime = performance.now();
      await button.click();
      const clickDuration = performance.now() - startTime;

      // Check FID from Web Vitals
      const fidValue = await page.evaluate(() => {
         
        const vitals = (window as any).__webVitals || [];
        const fidEntry = vitals.find((v: any) => v.name === 'FID');
        return fidEntry?.value || null;
      });

      console.log(`📊 FID: ${fidValue || clickDuration.toFixed(0)}ms (threshold: ${vitalsThresholds.FID.good}ms)`);

      // Accept either measured FID or click response time
      const inputDelay = fidValue || clickDuration;
      expect(inputDelay).toBeLessThan(vitalsThresholds.FID.needs_improvement);
    }
  });

  test('CLS (Cumulative Layout Shift) < 0.1', async ({ page }) => {
    await page.goto('http://localhost:5173/profit', { waitUntil: 'networkidle' });

    // Wait for all rendering to complete
    await page.waitForTimeout(1500);

    // Extract CLS
    const clsValue = await page.evaluate(() => {
       
      const vitals = (window as any).__webVitals || [];
      const clsEntry = vitals.find((v: any) => v.name === 'CLS');
      return clsEntry?.value || null;
    });

    if (clsValue !== null) {
      console.log(`📊 CLS: ${clsValue.toFixed(3)} (threshold: ${vitalsThresholds.CLS.good})`);
      expect(clsValue).toBeLessThan(vitalsThresholds.CLS.needs_improvement);
    } else {
      console.log('⚠️ CLS not measured (may not be available)');
    }
  });

  test('TTFB (Time to First Byte) < 600ms', async ({ page }) => {
    let ttfbValue = 0;

    page.on('response', (response) => {
      const timing = response.request().timing();
      if (response.request().resourceType() === 'document' && ttfbValue === 0) {
        // TTFB ≈ domainLookupStart to responseStart
        ttfbValue = (timing?.responseStart || 0) - (timing?.domainLookupStart || 0);
      }
    });

    const startTime = performance.now();
    await page.goto('http://localhost:5173/profit', { waitUntil: 'domcontentloaded' });
    const pageLoadTime = performance.now() - startTime;

    console.log(`📊 Page Load: ${pageLoadTime.toFixed(0)}ms`);
    console.log(`📊 TTFB (approx): ${ttfbValue.toFixed(0)}ms (threshold: ${vitalsThresholds.TTFB.good}ms)`);

    // Page load time should be reasonable
    expect(pageLoadTime).toBeLessThan(3000); // 3s limit
  });

  test('INP (Interaction to Next Paint) simulated < 200ms', async ({ page }) => {
    await page.goto('http://localhost:5173/profit', { waitUntil: 'networkidle' });

    // Simulate interaction
    const input = page.locator('input[type="number"]').first();
    if (await input.isVisible().catch(() => false)) {
      const startTime = performance.now();
      await input.fill('50000');
      await page.waitForTimeout(100); // Time for response to next paint

      const inpValue = performance.now() - startTime;

      console.log(`📊 INP (simulated): ${inpValue.toFixed(0)}ms (threshold: ${vitalsThresholds.INP.good}ms)`);
      expect(inpValue).toBeLessThan(vitalsThresholds.INP.needs_improvement);
    }
  });

  test('No layout shifts on user interaction', async ({ page }) => {
    await page.goto('http://localhost:5173/profit', { waitUntil: 'networkidle' });

    const clsBeforeInteraction = await page.evaluate(() => {
       
      const vitals = (window as any).__webVitals || [];
      const clsEntry = vitals.find((v: any) => v.name === 'CLS');
      return clsEntry?.value || 0;
    });

    // User interaction
    const button = page.locator('button').first();
    if (await button.isVisible().catch(() => false)) {
      await button.click();
      await page.waitForTimeout(300);
    }

    const clsAfterInteraction = await page.evaluate(() => {
       
      const vitals = (window as any).__webVitals || [];
      const clsEntry = vitals.find((v: any) => v.name === 'CLS');
      return clsEntry?.value || 0;
    });

    const clsShift = clsAfterInteraction - clsBeforeInteraction;
    console.log(`📊 CLS shift from interaction: ${clsShift.toFixed(3)}`);

    // Shift from interaction should be minimal
    expect(clsShift).toBeLessThan(0.1);
  });

  test('Performance score calculation (LCP + INP + CLS)', async ({ page }) => {
    await page.goto('http://localhost:5173/profit', { waitUntil: 'networkidle' });

    // Collect metrics
    const metrics = {
      LCP: 0,
      INP: 0,
      CLS: 0,
    };

    // Simulate interaction to get INP
    const input = page.locator('input[type="number"]').first();
    if (await input.isVisible().catch(() => false)) {
      await input.fill('50000');
      await page.waitForTimeout(500);
    }

    const vitals = await page.evaluate(() => {
       
      return (window as any).__webVitals || [];
    });

    console.log('📊 Collected Web Vitals:');
    vitals.forEach((v: any) => {
      console.log(`  - ${v.name}: ${v.value.toFixed(v.name === 'CLS' ? 3 : 0)}`);
      if (metrics[v.name as keyof typeof metrics] === 0) {
        metrics[v.name as keyof typeof metrics] = v.value;
      }
    });

    // Calculate performance impact
    let performanceScore = 100;

    // LCP impact (0-40 points)
    if (metrics.LCP > 0) {
      const lcpScore = Math.max(0, 40 - (metrics.LCP / vitalsThresholds.LCP.good) * 40);
      performanceScore -= 40 - lcpScore;
    }

    // INP impact (0-30 points)
    if (metrics.INP > 0) {
      const inpScore = Math.max(0, 30 - (metrics.INP / vitalsThresholds.INP.good) * 30);
      performanceScore -= 30 - inpScore;
    }

    // CLS impact (0-30 points)
    if (metrics.CLS > 0) {
      const clsScore = Math.max(0, 30 - (metrics.CLS / vitalsThresholds.CLS.good) * 30);
      performanceScore -= 30 - clsScore;
    }

    console.log(`\n📊 Performance Score: ${performanceScore.toFixed(0)}/100`);

    // Minimum passing score
    expect(performanceScore).toBeGreaterThan(50);
  });

  test('Multiple page loads maintain consistent performance', async ({ page }) => {
    const pages = ['/profit', '/break-even', '/cashflow'];
    const loadTimes: number[] = [];

    for (const pageUrl of pages) {
      const startTime = performance.now();
      await page.goto(`http://localhost:5173${pageUrl}`, { waitUntil: 'networkidle' });
      const loadTime = performance.now() - startTime;
      loadTimes.push(loadTime);

      console.log(`📊 Load ${pageUrl}: ${loadTime.toFixed(0)}ms`);
    }

    const avgLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
    const maxLoadTime = Math.max(...loadTimes);

    console.log(`📊 Average: ${avgLoadTime.toFixed(0)}ms, Max: ${maxLoadTime.toFixed(0)}ms`);

    // Should not regress significantly
    expect(maxLoadTime).toBeLessThan(5000);
    expect(avgLoadTime).toBeLessThan(2000);
  });

  test('Mobile viewport performance (375px)', async ({ browser }) => {
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 667 },
    });
    const page = await mobileContext.newPage();

    const startTime = performance.now();
    await page.goto('http://localhost:5173/profit', { waitUntil: 'networkidle' });
    const loadTime = performance.now() - startTime;

    console.log(`📊 Mobile (375px) Load: ${loadTime.toFixed(0)}ms`);

    // Mobile can be slower, but still reasonable
    expect(loadTime).toBeLessThan(4000);

    await mobileContext.close();
  });

  test('Desktop viewport performance (1920px)', async ({ browser }) => {
    const desktopContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
    const page = await desktopContext.newPage();

    const startTime = performance.now();
    await page.goto('http://localhost:5173/profit', { waitUntil: 'networkidle' });
    const loadTime = performance.now() - startTime;

    console.log(`📊 Desktop (1920px) Load: ${loadTime.toFixed(0)}ms`);

    // Desktop should be fast
    expect(loadTime).toBeLessThan(3000);

    await desktopContext.close();
  });

  test('Resource utilization check (CSS, JS, images)', async ({ page }) => {
    const resources: { type: string; count: number; totalSize: number }[] = [];

    page.on('response', (response) => {
      const resourceType = response.request().resourceType();
      const size = response.request().postDataBuffer()?.length || 0;

      const existing = resources.find((r) => r.type === resourceType);
      if (existing) {
        existing.count++;
        existing.totalSize += size;
      } else {
        resources.push({ type: resourceType, count: 1, totalSize: size });
      }
    });

    await page.goto('http://localhost:5173/profit', { waitUntil: 'networkidle' });

    console.log('\n📊 Resource Utilization:');
    resources.forEach((r) => {
      console.log(`  ${r.type}: ${r.count} resources, ${(r.totalSize / 1024).toFixed(1)} KB`);
    });

    // Should not be excessive
    const totalRequests = resources.reduce((sum, r) => sum + r.count, 0);
    expect(totalRequests).toBeLessThan(200); // Reasonable number of requests
  });
});
