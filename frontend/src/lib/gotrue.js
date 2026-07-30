import { GoTrueClient } from '@supabase/gotrue-js';

const GOTRUE_URL = import.meta.env.VITE_GOTRUE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const gotrue = new GoTrueClient({
  url: `${GOTRUE_URL}/auth/v1`,
  headers: {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`
  },
  detectSessionInUrl: true,
  autoRefreshToken: true,
  persistSession: true,
  storage: window.localStorage,
  flowType: 'implicit',   // GoTrue server v2.15.0 không hỗ trợ PKCE
});