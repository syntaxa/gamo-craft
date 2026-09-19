import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string }

// https://vite.dev/config/
export default defineConfig({
  // Абсолютный base: локально и в dev-сервере — '/'; при сборке для GitHub Pages
  // в подкаталог проекта задаётся через env BASE_PATH=/gamо-craft/ (см. workflow deploy-pages).
  base: process.env.BASE_PATH || '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Gamo',
        short_name: 'Gamo',
        description: 'Игровая песочница для учёбы и строительства',
        theme_color: '#1d5eb5',
        background_color: '#9ed8ff',
        display: 'standalone',
        start_url: './',
        scope: './',
        orientation: 'any',
        lang: 'ru',
        icons: [
          { src: './icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: './icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: './icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff,woff2,ttf,otf,svg,png,jpg,jpeg,gif,webp,json,ico}'],
        globIgnores: ['**/dev.log', '**/dev.out.log', '**/dev.err.log'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/src/tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/domains/**/*.ts', 'src/application/useCases/**/*.ts', 'src/persistence/**/*.ts'],
    },
  },
})
