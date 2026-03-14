// src/hooks/useGate.ts
import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSubscription } from './useSubscription';

type GatedFeature =
  | 'unlimited_swipes'
  | 'see_who_likes_you'
  | 'rewind'
  | 'profile_boost'
  | 'ai_coach'
  | 'incognito'
  | 'priority_matching'
  | 'video_messages'
  | 'read_receipts';

const FEATURE_LABELS: Record<GatedFeature, string> = {
  unlimited_swipes:    'Unlimited Swipes',
  see_who_likes_you:   'See Who Likes You',
  rewind:              'Rewind',
  profile_boost:       'Profile Boost',
  ai_coach:            'AI Relationship Coach',
  incognito:           'Incognito Mode',
  priority_matching:   'Priority Matching',
  video_messages:      'Video Messages',
  read_receipts:       'Read Receipts',
};

export function useGate() {
  const navigation = useNavigation<any>();
  const { hasFeature } = useSubscription();

  // Returns true if allowed, false + shows paywall if not
  const gate = useCallback(
    (feature: GatedFeature): boolean => {
      if (hasFeature(feature)) return true;
      navigation.navigate('Paywall', { featureGate: FEATURE_LABELS[feature] });
      return false;
    },
    [hasFeature, navigation]
  );

  // Higher-order: wrap an action with a gate check
  const gated = useCallback(
    (feature: GatedFeature, action: () => void) => () => {
      if (gate(feature)) action();
    },
    [gate]
  );

  return { gate, gated, hasFeature };
}
