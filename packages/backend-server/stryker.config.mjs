/**
 * Stryker mutation config for backend handlers/services.
 * Exclusions: entrypoint files and adapters with minimal branch logic.
 */
export default {
  testRunner: 'vitest',
  mutate: [
    'src/**/*.ts',
    '!src/index.ts',
    '!src/server.ts',
    '!src/adapters/**/*.ts',
  ],
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
