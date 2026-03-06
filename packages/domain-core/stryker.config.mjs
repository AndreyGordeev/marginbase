/**
 * Stryker Mutation Testing Configuration
 * Tests the quality of test suite by injecting mutations into source code
 * and verifying tests catch them.
 */

export default {
  // Test runner configuration (v9.x uses just testRunner, auto-detects framework)
  testRunner: 'vitest',
  plugins: [
    '@stryker-mutator/vitest-runner',
    '@stryker-mutator/typescript-checker',
  ],

  // Mutants to inject
  mutate: ['src/**/*.ts', '!src/index.ts'],

  // Test configuration
  test: {
    include: ['tests/**/*.test.ts'],
  },

  // Disable vitest.related auto-discovery
  vitest: {
    related: false,
  },

  // Reporting
  reporters: ['progress', 'clear-text'],
  coverageAnalysis: 'perTest',

  // Performance tuning
  concurrency: 4,
  timeoutMS: 60000,
  timeoutFactor: 1.5,

  // Mutation testing score thresholds (v9.x format)
  thresholds: {
    high: 80,
    low: 65,
    break: 50,
  },

  // Disable incremental for CI consistency
  incremental: false,
};
