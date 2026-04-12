// src/services/subscription/SubscriptionService.ts
// Manages Premium / Premium+ tiers, Boost tokens, and purchase flow.
// Purchase itself is delegated to the platform IAP layer (react-native-purchases / RevenueCat).
// This service manages the server-side record and expiry logic.
import type { UserSubscription, SubscriptionTier, SubscriptionPlan } from '@types/index';

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

// ── Static plan definitions ───────────────────────────────────────────────────
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id:         'free',
    name:       'Free',
    priceMonth: 0,
    priceYear:  0,
    highlight:  false,
    color:      '#888',
    features: [
      'See nearby members on map',
      'Send 5 messages/day',
      'View last 3 profile visitors',
      'Basic matching',
    ],
  },
  {
    id:         'premium',
    name:       'Premium',
    priceMonth: 999,   // $9.99
    priceYear:  7999,  // $79.99
    highlight:  true,
    color:      '#a855f7',
    features: [
      'Unlimited messaging',
      'See all profile visitors',
      'Who liked you',
      'Advanced filters on map',
      'Read receipts',
      '3 Boosts per month',
      'Premium badge on profile',
    ],
  },
  {
    id:         'premium_plus',
    name:       'Premium+',
    priceMonth: 1999,  // $19.99
    priceYear:  14999, // $149.99
    highlight:  false,
    color:      '#fbbf24',
    features: [
      'Everything in Premium',
      'Discreet mode',
      'Incognito browse',
      'Unlimited Boosts',
      'Priority in search',
      'Gold badge on profile',
      'Video calls',
    ],
  },
];

export class SubscriptionService {
  /** Fetch current subscription state for a user */
  async getSubscription(userId: string): Promise<UserSubscription> {
    const client = sb();
    if (!client) return this.defaultSubscription();

    const { data, error } = await client
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) return this.defaultSubscription();

    return {
      tier:             data.tier         as SubscriptionTier,
      expiresAt:        data.expires_at   ?? null,
      autoRenew:        data.auto_renew   ?? false,
      purchasedAt:      data.purchased_at ?? null,
      boostTokens:      data.boost_tokens ?? 0,
      boostActiveUntil: data.boost_active_until ?? null,
    };
  }

  /** Grant or upgrade a subscription (called after IAP receipt verification) */
  async grantSubscription(
    userId: string,
    tier: SubscriptionTier,
    durationDays: number,
  ): Promise<boolean> {
    const client = sb();
    if (!client) return false;

    const plan       = SUBSCRIPTION_PLANS.find(p => p.id === tier);
    const boostSlots = tier === 'premium_plus' ? 999 : tier === 'premium' ? 3 : 0;

    const { error } = await client
      .from('subscriptions')
      .upsert({
        user_id:      userId,
        tier,
        purchased_at: Date.now(),
        expires_at:   Date.now() + durationDays * 86_400_000,
        auto_renew:   true,
        boost_tokens: boostSlots,
      }, { onConflict: 'user_id' });

    if (error) {
      console.warn('[SubscriptionService] grantSubscription:', error.message);
      return false;
    }

    // Mirror isPremium flag on the user row for fast reads
    await client
      .from('users')
      .update({ is_premium: tier !== 'free' })
      .eq('id', userId);

    return true;
  }

  /** Activate a Boost — elevates profile in search for 30 minutes */
  async activateBoost(userId: string): Promise<boolean> {
    const client = sb();
    if (!client) return false;

    const sub = await this.getSubscription(userId);
    if (sub.boostTokens <= 0 && sub.tier !== 'premium_plus') {
      return false; // no tokens
    }

    const boostUntil = Date.now() + 30 * 60 * 1000; // 30 min

    const { error } = await client
      .from('subscriptions')
      .update({
        boost_active_until: boostUntil,
        boost_tokens: Math.max(0, sub.boostTokens - 1),
      })
      .eq('user_id', userId);

    if (error) {
      console.warn('[SubscriptionService] activateBoost:', error.message);
      return false;
    }
    return true;
  }

  /** Check if a boost is currently active */
  isBoostActive(sub: UserSubscription): boolean {
    return sub.boostActiveUntil !== null && sub.boostActiveUntil > Date.now();
  }

  /** Check if subscription is valid (not expired) */
  isActive(sub: UserSubscription): boolean {
    if (sub.tier === 'free') return true;
    if (sub.expiresAt === null) return true;
    return sub.expiresAt > Date.now();
  }

  private defaultSubscription(): UserSubscription {
    return {
      tier:             'free',
      expiresAt:        null,
      autoRenew:        false,
      purchasedAt:      null,
      boostTokens:      0,
      boostActiveUntil: null,
    };
  }
}

export const subscriptionService = new SubscriptionService();
