import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  // Đọc TẤT CẢ env vars (kể cả không có tiền tố VITE_) từ .env file và process.env
  // Trên Vercel: process.env đã có sẵn các biến được set trong Dashboard
  // loadEnv đọc .env file; process.env chứa biến từ Vercel Dashboard.
  // Dùng cả hai để đảm bảo luôn có giá trị dù môi trường khác nhau.
  const env = loadEnv(mode, process.cwd(), '');
  const get = (key) => env[key] || process.env[key] || '';

  return {
  define: {
    // Nhúng CỨNG vào bundle tại build-time — không phụ thuộc inject runtime.
    // Ưu tiên: loadEnv(.env file) → process.env (Vercel Dashboard) → ''
    'import.meta.env.VITE_GOTRUE_URL':        JSON.stringify(get('VITE_GOTRUE_URL')),
    'import.meta.env.VITE_SUPABASE_URL':      JSON.stringify(get('VITE_SUPABASE_URL')),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(get('VITE_SUPABASE_ANON_KEY')),
    'import.meta.env.VITE_POSTGREST_URL':     JSON.stringify(get('VITE_POSTGREST_URL')),
    'import.meta.env.VITE_GEMINI_API_KEY':    JSON.stringify(get('VITE_GEMINI_API_KEY')),
    'import.meta.env.VITE_WS_URL':            JSON.stringify(get('VITE_WS_URL')),
  },
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
  }; // đóng return {}
}); // đóng defineConfig(() => {})

