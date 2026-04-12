// src/screens/VisitsScreen.tsx
// Shows who has viewed the current user's profile.
// Free users see last 10 visitors blurred after 3; premium see full list with timestamps.
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserStore } from '@services/state/userStore';
import { visitsService } from '@services/visits';
import type { Visit } from '@types/index';

const C = {
  bg:        '#04040a',
  surface:   '#0d0d14',
  surfaceUp: '#13131e',
  border:    'rgba(168,85,247,0.18)',
  purple:    '#a855f7',
  pink:      '#ec4899',
  amber:     '#fbbf24',
  green:     '#4ade80',
  text:      '#f0eee8',
  textDim:   'rgba(240,238,232,0.5)',
  textMuted: 'rgba(240,238,232,0.2)',
};

// Gender → pin color (matches PinMarker palette)
const genderColor = (g: string) => {
  if (g === 'f')  return '#ff3c64';
  if (g === 'm')  return '#a855f7';
  if (g === 'tw') return '#f7a8c4';
  if (g === 'tm') return '#55cdfc';
  return '#aaa';
};

const timeAgo = (ms: number) => {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0)  return `${d}d ago`;
  if (h > 0)  return `${h}h ago`;
  if (m > 0)  return `${m}m ago`;
  return 'just now';
};

// ── Visit row ─────────────────────────────────────────────────────────────────
interface VisitRowProps {
  visit:   Visit;
  blurred: boolean;
  onPress: (visit: Visit) => void;
}

const VisitRow: React.FC<VisitRowProps> = ({ visit, blurred, onPress }) => {
  const col = genderColor(visit.visitorGender);

  if (blurred) {
    return (
      <View style={styles.row}>
        <View style={[styles.avatar, { borderColor: '#444', backgroundColor: '#1a1a2e' }]}>
          <Text style={styles.avatarText}>?</Text>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={styles.blurBar} />
          <View style={[styles.blurBar, { width: '55%' }]} />
        </View>
        <View style={[styles.lockBadge]}>
          <Text style={styles.lockIcon}>🔒</Text>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(visit)} activeOpacity={0.7}>
      {/* Avatar */}
      <View style={[styles.avatar, { borderColor: col }]}>
        <Text style={[styles.avatarText, { color: col }]}>
          {visit.visitorName[0]?.toUpperCase() ?? '?'}
        </Text>
        {visit.isNew && <View style={[styles.newDot, { backgroundColor: C.green }]} />}
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{visit.visitorName}, {visit.visitorAge}</Text>
        <Text style={styles.sub}>{timeAgo(visit.visitedAt)}</Text>
      </View>

      {/* Gender badge */}
      <View style={[styles.genderBadge, { backgroundColor: `${col}20`, borderColor: `${col}44` }]}>
        <Text style={[styles.genderText, { color: col }]}>
          {visit.visitorGender.toUpperCase()}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// ── Premium upsell banner ─────────────────────────────────────────────────────
const PremiumBanner: React.FC<{ onPress: () => void }> = ({ onPress }) => (
  <TouchableOpacity style={styles.premiumBanner} onPress={onPress} activeOpacity={0.85}>
    <View style={styles.premiumGlow} />
    <Text style={styles.premiumTitle}>⭐  Unlock All Visitors</Text>
    <Text style={styles.premiumSub}>
      See everyone who checked you out — names, photos, timestamps.
      Free users see the last 3.
    </Text>
    <View style={styles.premiumBtn}>
      <Text style={styles.premiumBtnText}>GET PREMIUM →</Text>
    </View>
  </TouchableOpacity>
);

// ── Main ──────────────────────────────────────────────────────────────────────
const FREE_VISIBLE = 3;

interface VisitsScreenProps {
  navigation?: any;
}

const VisitsScreen: React.FC<VisitsScreenProps> = ({ navigation }) => {
  const { profile } = useUserStore();
  const isPremium   = profile?.isPremium ?? false;

  const [visits,      setVisits]      = useState<Visit[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    const data = await visitsService.getVisitors(profile.id, isPremium);
    setVisits(data);
    // Mark all seen after loading
    await visitsService.markAllSeen(profile.id);
  }, [profile, isPremium]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleVisitPress = (visit: Visit) => {
    // TODO[NORMAL]: navigate to viewer's profile card
    console.log('[VisitsScreen] open profile:', visit.visitorId);
  };

  const handleUpgrade = () => {
    navigation?.navigate('Premium');
  };

  const newCount = visits.filter(v => v.isNew).length;

  const renderItem = ({ item, index }: { item: Visit; index: number }) => (
    <VisitRow
      visit={item}
      blurred={!isPremium && index >= FREE_VISIBLE}
      onPress={handleVisitPress}
    />
  );

  const ListHeader = () => (
    <View style={styles.listHeader}>
      <View>
        <Text style={styles.screenTitle}>VISITS</Text>
        <Text style={styles.screenSub}>
          {visits.length} {visits.length === 1 ? 'person' : 'people'} checked you out
          {newCount > 0 ? ` · ${newCount} new` : ''}
        </Text>
      </View>
      {newCount > 0 && (
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>{newCount} NEW</Text>
        </View>
      )}
    </View>
  );

  const ListFooter = () => {
    if (isPremium || visits.length <= FREE_VISIBLE) return null;
    return (
      <PremiumBanner onPress={handleUpgrade} />
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ActivityIndicator style={{ marginTop: 60 }} color={C.purple} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={visits}
        keyExtractor={v => v.id}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>👀</Text>
            <Text style={styles.emptyTitle}>No visitors yet</Text>
            <Text style={styles.emptySub}>When someone views your profile, they'll show up here.</Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={C.purple}
          />
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  list: { paddingHorizontal: 16, paddingBottom: 40 },

  listHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 20,
  },
  screenTitle: { fontSize: 22, fontWeight: '900', color: C.text, letterSpacing: 2 },
  screenSub:   { fontSize: 12, color: C.textDim, marginTop: 3 },
  newBadge:    { backgroundColor: C.green, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  newBadgeText: { fontSize: 10, fontWeight: '800', color: '#000', letterSpacing: 1 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.surface, borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: C.border,
  },

  avatar: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 2, backgroundColor: '#111120',
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  avatarText: { fontSize: 20, fontWeight: '800' },
  newDot: {
    position: 'absolute', top: -2, right: -2,
    width: 12, height: 12, borderRadius: 6,
    borderWidth: 2, borderColor: C.bg,
  },

  name: { fontSize: 15, fontWeight: '700', color: C.text },
  sub:  { fontSize: 12, color: C.textDim, marginTop: 2 },

  genderBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  genderText:  { fontSize: 10, fontWeight: '800', letterSpacing: 1 },

  // Blurred row
  blurBar: { height: 12, borderRadius: 6, backgroundColor: '#1e1e30', width: '70%' },
  lockBadge: { padding: 6 },
  lockIcon:  { fontSize: 18 },

  // Premium banner
  premiumBanner: {
    marginTop: 8, marginBottom: 24, borderRadius: 20,
    backgroundColor: '#0d0d1e', borderWidth: 1, borderColor: 'rgba(168,85,247,0.4)',
    padding: 20, overflow: 'hidden',
  },
  premiumGlow: {
    position: 'absolute', top: -30, right: -20,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(168,85,247,0.2)',
  },
  premiumTitle: { fontSize: 18, fontWeight: '900', color: C.text, marginBottom: 8 },
  premiumSub:   { fontSize: 13, color: C.textDim, lineHeight: 20, marginBottom: 16 },
  premiumBtn:   { alignSelf: 'flex-start', backgroundColor: C.purple, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 },
  premiumBtnText: { fontSize: 13, fontWeight: '900', color: '#fff', letterSpacing: 1 },

  // Empty state
  empty: { paddingTop: 80, alignItems: 'center', gap: 10 },
  emptyIcon:  { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  emptySub:   { fontSize: 13, color: C.textDim, textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 },
});

export default VisitsScreen;
