import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      'virtual:pwa-register/react': path.resolve(
        __dirname,
        'src/__mocks__/virtual-pwa-register-react.js'
      ),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{js,jsx}'],
    setupFiles: ['src/test-setup.js'],
    testTimeout: 15000,
  },
  coverage: {
    exclude: [
      'src/styles/**',
      'src/routes/**',
      'src/lib/queries/**',
      'src/context/AppContext.jsx',
      'src/lib/cn.js',
    ],
    thresholds: {
      statements: 90,
      branches: 75,
      functions: 85,
      lines: 90,
    },
  },
})
