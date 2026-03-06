/**
 * Stryker mutation config for entitlements policy package.
 * Exclusions are limited to barrel exports where mutation has no signal.
 */
export default {
  testRunner: 'vitest',
  plugins: [
    '@stryker-mutator/vitest-runner',
    '@stryker-mutator/typescript-checker',
  ],
  mutate: ['src/**/*.ts', '!src/index.ts'],
  test: {
    include: ['tests/**/*.test.ts'],
  },
  vitest: {
    related: false,
  },
  reporters: ['progress', 'clear-text', 'html'],
  coverageAnalysis: 'perTest',
  concurrency: 3,
  timeoutMS: 60000,
  timeoutFactor: 1.5,
  thresholds: {
    high: 80,
    low: 65,
    break: 50,
  },
  incremental: false,
};
