import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/builders/**/*.ts', 'src/export/**/*.ts'],
      thresholds: {
        lines: 65,
        branches: 54,
        functions: 95,
        statements: 65
      }
    }
  }
});