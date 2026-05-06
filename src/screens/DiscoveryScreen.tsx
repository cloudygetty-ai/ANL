// src/screens/DiscoveryScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Dimensions, RefreshControl, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { locationService } from '../services/location/LocationService';

const { width: SW } = Dimensions.get('window');

const C = {
  bg: '#04040a', surface: '#0d0d14', border: 'rgba(168,85,247,0.18)',
  purple: '#a855f7', pink: '#ec4899', amber: '#fbbf24', green: '#4ade80',
  red: '#f87171', text: '#f0eee8', textDim: 'rgba(240,238,232,0.5)',
  textMuted: 'rgba(240,238,232,0.22)',
};

const GENDER_COLOR: Record<string, string> = {
  f: '#ff3c64', m: '#a855f7', tw: '#f7a8c4', tm: '#55cdfc', nb: '#a8d5a2',
};

type DiscoveryUser = {
  id: string;
  display_name: string;
  age: number;
  gender: string;
  bio: string;
  distance_km: number | null;
  circadian: { score: number; label: string; reason: string } | null;
  isAtVenue: boolean;
  presence?: string;
  vibe?: string;
  interests?: string[];
};

type Props = NativeStackScreenProps<any, 'Discovery'>;

const DiscoveryScreen: React.FC<Props> = ({ navigation }) => {
  const [users, setUsers]       = useState<DiscoveryUser[]>([]);
  const [idx, setIdx]           = useState(0);
  const [liked, setLiked]       = useState<string[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const locRef = useRef<{ lat: number; lng: number } | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const loc = locRef.current;
      const data = await api.get<{ users: DiscoveryUser[] }>(
        '/api/discovery/feed',
        { lat: loc?.lat, lng: loc?.lng, limit: 20 },
      );
      setUsers(data.users ?? []);
      setIdx(0);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    locationService.getCurrentLocation().then(upd => {
      if (upd) locRef.current = { lat: upd.exact.lat, lng: upd.exact.lng };
      load();
    });
  }, [load]);

  const swipe = async (direction: 'left' | 'right') => {
    if (!users[idx]) return;
    const user = users[idx];
    setIdx(i => i + 1);

    if (direction === 'right') {
      setLiked(l => [...l, user.id]);
      try {
        const res = await api.post<{ success: boolean; match: { matchId: string; isNew: boolean } | null }>(
          '/api/discovery/swipe',
          { targetUserId: user.id, direction: 'right' },
        );
        if (res.match?.isNew) {
          navigation.navigate('Matches');
        }
      } catch { /* non-blocking — swipe recorded optimistically */ }
    } else {
      await api.post('/api/discovery/swipe', { targetUserId: user.id, direction: 'left' }).catch(() => {});
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator color={C.purple} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => load()}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const user = users[idx];

  if (!user) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <Text style={s.wordmark}><Text style={{ color: C.purple }}>ANL</Text>{'  '}<Text style={s.wordmarkSub}>DISCOVER</Text></Text>
        </View>
        <ScrollView
          contentContainerStyle={s.center}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={C.purple} />}
        >
          <Text style={s.emptyEmoji}>🌙</Text>
          <Text style={s.emptyTitle}>You're all caught up</Text>
          <Text style={s.emptyText}>Check back later — the night is young.</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const col = GENDER_COLOR[user.gender] ?? C.purple;
  const distLabel = user.distance_km != null
    ? user.distance_km < 1 ? `${Math.round(user.distance_km * 1000)}m` : `${user.distance_km}km`
    : '';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.wordmark}><Text style={{ color: C.purple }}>ANL</Text>{'  '}<Text style={s.wordmarkSub}>DISCOVER</Text></Text>
        <View style={s.pill}>
          <View style={[s.dot, { backgroundColor: C.green }]} />
          <Text style={s.pillText}>{users.length - idx} near you</Text>
        </View>
      </View>

      <View style={s.cardWrap}>
        <LinearGradient
          colors={[`${col}22`, '#04040a']}
          style={s.card}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <View style={[s.avatar, { borderColor: col }]}>
            <Text style={s.avatarEmoji}>
              {user.gender === 'f' ? '🔥' : user.gender === 'nb' ? '✨' : '🌙'}
            </Text>
            {user.isAtVenue && (
              <View style={s.venueBadge}><Text style={s.venueBadgeText}>📍</Text></View>
            )}
          </View>

          <Text style={[s.name, { color: col }]}>{user.display_name}</Text>
          <Text style={s.meta}>
            {user.age}{distLabel ? ` · ${distLabel}` : ''}
            {user.presence === 'online' ? ' · 🟢 Online' : ''}
          </Text>

          {user.vibe ? <Text style={s.vibe}>"{user.vibe}"</Text> : null}

          {user.circadian && (
            <View style={[s.circadianBadge, { borderColor: `${col}44` }]}>
              <Text style={[s.circadianText, { color: col }]}>
                {user.circadian.label} · {Math.round(user.circadian.score * 100)}% vibe match
              </Text>
            </View>
          )}

          {user.interests && user.interests.length > 0 && (
            <View style={s.tags}>
              {user.interests.slice(0, 3).map(t => (
                <View key={t} style={[s.tag, { borderColor: `${col}55` }]}>
                  <Text style={[s.tagText, { color: col }]}>{t}</Text>
                </View>
              ))}
            </View>
          )}
        </LinearGradient>

        <View style={s.actions}>
          <TouchableOpacity style={s.passBtn} onPress={() => swipe('left')}>
            <Text style={s.passBtnText}>✕ Pass</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.likeBtn, { backgroundColor: col }]} onPress={() => swipe('right')}>
            <Text style={s.likeBtnText}>♥ Like</Text>
          </TouchableOpacity>
        </View>
      </View>

      {liked.length > 0 && (
        <View style={s.likedBar}>
          <Text style={s.likedText}>{liked.length} liked tonight 🔥</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: C.bg },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  wordmark:       { fontSize: 20, fontWeight: '900', color: C.text, letterSpacing: 2 },
  wordmarkSub:    { fontSize: 20, fontWeight: '300', color: C.textDim, letterSpacing: 5 },
  pill:           { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: C.border },
  dot:            { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  pillText:       { fontSize: 11, color: C.textDim },
  cardWrap:       { flex: 1, paddingHorizontal: 20, paddingBottom: 20 },
  card:           { flex: 1, borderRadius: 24, borderWidth: 1, borderColor: C.border, padding: 28, alignItems: 'center', justifyContent: 'center' },
  avatar:         { width: 100, height: 100, borderRadius: 50, borderWidth: 3, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', marginBottom: 20, position: 'relative' },
  avatarEmoji:    { fontSize: 46 },
  venueBadge:     { position: 'absolute', bottom: -2, right: -2, backgroundColor: C.bg, borderRadius: 10, padding: 2 },
  venueBadgeText: { fontSize: 14 },
  name:           { fontSize: 30, fontWeight: '900', marginBottom: 6 },
  meta:           { fontSize: 13, color: C.textDim, marginBottom: 12 },
  vibe:           { fontSize: 16, color: C.text, fontStyle: 'italic', marginBottom: 16, textAlign: 'center' },
  circadianBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 16 },
  circadianText:  { fontSize: 12, fontWeight: '600' },
  tags:           { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  tag:            { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  tagText:        { fontSize: 12, fontWeight: '600' },
  actions:        { flexDirection: 'row', gap: 16, paddingTop: 16 },
  passBtn:        { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  passBtnText:    { fontSize: 16, fontWeight: '700', color: C.textDim },
  likeBtn:        { flex: 1, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  likeBtnText:    { fontSize: 16, fontWeight: '700', color: '#fff' },
  likedBar:       { paddingHorizontal: 20, paddingBottom: 12, alignItems: 'center' },
  likedText:      { fontSize: 12, color: C.purple },
  errorText:      { color: C.red, fontSize: 15, marginBottom: 20, textAlign: 'center' },
  retryBtn:       { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  retryText:      { color: C.purple, fontWeight: '700' },
  emptyEmoji:     { fontSize: 48, marginBottom: 16 },
  emptyTitle:     { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 8 },
  emptyText:      { fontSize: 14, color: C.textDim, textAlign: 'center' },
});

export default DiscoveryScreen;
