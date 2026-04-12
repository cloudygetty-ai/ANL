// src/services/visits/VisitsService.ts
// Tracks who has viewed the current user's profile and whose profiles we've viewed.
// Premium users can view visitors without revealing themselves (ghost mode).
import type { Visit, UserProfile } from '@types/index';

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

export class VisitsService {
  /**
   * Record that `visitorId` viewed `targetId`'s profile.
   * Called whenever a profile card is opened.
   */
  async recordVisit(visitorId: string, targetId: string): Promise<void> {
    const client = sb();
    if (!client) return;

    // WHY: upsert on (visitor_id, target_id) with updated_at
    // so we don't spam the table — one row per pair, refreshed each visit.
    const { error } = await client
      .from('profile_visits')
      .upsert(
        { visitor_id: visitorId, target_id: targetId, visited_at: Date.now() },
        { onConflict: 'visitor_id,target_id' },
      );

    if (error) console.warn('[VisitsService] recordVisit:', error.message);
  }

  /**
   * Fetch who visited `userId`'s profile, ordered most-recent first.
   * `limit` defaults to 50. Premium users get full history; free users get last 10.
   */
  async getVisitors(userId: string, isPremium: boolean): Promise<Visit[]> {
    const client = sb();
    if (!client) return [];

    const limit = isPremium ? 50 : 10;

    const { data, error } = await client
      .from('profile_visits')
      .select(`
        id,
        visited_at,
        users!visitor_id (
          id, display_name, age, gender, photos
        )
      `)
      .eq('target_id', userId)
      .order('visited_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[VisitsService] getVisitors:', error.message);
      return [];
    }

    const seenCutoff = Date.now() - 24 * 60 * 60 * 1000; // 24h window for "new"

    return (data ?? []).map((row: any): Visit => {
      const u: any = row.users ?? {};
      return {
        id:              row.id,
        visitorId:       u.id ?? '',
        visitorName:     u.display_name ?? 'Unknown',
        visitorAge:      u.age ?? 0,
        visitorGender:   u.gender ?? 'f',
        visitorPhotoUrl: u.photos?.[0] ?? undefined,
        visitedAt:       row.visited_at,
        isNew:           row.visited_at > seenCutoff,
      };
    });
  }

  /**
   * Mark all visits as seen (clears the "new" indicator) for `userId`.
   * Called when user opens the Visits screen.
   */
  async markAllSeen(userId: string): Promise<void> {
    const client = sb();
    if (!client) return;

    // WHY: we use a last_seen_at column on a per-user basis rather than
    // mutating every visit row — one update vs potentially hundreds.
    const { error } = await client
      .from('users')
      .update({ visits_last_seen_at: Date.now() })
      .eq('id', userId);

    if (error) console.warn('[VisitsService] markAllSeen:', error.message);
  }

  /**
   * Get the count of new (unseen) visitors since last check.
   */
  async getNewVisitorCount(userId: string): Promise<number> {
    const client = sb();
    if (!client) return 0;

    const { data: user } = await client
      .from('users')
      .select('visits_last_seen_at')
      .eq('id', userId)
      .single();

    const since = user?.visits_last_seen_at ?? 0;

    const { count, error } = await client
      .from('profile_visits')
      .select('id', { count: 'exact', head: true })
      .eq('target_id', userId)
      .gt('visited_at', since);

    if (error) return 0;
    return count ?? 0;
  }
}

export const visitsService = new VisitsService();
