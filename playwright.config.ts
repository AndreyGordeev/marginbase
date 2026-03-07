import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './apps/web/tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 0 : 1,
  workers: process.env.CI ? 2 : undefined,
  forbidOnly: !!process.env.CI,
  expect: {
    timeout: 10_000,
  },
  reporter: process.env.CI
    ? [
        ['line'],
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
        ['json', { outputFile: 'test-results.json' }],
      ]
    : [['line'], ['html', { open: 'on-failure' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'en-US',
    colorScheme: 'light',
    navigationTimeout: 15_000,
    actionTimeout: 10_000,
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: {
          width: 1365,
          height: 768,
        },
        // Reduce motion for stable visual tests
        reducedMotion: 'reduce',
      },
    },
    {
      name: 'firefox-desktop',
      use: {
        ...devices['Desktop Firefox'],
        viewport: {
          width: 1365,
          height: 768,
        },
        reducedMotion: 'reduce',
      },
    },
    {
      name: 'webkit-desktop',
      use: {
        ...devices['Desktop Safari'],
        viewport: {
          width: 1365,
          height: 768,
        },
        reducedMotion: 'reduce',
      },
    },
    {
      name: 'chromium-tablet',
      use: {
        ...devices['iPad (gen 7)'],
        browserName: 'chromium',
        reducedMotion: 'reduce',
      },
    },
    {
      name: 'chromium-mobile-small',
      use: {
        ...devices['iPhone SE'],
        browserName: 'chromium',
        reducedMotion: 'reduce',
      },
    },
    {
      name: 'chromium-mobile-large',
      use: {
        ...devices['Pixel 7'],
        browserName: 'chromium',
        reducedMotion: 'reduce',
      },
    },
    {
      name: 'firefox-tablet',
      use: {
        ...devices['Desktop Firefox'],
        viewport: {
          width: 768,
          height: 1024,
        },
        browserName: 'firefox',
        reducedMotion: 'reduce',
      },
    },
    {
      name: 'firefox-mobile-small',
      use: {
        ...devices['Desktop Firefox'],
        viewport: {
          width: 375,
          height: 667,
        },
        browserName: 'firefox',
        reducedMotion: 'reduce',
      },
    },
    {
      name: 'firefox-mobile-large',
      use: {
        ...devices['Desktop Firefox'],
        viewport: {
          width: 412,
          height: 915,
        },
        browserName: 'firefox',
        reducedMotion: 'reduce',
      },
    },
    {
      name: 'webkit-tablet',
      use: {
        ...devices['iPad (gen 7)'],
        browserName: 'webkit',
        reducedMotion: 'reduce',
      },
    },
    {
      name: 'webkit-mobile-small',
      use: {
        ...devices['iPhone SE'],
        browserName: 'webkit',
        reducedMotion: 'reduce',
      },
    },
    {
      name: 'webkit-mobile-large',
      use: {
        ...devices['Pixel 7'],
        browserName: 'webkit',
        reducedMotion: 'reduce',
      },
    },
  ],
  webServer: {
    command:
      'corepack pnpm --filter @marginbase/web build && corepack pnpm --filter @marginbase/web exec vite preview --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
