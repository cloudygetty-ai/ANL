/* eslint-disable @typescript-eslint/no-explicit-any */
// src/hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { supabase } from '@config/supabase';
import type { UserProfile } from '@types/index';

export interface AuthState {
  user:        UserProfile | null;
  session:     any | null;
  isLoading:   boolean;
  isLoggedIn:  boolean;
}

export function useAuth(): AuthState {
  const [session,   setSession]   = useState<any>(null);
  const [user,      setUser]      = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setIsLoading(false); return; }

    supabase.auth.getSession().then(({ data }: any) => {
      setSession(data.session);
      if (data.session?.user) fetchProfile(data.session.user.id);
      else setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
      else { setUser(null); setIsLoading(false); }
    });

    return () => listener?.subscription?.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    if (!supabase) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setUser(data ?? null);
    setIsLoading(false);
  }

  return { user, session, isLoading, isLoggedIn: !!session };
}
