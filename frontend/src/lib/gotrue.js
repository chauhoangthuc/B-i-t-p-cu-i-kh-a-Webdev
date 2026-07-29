import { GoTrueClient } from '@supabase/gotrue-js';

const GOTRUE_URL = import.meta.env.VITE_GOTRUE_URL || '';

export const gotrue = new GoTrueClient({
  url: `${GOTRUE_URL}/auth/v1`,
  detectSessionInUrl: true,
  autoRefreshToken: true,
  persistSession: true,
  storage: window.localStorage,
  flowType: 'implicit',   // GoTrue server v2.15.0 không hỗ trợ PKCE
});
