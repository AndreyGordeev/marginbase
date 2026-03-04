import { type Page, expect } from '@playwright/test';

/**
 * Console message types to track for errors
 */
export interface ConsoleErrorMessage {
  type: string;
  text: string;
  location: string;
}

/**
 * Page error (uncaught exception) details
 */
export interface PageErrorDetails {
  message: string;
  stack?: string;
}

/**
 * Failed network request details
 */
export interface FailedRequest {
  url: string;
  method: string;
  status: number;
  statusText: string;
}

/**
 * Collected page errors for assertion
 */
export interface PageErrors {
  consoleErrors: ConsoleErrorMessage[];
  pageErrors: PageErrorDetails[];
  failedRequests: FailedRequest[];
}

/**
 * Configuration for error tracking
 */
export interface ErrorTrackingOptions {
  /**
   * Track console.error messages
   * @default true
   */
  trackConsoleErrors?: boolean;

  /**
   * Track uncaught page errors (pageerror event)
   * @default true
   */
  trackPageErrors?: boolean;

  /**
   * Track failed network requests (status >= 400)
   * @default true
   */
  trackFailedRequests?: boolean;

  /**
   * URL patterns to exclude from failed request tracking (e.g., expected 404s)
   * Supports regex patterns
   */
  excludeRequestPatterns?: RegExp[];

  /**
   * HTTP status codes to exclude from tracking (e.g., [401, 403, 404])
   */
  excludeStatusCodes?: number[];
}

/**
 * Attach error tracking listeners to a Playwright page.
 * Returns a function to retrieve collected errors and helpers to assert no errors occurred.
 *
 * @example
 * ```typescript
 * const { getErrors, expectNoErrors } = attachErrorTracking(page);
 * // ... perform test actions ...
 * await expectNoErrors(); // Fails test if any errors were captured
 * ```
 *
 * @example
 * ```typescript
 * // Track only console errors, excluding known 404s
 * const { expectNoErrors } = attachErrorTracking(page, {
 *   trackFailedRequests: false,
 *   excludeRequestPatterns: [/\/api\/optional-resource/]
 * });
 * ```
 */
export function attachErrorTracking(
  page: Page,
  options: ErrorTrackingOptions = {}
): {
  getErrors: () => PageErrors;
  expectNoErrors: () => void;
  expectNoConsoleErrors: () => void;
  expectNoPageErrors: () => void;
  expectNoFailedRequests: () => void;
} {
  const opts: Required<ErrorTrackingOptions> = {
    trackConsoleErrors: options.trackConsoleErrors ?? true,
    trackPageErrors: options.trackPageErrors ?? true,
    trackFailedRequests: options.trackFailedRequests ?? true,
    excludeRequestPatterns: options.excludeRequestPatterns ?? [],
    excludeStatusCodes: options.excludeStatusCodes ?? []
  };

  const errors: PageErrors = {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: []
  };

  // Track console.error messages
  if (opts.trackConsoleErrors) {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.consoleErrors.push({
          type: msg.type(),
          text: msg.text(),
          location: msg.location().url || 'unknown'
        });
      }
    });
  }

  // Track uncaught exceptions (pageerror)
  if (opts.trackPageErrors) {
    page.on('pageerror', (error) => {
      errors.pageErrors.push({
        message: error.message,
        stack: error.stack
      });
    });
  }

  // Track failed network requests
  if (opts.trackFailedRequests) {
    page.on('response', (response) => {
      const status = response.status();
      const url = response.url();
      const method = response.request().method();

      // Check if status indicates failure (4xx, 5xx)
      if (status >= 400) {
        // Check exclusions
        if (opts.excludeStatusCodes.includes(status)) {
          return;
        }

        if (opts.excludeRequestPatterns.some((pattern) => pattern.test(url))) {
          return;
        }

        errors.failedRequests.push({
          url,
          method,
          status,
          statusText: response.statusText()
        });
      }
    });
  }

  return {
    getErrors: () => errors,
    expectNoErrors: () => {
      const hasErrors =
        errors.consoleErrors.length > 0 ||
        errors.pageErrors.length > 0 ||
        errors.failedRequests.length > 0;

      if (hasErrors) {
        const errorSummary = [
          errors.consoleErrors.length > 0
            ? `Console errors:\n${errors.consoleErrors
                .map((e) => `  - ${e.text} (${e.location})`)
                .join('\n')}`
            : null,
          errors.pageErrors.length > 0
            ? `Page errors:\n${errors.pageErrors
                .map((e) => `  - ${e.message}\n${e.stack || ''}`)
                .join('\n')}`
            : null,
          errors.failedRequests.length > 0
            ? `Failed requests:\n${errors.failedRequests
                .map((e) => `  - ${e.method} ${e.url} (${e.status} ${e.statusText})`)
                .join('\n')}`
            : null
        ]
          .filter(Boolean)
          .join('\n\n');

        expect(hasErrors, `Expected no errors, but found:\n\n${errorSummary}`).toBe(false);
      }
    },
    expectNoConsoleErrors: () => {
      if (errors.consoleErrors.length > 0) {
        const errorList = errors.consoleErrors
          .map((e) => `  - ${e.text} (${e.location})`)
          .join('\n');
        expect(
          errors.consoleErrors.length,
          `Expected no console errors, but found:\n${errorList}`
        ).toBe(0);
      }
    },
    expectNoPageErrors: () => {
      if (errors.pageErrors.length > 0) {
        const errorList = errors.pageErrors
          .map((e) => `  - ${e.message}\n${e.stack || ''}`)
          .join('\n');
        expect(errors.pageErrors.length, `Expected no page errors, but found:\n${errorList}`).toBe(
          0
        );
      }
    },
    expectNoFailedRequests: () => {
      if (errors.failedRequests.length > 0) {
        const errorList = errors.failedRequests
          .map((e) => `  - ${e.method} ${e.url} (${e.status} ${e.statusText})`)
          .join('\n');
        expect(
          errors.failedRequests.length,
          `Expected no failed requests, but found:\n${errorList}`
        ).toBe(0);
      }
    }
  };
}

/**
 * Create a Playwright test fixture that automatically tracks errors.
 * Use this with test.extend() to add error tracking to all tests in a suite.
 *
 * @example
 * ```typescript
 * import { test as base } from '@playwright/test';
 * import { createErrorTrackingFixture } from './playwright-helpers';
 *
 * const test = base.extend(createErrorTrackingFixture());
 *
 * test('should not have runtime errors', async ({ page, errorTracking }) => {
 *   await page.goto('/');
 *   // ... test actions ...
 *   await errorTracking.expectNoErrors(); // Automatic assertion
 * });
 * ```
 */
export function createErrorTrackingFixture(options: ErrorTrackingOptions = {}) {
  return {
    errorTracking: async ({ page }: { page: Page }, use: (r: ReturnType<typeof attachErrorTracking>) => Promise<void>) => {
      const tracking = attachErrorTracking(page, options);
      await use(tracking);
    }
  };
}
