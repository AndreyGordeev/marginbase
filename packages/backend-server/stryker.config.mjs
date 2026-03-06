export default {
  testRunner: 'vitest',
  plugins: [
    '@stryker-mutator/vitest-runner',
    '@stryker-mutator/typescript-checker',
  ],
  mutate: [
    'src/**/*.ts',
    '!src/index.ts',
    '!src/server.ts',
    '!src/adapters/**/*.ts',
  ],
  test: {
    include: ['tests/**/*.test.ts'],
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
