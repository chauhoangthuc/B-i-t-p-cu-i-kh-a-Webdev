/**
 * supabase.js — Unified Auth Client (Dual-Mode v2)
 */
import { createClient } from '@supabase/supabase-js';
import { GoTrueClient } from '@supabase/gotrue-js';

const SUPABASE_URL  = (import.meta.env.VITE_GOTRUE_URL || import.meta.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

let _supabase;
let _gotrue;

// Kiểm tra xem có đầy đủ cấu hình Cloud không
if (SUPABASE_URL && SUPABASE_ANON) {
  // ── ☁️ CLOUD MODE (Vercel) ──
  console.log("🚀 [Supabase] Chạy ở chế độ CLOUD MODE");
  
  _supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'implicit',
      storage: window.localStorage,
    },
  });
  _gotrue = _supabase.auth;

} else {
  // ── 🐳 LOCAL MODE (Docker / Không có env) ──
  console.log("🐳 [Supabase] Chạy ở chế độ LOCAL MODE");
  
  const LOCAL_GOTRUE_URL = SUPABASE_URL || 'http://localhost:9999';

  _gotrue = new GoTrueClient({
    url: `${LOCAL_GOTRUE_URL}/auth/v1`,
    headers: {},
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    flowType: 'implicit',
  });

  _supabase = { auth: _gotrue };
}

export const supabase = _supabase;
export const gotrue   = _gotrue;
