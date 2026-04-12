// src/services/security/SecurityService.ts
// Manages discreet mode settings, app-lock PIN, and block list.
// Discreet mode hides the user from the map and search entirely.
// Incognito browse (Premium+) lets them view profiles without recording visits.
import type { DiscreetSettings } from '@types/index';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DISCREET_KEY  = '@anl:discreet_settings';
const PIN_HASH_KEY  = '@anl:pin_hash';

const DEFAULT_SETTINGS: DiscreetSettings = {
  enabled:           false,
  hiddenFromSearch:  false,
  appearOffline:     false,
  requirePinToOpen:  false,
  discreetIcon:      false,
  screenshotAlert:   false,
};

// WHY: simple djb2 hash — not cryptographically secure, but
// sufficient to obfuscate a 4-digit PIN in local storage.
// A real implementation would use expo-secure-store + bcrypt.
const hashPin = (pin: string): string => {
  let hash = 5381;
  for (let i = 0; i < pin.length; i++) {
    hash = ((hash << 5) + hash) + pin.charCodeAt(i);
    hash = hash & hash; // force 32-bit int
  }
  return hash.toString(16);
};

let supabase: any = null;
const sb = () => {
  if (supabase) return supabase;
  try {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL    ?? '',
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    );
  } catch { /* not installed */ }
  return supabase;
};

export class SecurityService {
  /** Load discreet settings from local storage (fast, no network) */
  async getSettings(): Promise<DiscreetSettings> {
    try {
      const raw = await AsyncStorage.getItem(DISCREET_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  /** Persist discreet settings locally and mirror to Supabase */
  async saveSettings(userId: string, settings: DiscreetSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(DISCREET_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('[SecurityService] saveSettings (local):', e);
    }

    const client = sb();
    if (!client) return;

    const { error } = await client
      .from('users')
      .update({
        discreet_mode:       settings.enabled,
        hidden_from_search:  settings.hiddenFromSearch,
        appear_offline:      settings.appearOffline,
      })
      .eq('id', userId);

    if (error) console.warn('[SecurityService] saveSettings (remote):', error.message);
  }

  /** Set a 4-digit PIN for app lock */
  async setPin(pin: string): Promise<void> {
    await AsyncStorage.setItem(PIN_HASH_KEY, hashPin(pin));
  }

  /** Verify a PIN attempt — returns true if correct */
  async verifyPin(attempt: string): Promise<boolean> {
    const stored = await AsyncStorage.getItem(PIN_HASH_KEY);
    if (!stored) return true; // no PIN set
    return stored === hashPin(attempt);
  }

  /** Remove the PIN lock */
  async clearPin(): Promise<void> {
    await AsyncStorage.removeItem(PIN_HASH_KEY);
  }

  /** Check whether a PIN is currently set */
  async hasPinSet(): Promise<boolean> {
    const v = await AsyncStorage.getItem(PIN_HASH_KEY);
    return v !== null;
  }

  // ── Block list ───────────────────────────────────────────────────────────────

  /** Block a user — adds to local blockedIds and updates Supabase */
  async blockUser(myId: string, targetId: string, currentBlockedIds: string[]): Promise<string[]> {
    const updated = [...new Set([...currentBlockedIds, targetId])];

    const client = sb();
    if (client) {
      const { error } = await client
        .from('users')
        .update({ blocked_ids: updated })
        .eq('id', myId);
      if (error) console.warn('[SecurityService] blockUser:', error.message);
    }

    return updated;
  }

  /** Unblock a user */
  async unblockUser(myId: string, targetId: string, currentBlockedIds: string[]): Promise<string[]> {
    const updated = currentBlockedIds.filter(id => id !== targetId);

    const client = sb();
    if (client) {
      const { error } = await client
        .from('users')
        .update({ blocked_ids: updated })
        .eq('id', myId);
      if (error) console.warn('[SecurityService] unblockUser:', error.message);
    }

    return updated;
  }
}

export const securityService = new SecurityService();
