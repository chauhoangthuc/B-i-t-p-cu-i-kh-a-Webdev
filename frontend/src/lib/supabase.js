/**
 * supabase.js — Unified Auth Client (Dual-Mode v4)
 *
 * CLOUD MODE: khi VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY có giá trị
 *             → dùng @supabase/supabase-js (tự inject apikey + Bearer)
 * LOCAL MODE: khi chạy localhost mà thiếu env → dùng raw GoTrueClient
 */
import { createClient } from '@supabase/supabase-js';
import { GoTrueClient } from '@supabase/gotrue-js';

const SUPABASE_URL  = (import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_GOTRUE_URL || '').trim();
const SUPABASE_ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

// Runtime: kiểm tra xem đang chạy trên localhost hay không
const IS_LOCALHOST = typeof window !== 'undefined'
  && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Log diagnostic để audit sau khi deploy
console.log(
  '%c[TripManager Auth]',
  'background:#0058be;color:#fff;padding:2px 8px;border-radius:4px;font-weight:bold',
  `\n  URL  = ${SUPABASE_URL  || '❌ TRỐNG'}`,
  `\n  KEY  = ${SUPABASE_ANON ? `✅ ${SUPABASE_ANON.slice(0,16)}...` : '❌ TRỐNG'}`,
  `\n  HOST = ${typeof window !== 'undefined' ? window.location.hostname : 'SSR'}`,
  `\n  MODE = ${(SUPABASE_URL && SUPABASE_ANON) ? '☁️ CLOUD' : (IS_LOCALHOST ? '🐳 LOCAL' : '🔴 CONFIG ERROR')}`,
);

let _supabase;
let _gotrue;

if (SUPABASE_URL && SUPABASE_ANON) {
  // ── ☁️ CLOUD MODE ──────────────────────────────────────────────────────────
  // createClient yêu cầu chính xác Base URL (https://[PROJECT-ID].supabase.co)
  // để tự inject apikey header + Authorization Bearer + token refresh
  _supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: {
      autoRefreshToken:   true,
      persistSession:     true,
      detectSessionInUrl: true,
      flowType: 'implicit',
      storage:  window.localStorage,
    },
  });
  _gotrue = _supabase.auth;

} else if (IS_LOCALHOST) {
  // ── 🐳 LOCAL MODE (Docker) ─────────────────────────────────────────────────
  const LOCAL_GOTRUE_URL = SUPABASE_URL || 'http://localhost:9999';
  console.info(`%c[TripManager] 🐳 LOCAL MODE → ${LOCAL_GOTRUE_URL}`, 'color:#0058be');

  _gotrue = new GoTrueClient({
    url:                `${LOCAL_GOTRUE_URL}/auth/v1`,
    headers:            {},
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: true,
    storage:            window.localStorage,
    flowType:           'implicit',
  });
  _supabase = { auth: _gotrue };

} else {
  // ── 🔴 CONFIG ERROR — đang deploy trên Cloud nhưng thiếu env vars ─────────
  const msg = [
    '[TripManager] CRITICAL: Thiếu Supabase config trên Cloud deployment!',
    `  VITE_SUPABASE_URL      = "${SUPABASE_URL  || 'TRỐNG'}"`,
    `  VITE_SUPABASE_ANON_KEY = "${SUPABASE_ANON || 'TRỐNG'}"`,
    'Kiểm tra Environment Variables trên Vercel Dashboard và redeploy.',
  ].join('\n');
  console.error(msg);
  const errFn = () => Promise.reject(new Error('Supabase chưa được cấu hình. Kiểm tra VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trên Vercel.'));
  _gotrue   = { signUp: errFn, signInWithPassword: errFn, signInWithOAuth: errFn, getSession: errFn, onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) };
  _supabase = { auth: _gotrue };
}

export const supabase = _supabase;
export const gotrue   = _gotrue;
