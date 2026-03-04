import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      thresholds: {
        lines: 85,
        branches: 75,
        functions: 100,
        statements: 85
      }
    }
  }
});
