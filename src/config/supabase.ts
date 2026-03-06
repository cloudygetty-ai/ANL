// src/config/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL    ?? '';
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!URL || !KEY) {
  console.warn('[Supabase] Missing env vars — running in mock mode');
}

export const supabase: SupabaseClient = URL && KEY
  ? createClient(URL, KEY, {
      auth: {
        autoRefreshToken:    true,
        persistSession:      true,
        detectSessionInUrl:  false,
      },
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : (null as any);

export const isSupabaseReady = !!supabase;
