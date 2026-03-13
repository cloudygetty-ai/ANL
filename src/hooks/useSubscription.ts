// hooks/useSubscription.ts
import { useState, useCallback } from 'react';
import { useStripe } from '@stripe/stripe-react-native';
import { Alert } from 'react-native';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';

export type SubscriptionTier = 'free' | 'plus' | 'premium';

interface SubscriptionState {
  tier: SubscriptionTier;
  status: 'active' | 'inactive' | 'pending' | 'past_due' | 'cancelling';
  expiresAt: string | null;
}

export function useSubscription() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const subscribe = useCallback(async (tier: Exclude<SubscriptionTier, 'free'>) => {
    setLoading(true);
    try {
      // 1. Fetch payment sheet params from backend
      const { data } = await api.post('/stripe/payment-sheet', { tier });
      const { paymentIntent, ephemeralKey, customer, publishableKey } = data;

      // 2. Init Stripe payment sheet
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'AllNightLong',
        customerId: customer,
        customerEphemeralKeySecret: ephemeralKey,
        paymentIntentClientSecret: paymentIntent,
        allowsDelayedPaymentMethods: false,
        appearance: {
          colors: {
            primary: '#a855f7',
            background: '#04040a',
            componentBackground: '#0d0010',
            componentText: '#ffffff',
            primaryText: '#ffffff',
            secondaryText: '#9ca3af',
            componentBorder: '#1f0a2e',
          },
          shapes: { borderRadius: 12 },
        },
      });

      if (initError) throw new Error(initError.message);

      // 3. Present payment sheet
      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code === 'Canceled') return { success: false, cancelled: true };
        throw new Error(presentError.message);
      }

      // 4. Refresh user subscription state
      const { data: sub } = await api.get('/stripe/subscription');
      setUser({ ...user!, subscriptionTier: sub.subscription_tier });

      return { success: true };
    } catch (err: any) {
      Alert.alert('Payment Failed', err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [initPaymentSheet, presentPaymentSheet, user, setUser]);

  const purchaseBoost = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/stripe/boost');
      const { clientSecret } = data;

      const { error } = await presentPaymentSheet();
      if (error) throw new Error(error.message);

      return { success: true };
    } catch (err: any) {
      Alert.alert('Boost Failed', err.message);
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [presentPaymentSheet]);

  const cancelSubscription = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/stripe/cancel');
      setUser({ ...user!, subscriptionStatus: 'cancelling' });
      return { success: true, cancelAt: data.cancelAt };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [user, setUser]);

  const hasFeature = useCallback((feature: string): boolean => {
    const tier = user?.subscriptionTier ?? 'free';
    const gates: Record<string, SubscriptionTier[]> = {
      unlimited_swipes: ['plus', 'premium'],
      see_who_likes_you: ['plus', 'premium'],
      rewind: ['plus', 'premium'],
      profile_boost: ['plus', 'premium'],
      ai_coach: ['premium'],
      incognito: ['premium'],
      priority_matching: ['premium'],
      video_messages: ['premium'],
      read_receipts: ['premium'],
    };
    return gates[feature]?.includes(tier) ?? false;
  }, [user?.subscriptionTier]);

  return { subscribe, purchaseBoost, cancelSubscription, hasFeature, loading };
}
