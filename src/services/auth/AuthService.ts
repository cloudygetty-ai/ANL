// src/services/auth/AuthService.ts
// Phone OTP via backend /api/otp/* (Twilio Verify)
// Falls back to Supabase session management

import { supabase, isSupabaseReady } from '../../config/supabase';
import type { UserProfile } from '@types/index';

const API = import.meta.env.VITE_API_URL || process.env.EXPO_PUBLIC_API_URL || '';

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

async function apiPost(path: string, body: Record<string, string>) {
  const res = await fetch(`${API}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export class AuthService {
  /** Send OTP via Twilio Verify */
  async sendOTP(phone: string): Promise<OTPResult> {
    try {
      await apiPost('/api/otp/send', { phone });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /** Verify OTP — returns session on success */
  async verifyOTP(phone: string, code: string): Promise<AuthSession | null> {
    try {
      const data = await apiPost('/api/otp/verify', { phone, code });
      // Store JWT for subsequent API calls
      localStorage?.setItem?.('anl_token', data.token);
      return {
        userId:      data.user.id,
        phone:       data.user.phone,
        accessToken: data.token,
        expiresAt:   Date.now() / 1000 + 30 * 86400,
      };
    } catch {
      return null;
    }
  }

  /** Get current session from stored token */
  async getSession(): Promise<AuthSession | null> {
    const token = localStorage?.getItem?.('anl_token');
    if (!token) return null;
    try {
      // Decode JWT payload (no verify needed — server will validate on each request)
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp < Date.now() / 1000) { localStorage?.removeItem?.('anl_token'); return null; }
      return { userId: payload.id, phone: payload.phone, accessToken: token, expiresAt: payload.exp };
    } catch {
      return null;
    }
  }

  /** Sign out */
  async signOut(): Promise<void> {
    localStorage?.removeItem?.('anl_token');
    if (isSupabaseReady) await supabase.auth.signOut().catch(() => {});
  }

  /** Fetch or create user profile */
  async getOrCreateProfile(userId: string, phone: string): Promise<UserProfile | null> {
    if (!isSupabaseReady) return null;
    const { data: existing } = await supabase.from('users').select('*').eq('id', userId).single();
    if (existing) return existing as UserProfile;
    const { data: created, error } = await supabase.from('users').insert({
      id: userId, phone, display_name: '', gender: 'f', age: 18,
      presence: 'online', blocked_ids: [], vibe_tag_ids: [], photos: [],
      is_verified: false, is_premium: false,
    }).select().single();
    if (error) { console.warn('[AuthService] createProfile:', error); return null; }
    return created as UserProfile;
  }

  /** Update profile fields */
  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<boolean> {
    if (!isSupabaseReady) return false;
    const { error } = await supabase.from('users').update(updates).eq('id', userId);
    return !error;
  }
}

export const authService = new AuthService();
