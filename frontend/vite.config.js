import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Diagnostic log — hiện trong Vercel Build Logs để kiểm tra env vars
console.log('[Vite Build] ENV CHECK:');
console.log('  VITE_GOTRUE_URL        =', process.env.VITE_GOTRUE_URL        ? '✅ CÓ' : '❌ THIẾU');
console.log('  VITE_SUPABASE_ANON_KEY =', process.env.VITE_SUPABASE_ANON_KEY ? '✅ CÓ' : '❌ THIẾU');
console.log('  VITE_GEMINI_API_KEY    =', process.env.VITE_GEMINI_API_KEY    ? '✅ CÓ' : '❌ THIẾU');

// Vite tự động inject tất cả biến có prefix VITE_ từ process.env
// vào import.meta.env.* — KHÔNG cần define block thủ công.
// define block với fallback || '' sẽ OVERRIDE và làm rỗng các biến Vercel inject.
export default defineConfig({
  plugins: [

    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        // Không chặn các path của GoTrue OAuth — để browser navigate thật ra ngoài
        navigateFallbackDenylist: [
          /^\/auth\//,       // /auth/v1/authorize, /auth/v1/callback...
          /^\/callback/,     // /callback?code=...
        ],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'weather-api-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 // 1 hour
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Cache PostgREST read endpoints for offline access
            urlPattern: /\/(trips|events|expenses|trip_members|users)\?.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'postgrest-read-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      manifest: {
        name: 'TripManager - Quản lý lịch trình nhóm',
        short_name: 'TripManager',
        description: 'Ứng dụng quản lý lịch trình chuyến đi, chi tiêu nhóm offline-first',
        theme_color: '#0058be',
        background_color: '#f8f9fa',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  server: {
    port: 5173
  }
});

