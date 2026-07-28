import React, { createContext, useContext, useState, useEffect } from 'react';
import { gotrue } from '../lib/gotrue.js';
import { postgrest } from '../lib/postgrest.js';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync profile from public.users table
  const fetchUserProfile = async (userId) => {
    try {
      const res = await postgrest.get(`/profiles?id=eq.${userId}`);
      if (res.data && res.data.length > 0) {
        setCurrentUser(res.data[0]);
      } else {
        console.warn('User profile not found in public.profiles. Logging out stale session...');
        logout();
      }
    } catch (err) {
      console.error('Failed to fetch public user profile:', err);
      // If we get a 403 or 401, it also means session is invalid
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
        fetchUserProfile(activeSession.user.id);
      }
      setLoading(false);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = gotrue.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        fetchUserProfile(newSession.user.id);
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
