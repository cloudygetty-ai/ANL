/* eslint-disable @typescript-eslint/no-explicit-any */
// src/screens/DiscoveryScreen.tsx
// Swipe-card discovery feed — shows nearby users, swipe right to like, left to pass.
// TODO[HIGH]: wire to Supabase realtime query replacing mock data
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, PanResponder,
  TouchableOpacity, Dimensions, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGate } from '@hooks/useGate';
import type { UserProfile } from '@types/index';

const { width: SW, height: SH } = Dimensions.get('window');
const CARD_W  = SW - 32;
const SWIPE_THRESHOLD = SW * 0.35;

const C = {
  bg:      '#04040a',
  surface: '#0d0d14',
  border:  'rgba(168,85,247,0.18)',
  purple:  '#a855f7',
  pink:    '#ec4899',
  green:   '#4ade80',
  red:     '#f87171',
  text:    '#f0eee8',
  textDim: 'rgba(240,238,232,0.5)',
};

// ── Stub data — replace with Supabase realtime ────────────────────────────────
const MOCK_PROFILES: Partial<UserProfile>[] = [
  { id: '1', displayName: 'Mia',  age: 24, gender: 'f',  bio: 'Tonight only 🔥',   vibe: 'Down for anything', match: 94, photos: [] },
  { id: '2', displayName: 'Jade', age: 27, gender: 'f',  bio: 'No strings 😈',     vibe: 'Good vibes only',   match: 88, photos: [] },
  { id: '3', displayName: 'Dre',  age: 26, gender: 'm',  bio: "What's good 👊",    vibe: 'Here for the night', match: 89, photos: [] },
  { id: '4', displayName: 'Luna', age: 25, gender: 'tw', bio: 'Good energy ✨',    vibe: 'All night long',    match: 93, photos: [] },
  { id: '5', displayName: 'Kai',  age: 23, gender: 'tm', bio: 'Free tonight',      vibe: 'Open to anything',  match: 72, photos: [] },
];

// ── Single swipe card ─────────────────────────────────────────────────────────
function SwipeCard({
  profile,
  onSwipeLeft,
  onSwipeRight,
  isTop,
}: {
  profile: Partial<UserProfile>;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  isTop: boolean;
}) {
  const position = useRef(new Animated.ValueXY()).current;
  const rotate   = position.x.interpolate({
    inputRange: [-SW / 2, 0, SW / 2],
    outputRange: ['-8deg', '0deg', '8deg'],
    extrapolate: 'clamp',
  });
  const likeOpacity = position.x.interpolate({
    inputRange: [0, SW / 8],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const passOpacity = position.x.interpolate({
    inputRange: [-SW / 8, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => isTop,
    onPanResponderMove: Animated.event(
      [null, { dx: position.x, dy: position.y }],
      { useNativeDriver: false }
    ),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > SWIPE_THRESHOLD) {
        Animated.timing(position, {
          toValue: { x: SW * 1.5, y: gesture.dy },
          duration: 250, useNativeDriver: false,
        }).start(onSwipeRight);
      } else if (gesture.dx < -SWIPE_THRESHOLD) {
        Animated.timing(position, {
          toValue: { x: -SW * 1.5, y: gesture.dy },
          duration: 250, useNativeDriver: false,
        }).start(onSwipeLeft);
      } else {
        Animated.spring(position, {
          toValue: { x: 0, y: 0 }, useNativeDriver: false,
        }).start();
      }
    },
  });

  const cardStyle = isTop
    ? { transform: [...position.getTranslateTransform(), { rotate }] }
    : {};

  return (
    <Animated.View style={[styles.card, cardStyle]} {...(isTop ? panResponder.panHandlers : {})}>
      {/* Photo placeholder */}
      <View style={styles.photoArea}>
        <Text style={styles.avatarInitial}>
          {(profile.displayName?.[0] ?? '?').toUpperCase()}
        </Text>
        {/* LIKE stamp */}
        {isTop && (
          <Animated.View style={[styles.stamp, styles.stampLike, { opacity: likeOpacity }]}>
            <Text style={styles.stampText}>LIKE</Text>
          </Animated.View>
        )}
        {/* PASS stamp */}
        {isTop && (
          <Animated.View style={[styles.stamp, styles.stampPass, { opacity: passOpacity }]}>
            <Text style={styles.stampText}>PASS</Text>
          </Animated.View>
        )}
      </View>

      {/* Info */}
      <View style={styles.infoRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{profile.displayName}, {profile.age}</Text>
          <Text style={styles.vibe} numberOfLines={1}>{profile.bio}</Text>
        </View>
        {profile.match != null && (
          <View style={styles.matchBadge}>
            <Text style={styles.matchText}>{profile.match}%</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function DiscoveryScreen({ navigation: _navigation }: any) {
  const [profiles, setProfiles] = useState<Partial<UserProfile>[]>(MOCK_PROFILES);
  const { gated } = useGate();

  const handleSwipeLeft = () => setProfiles((p) => p.slice(1));

  // WHY: unlimited swipes is a gated feature — free users get 10/day
  const handleSwipeRight = gated('unlimited_swipes', () => {
    // TODO[HIGH]: POST /matches/like { targetId }
    setProfiles((p) => p.slice(1));
  });

  const current = profiles[0];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Discover</Text>
        </View>

        {/* Card stack */}
        <View style={styles.cardStack}>
          {profiles.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🌙</Text>
              <Text style={styles.emptyText}>You have seen everyone nearby</Text>
              <Text style={styles.emptySubtext}>Check back later tonight</Text>
            </View>
          ) : (
            profiles.slice(0, 3).map((profile, i) => (
              <SwipeCard
                key={profile.id}
                profile={profile}
                isTop={i === 0}
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={handleSwipeRight}
              />
            )).reverse()
          )}
        </View>

        {/* Action buttons */}
        {profiles.length > 0 && current && (
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.actionBtn, styles.passBtn]} onPress={handleSwipeLeft}>
              <Text style={styles.actionIcon}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.likeBtn]} onPress={handleSwipeRight}>
              <Text style={styles.actionIcon}>♥</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, paddingHorizontal: 16 },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: C.text },

  cardStack: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  card: {
    position: 'absolute',
    width: CARD_W, height: SH * 0.62,
    borderRadius: 24, overflow: 'hidden',
    backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
  },

  photoArea: {
    flex: 1, backgroundColor: '#0d0d14',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 96, fontWeight: '900', color: 'rgba(240,238,232,0.1)' },

  stamp:     { position: 'absolute', top: 40, borderWidth: 3, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 6 },
  stampLike: { left: 20, borderColor: C.green, transform: [{ rotate: '-15deg' }] },
  stampPass: { right: 20, borderColor: C.red, transform: [{ rotate: '15deg' }] },
  stampText: { fontSize: 24, fontWeight: '900', color: C.text, letterSpacing: 2 },

  infoRow:    { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 12 },
  name:       { fontSize: 22, fontWeight: '800', color: C.text },
  vibe:       { fontSize: 13, color: C.textDim, marginTop: 2 },
  matchBadge: { backgroundColor: C.purple, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  matchText:  { fontSize: 14, fontWeight: '800', color: '#fff' },

  actions:   { flexDirection: 'row', justifyContent: 'center', gap: 32, paddingBottom: 24 },
  actionBtn: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  passBtn:   { backgroundColor: 'rgba(248,113,113,0.15)', borderWidth: 1.5, borderColor: C.red },
  likeBtn:   { backgroundColor: 'rgba(74,222,128,0.15)', borderWidth: 1.5, borderColor: C.green },
  actionIcon:{ fontSize: 26, color: C.text },

  emptyState:   { alignItems: 'center', gap: 12 },
  emptyIcon:    { fontSize: 60 },
  emptyText:    { fontSize: 20, fontWeight: '800', color: C.text },
  emptySubtext: { fontSize: 14, color: C.textDim },
});
