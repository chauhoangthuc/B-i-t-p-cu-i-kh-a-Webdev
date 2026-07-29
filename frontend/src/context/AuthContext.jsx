import React, { createContext, useContext, useState, useEffect } from 'react';
import { gotrue } from '../lib/gotrue.js';
import { postgrest } from '../lib/postgrest.js';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync profile from public.profiles table, create if not exists (for OAuth users)
  const fetchUserProfile = async (userId, userMeta) => {
    try {
      const res = await postgrest.get(`/profiles?id=eq.${userId}`);
      if (res.data && res.data.length > 0) {
        setCurrentUser(res.data[0]);
      } else {
        // New OAuth user: tạo profile mới
        console.info('Creating new profile for OAuth user:', userId);
        const fullName = userMeta?.full_name || userMeta?.name || '';
        const avatarUrl = userMeta?.avatar_url || userMeta?.picture || '';
        const email = userMeta?.email || '';
        try {
          await postgrest.post('/profiles', {
            id: userId,
            full_name: fullName,
            avatar_url: avatarUrl,
            email: email,
          });
          const created = await postgrest.get(`/profiles?id=eq.${userId}`);
          if (created.data && created.data.length > 0) {
            setCurrentUser(created.data[0]);
          }
        } catch (createErr) {
          console.error('Failed to create profile for OAuth user:', createErr);
          // Không logout — vẫn cho user vào app dù profile chưa có
          setCurrentUser({ id: userId, full_name: fullName, avatar_url: avatarUrl, email });
        }
      }
    } catch (err) {
      console.error('Failed to fetch public user profile:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
      }
    }
  };

  useEffect(() => {
    // 1. Get initial session
    gotrue.getSession().then(({ data }) => {
      const activeSession = data?.session;
      setSession(activeSession);
      if (activeSession?.user) {
        fetchUserProfile(activeSession.user.id, activeSession.user.user_metadata);
      }
      setLoading(false);
    });

    // 2. Listen for auth changes (bao gồm OAuth callback)
    const { data: { subscription } } = gotrue.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        if (event === 'SIGNED_IN') {
          // Đợi DB trigger handle_new_user chạy xong (tạo profile trong public.profiles)
          // trước khi fetch — tránh "profile not found" với user OAuth mới
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
        fetchUserProfile(newSession.user.id, newSession.user.user_metadata);
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    const { data, error } = await gotrue.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signup = async (email, password, name) => {
    const { data, error } = await gotrue.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name
        }
      }
    });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    try {
      await gotrue.signOut();
    } catch (err) {
      console.error('GoTrue signOut failed, clearing local session anyway:', err);
    } finally {
      setCurrentUser(null);
      setSession(null);
      // Remove tokens from localStorage to prevent auth deadlock
      localStorage.removeItem('gotrue.auth');
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('currentTripId');
    }
  };

  const value = {
    currentUser,
    session,
    loading,
    login,
    signup,
    logout,
    fetchUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
