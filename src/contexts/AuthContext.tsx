import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import authLib from '../lib/auth';
import type { AuthContextType, Profile } from '../types/database';

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ id: string; email: string | null } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      setProfile(data);
    } else if (error?.code === 'PGRST116') {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({
            id: userData.user.id,
            email: userData.user.email ?? '',
            role: 'customer',
          })
          .select()
          .maybeSingle();
        if (newProfile) setProfile(newProfile);
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const session = await authLib.getSession();
        if (mounted) {
          if (session?.user) {
            setUser({ id: session.user.id, email: session.user.email ?? null });
            await fetchProfile(session.user.id);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Auth init error:', err);
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const subscription = authLib.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' && session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? null });
        await fetchProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      try {
        subscription?.unsubscribe?.();
      } catch (_) {}
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string, remember = true) => {
    const { error } = await authLib.signInWithPassword(email, password, remember);
    return { error };
  };

  const signUp = async (email: string, password: string, fullName = '', remember = true) => {
    const { error } = await authLib.signUpWithPassword(email, password, fullName, remember);
    if (error) return { error };
    // If profile creation is handled by DB trigger, fetch it; otherwise the existing
    // `fetchProfile` on auth state change will handle it when the session becomes active.
    return { error: null };
  };

  const signInWithProvider = async (provider: 'google' | 'apple') => {
    const { error } = await authLib.signInWithProvider(provider);
    return { error };
  };

  const signOut = async () => {
    const { error } = await authLib.signOut();
    if (!error) {
      setUser(null);
      setProfile(null);
    }
  };

  const updateProfile = async (data: Partial<Profile>) => {
    if (!user) return { error: 'Not authenticated' };

    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', user.id);

    if (error) return { error: error.message };

    setProfile(prev => prev ? { ...prev, ...data } : null);
    return { error: null };
  };

  const resetPassword = async (email: string) => {
    const { error } = await authLib.sendPasswordReset(email);
    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin: profile?.role === 'admin',
        signIn,
        signUp,
        signInWithProvider,
        signOut,
        updateProfile,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
