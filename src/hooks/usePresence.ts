// src/hooks/usePresence.ts
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { supabase, isSupabaseReady } from '@config/supabase';
import type { PresenceStatus } from '@types/index';

// Auto-expire presence after 2 h of inactivity (covers overnight background)
const EXPIRE_MS = 2 * 60 * 60 * 1000;

export function usePresence(userId: string | undefined) {
  // WHY: store the channel in a ref so the cleanup function always sees the
  // same channel instance regardless of re-renders
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!userId || !isSupabaseReady) return;

    const channel = supabase.channel(`presence:${userId}`);
    channelRef.current = channel;

    // Subscribe and begin tracking on SUBSCRIBED confirmation
    channel
      .on('presence', { event: 'sync' }, () => {})
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ userId, status: 'online' as PresenceStatus, at: Date.now() });
        }
      });

    // Mirror presence into the users table so queries can filter by it
    supabase
      .from('users')
      .update({ presence: 'online', last_active_at: new Date().toISOString() })
      .eq('id', userId)
      .then(() => {});

    // Sync presence status whenever the app moves between foreground/background
    const handleAppStateChange = async (state: AppStateStatus) => {
      const presence: PresenceStatus = state === 'active' ? 'online' : 'away';
      await channel.track({ userId, status: presence, at: Date.now() });
      await supabase
        .from('users')
        .update({ presence, last_active_at: new Date().toISOString() })
        .eq('id', userId);
    };

    const appStateSub = AppState.addEventListener('change', handleAppStateChange);

    // Flip to offline after the expiry window in case the OS never fires
    // an app-state event (common when backgrounded for hours on iOS)
    const expireTimer = setTimeout(async () => {
      await channel.track({ userId, status: 'offline' as PresenceStatus, at: Date.now() });
    }, EXPIRE_MS);

    return () => {
      appStateSub.remove();
      clearTimeout(expireTimer);
      channel.unsubscribe();
    };
  }, [userId]);
}
