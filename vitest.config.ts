import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Run tests in Node environment
    environment: 'node',

    // Glob for test files
    include: ['tests/**/*.test.ts'],

    // Coverage via V8 (fast, no instrumentation)
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],   // barrel file — not worth covering directly
      reporter: ['text', 'lcov'],  // lcov for CI / GitHub Actions
      thresholds: {
        lines: 80,
        functions: 80,
      },
    },

    // Pretty output
    reporters: ['verbose'],
  },
})
