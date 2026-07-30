import axios from 'axios';
import { supabase } from './supabase.js';

const SUPABASE_URL = import.meta.env.VITE_GOTRUE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Supabase PostgREST endpoint: https://<ref>.supabase.co/rest/v1
// Nếu có biến VITE_POSTGREST_URL riêng (khi self-host), dùng nó. Nếu không, tự build từ SUPABASE_URL.
const POSTGREST_URL = import.meta.env.VITE_POSTGREST_URL
  || (SUPABASE_URL ? `${SUPABASE_URL}/rest/v1` : 'http://localhost:3000');

export const postgrest = axios.create({
  baseURL: POSTGREST_URL,
  headers: {
    'Content-Type': 'application/json',
    // Header apikey là bắt buộc với Supabase API Gateway (ngoài Authorization Bearer)
    'apikey': SUPABASE_ANON_KEY,
  }
});

// Interceptor: tự động đính kèm JWT của session hiện tại vào mọi request
postgrest.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  if (data?.session?.access_token) {
    config.headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor: xử lý 401 — thử refresh token rồi retry request gốc
postgrest.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.access_token) {
          originalRequest.headers.Authorization = `Bearer ${data.session.access_token}`;
          return postgrest(originalRequest);
        }
      } catch (err) {
        console.error('[postgrest] Auto-refresh session thất bại:', err);
      }
    }
    return Promise.reject(error);
  }
);

