import tsParser from '@typescript-eslint/parser'
import importPlugin from 'eslint-plugin-import-x'

export default [
  {
    name: 'ignored',
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.wrangler/**',
      '**/.tanstack/**',
      'frontend/src/routeTree.gen.ts',
      'playwright-report/**',
      'test-results/**',
      'vitest-report/**',
      '*.lock',
      '**/*.min.*',
    ],
  },
  {
    name: 'frontend',
    files: ['frontend/**/*.{js,jsx}'],
    ignores: ['frontend/src/routeTree.gen.ts'],
    plugins: { import: importPlugin },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'import/no-default-export': 'error',
      'import/no-anonymous-default-export': 'error',
    },
  },
  {
    name: 'backend',
    files: ['backend/**/*.ts'],
    plugins: { import: importPlugin },
    languageOptions: { parser: tsParser },
    rules: {
      'import/no-default-export': 'error',
      'import/no-anonymous-default-export': 'error',
    },
  },
  {
    name: 'allow-worker-default',
    files: ['backend/src/index.ts'],
    rules: {
      'import/no-default-export': 'off',
      'import/no-anonymous-default-export': 'off',
    },
  },
  {
    name: 'allow-default-configs',
    files: ['**/*.config.{js,ts,mjs,cjs}'],
    rules: {
      'import/no-default-export': 'off',
      'import/no-anonymous-default-export': 'off',
    },
  },
]
