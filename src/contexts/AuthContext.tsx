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
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        // Ensure designated admin email has admin role in database
        const { data: userData } = await supabase.auth.getUser();
        const email = (userData?.user?.email || data.email || '').toLowerCase().trim();
        const isDesignatedAdmin = email === 'azharmir416@gmail.com';

        if (isDesignatedAdmin && data.role !== 'admin') {
          await supabase.from('profiles').update({ role: 'admin' }).eq('id', userId);
          setProfile({ ...data, role: 'admin' });
        } else {
          setProfile(data);
        }
        return;
      }

      // If data is null (row does not exist yet) or select errored, auto-create profile
      const { data: userData } = await supabase.auth.getUser();
      const authUser = userData?.user;
      if (authUser && authUser.id === userId) {
        const meta = authUser.user_metadata || {};
        const fullName = meta.full_name || meta.name || (authUser.email ? authUser.email.split('@')[0] : 'Customer');
        const avatarUrl = meta.avatar_url || meta.picture || null;
        const email = (authUser.email ?? '').toLowerCase().trim();
        const isDesignatedAdmin = email === 'azharmir416@gmail.com';

        const profileData = {
          id: authUser.id,
          email: authUser.email ?? null,
          phone: authUser.phone ?? null,
          full_name: fullName,
          avatar_url: avatarUrl,
          role: (isDesignatedAdmin ? 'admin' : 'customer') as 'admin' | 'customer',
        };

        const { data: created, error: upsertError } = await supabase
          .from('profiles')
          .upsert(profileData, { onConflict: 'id' })
          .select()
          .maybeSingle();

        if (created) {
          setProfile(created);
        } else {
          if (upsertError) {
            console.warn('Upsert profile error:', upsertError.message);
          }
          // Fallback to local profile representation
          setProfile({
            ...profileData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      console.error('fetchProfile exception:', err);
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
          } else {
            setUser(null);
            setProfile(null);
          }
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const subscription = authLib.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') && session?.user) {
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
      } catch {
        // Ignore cleanup errors
      }
    };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await authLib.signInWithPassword(email, password);
    return { error };
  };

  const signUp = async (email: string, password: string, fullName = '') => {
    const { error } = await authLib.signUpWithPassword(email, password, fullName);
    return { error };
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
        isAdmin: profile?.role === 'admin' || Boolean(user?.email && user.email.toLowerCase().trim() === 'azharmir416@gmail.com'),
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
