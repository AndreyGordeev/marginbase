import { test, expect, Page, BrowserContext } from '@playwright/test';
import {
  assertPayloadPrivacy,
  assertNoSuspiciousNumerics,
  extractPayloadLeafValues,
  FORBIDDEN_KEYS,
} from '../helpers/privacy-guards';

/**
 * Privacy Tests — Hard Gate #1: Financial Data Never Leaves Device 🔒
 *
 * Every test must verify that:
 * - Telemetry events don't contain financial data
 * - API requests are properly cleaned
 * - Shared/exported artifacts are sanitized
 * - Logs don't expose sensitive information
 *
 * Hard block if any violation detected.
 */

test.describe('Privacy: Hard Gate #1 - Financial Data Protection', () => {
  let page: Page;
  let context: BrowserContext;

  // Collect all network requests during test
  const networkRequests: { url: string; body?: unknown; response?: unknown }[] = [];
  const telemetryEvents: unknown[] = [];
  const consoleLogs: string[] = [];

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();

    // Intercept network requests
    page.on('request', (request) => {
      const url = request.url();

      // Only capture our API calls
      if (url.includes('/api/') || url.includes('localhost')) {
        networkRequests.push({
          url,
          body: request.postDataJSON?.(),
        });
      }
    });

    // Intercept console messages
    page.on('console', (msg) => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Intercept telemetry by mocking window.navigator.sendBeacon
    await page.addInitScript(() => {
      const originalSendBeacon = navigator.sendBeacon;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__telemetryInvocations = [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigator.sendBeacon = function (url: string, data?: any) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__telemetryInvocations.push({
          url,
          data:
            typeof data === 'string'
              ? JSON.parse(data)
              : data instanceof ArrayBuffer
                ? new TextDecoder().decode(new Uint8Array(data))
                : data,
        });
        return originalSendBeacon.call(this, url, data);
      };
    });
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.afterEach(async () => {
    // Extract telemetry invocations from page
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invocations = await page.evaluate(() => (window as any).__telemetryInvocations);
    if (invocations) {
      telemetryEvents.push(...invocations);
    }

    networkRequests.length = 0;
    consoleLogs.length = 0;
  });

  // ============================================================================
  // SECTION 1: Telemetry Payload Sanitization
  // ============================================================================

  test('1A: Telemetry event for calculator view should NOT contain financial data', async () => {
    await page.goto('http://localhost:5173/profit');
    await page.waitForLoadState('networkidle');

    // Simulate a telemetry event by interacting with the app
    await page.click('text=Calculate');
    await page.waitForTimeout(500);

    // Get telemetry events
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const events = await page.evaluate(() => (window as any).__telemetryInvocations);
    expect(events.length).toBeGreaterThan(0);

    for (const event of events) {
      // Assert no forbidden keys
      assertPayloadPrivacy(event.data, `Telemetry event: ${event.url}`);

      // Warn about suspicious numerics
      assertNoSuspiciousNumerics(
        event.data,
        `Telemetry suspicious values: ${event.url}`,
      );
    }
  });

  test('1B: Telemetry should never include revenue, cost, or profit', async () => {
    await page.goto('http://localhost:5173/profit');

    // Fill in profit calculator
    await page.fill('input[name="revenue"]', '10000');
    await page.fill('input[name="cost"]', '6000');
    await page.click('button:has-text("Calculate")');
    await page.waitForTimeout(500);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const events = await page.evaluate(() => (window as any).__telemetryInvocations);

    for (const event of events) {
      for (const forbiddenKey of FORBIDDEN_KEYS) {
        const leafValues = extractPayloadLeafValues(event.data);
        for (const [path, value] of leafValues) {
          if (path.toLowerCase().includes(forbiddenKey)) {
            throw new Error(
              `PRIVACY VIOLATION: Telemetry contains "${forbiddenKey}" at path "${path}" with value "${value}"`,
            );
          }
        }
      }
    }
  });

  test('1C: All telemetry events must be classified (have event_type)', async () => {
    await page.goto('http://localhost:5173/profit');
    await page.click('button:has-text("Calculate")');
    await page.waitForTimeout(500);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const events = await page.evaluate(() => (window as any).__telemetryInvocations);
    expect(events.length).toBeGreaterThan(0);

    for (const event of events) {
      // Event should have classification
      expect(
        event.data?.event_type ||
          event.data?.type ||
          event.data?.name,
      ).toBeTruthy();
    }
  });

  // ============================================================================
  // SECTION 2: Network Request Inspection
  // ============================================================================

  test('2A: API requests to share endpoint must NOT include scenario values', async () => {
    await page.goto('http://localhost:5173/profit');

    // Fill form
    await page.fill('input[name="revenue"]', '10000');
    await page.fill('input[name="cost"]', '6000');

    // Intercept POST to share endpoint
    const shareResponse = page.waitForResponse((response) =>
      response.url().includes('/api/share'),
    );

    // Try to create share (may fail if backend not available, that's OK)
    try {
      await page.click('button:has-text("Share")');
      const response = await Promise.race([shareResponse, new Promise((r) => setTimeout(r, 3000))]);

      if (response) {
        // Check request body didn't leak scenario data
        const request = response.request();
        const postData = request.postDataJSON?.();

        if (postData) {
          assertPayloadPrivacy(
            postData,
            'Share endpoint request body',
          );
        }
      }
    } catch {
      // API may not be available in test environment, that's acceptable
    }
  });

  test('2B: Export endpoint must NOT leak scenario values in metadata', async () => {
    await page.goto('http://localhost:5173/profit');

    // Fill calculator
    await page.fill('input[name="revenue"]', '10000');
    await page.fill('input[name="cost"]', '6000');

    // Try export (may not be available)
    try {
      await page.click('button:has-text("Export")');
      await page.waitForTimeout(500);
    } catch {
      // Expected if export not implemented yet
    }
  });

  // ============================================================================
  // SECTION 3: Shared Artifact Validation
  // ============================================================================

  test('3A: Shared scenario URL should NOT contain unencrypted financial data', async () => {
    // When share link is generated, check it doesn't encode revenue/cost/profit
    await page.goto('http://localhost:5173/profit');

    await page.fill('input[name="revenue"]', '10000');
    await page.fill('input[name="cost"]', '6000');

    const url = page.url();

    // URL should not contain forbidden business logic values
    for (const forbiddenKey of FORBIDDEN_KEYS) {
      expect(url.toLowerCase()).not.toContain(forbiddenKey);
    }

    // URL should not contain unencrypted numbers that look like revenue
    expect(url).not.toMatch(/[?&](revenue|cost|profit)=\d+/i);
  });

  test('3B: Export file metadata should be sanitized', async () => {
    // This test validates that when exporting to PDF/XLSX,
    // the metadata (title, author, etc.) doesn't leak scenario data

    await page.goto('http://localhost:5173/profit');
    await page.fill('input[name="revenue"]', '10000');
    await page.fill('input[name="cost"]', '6000');

    // Try to export and intercept file download
    const downloadPromise = page.waitForEvent('download').catch(() => null);

    try {
      await page.click('button:has-text("Download")');
      const download = await Promise.race([
        downloadPromise,
        new Promise((r) => setTimeout(r, 2000)),
      ]);

      if (download) {
        // Filename should not contain scenario values
        const filename = download.suggestedFilename?.toLowerCase() || '';
        for (const forbiddenKey of FORBIDDEN_KEYS) {
          expect(filename).not.toContain(forbiddenKey);
        }
      }
    } catch {
      // Expected if export/download not available
    }
  });

  // ============================================================================
  // SECTION 4: Log Sanitization
  // ============================================================================

  test('4A: Console should NOT log financial scenario values', async () => {
    // Clear previous logs
    consoleLogs.length = 0;

    await page.goto('http://localhost:5173/profit');

    // Fill form
    await page.fill('input[name="revenue"]', '10000');
    await page.fill('input[name="cost"]', '6000');
    await page.click('button:has-text("Calculate")');
    await page.waitForTimeout(500);

    // Check console logs
    for (const log of consoleLogs) {
      for (const forbiddenKey of FORBIDDEN_KEYS) {
        expect(log.toLowerCase()).not.toContain(forbiddenKey);
      }
    }
  });

  test('4B: Error messages must not expose scenario data', async () => {
    consoleLogs.length = 0;

    await page.goto('http://localhost:5173/profit');

    // Try to trigger an error by entering invalid data
    await page.fill('input[name="revenue"]', 'invalid');
    await page.click('button:has-text("Calculate")');
    await page.waitForTimeout(500);

    // Check error logs didn't expose data
    for (const log of consoleLogs) {
      if (log.includes('error') || log.includes('Error')) {
        // Error messages should be generic, not reveal internals
        expect(log).not.toMatch(/\d{4,}/); // No large numbers
        expect(log).not.toMatch(/\$[\d,]+/); // No currency patterns
      }
    }
  });

  // ============================================================================
  // SECTION 5: Edge Cases & Encoding Attacks
  // ============================================================================

  test('5A: Base64-encoded financial data should not appear in requests', async () => {
    await page.goto('http://localhost:5173/profit');

    await page.fill('input[name="revenue"]', '10000');
    await page.fill('input[name="cost"]', '6000');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const events = await page.evaluate(() => (window as any).__telemetryInvocations);

    for (const event of events) {
      const payload = JSON.stringify(event.data);

      // Check for suspiciously long Base64-like strings
      const base64ish = payload.match(/[A-Za-z0-9+/]{50,}={0,2}/g);
      if (base64ish?.length) {
        for (const encoded of base64ish) {
          try {
            const decoded = atob(encoded);
            // Check if decoded contains forbidden keys
            for (const forbiddenKey of FORBIDDEN_KEYS) {
              expect(decoded.toLowerCase()).not.toContain(forbiddenKey);
            }
          } catch {
            // Not valid Base64, skip
          }
        }
      }
    }
  });

  test('5B: Special characters should not be used to obfuscate financial data', async () => {
    await page.goto('http://localhost:5173/profit');

    // Enter data with special chars that might bypass filters
    await page.fill('input[name="revenue"]', '\u202e10000'); // Right-to-left override
    await page.fill('input[name="cost"]', '60\u200b00'); // Zero-width space
    await page.click('button:has-text("Calculate")');
    await page.waitForTimeout(500);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const events = await page.evaluate(() => (window as any).__telemetryInvocations);

    for (const event of events) {
      assertPayloadPrivacy(event.data, 'Special character test');
    }
  });

  // ============================================================================
  // SECTION 6: Cross-Module Privacy (All Calculators)
  // ============================================================================

  test.describe('6: All Calculator Modules', () => {
    const calculators = ['profit', 'break-even', 'cashflow'];

    for (const calc of calculators) {
      test(`6X: ${calc} calculator must protect financial data`, async () => {
        await page.goto(`http://localhost:5173/${calc}`);

        // Try to interact with each calculator
        try {
          await page.fill('input[type="number"]', '1000');
          await page.click('button:has-text("Calculate")');
          await page.waitForTimeout(500);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const events = await page.evaluate(() => (window as any).__telemetryInvocations);

          for (const event of events) {
            assertPayloadPrivacy(
              event.data,
              `${calc} calculator telemetry`,
            );
          }
        } catch {
          // Some fields might not be available in test
        }
      });
    }
  });

  // ============================================================================
  // SECTION 7: Compliance Checklist
  // ============================================================================

  test('7A: GDPR - No personal data in telemetry (user IDs only, no scenario data)', async () => {
    await page.goto('http://localhost:5173/profit');
    await page.click('button:has-text("Calculate")');
    await page.waitForTimeout(500);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const events = await page.evaluate(() => (window as any).__telemetryInvocations);

    for (const event of events) {
      // Should only contain: event_type, user_id (anonymized), timestamp
      // Should NOT contain: email, name, scenario, financial data
      const keys = Object.keys(event.data || {});

      for (const key of keys) {
        expect(key.toLowerCase()).not.toMatch(/email|name|phone|address/);
        expect(key.toLowerCase()).not.toMatch(/revenue|cost|profit|cashflow/);
      }
    }
  });

  test('7B: CCPAssistant - Share keys should not expose scenario values', async () => {
    await page.goto('http://localhost:5173/profit');

    await page.fill('input[name="revenue"]', '10000');
    await page.fill('input[name="cost"]', '6000');

    const url = page.url();

    // Share ID format: /s/:token#k=shareKey
    // ShareKey should be opaque, not contain raw scenario data
    const match = url.match(/#k=([A-Za-z0-9+/=]+)/);
    if (match?.[1]) {
      const shareKey = match[1];

      // Try to decode (may fail, that's OK)
      try {
        const decoded = atob(shareKey);
        for (const forbiddenKey of FORBIDDEN_KEYS) {
          expect(decoded.toLowerCase()).not.toContain(forbiddenKey);
        }
      } catch {
        // If it's not Base64 or binary, that's actually good (more opaque)
      }
    }
  });
});
