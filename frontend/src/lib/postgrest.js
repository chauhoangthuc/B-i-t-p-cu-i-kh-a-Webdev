import axios from 'axios';
import { gotrue } from './gotrue.js';

const POSTGREST_URL = import.meta.env.VITE_POSTGREST_URL || 'http://localhost:3000';

export const postgrest = axios.create({
  baseURL: POSTGREST_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to attach JWT token to all requests automatically
postgrest.interceptors.request.use(async (config) => {
  const { data, error } = await gotrue.getSession();
  if (data?.session?.access_token) {
    config.headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor to handle 401 Unauthorized errors and auto-refresh token
postgrest.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // gotrue-js will auto-refresh session if refresh token exists in storage
        const { data, error: refreshErr } = await gotrue.getSession();
        if (data?.session?.access_token && !refreshErr) {
          originalRequest.headers.Authorization = `Bearer ${data.session.access_token}`;
          return postgrest(originalRequest);
        }
      } catch (err) {
        console.error('Auto-refreshing session failed on 401:', err);
      }
    }
    return Promise.reject(error);
  }
);
