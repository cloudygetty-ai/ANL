// src/services/matching/MatchingEngine.ts — Weighted matching score calculator
import type { MapUser, UserProfile, PresenceStatus } from '@types/index';
import { distanceMi } from '@utils/geo';
import { MATCH_WEIGHTS, PROXIMITY } from '@config/constants';

// ---------------------------------------------------------------------------
// Score sub-component boundaries
// ---------------------------------------------------------------------------

// Maximum distance considered for proximity scoring (beyond this = 0 pts)
const MAX_DISTANCE_MI = 25;

// Maximum age difference considered for age-diff scoring (beyond this = 0 pts)
const MAX_AGE_DIFF = 20;

// Presence score look-up: higher means user is more immediately reachable
const PRESENCE_SCORES: Record<PresenceStatus, number> = {
  online: 1.0,
  away: 0.5,
  offline: 0.0,
};

export class MatchingEngine {
  /**
   * Computes a 0–100 match score between a candidate MapUser and the
   * viewing user's profile.
   *
   * Score = weighted sum of five components:
   *   - Proximity   (35%) — closer distance → higher score
   *   - Interests   (25%) — Jaccard similarity of vibeTags
   *   - Age diff    (15%) — smaller age gap → higher score
   *   - Activity    (15%) — bonus if candidate is out tonight
   *   - Presence    (10%) — online > away > offline
   */
  score(user: MapUser, profile: UserProfile): number {
    if (!profile.location) {
      // WHY: Without the viewer's location we cannot compute proximity,
      // which is the heaviest weight. Return 0 rather than a misleading score.
      return 0;
    }

    const proximity = this.proximityScore(
      user.latitude,
      user.longitude,
      profile.location.latitude,
      profile.location.longitude,
    );

    const interests = this.interestsScore(user.vibeTags, profile.vibeTags);
    const ageDiff = this.ageDiffScore(user.age, profile.age);
    const activity = user.isOutTonight ? 1.0 : 0.0;
    const presence = PRESENCE_SCORES[user.presence];

    const raw =
      proximity  * MATCH_WEIGHTS.proximity  +
      interests  * MATCH_WEIGHTS.interests  +
      ageDiff    * MATCH_WEIGHTS.ageDiff    +
      activity   * MATCH_WEIGHTS.activity   +
      presence   * MATCH_WEIGHTS.presence;

    // Clamp to [0, 100] and round to integer for clean display
    return Math.round(Math.min(Math.max(raw * 100, 0), 100));
  }

  /**
   * Sorts a list of MapUsers by their match score against the given profile,
   * highest score first.
   * Does not mutate the input array.
   */
  rank(users: MapUser[], profile: UserProfile): MapUser[] {
    return [...users].sort(
      (a, b) => this.score(b, profile) - this.score(a, profile),
    );
  }

  // ---------------------------------------------------------------------------
  // Sub-component scoring (each returns 0–1)
  // ---------------------------------------------------------------------------

  /**
   * Converts distance in miles to a 0–1 proximity score using an inverse
   * linear decay. A user within 1 mile scores ~0.96; at MAX_DISTANCE_MI = 0.
   *
   * WHY inverse linear (not exponential): it keeps the gradient gradual
   * enough that users 5–10 miles away still get meaningful scores.
   */
  private proximityScore(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const miles = distanceMi(lat1, lon1, lat2, lon2);
    if (miles >= MAX_DISTANCE_MI) return 0;
    return 1 - miles / MAX_DISTANCE_MI;
  }

  /**
   * Jaccard similarity: |intersection| / |union| of the two tag sets.
   * Returns 0 when both sets are empty (no information, not a perfect match).
   */
  private interestsScore(tagsA: string[], tagsB: string[]): number {
    if (tagsA.length === 0 || tagsB.length === 0) return 0;

    const setA = new Set(tagsA.map((t) => t.toLowerCase()));
    const setB = new Set(tagsB.map((t) => t.toLowerCase()));

    let intersection = 0;
    for (const tag of setA) {
      if (setB.has(tag)) intersection++;
    }

    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  /**
   * Converts age difference to a 0–1 score using inverse linear decay.
   * Same age = 1.0; MAX_AGE_DIFF or more = 0.
   */
  private ageDiffScore(ageA: number, ageB: number): number {
    const diff = Math.abs(ageA - ageB);
    if (diff >= MAX_AGE_DIFF) return 0;
    return 1 - diff / MAX_AGE_DIFF;
  }
}
