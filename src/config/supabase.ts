// src/config/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

if (!URL || !KEY) {
  console.warn('[Supabase] Missing env vars — running in mock mode');
}

export const supabase: SupabaseClient = URL && KEY
  ? createClient(URL, KEY, {
      auth: {
        autoRefreshToken:    true,
        persistSession:      true,
        detectSessionInUrl:  true,
      },
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : (null as any);

export const isSupabaseReady = !!supabase;
