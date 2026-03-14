/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-var-requires */
// src/services/auth/AuthService.ts
// Stack: Supabase Auth — phone OTP, session management, token refresh
import type { UserProfile } from '@types/index';

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

export interface AuthSession {
  userId:      string;
  phone:       string;
  accessToken: string;
  expiresAt:   number;
}

export interface OTPResult {
  success: boolean;
  error?:  string;
}

export class AuthService {
  /** Send OTP to phone number (E.164 format: +12015551234) */
  async sendOTP(phone: string): Promise<OTPResult> {
    const client = sb();
    if (!client) return { success: false, error: 'Supabase not configured' };

    const { error } = await client.auth.signInWithOtp({ phone });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  /** Verify OTP code — returns session on success */
  async verifyOTP(phone: string, token: string): Promise<AuthSession | null> {
    const client = sb();
    if (!client) return null;

    const { data, error } = await client.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    if (error || !data.session) return null;

    return {
      userId:      data.session.user.id,
      phone:       data.session.user.phone ?? phone,
      accessToken: data.session.access_token,
      expiresAt:   data.session.expires_at ?? Date.now() / 1000 + 3600,
    };
  }

  /** Get current session (auto-refreshes if needed) */
  async getSession(): Promise<AuthSession | null> {
    const client = sb();
    if (!client) return null;

    const { data } = await client.auth.getSession();
    const session = data?.session;
    if (!session) return null;

    return {
      userId:      session.user.id,
      phone:       session.user.phone ?? '',
      accessToken: session.access_token,
      expiresAt:   session.expires_at ?? 0,
    };
  }

  /** Sign out and clear session */
  async signOut(): Promise<void> {
    const client = sb();
    if (client) await client.auth.signOut();
  }

  /** Fetch or create user profile row */
  async getOrCreateProfile(userId: string, phone: string): Promise<UserProfile | null> {
    const client = sb();
    if (!client) return null;

    const { data: existing } = await client
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (existing) return existing as UserProfile;

    const { data: created, error } = await client
      .from('users')
      .insert({
        id:          userId,
        phone,
        display_name: '',
        gender:       'f',
        age:          18,
        presence:     'online',
        blocked_ids:  [],
        vibe_tag_ids: [],
        photos:       [],
        is_verified:  false,
        is_premium:   false,
      })
      .select()
      .single();

    if (error) { console.warn('[AuthService] createProfile:', error); return null; }
    return created as UserProfile;
  }

  /** Update profile fields */
  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<boolean> {
    const client = sb();
    if (!client) return false;

    const { error } = await client
      .from('users')
      .update(updates)
      .eq('id', userId);

    return !error;
  }
}

export const authService = new AuthService();
