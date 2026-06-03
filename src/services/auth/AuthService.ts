// src/services/auth/AuthService.ts
// Phone OTP via Supabase Auth — no backend needed
import { supabase, isSupabaseReady } from '../../config/supabase';

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
  async sendOTP(phone: string): Promise<OTPResult> {
    if (!isSupabaseReady) return { success: false, error: 'Supabase not configured' };
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  async verifyOTP(phone: string, code: string): Promise<AuthSession | null> {
    if (!isSupabaseReady) return null;
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token: code,
      type: 'sms',
    });
    if (error || !data.session) return null;
    return {
      userId:      data.session.user.id,
      phone:       data.session.user.phone ?? phone,
      accessToken: data.session.access_token,
      expiresAt:   data.session.expires_at ?? (Date.now() / 1000 + 3600),
    };
  }

  async getSession(): Promise<AuthSession | null> {
    if (!isSupabaseReady) return null;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    return {
      userId:      session.user.id,
      phone:       session.user.phone ?? '',
      accessToken: session.access_token,
      expiresAt:   session.expires_at ?? (Date.now() / 1000 + 3600),
    };
  }

  async signOut(): Promise<void> {
    if (isSupabaseReady) await supabase.auth.signOut().catch(() => {});
  }

  async getOrCreateProfile(userId: string, phone: string): Promise<any | null> {
    if (!isSupabaseReady) return null;
    const { data: existing } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (existing) return existing;

    const { data: created, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        username: phone.replace('+', ''),
        display_name: '',
        gender: 'f',
        age: 18,
        vibe_tags: [],
        photos: [],
        is_verified: false,
        subscription_tier: 'free',
      })
      .select()
      .single();
    if (error) {
      console.warn('[AuthService] createProfile:', error);
      return null;
    }
    return created;
  }

  async updateProfile(userId: string, updates: Record<string, any>): Promise<boolean> {
    if (!isSupabaseReady) return false;
    const { error } = await supabase.from('users').update(updates).eq('id', userId);
    return !error;
  }
}

export const authService = new AuthService();
