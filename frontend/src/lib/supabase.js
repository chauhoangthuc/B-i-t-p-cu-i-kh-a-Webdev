/**
 * supabase.js — Unified Auth Client (Dual-Mode)
 *
 * Tự động chọn chế độ hoạt động dựa trên biến môi trường:
 *
 *  ☁️  CLOUD MODE (Vercel + Supabase Cloud):
 *      Khi VITE_GOTRUE_URL và VITE_SUPABASE_ANON_KEY đều có giá trị.
 *      Dùng @supabase/supabase-js → tự inject apikey + Authorization Bearer.
 *
 *  🐳 LOCAL MODE (Docker compose):
 *      Khi VITE_SUPABASE_ANON_KEY chưa được set.
 *      Dùng raw GoTrueClient trỏ về localhost:9999 — hành vi giống ban đầu.
 *
 * Export: `supabase` và `gotrue` — interface giống nhau ở cả 2 môi trường.
 */

import { GoTrueClient }    from '@supabase/gotrue-js';
import { createClient }    from '@supabase/supabase-js';

const SUPABASE_URL  = import.meta.env.VITE_GOTRUE_URL        || '';
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let _supabase;
let _gotrue;

if (SUPABASE_URL && SUPABASE_ANON) {
  // ── ☁️  CLOUD MODE ──────────────────────────────────────────────────────────
  // createClient tự xử lý: apikey header, Authorization Bearer, token refresh.
  _supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: {
      autoRefreshToken:   true,
      persistSession:     true,
      detectSessionInUrl: true,
      flowType: 'implicit', // GoTrue v2 — không dùng PKCE
      storage:  window.localStorage,
    },
  });
  _gotrue = _supabase.auth;

} else {
  // ── 🐳 LOCAL MODE (Docker) ──────────────────────────────────────────────────
  // Không có anon key → raw GoTrueClient, không cần apikey header.
  const LOCAL_GOTRUE_URL = SUPABASE_URL || 'http://localhost:9999';

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.info(
      `%c[TripManager] 🐳 LOCAL MODE — Auth: ${LOCAL_GOTRUE_URL}/auth/v1`,
      'color:#0058be;font-weight:bold'
    );
  }

  _gotrue = new GoTrueClient({
    url:                `${LOCAL_GOTRUE_URL}/auth/v1`,
    headers:            {},  // Local GoTrue không cần apikey header
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: true,
    storage:            window.localStorage,
    flowType:           'implicit', // gotrue:v2.15.0 không hỗ trợ PKCE
  });

  // Stub tương thích — postgrest.js chỉ gọi supabase.auth.getSession()
  _supabase = { auth: _gotrue };
}

export const supabase = _supabase;
export const gotrue   = _gotrue;

