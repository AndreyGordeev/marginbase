import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './apps/web/tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 0 : 1, // Hard gate: zero retries in CI, one retry locally
  expect: {
    timeout: 10_000
  },
  reporter: [['line'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'en-US',
    colorScheme: 'light'
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: {
          width: 1365,
          height: 768
        }
      }
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: {
          width: 1365,
          height: 768
        }
      }
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: {
          width: 1365,
          height: 768
        }
      }
    }
  ],
  webServer: {
    command:
      'corepack pnpm --filter @marginbase/web build && corepack pnpm --filter @marginbase/web exec vite preview --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 120_000
  }
});
