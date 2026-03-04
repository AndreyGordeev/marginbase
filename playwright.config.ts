import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './apps/web/tests/e2e',
  timeout: 30_000,
  retries: 1,
  expect: {
    timeout: 10_000
  },
  reporter: [['line'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: {
      width: 1365,
      height: 768
    },
    locale: 'en-US',
    colorScheme: 'light'
  },
  webServer: {
    command:
      'corepack pnpm --filter @marginbase/web build && corepack pnpm --filter @marginbase/web exec vite preview --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 120_000
  }
});
