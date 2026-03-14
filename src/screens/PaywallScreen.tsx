/* eslint-disable @typescript-eslint/no-explicit-any */
// screens/PaywallScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Dimensions, ActivityIndicator, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../hooks/useSubscription';

const { width: _width } = Dimensions.get('window');

const TIERS = [
  {
    id: 'free',
    label: 'Free',
    price: '$0',
    period: 'forever',
    color: '#4b5563',
    features: [
      '10 swipes per day',
      'Basic matching',
      'Text chat',
    ],
  },
  {
    id: 'plus',
    label: 'Plus',
    price: '$9.99',
    period: '/month',
    color: '#a855f7',
    badge: 'POPULAR',
    features: [
      'Unlimited swipes',
      'See who likes you',
      'Rewind last swipe',
      '1 Profile boost/month',
      'AI conversation starters',
    ],
  },
  {
    id: 'premium',
    label: 'Premium',
    price: '$24.99',
    period: '/month',
    color: '#800020',
    badge: 'BEST VALUE',
    features: [
      'Everything in Plus',
      'AI Relationship Coach',
      'Incognito mode',
      'Priority matching',
      'Video messages',
      'Read receipts',
      'Unlimited boosts',
    ],
  },
];

export default function PaywallScreen({ navigation, route }: any) {
  const { featureGate } = route.params ?? {};
  const [selected, setSelected] = useState<'plus' | 'premium'>('plus');
  const { subscribe, loading } = useSubscription();

  const handleSubscribe = async () => {
    const result = await subscribe(selected);
    if (result.success) navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#04040a', '#0d0010', '#04040a']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color="#9ca3af" />
        </TouchableOpacity>
        <Text style={styles.title}>Upgrade ANL</Text>
        <View style={{ width: 40 }} />
      </View>

      {featureGate && (
        <View style={styles.gateBanner}>
          <Ionicons name="lock-closed" size={16} color="#a855f7" />
          <Text style={styles.gateText}>
            {featureGate} requires a paid plan
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Tier Cards */}
        {TIERS.map((tier) => {
          const _isSelected = selected === tier.id || tier.id === 'free';
          const isSelectable = tier.id !== 'free';

          return (
            <TouchableOpacity
              key={tier.id}
              onPress={() => isSelectable && setSelected(tier.id as any)}
              activeOpacity={isSelectable ? 0.8 : 1}
              style={[
                styles.card,
                selected === tier.id && { borderColor: tier.color, borderWidth: 2 },
              ]}
            >
              {tier.badge && (
                <View style={[styles.badge, { backgroundColor: tier.color }]}>
                  <Text style={styles.badgeText}>{tier.badge}</Text>
                </View>
              )}

              <View style={styles.cardHeader}>
                <View style={[styles.dot, { backgroundColor: tier.color }]} />
                <Text style={styles.tierLabel}>{tier.label}</Text>
                <View style={styles.priceRow}>
                  <Text style={[styles.price, { color: tier.color }]}>{tier.price}</Text>
                  <Text style={styles.period}>{tier.period}</Text>
                </View>
              </View>

              {tier.features.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={16} color={tier.color} />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </TouchableOpacity>
          );
        })}

        <Text style={styles.legalText}>
          Subscriptions auto-renew. Cancel anytime in settings.
          Billed through your App Store account.
        </Text>
      </ScrollView>

      {/* CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: selected === 'premium' ? '#800020' : '#a855f7' }]}
          onPress={handleSubscribe}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaText}>
              Get {selected.charAt(0).toUpperCase() + selected.slice(1)} →
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#04040a' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16,
  },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 18, fontWeight: '700', fontFamily: 'System' },
  gateBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(168,85,247,0.1)', marginHorizontal: 20,
    padding: 12, borderRadius: 10, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)',
  },
  gateText: { color: '#a855f7', fontSize: 13 },
  scroll: { paddingHorizontal: 20, paddingBottom: 120, gap: 12 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16,
    padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    position: 'relative', overflow: 'hidden',
  },
  badge: {
    position: 'absolute', top: 12, right: 12,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  tierLabel: { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  price: { fontSize: 18, fontWeight: '800' },
  period: { color: '#6b7280', fontSize: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  featureText: { color: '#d1d5db', fontSize: 13 },
  legalText: { color: '#4b5563', fontSize: 11, textAlign: 'center', marginTop: 8, lineHeight: 16 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: 'rgba(4,4,10,0.95)',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  cta: {
    borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
