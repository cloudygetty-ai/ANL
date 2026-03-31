/* eslint-disable @typescript-eslint/no-explicit-any */
// src/screens/MatchesScreen.tsx
// Lists mutual matches and message threads. Tapping a match opens ChatScreen.
// TODO[HIGH]: replace mock data with Supabase realtime subscription
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSocketStore } from '../stores/socketStore';

const C = {
  bg:      '#04040a',
  surface: '#0d0d14',
  border:  'rgba(168,85,247,0.12)',
  purple:  '#a855f7',
  green:   '#4ade80',
  text:    '#f0eee8',
  textDim: 'rgba(240,238,232,0.5)',
};

interface Match {
  id:          string;
  userId:      string;
  displayName: string;
  age:         number;
  photoUrl:    string | null;
  lastMessage: string | null;
  unread:      boolean;
  matchedAt:   number;
}

// ── Stub data ─────────────────────────────────────────────────────────────────
const MOCK_MATCHES: Match[] = [
  { id: 'm1', userId: 'u1', displayName: 'Mia',  age: 24, photoUrl: null, lastMessage: 'Hey, what are you up to tonight?', unread: true,  matchedAt: Date.now() - 60000 },
  { id: 'm2', userId: 'u2', displayName: 'Luna', age: 25, photoUrl: null, lastMessage: null,                              unread: false, matchedAt: Date.now() - 120000 },
  { id: 'm3', userId: 'u3', displayName: 'Jade', age: 27, photoUrl: null, lastMessage: 'Come through 😈',                 unread: true,  matchedAt: Date.now() - 300000 },
];

function MatchRow({ match, onPress }: { match: Match; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      {/* Avatar */}
      <View style={[styles.avatar, match.unread && styles.avatarUnread]}>
        <Text style={styles.avatarText}>{match.displayName[0].toUpperCase()}</Text>
        <View style={[styles.onlineDot, { backgroundColor: C.green }]} />
      </View>

      {/* Text */}
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={[styles.name, match.unread && styles.nameUnread]}>
            {match.displayName}, {match.age}
          </Text>
          <Text style={styles.time}>{timeAgo(match.matchedAt)}</Text>
        </View>
        <Text
          style={[styles.preview, match.unread && styles.previewUnread]}
          numberOfLines={1}
        >
          {match.lastMessage ?? 'Matched — say hi!'}
        </Text>
      </View>

      {match.unread && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h`;
}

export default function MatchesScreen({ navigation }: any) {
  const [matches] = useState<Match[]>(MOCK_MATCHES);
  const clearUnread = useSocketStore((s) => s.clearUnread);

  const handleOpen = (match: Match) => {
    clearUnread();
    navigation.navigate('Chat', {
      matchId:     match.id,
      userId:      match.userId,
      displayName: match.displayName,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.header}>Matches</Text>

        {matches.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💜</Text>
            <Text style={styles.emptyText}>No matches yet</Text>
            <Text style={styles.emptySub}>Keep swiping on the Discover tab</Text>
          </View>
        ) : (
          <FlatList
            data={matches}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => (
              <MatchRow match={item} onPress={() => handleOpen(item)} />
            )}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, paddingHorizontal: 16 },
  header:    { fontSize: 26, fontWeight: '900', color: C.text, paddingVertical: 18 },

  row:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 14 },
  rowContent:  { flex: 1 },
  rowTop:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  name:        { fontSize: 16, fontWeight: '600', color: C.text },
  nameUnread:  { fontWeight: '800', color: C.text },
  time:        { fontSize: 12, color: C.textDim },
  preview:     { fontSize: 13, color: C.textDim },
  previewUnread:{ color: C.text },

  avatar:       {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  avatarUnread: { borderColor: C.purple, borderWidth: 2 },
  avatarText:   { fontSize: 22, fontWeight: '800', color: C.purple },
  onlineDot:    { position: 'absolute', bottom: 2, right: 2, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: C.bg },

  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.purple },
  sep:       { height: 1, backgroundColor: C.border },

  empty:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyIcon: { fontSize: 56 },
  emptyText: { fontSize: 20, fontWeight: '800', color: C.text },
  emptySub:  { fontSize: 14, color: C.textDim },
});
