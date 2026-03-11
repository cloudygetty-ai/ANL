// src/services/auth/AuthService.ts — Supabase phone OTP authentication service
import type { UserProfile } from '@types/index';
import { logger } from '@utils/Logger';
import { supabase, isSupabaseReady } from '@config/supabase';

const MODULE = 'AuthService';

export class AuthService {
  /**
   * Sends an OTP to the given phone number via Supabase SMS.
   * Phone must be in E.164 format (e.g. "+12125551234").
   */
  async sendOTP(phone: string): Promise<void> {
    if (!isSupabaseReady) {
      logger.warn(MODULE, 'Supabase not ready — OTP not sent (dev mode)');
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
      logger.info(MODULE, 'OTP sent', { phone });
    } catch (err) {
      logger.error(MODULE, 'sendOTP failed', err);
      throw err;
    }
  }

  /**
   * Verifies the OTP token the user received via SMS.
   * Returns the Supabase Session on success.
   */
  async verifyOTP(
    phone: string,
    token: string,
  ): Promise<import('@supabase/supabase-js').Session> {
    if (!isSupabaseReady) {
      logger.warn(MODULE, 'Supabase not ready — using mock session (dev mode)');
      // WHY: Return a minimal stub so UI flows continue in dev without a real backend
      return {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
        user: {
          id: 'mock-user-id',
          aud: 'authenticated',
          role: 'authenticated',
          email: undefined,
          phone,
          app_metadata: {},
          user_metadata: {},
          identities: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          factors: [],
        },
      } as unknown as import('@supabase/supabase-js').Session;
    }

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      });

      if (error) throw error;
      if (!data.session) throw new Error('No session returned from OTP verification');

      logger.info(MODULE, 'OTP verified', { userId: data.session.user.id });
      return data.session;
    } catch (err) {
      logger.error(MODULE, 'verifyOTP failed', err);
      throw err;
    }
  }

  /**
   * Returns the currently active Supabase session, or null if signed out.
   */
  async getSession(): Promise<import('@supabase/supabase-js').Session | null> {
    if (!isSupabaseReady) return null;

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    } catch (err) {
      logger.error(MODULE, 'getSession failed', err);
      return null;
    }
  }

  /**
   * Signs the current user out and clears the local session.
   */
  async signOut(): Promise<void> {
    if (!isSupabaseReady) {
      logger.warn(MODULE, 'Supabase not ready — signOut skipped (dev mode)');
      return;
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      logger.info(MODULE, 'Signed out');
    } catch (err) {
      logger.error(MODULE, 'signOut failed', err);
      throw err;
    }
  }

  /**
   * Fetches the user's profile row from the 'users' table.
   * If no row exists yet, inserts a minimal default profile and returns it.
   */
  async getOrCreateProfile(
    userId: string,
    phone: string,
  ): Promise<UserProfile> {
    if (!isSupabaseReady) {
      logger.warn(MODULE, 'Supabase not ready — returning mock profile');
      return this.buildMockProfile(userId, phone);
    }

    try {
      // Attempt to fetch existing profile
      const { data: existing, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = "row not found" — that is expected on first login
        throw fetchError;
      }

      if (existing) {
        logger.debug(MODULE, 'Profile loaded', { userId });
        return this.rowToProfile(existing);
      }

      // No existing row — insert defaults
      const defaults = this.buildDefaultRow(userId, phone);
      const { data: created, error: insertError } = await supabase
        .from('users')
        .insert(defaults)
        .select('*')
        .single();

      if (insertError) throw insertError;

      logger.info(MODULE, 'Profile created', { userId });
      return this.rowToProfile(created);
    } catch (err) {
      logger.error(MODULE, 'getOrCreateProfile failed', err);
      throw err;
    }
  }

  /**
   * Applies a partial update to the user's profile row.
   * Only the provided fields are changed; all others remain intact.
   */
  async updateProfile(
    userId: string,
    updates: Partial<UserProfile>,
  ): Promise<void> {
    if (!isSupabaseReady) {
      logger.warn(MODULE, 'Supabase not ready — updateProfile skipped (dev mode)');
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update(this.profileToRow(updates))
        .eq('id', userId);

      if (error) throw error;
      logger.debug(MODULE, 'Profile updated', { userId, updates });
    } catch (err) {
      logger.error(MODULE, 'updateProfile failed', err);
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Maps a raw Supabase DB row to our typed UserProfile. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private rowToProfile(row: Record<string, any>): UserProfile {
    return {
      id: row.id as string,
      phone: row.phone as string,
      displayName: (row.display_name as string) ?? '',
      age: (row.age as number) ?? 21,
      gender: row.gender ?? 'non_binary',
      bio: (row.bio as string) ?? '',
      avatarUrl: (row.avatar_url as string | null) ?? null,
      vibeTags: (row.vibe_tags as string[]) ?? [],
      isOutTonight: (row.is_out_tonight as boolean) ?? false,
      isPremium: (row.is_premium as boolean) ?? false,
      location: row.latitude != null && row.longitude != null
        ? { latitude: row.latitude as number, longitude: row.longitude as number }
        : null,
      presence: (row.presence as UserProfile['presence']) ?? 'offline',
      lastActiveAt: row.last_active_at
        ? new Date(row.last_active_at as string).getTime()
        : Date.now(),
      createdAt: row.created_at
        ? new Date(row.created_at as string).getTime()
        : Date.now(),
    };
  }

  /** Maps a partial UserProfile to DB column names for updates. */
  private profileToRow(profile: Partial<UserProfile>): Record<string, unknown> {
    const row: Record<string, unknown> = {};
    if (profile.displayName !== undefined) row.display_name = profile.displayName;
    if (profile.age !== undefined) row.age = profile.age;
    if (profile.gender !== undefined) row.gender = profile.gender;
    if (profile.bio !== undefined) row.bio = profile.bio;
    if (profile.avatarUrl !== undefined) row.avatar_url = profile.avatarUrl;
    if (profile.vibeTags !== undefined) row.vibe_tags = profile.vibeTags;
    if (profile.isOutTonight !== undefined) row.is_out_tonight = profile.isOutTonight;
    if (profile.isPremium !== undefined) row.is_premium = profile.isPremium;
    if (profile.location !== undefined) {
      row.latitude = profile.location?.latitude ?? null;
      row.longitude = profile.location?.longitude ?? null;
    }
    if (profile.presence !== undefined) row.presence = profile.presence;
    if (profile.lastActiveAt !== undefined) {
      row.last_active_at = new Date(profile.lastActiveAt).toISOString();
    }
    return row;
  }

  /** Returns the minimal row payload inserted on first login. */
  private buildDefaultRow(userId: string, phone: string): Record<string, unknown> {
    return {
      id: userId,
      phone,
      display_name: '',
      age: 21,
      gender: 'non_binary',
      bio: '',
      avatar_url: null,
      vibe_tags: [],
      is_out_tonight: false,
      is_premium: false,
      presence: 'online',
      last_active_at: new Date().toISOString(),
    };
  }

  /** Builds a mock profile for development without a backend. */
  private buildMockProfile(userId: string, phone: string): UserProfile {
    return {
      id: userId,
      phone,
      displayName: 'Dev User',
      age: 25,
      gender: 'non_binary',
      bio: 'Mock profile for local development',
      avatarUrl: null,
      vibeTags: ['music', 'rooftops'],
      isOutTonight: true,
      isPremium: false,
      location: { latitude: 40.7128, longitude: -74.006 },
      presence: 'online',
      lastActiveAt: Date.now(),
      createdAt: Date.now(),
    };
  }
}
