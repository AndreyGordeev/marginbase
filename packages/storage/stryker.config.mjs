/**
 * Stryker mutation config for storage package.
 * Advanced integration tests for IndexedDB/SQLite/SQLiteAPI persistence.
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
  reporters: ['progress', 'clear-text', 'html'],
  coverageAnalysis: 'perTest',
  concurrency: 2,
  timeoutMS: 120000,
  timeoutFactor: 2,
  thresholds: {
    high: 95,
    low: 85,
    break: 70,
  },
  incremental: false,
};
