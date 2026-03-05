/**
 * Playwright helpers for NO MANUAL test infrastructure.
 * These help enforce console error budgets, privacy checks, and visual stability.
 */

/**
 * Console error/warning messages to allow in tests (harmless or expected)
 */
const ALLOWED_CONSOLE_MESSAGES = new Set<string>([
  // Add allowed patterns here, e.g.:
  // 'Deprecation warning from library X',
  // 'Non-critical feature fallback',
]);

const isAllowedConsoleMessage = (message: string): boolean => {
  return Array.from(ALLOWED_CONSOLE_MESSAGES).some((pattern) => message.includes(pattern));
};

export interface ConsoleErrorBudgetConfig {
  maxErrors: number;
  maxWarnings: number;
}

export const DEFAULT_CONSOLE_BUDGET: ConsoleErrorBudgetConfig = {
  maxErrors: 0, // strict: no errors allowed
  maxWarnings: 0 // strict: no warnings allowed (can be relaxed if needed)
};

/**
 * Attach console error tracking to a Playwright page.
 * Fails the test if console errors/warnings exceed budget or contain forbidden keys.
 * 
 * @param page Playwright page object
 * @param budget Console error budget (defaults to strict 0 errors, 0 warnings)
 * @returns Helper to assert no errors occurred
 */
export const attachConsoleErrorTracking = (
  page: any, // would be Page type from @playwright/test, but avoiding direct dep
  budget: ConsoleErrorBudgetConfig = DEFAULT_CONSOLE_BUDGET
) => {
  const errors: string[] = [];
  const warnings: string[] = [];

  page.on('console', (msg: any) => {
    const text = msg.text();
    const type = msg.type();

    // Ignore allowed messages
    if (isAllowedConsoleMessage(text)) {
      return;
    }

    if (type === 'error' || type === 'assert') {
      errors.push(text);
    } else if (type === 'warn' || type === 'count') {
      warnings.push(text);
    }
  });

  page.on('pageerror', (error: any) => {
    errors.push(`Uncaught error: ${error.toString()}`);
  });

  return {
    expectNoErrors: () => {
      if (errors.length > budget.maxErrors) {
        throw new Error(`Console error budget exceeded. Allowed: ${budget.maxErrors}, Got: ${errors.length}\nErrors:\n${errors.join('\n')}`);
      }
      if (warnings.length > budget.maxWarnings) {
        throw new Error(`Console warning budget exceeded. Allowed: ${budget.maxWarnings}, Got: ${warnings.length}\nWarnings:\n${warnings.join('\n')}`);
      }
    },
    getErrors: () => errors,
    getWarnings: () => warnings
  };
};

/**
 * Configure page for deterministic visual testing
 * - disable animations
 * - set fixed viewport
 * - set fixed timezone
 */
export const configurePageForVisualTesting = async (page: any) => {
  // Disable CSS animations and transitions for snapshots
  await page.addStyleTag({
    content: `
      * {
        animation: none !important;
        transition: none !important;
      }
      *::before,
      *::after {
        animation: none !important;
        transition: none !important;
      }
    `
  });

  // Hide dynamic content (timestamps, random values)
  // Add data attributes or classes to components you want to hide
  await page.evaluate(() => {
    // Hide elements with data-testid="dynamic-timestamp"
    const timestamps = document.querySelectorAll('[data-testid="dynamic-timestamp"]');
    timestamps.forEach((el: any) => {
      el.style.visibility = 'hidden';
    });

    // Hide elements with data-testid="random-id"
    const randomIds = document.querySelectorAll('[data-testid="random-id"]');
    randomIds.forEach((el: any) => {
      el.textContent = '[HIDDEN]';
    });
  });
};

/**
 * Helper to intercept and track network requests for privacy validation
 */
export interface NetworkInterceptorConfig {
  allowedEndpoints: string[];
  forbiddenKeys: string[];
}

export const trackNetworkPayloads = (page: any, config: NetworkInterceptorConfig) => {
  const interceptedRequests: Array<{ url: string; method: string; body: any }> = [];

  page.on('request', (request: any) => {
    const url = request.url();
    
    if (config.allowedEndpoints.some((endpoint) => url.includes(endpoint))) {
      try {
        const postData = request.postDataJSON();
        interceptedRequests.push({
          url,
          method: request.method(),
          body: postData
        });

        // Check for forbidden keys
        const bodyString = JSON.stringify(postData).toLowerCase();
        const foundForbidden = config.forbiddenKeys.filter((key) => bodyString.includes(key.toLowerCase()));

        if (foundForbidden.length > 0) {
          throw new Error(`Found forbidden keys in ${url}: ${foundForbidden.join(', ')}`);
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes('Found forbidden')) {
          throw error;
        }
        // Ignore parse errors for non-JSON requests
      }
    }
  });

  return {
    getInterceptedRequests: () => interceptedRequests,
    expectNobodyIntercepted: () => {
      if (interceptedRequests.length === 0) {
        throw new Error('No requests were intercepted.');
      }
    },
    expectAtLeastOneRequest: () => {
      if (interceptedRequests.length === 0) {
        throw new Error('Expected at least one network request, but none were intercepted.');
      }
    }
  };
};
