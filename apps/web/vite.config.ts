import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'offline.html'],
      manifest: {
        name: 'E-Iwas Baha',
        short_name: 'E-Iwas Baha',
        description: 'Flood-aware evacuation routing for the Philippines',
        theme_color: '#1e40af',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Show offline.html for any navigation request that can't be served
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/api/, /^\/socket\.io/],

        runtimeCaching: [
          {
            // OSM map tiles – cache-first, 7 days, 2000 tiles max
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: {
                maxEntries: 2000,
                maxAgeSeconds: 7 * 24 * 60 * 60,
              },
            },
          },
          {
            // Route API – network-first (6 s timeout), fall back to last cached response
            urlPattern: /\/api\/route/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-route',
              networkTimeoutSeconds: 6,
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 30 * 60,
              },
            },
          },
          {
            // Evac centers – stale-while-revalidate, 24 h TTL
            urlPattern: /\/api\/evac-centers/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-evac',
              expiration: {
                maxEntries: 1,
                maxAgeSeconds: 24 * 60 * 60,
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
