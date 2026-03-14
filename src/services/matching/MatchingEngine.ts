// src/services/matching/MatchingEngine.ts
// Weighted compatibility score: distance, interests, age, activity, premium
import type { UserProfile } from '@types/index';
import { distanceM } from '@utils/geo';

export interface MatchWeights {
  distance:  number; // 0-1
  interests: number;
  age:       number;
  activity:  number;
  premium:   number;
}

const DEFAULT_WEIGHTS: MatchWeights = {
  distance:  0.35,
  interests: 0.25,
  age:       0.15,
  activity:  0.20,
  premium:   0.05,
};

export interface MatchResult {
  userId: string;
  score:  number;       // 0-100
  breakdown: MatchWeights;
}

export class MatchingEngine {
  private weights: MatchWeights;

  constructor(weights: Partial<MatchWeights> = {}) {
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
  }

  /** Score a candidate profile against the current user */
  score(viewer: UserProfile, candidate: UserProfile): MatchResult {
    const breakdown: MatchWeights = {
      distance:  this.distanceScore(viewer, candidate),
      interests: this.interestScore(viewer, candidate),
      age:       this.ageScore(viewer, candidate),
      activity:  this.activityScore(candidate),
      premium:   candidate.isPremium ? 1 : 0,
    };

    const raw =
      breakdown.distance  * this.weights.distance  +
      breakdown.interests * this.weights.interests +
      breakdown.age       * this.weights.age       +
      breakdown.activity  * this.weights.activity  +
      breakdown.premium   * this.weights.premium;

    return {
      userId: candidate.id,
      score:  Math.round(Math.min(100, Math.max(0, raw * 100))),
      breakdown,
    };
  }

  /** Sort and filter a list of candidates */
  rank(viewer: UserProfile, candidates: UserProfile[], minScore = 40): UserProfile[] {
    return candidates
      .map(c => ({ profile: c, result: this.score(viewer, c) }))
      .filter(({ result }) => result.score >= minScore)
      .sort((a, b) => b.result.score - a.result.score)
      .map(({ profile, result }) => ({ ...profile, match: result.score }));
  }

  private distanceScore(viewer: UserProfile, candidate: UserProfile): number {
    if (!viewer.coords || !candidate.coords) return 0.5;
    const meters = distanceM(viewer.coords, candidate.coords);
    // Full score < 500m, zero at 8km
    if (meters <= 500)  return 1.0;
    if (meters >= 8000) return 0.0;
    return 1 - (meters - 500) / 7500;
  }

  private interestScore(viewer: UserProfile, candidate: UserProfile): number {
    const a = new Set(viewer.vibeTagIds);
    const b = new Set(candidate.vibeTagIds);
    if (a.size === 0 || b.size === 0) return 0.5;
    const intersection = [...a].filter(x => b.has(x)).length;
    const union = new Set([...a, ...b]).size;
    return intersection / union; // Jaccard similarity
  }

  private ageScore(viewer: UserProfile, candidate: UserProfile): number {
    const diff = Math.abs(viewer.age - candidate.age);
    if (diff <= 2)  return 1.0;
    if (diff <= 5)  return 0.8;
    if (diff <= 10) return 0.5;
    if (diff <= 15) return 0.25;
    return 0.1;
  }

  private activityScore(candidate: UserProfile): number {
    if (candidate.presence === 'online') {
      const minsAgo = (Date.now() - candidate.lastActiveAt) / 60000;
      if (minsAgo <= 5)   return 1.0;
      if (minsAgo <= 30)  return 0.8;
      if (minsAgo <= 120) return 0.5;
    }
    return candidate.presence === 'away' ? 0.3 : 0.1;
  }
}

export const matchingEngine = new MatchingEngine();
