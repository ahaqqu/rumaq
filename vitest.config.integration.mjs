import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/api/**/*.test.js'],
    envDir: './tests',
    testTimeout: 30_000,
  },
})
