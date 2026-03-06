// src/hooks/usePresence.ts
// Manages user's online presence — broadcasts coords + active status to Supabase
// Auto-expires after PRESENCE.ACTIVE_TTL_MS of inactivity
import { useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { supabase } from '@config/supabase';
import { PRESENCE } from '@config/constants';
import type { LatLng, PresenceStatus } from '@types/index';

export function usePresence(userId: string | null, coords: LatLng | null) {
  const channelRef = useRef<any>(null);
  const statusRef  = useRef<PresenceStatus>('online');

  const broadcast = useCallback(async (status: PresenceStatus) => {
    if (!supabase || !userId || !coords) return;
    statusRef.current = status;

    // Upsert presence row
    await supabase.from('presence').upsert({
      user_id:    userId,
      status,
      lat:        coords.lat,
      lng:        coords.lng,
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + PRESENCE.ACTIVE_TTL_MS).toISOString(),
    });

    // Broadcast via Realtime for instant map updates
    channelRef.current?.track({ status, coords, userId });
  }, [userId, coords]);

  useEffect(() => {
    if (!supabase || !userId) return;

    channelRef.current = supabase.channel(`presence:${userId}`, {
      config: { presence: { key: userId } },
    });
    channelRef.current.subscribe();

    broadcast('online');

    const sub = AppState.addEventListener('change', (state) => {
      broadcast(state === 'active' ? 'online' : 'away');
    });

    const expiry = setTimeout(() => broadcast('away'), PRESENCE.ACTIVE_TTL_MS);

    return () => {
      sub.remove();
      clearTimeout(expiry);
      broadcast('offline');
      supabase.removeChannel(channelRef.current);
    };
  }, [userId, coords]);

  return { setStatus: broadcast };
}
