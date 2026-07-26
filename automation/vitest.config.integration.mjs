import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['automation/tests/local/api/steps/**/*.steps.js'],
    exclude: ['automation/tests/local/e2e/**'],
    envDir: 'automation/tests',
    testTimeout: 30_000,
    fileParallelism: false,
    reporters: [
      ['default', { verbose: true }],
      ['json', { outputFile: 'vitest-report/api-results.json' }],
    ],
  },
})
