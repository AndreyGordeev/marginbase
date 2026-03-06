import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts', 'src/adapters/**'],
      thresholds: {
        lines: 80,
        branches: 70,
        functions: 90,
        statements: 80,
      },
    },
  },
});
