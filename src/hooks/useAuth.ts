// src/hooks/useAuth.ts
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseReady } from '@config/supabase';
import { useUserStore } from '@services/state/userStore';
import type { UserProfile } from '@types/index';

export function useAuth() {
  const { profile, isAuthed, setProfile, clearProfile } = useUserStore();
  const [isLoading, setIsLoading] = useState(true);
  // Keep session available to callers that need the raw JWT (e.g. video tokens)
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // WHY: guard lets the app run without Supabase creds during local dev
    if (!isSupabaseReady) {
      setIsLoading(false);
      return;
    }

    // Restore any session that was persisted in AsyncStorage
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        fetchProfile(data.session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        clearProfile();
        setIsLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
    // WHY: empty deps — runs once on mount; auth state changes arrive via the listener
  }, []);

  async function fetchProfile(userId: string) {
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        // Map snake_case DB columns to camelCase domain type
        const mapped: UserProfile = {
          id: data.id,
          phone: data.phone ?? '',
          displayName: data.display_name ?? '',
          age: data.age ?? 0,
          gender: data.gender ?? 'non_binary',
          bio: data.bio ?? '',
          avatarUrl: data.avatar_url ?? null,
          vibeTags: data.vibe_tags ?? [],
          isOutTonight: data.is_out_tonight ?? false,
          isPremium: data.is_premium ?? false,
          location:
            data.latitude != null && data.longitude != null
              ? { latitude: data.latitude, longitude: data.longitude }
              : null,
          presence: 'online',
          lastActiveAt: Date.now(),
          createdAt: new Date(data.created_at).getTime(),
        };
        setProfile(mapped);
      }
    } catch {
      // WHY: a missing profile is expected for brand-new users who have
      // authenticated but not yet completed onboarding — not an error state
    } finally {
      setIsLoading(false);
    }
  }

  return { user: profile, session, isLoading, isLoggedIn: isAuthed };
}
