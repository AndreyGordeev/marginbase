/**
 * Stryker mutation config for entitlements policy package.
 * Exclusions are limited to barrel exports where mutation has no signal.
 */
export default {
  testRunner: 'vitest',
  mutate: ['src/**/*.ts', '!src/index.ts'],
  reporters: ['progress', 'clear-text', 'html'],
  coverageAnalysis: 'perTest',
  concurrency: 3,
  timeoutMS: 60000,
  timeoutFactor: 1.5,
  mutationScore: {
    threshold: 65,
    thresholdFatal: 50,
  },
  incremental: false,
};
