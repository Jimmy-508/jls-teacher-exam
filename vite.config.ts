import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const base = '/jls-teacher-exam/';
const appDescription = '\u004a\u0061\u0072\u0076\u0069\u0073 \u6559\u5e2b\u8cc7\u683c\u8003\u5b78\u7fd2\u7cfb\u7d71';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['questions.csv', 'icons/apple-touch-icon.png', 'icons/jls-icon-192.png', 'icons/jls-icon-512.png'],
      manifest: {
        name: 'Jarvis Learning System',
        short_name: 'JLS',
        description: appDescription,
        lang: 'zh-Hant',
        theme_color: '#1c6758',
        background_color: '#f5f7fa',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          {
            src: 'icons/jls-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/jls-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/jls-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,csv,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: `${base}index.html`,
        navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.toString().endsWith('/questions.csv'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'jls-default-question-bank-v4.3.0',
              cacheableResponse: {
                statuses: [200],
              },
              expiration: {
                maxEntries: 2,
              },
            },
          },
        ],
      },
    }),
  ],
});
