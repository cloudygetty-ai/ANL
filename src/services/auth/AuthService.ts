// src/services/auth/AuthService.ts
// Phone OTP via backend /api/otp/* (Twilio Verify)

import { supabase, isSupabaseReady } from '../../config/supabase';
import type { UserProfile } from '@types/index';

const API = (
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) ||
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) ||
  ''
).replace(/\/$/, '');

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
  if (!API) throw new Error('API URL not configured — set VITE_API_URL');

  const res = await fetch(`${API}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  // Guard: non-JSON response (HTML error page, proxy error, etc.)
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    throw new Error(`Server returned non-JSON (${res.status}): ${text.slice(0, 120)}`);
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export class AuthService {
  async sendOTP(phone: string): Promise<OTPResult> {
    try {
      await apiPost('/api/otp/send', { phone });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async verifyOTP(phone: string, code: string): Promise<AuthSession | null> {
    try {
      const data = await apiPost('/api/otp/verify', { phone, code });
      try { localStorage.setItem('anl_token', data.token); } catch {}
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

  async getSession(): Promise<AuthSession | null> {
    try {
      const token = localStorage.getItem('anl_token');
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp < Date.now() / 1000) {
        localStorage.removeItem('anl_token');
        return null;
      }
      return { userId: payload.id, phone: payload.phone, accessToken: token, expiresAt: payload.exp };
    } catch {
      return null;
    }
  }

  async signOut(): Promise<void> {
    try { localStorage.removeItem('anl_token'); } catch {}
    if (isSupabaseReady) await supabase.auth.signOut().catch(() => {});
  }

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

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<boolean> {
    if (!isSupabaseReady) return false;
    const { error } = await supabase.from('users').update(updates).eq('id', userId);
    return !error;
  }
}

export const authService = new AuthService();
