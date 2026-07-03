import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx}'],
    setupFiles: ['src/test-setup.js'],
  },
  coverage: {
    exclude: ['src/styles/**'],
    thresholds: {
      statements: 90,
      branches: 75,
      functions: 85,
      lines: 90,
    },
  },
})
