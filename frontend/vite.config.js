import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1000,
  },
  plugins: [
    tailwindcss(),
    TanStackRouterVite(),
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      manifest: {
        id: '/',
        scope: '/',
        name: 'RumaQ',
        short_name: 'RumaQ',
        description: 'Household shopping & inventory assistant',
        theme_color: '#f4f8fb',
        background_color: '#f4f8fb',
        display: 'standalone',
        start_url: '/',
        categories: ['shopping', 'productivity', 'utilities'],
        icons: [
          { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icon-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/offline\.html$/, /^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^\/api\/(stock|plans|purchases)(\?.*)?$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'rumaq-api-reads',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 300,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
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
      statements: 50,
      branches: 50,
      functions: 50,
      lines: 50,
    },
  },
})
