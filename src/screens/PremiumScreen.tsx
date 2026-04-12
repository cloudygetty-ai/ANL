// src/screens/PremiumScreen.tsx
// Subscription upgrade screen — shows plan tiers, features, and handles purchase.
// Boost activation is also surfaced here.
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserStore } from '@services/state/userStore';
import { subscriptionService, SUBSCRIPTION_PLANS } from '@services/subscription';
import type { UserSubscription, SubscriptionPlan } from '@types/index';

const C = {
  bg:        '#04040a',
  surface:   '#0d0d14',
  surfaceUp: '#13131e',
  border:    'rgba(168,85,247,0.18)',
  purple:    '#a855f7',
  pink:      '#ec4899',
  amber:     '#fbbf24',
  green:     '#4ade80',
  red:       '#f87171',
  text:      '#f0eee8',
  textDim:   'rgba(240,238,232,0.5)',
  textMuted: 'rgba(240,238,232,0.2)',
};

const formatPrice = (cents: number) => {
  if (cents === 0) return 'Free';
  return `$${(cents / 100).toFixed(2)}`;
};

// ── Plan card ─────────────────────────────────────────────────────────────────
interface PlanCardProps {
  plan:      SubscriptionPlan;
  current:   boolean;
  selected:  boolean;
  billing:   'month' | 'year';
  onSelect:  () => void;
}

const PlanCard: React.FC<PlanCardProps> = ({ plan, current, selected, billing, onSelect }) => {
  const price = billing === 'month' ? plan.priceMonth : plan.priceYear;
  const period = billing === 'month' ? '/mo' : '/yr';

  return (
    <TouchableOpacity
      style={[
        styles.planCard,
        selected  && { borderColor: plan.color, borderWidth: 2 },
        plan.highlight && styles.planCardHighlight,
      ]}
      onPress={onSelect}
      activeOpacity={0.8}
    >
      {plan.highlight && (
        <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
          <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
        </View>
      )}
      {current && (
        <View style={[styles.currentBadge, { backgroundColor: `${plan.color}22`, borderColor: `${plan.color}44` }]}>
          <Text style={[styles.currentBadgeText, { color: plan.color }]}>CURRENT</Text>
        </View>
      )}

      <View style={styles.planHeader}>
        <View style={[styles.planColorDot, { backgroundColor: plan.color }]} />
        <Text style={[styles.planName, { color: plan.color }]}>{plan.name}</Text>
      </View>

      <Text style={styles.planPrice}>
        {formatPrice(price)}
        {price > 0 && <Text style={styles.planPeriod}>{period}</Text>}
      </Text>

      {billing === 'year' && plan.priceYear > 0 && (
        <Text style={styles.savingsText}>
          Save {Math.round((1 - plan.priceYear / (plan.priceMonth * 12)) * 100)}% vs monthly
        </Text>
      )}

      <View style={styles.featureList}>
        {plan.features.map(f => (
          <View key={f} style={styles.featureRow}>
            <Text style={[styles.checkIcon, { color: plan.color }]}>✓</Text>
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
      </View>

      <View style={[
        styles.selectIndicator,
        selected && { backgroundColor: plan.color, borderColor: plan.color },
      ]}>
        {selected && <Text style={styles.selectCheck}>✓</Text>}
      </View>
    </TouchableOpacity>
  );
};

// ── Boost card ────────────────────────────────────────────────────────────────
interface BoostCardProps {
  sub:      UserSubscription;
  onBoost:  () => void;
  loading:  boolean;
}

const BoostCard: React.FC<BoostCardProps> = ({ sub, onBoost, loading }) => {
  const active    = subscriptionService.isBoostActive(sub);
  const remaining = active
    ? Math.ceil(((sub.boostActiveUntil ?? 0) - Date.now()) / 60000)
    : 0;

  return (
    <View style={styles.boostCard}>
      <View style={styles.boostGlow} />
      <Text style={styles.boostTitle}>🚀  Boost Your Profile</Text>
      <Text style={styles.boostSub}>
        Get placed at the top of search and the map for 30 minutes.
      </Text>

      {active ? (
        <View style={styles.boostActiveRow}>
          <View style={[styles.boostActiveDot, { backgroundColor: C.green }]} />
          <Text style={styles.boostActiveText}>Active · {remaining}m remaining</Text>
        </View>
      ) : (
        <View style={styles.boostMeta}>
          <Text style={styles.boostTokens}>
            {sub.tier === 'premium_plus' ? '∞' : sub.boostTokens} boost{sub.boostTokens !== 1 ? 's' : ''} left
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.boostBtn, active && styles.boostBtnDisabled]}
        onPress={onBoost}
        disabled={active || loading}
        activeOpacity={0.8}
      >
        {loading
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={styles.boostBtnText}>{active ? 'BOOSTING…' : 'BOOST NOW'}</Text>
        }
      </TouchableOpacity>
    </View>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
interface PremiumScreenProps {
  navigation?: any;
}

const PremiumScreen: React.FC<PremiumScreenProps> = ({ navigation }) => {
  const { profile, updateProfile } = useUserStore();

  const [sub,         setSub]         = useState<UserSubscription | null>(null);
  const [selected,    setSelected]    = useState<string>('premium');
  const [billing,     setBilling]     = useState<'month' | 'year'>('month');
  const [purchasing,  setPurchasing]  = useState(false);
  const [boosting,    setBoosting]    = useState(false);

  useEffect(() => {
    if (!profile) return;
    subscriptionService.getSubscription(profile.id).then(setSub);
  }, [profile]);

  const handlePurchase = async () => {
    if (!profile || !sub) return;
    if (selected === 'free') return;

    setPurchasing(true);
    try {
      // TODO[HIGH]: integrate RevenueCat / StoreKit for real IAP receipt
      // For now, simulate a successful purchase grant
      const days = billing === 'year' ? 365 : 30;
      const ok   = await subscriptionService.grantSubscription(profile.id, selected as any, days);

      if (ok) {
        updateProfile({ isPremium: selected !== 'free' });
        const refreshed = await subscriptionService.getSubscription(profile.id);
        setSub(refreshed);
        Alert.alert('Welcome to ' + SUBSCRIPTION_PLANS.find(p => p.id === selected)?.name + '!', 'Your subscription is now active.');
      } else {
        Alert.alert('Purchase Failed', 'Could not complete purchase. Please try again.');
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleBoost = async () => {
    if (!profile) return;
    setBoosting(true);
    const ok = await subscriptionService.activateBoost(profile.id);
    if (ok) {
      const refreshed = await subscriptionService.getSubscription(profile.id);
      setSub(refreshed);
    } else {
      Alert.alert('No Boosts Left', 'Upgrade to Premium+ for unlimited boosts.');
    }
    setBoosting(false);
  };

  const currentTier = sub?.tier ?? 'free';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>‹</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>PREMIUM</Text>
            <Text style={styles.titleSub}>Unlock the full experience</Text>
          </View>
        </View>

        {/* Billing toggle */}
        <View style={styles.billingToggle}>
          {(['month', 'year'] as const).map(b => (
            <TouchableOpacity
              key={b}
              style={[styles.billingBtn, billing === b && styles.billingBtnActive]}
              onPress={() => setBilling(b)}
            >
              <Text style={[styles.billingBtnText, billing === b && styles.billingBtnTextActive]}>
                {b === 'month' ? 'Monthly' : 'Yearly'}
              </Text>
              {b === 'year' && (
                <View style={styles.savingsBubble}>
                  <Text style={styles.savingsBubbleText}>Save 30%+</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Plan cards */}
        {SUBSCRIPTION_PLANS.filter(p => p.id !== 'free').map(plan => (
          <PlanCard
            key={plan.id}
            plan={plan}
            current={currentTier === plan.id}
            selected={selected === plan.id}
            billing={billing}
            onSelect={() => setSelected(plan.id)}
          />
        ))}

        {/* Purchase button */}
        {selected !== currentTier && (
          <TouchableOpacity
            style={[styles.purchaseBtn, purchasing && styles.purchaseBtnLoading]}
            onPress={handlePurchase}
            disabled={purchasing}
            activeOpacity={0.85}
          >
            {purchasing
              ? <ActivityIndicator color="#fff" />
              : (
                <Text style={styles.purchaseBtnText}>
                  UPGRADE TO {SUBSCRIPTION_PLANS.find(p => p.id === selected)?.name.toUpperCase()}
                </Text>
              )
            }
          </TouchableOpacity>
        )}

        <Text style={styles.legalText}>
          Subscriptions auto-renew. Cancel anytime in App Store / Google Play settings.
          Prices in USD. Restore purchases below.
        </Text>

        {/* Boost card — only for premium users */}
        {sub && currentTier !== 'free' && (
          <BoostCard sub={sub} onBoost={handleBoost} loading={boosting} />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },

  header:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 12 },
  backBtn:   { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 28, color: C.text, lineHeight: 32 },
  title:     { fontSize: 22, fontWeight: '900', color: C.text, letterSpacing: 2 },
  titleSub:  { fontSize: 12, color: C.textDim, marginTop: 2 },

  billingToggle: {
    flexDirection: 'row', backgroundColor: C.surface,
    borderRadius: 14, padding: 4, marginBottom: 20,
    borderWidth: 1, borderColor: C.border,
  },
  billingBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  billingBtnActive: { backgroundColor: C.purple },
  billingBtnText:     { fontSize: 14, fontWeight: '700', color: C.textDim },
  billingBtnTextActive: { color: '#fff' },
  savingsBubble:    { backgroundColor: C.green, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  savingsBubbleText: { fontSize: 9, fontWeight: '800', color: '#000' },

  planCard: {
    backgroundColor: C.surface, borderRadius: 20, padding: 20,
    marginBottom: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  planCardHighlight: { borderColor: 'rgba(168,85,247,0.4)' },

  popularBadge: { position: 'absolute', top: 12, right: 12, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  popularBadgeText: { fontSize: 9, fontWeight: '900', color: '#fff', letterSpacing: 1 },

  currentBadge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, marginBottom: 10 },
  currentBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },

  planHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  planColorDot: { width: 10, height: 10, borderRadius: 5 },
  planName:   { fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  planPrice:  { fontSize: 30, fontWeight: '900', color: C.text, marginBottom: 4 },
  planPeriod: { fontSize: 15, fontWeight: '400', color: C.textDim },
  savingsText: { fontSize: 11, color: C.green, fontWeight: '700', marginBottom: 12 },

  featureList: { gap: 8, marginTop: 8, marginBottom: 16 },
  featureRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  checkIcon:   { fontSize: 13, fontWeight: '900', marginTop: 1 },
  featureText: { fontSize: 13, color: C.textDim, flex: 1, lineHeight: 18 },

  selectIndicator: {
    alignSelf: 'flex-end', width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  selectCheck: { fontSize: 13, fontWeight: '900', color: '#fff' },

  purchaseBtn: {
    backgroundColor: C.purple, borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', marginTop: 6, marginBottom: 12,
  },
  purchaseBtnLoading: { opacity: 0.7 },
  purchaseBtnText: { fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: 1.5 },

  legalText: { fontSize: 10, color: C.textMuted, textAlign: 'center', lineHeight: 16, marginBottom: 24 },

  boostCard: {
    backgroundColor: '#0d0d20', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)', overflow: 'hidden',
    marginTop: 8,
  },
  boostGlow: {
    position: 'absolute', top: -30, right: -20,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(168,85,247,0.15)',
  },
  boostTitle: { fontSize: 18, fontWeight: '900', color: C.text, marginBottom: 8 },
  boostSub:   { fontSize: 13, color: C.textDim, lineHeight: 20, marginBottom: 14 },
  boostMeta:  { marginBottom: 14 },
  boostTokens: { fontSize: 13, color: C.purple, fontWeight: '700' },
  boostActiveRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  boostActiveDot: { width: 8, height: 8, borderRadius: 4 },
  boostActiveText: { fontSize: 13, color: C.green, fontWeight: '700' },
  boostBtn: {
    backgroundColor: C.purple, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  boostBtnDisabled: { backgroundColor: '#333', opacity: 0.6 },
  boostBtnText: { fontSize: 14, fontWeight: '900', color: '#fff', letterSpacing: 1 },
});

export default PremiumScreen;
