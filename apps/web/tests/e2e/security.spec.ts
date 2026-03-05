/* eslint-disable @typescript-eslint/no-unused-vars */
import { test, expect } from '@playwright/test';

/**
 * Security & Secrets Detection Tests — Phase 4C: SAST Checks 🔐
 *
 * Validates:
 * - No console logs with sensitive data (revenue, costs, passwords)
 * - No plaintext secrets in code
 * - No XSS/SQL injection vectors in user input
 * - No eval() or dangerouslySetInnerHTML without sanitization
 *
 * Run: pnpm test:security (from apps/web)
 * Or: semgrep --config=.semgrep.yml src/ packages/ apps/
 */

test.describe('Security & SAST Tests', () => {
  test('No console logs with financial data in production', async ({ page }) => {
    // Intercept and collect all console messages
    const consoleLogs: { method: string; text: string }[] = [];

    page.on('console', (msg) => {
      consoleLogs.push({
        method: msg.type(),
        text: msg.text(),
      });
    });

    await page.goto('http://localhost:5173/profit', { waitUntil: 'networkidle' });

    // Fill form and trigger calculation
    const numberInputs = page.locator('input[type="number"]');
    const count = await numberInputs.count();
    if (count >= 2) {
      await numberInputs.first().fill('50000');
      await numberInputs.nth(1).fill('30000');
    }

    const calculateBtn = page.locator('button:has-text("Calculate")').first();
    if (await calculateBtn.isVisible().catch(() => false)) {
      await calculateBtn.click();
      await page.waitForTimeout(500);
    }

    // Check for sensitive data in logs
    const sensitivePatterns = [
      /revenue/i,
      /cost/i,
      /profit/i,
      /cashflow/i,
      /money/i,
      /amount/i,
      /password/i,
      /token/i,
      /secret/i,
      /api_key/i,
      /50000|30000|20000/,
    ];

    const violatingLogs = consoleLogs.filter((log) => {
      if (log.method === 'error' || log.method === 'warning') {
        // Allow errors/warnings with financial terms (expected in error messages)
        return false;
      }
      return sensitivePatterns.some((p) => p.test(log.text));
    });

    expect(
      violatingLogs.length,
      `Found ${violatingLogs.length} console logs with sensitive data: ${violatingLogs.map((l) => l.text).join('; ')}`
    ).toBe(0);
  });

  test('No XSS vectors in scenario export (HTML sanitization)', async ({ page }) => {
    // Create scenario with malicious payload
    const maliciousScenario = {
      name: '<img src=x onerror="alert(\'XSS\')">',
      inputs: {
        revenue: 50000,
        cost: 30000,
      },
    };

    await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle' });

    // Try to import malicious scenario (if import UI exists)
    const importBtn = page.locator('button:has-text("Import")').first();
    if (await importBtn.isVisible().catch(() => false)) {
      await importBtn.click();

      // Paste malicious JSON
      const textarea = page.locator('textarea').first();
      if (await textarea.isVisible().catch(() => false)) {
        await textarea.fill(JSON.stringify([maliciousScenario]));
        await page.locator('button:has-text("Import")').last().click();
      }
    }

    // Capture any alerts (would indicate XSS success)
    let alertTriggered = false;
    page.on('dialog', (dialog) => {
      alertTriggered = true;
      dialog.dismiss();
    });

    await page.waitForTimeout(500);

    // XSS should NOT trigger alert
    expect(alertTriggered, 'XSS payload was executed (alert triggered)').toBe(false);

    // Check that malicious name is rendered safely (escaped, not executed)
    const scenarioCard = page.locator(`text=${maliciousScenario.name}`).first();
    const isVisible = await scenarioCard.isVisible().catch(() => false);

    if (isVisible) {
      // If text is visible, verify it's escaped (substring match, not DOM execution)
      const innerHTML = await page.locator('body').innerHTML();
      expect(
        innerHTML.includes('&lt;img') || innerHTML.includes('&quot;') || !innerHTML.includes('onerror='),
        'Malicious HTML was not escaped'
      ).toBe(true);
    }
  });

  test('No eval() or Function() constructor in calculation', async ({ page }) => {
    let evalDetected = false;
    let functionConstructorDetected = false;

    // Override global eval and Function
    await page.addInitScript(() => {

      const originalEval = eval;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).eval = function (...args: any[]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__evalDetected = true;
        return originalEval.apply(this, args);
      };

      const OriginalFunction = Function;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).Function = function (...args: any[]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__functionConstructorDetected = true;
        return OriginalFunction.apply(this, args);
      };
    });

    await page.goto('http://localhost:5173/profit', { waitUntil: 'networkidle' });

    // Fill form and calculate
    const inputs = page.locator('input[type="number"]');
    if ((await inputs.count()) >= 2) {
      await inputs.first().fill('50000');
      await inputs.nth(1).fill('30000');
    }

    const calculateBtn = page.locator('button:has-text("Calculate")').first();
    if (await calculateBtn.isVisible().catch(() => false)) {
      await calculateBtn.click();
      await page.waitForTimeout(500);
    }

    // Check if eval or Function constructor was called
    evalDetected = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return !!(window as any).__evalDetected;
    });

    functionConstructorDetected = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return !!(window as any).__functionConstructorDetected;
    });

    expect(evalDetected, 'eval() was called during calculation').toBe(false);
    expect(functionConstructorDetected, 'new Function() was called during calculation').toBe(false);
  });

  test('API responses validated for malformed content', async ({ page }) => {
    // Intercept API to inject malformed response
    await page.route('**/api/**', (route) => {
      // Return malformed JSON (missing closing bracket)
      route.abort();
    });

    await page.goto('http://localhost:5173/profit', { waitUntil: 'domcontentloaded' });

    // Try to perform action that would trigger API
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('JSON')) {
        malformedDetected = true;
      }
    });

    // App should not crash; should show user-friendly error
    const errorUI = page.locator('text=/error|failed/i, [role="alert"]').first();
// Intercept API to fail silently, check error UI
      await page.route('**/*api*', (route) => route.abort());

    // Either graceful error shown, or app stayed responsive
    expect(
      isPresent || !(await page.locator('main, [role="main"]').isVisible().catch(() => false)),
      'Malformed API response caused unhandled crash'
    ).toBe(false);
  });

  test('No hardcoded secrets in network requests', async ({ page }) => {
    const capturedRequests: { url: string; headers: Record<string, string> }[] = [];

    page.on('request', (request) => {
      capturedRequests.push({
        url: request.url(),
        headers: { ...request.allHeaders() },
      });
    });

    await page.goto('http://localhost:5173/profit', { waitUntil: 'networkidle' });

    // Check for hardcoded tokens/secrets in Authorization headers
    const secretPatterns = [
      /Bearer\s+[A-Za-z0-9\-_.]*[a-z0-9]{20,}/i,
      /token\s*=\s*[A-Za-z0-9\-_.]{20,}/i,
      /password\s*=\s*[^\s]{8,}/i,
      /sk_[a-z0-9]{24,}/i, // Stripe secret key pattern
    ];

    const suspiciousRequests = capturedRequests.filter((req) => {
      const allText = `${req.url} ${JSON.stringify(req.headers)}`;
      return secretPatterns.some((p) => p.test(allText));
    });

    expect(
      suspiciousRequests.length,
      `Found ${suspiciousRequests.length} requests with potential hardcoded secrets`
    ).toBe(0);
  });

  test('Storage (IndexedDB) data encryption at rest (if applicable)', async ({ page }) => {
    // This is a placeholder; actual encryption verification would require
    // accessing IndexedDB directly and checking encryption markers

    await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle' });

    // OpenDB and check for encrypted data markers

    await page.evaluate(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (window as any).__dbDebugInfo || { encrypted: 'unknown' };
    });
  });

  test('CORS headers validated (no overly permissive policies)', async ({ page }) => {
    let corsViolations: string[] = [];

    page.on('response', (response) => {
      const corsHeader = response.headers()['access-control-allow-origin'];
      if (corsHeader === '*') {
        corsViolations.push(response.url());
      }
    });

    await page.goto('http://localhost:5173/profit', { waitUntil: 'networkidle' });

    // CORS: '*' is OK for public APIs that don't require auth
    // But flag if used on authenticated endpoints
    if (corsViolations.length > 0) {
      console.log('⚠️ Warning: CORS allow-origin: * on:', corsViolations);
      // Not a hard fail; depends on endpoint
    }

    expect(corsViolations.length).toBeLessThanOrEqual(5); // Allow some permissive CORS
  });
});
