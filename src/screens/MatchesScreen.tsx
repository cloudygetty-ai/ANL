// src/screens/MatchesScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { api } from '../lib/api';
import { useSocketStore } from '../stores/socketStore';

const C = {
  bg: '#04040a', surface: '#0d0d14', border: 'rgba(168,85,247,0.18)',
  purple: '#a855f7', green: '#4ade80', amber: '#fbbf24',
  text: '#f0eee8', textDim: 'rgba(240,238,232,0.5)',
};

const GENDER_COLOR: Record<string, string> = {
  f: '#ff3c64', m: '#a855f7', tw: '#f7a8c4', tm: '#55cdfc', nb: '#a8d5a2',
};

const GENDER_EMOJI: Record<string, string> = {
  f: '🔥', m: '🌙', tw: '💜', tm: '⚡', nb: '✨',
};

type MatchRow = {
  id: string;
  partner_id: string;
  partner_name: string;
  partner_gender?: string;
  created_at: string;
  // enriched client-side from socket events
  lastMsg?: string;
  lastMsgTime?: string;
  unread: number;
  presence: 'online' | 'away' | 'offline';
};

type Props = NativeStackScreenProps<any, 'Matches'>;

const MatchesScreen: React.FC<Props> = ({ navigation }) => {
  const [matches, setMatches]     = useState<MatchRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const socket = useSocketStore(s => s.socket);
  const clearUnread = useSocketStore(s => s.clearUnread);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const rows = await api.get<MatchRow[]>('/api/matches');
      setMatches(rows.map(r => ({ ...r, unread: 0, presence: 'offline' })));
    } catch { /* surface nothing — empty state is safe */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    load();
    clearUnread();
  }, [load, clearUnread]);

  // Real-time: incoming message preview
  useEffect(() => {
    if (!socket) return;

    const onPreview = (evt: { matchId: string; preview: string; time: string }) => {
      setMatches(prev => prev.map(m =>
        m.id === evt.matchId
          ? { ...m, lastMsg: evt.preview, lastMsgTime: evt.time, unread: m.unread + 1 }
          : m
      ));
    };

    const onPresence = (evt: { userId: string; status: 'online' | 'away' | 'offline' }) => {
      setMatches(prev => prev.map(m =>
        m.partner_id === evt.userId ? { ...m, presence: evt.status } : m
      ));
    };

    const onNewMatch = () => load(true);

    socket.on('message:preview', onPreview);
    socket.on('presence:update', onPresence);
    socket.on('match:new', onNewMatch);

    return () => {
      socket.off('message:preview', onPreview);
      socket.off('presence:update', onPresence);
      socket.off('match:new', onNewMatch);
    };
  }, [socket, load]);

  const openChat = (m: MatchRow) => {
    setMatches(prev => prev.map(x => x.id === m.id ? { ...x, unread: 0 } : x));
    navigation.navigate('Chat', {
      matchId: m.id,
      userId: m.partner_id,
      displayName: m.partner_name,
    });
  };

  const totalUnread = matches.reduce((s, m) => s + m.unread, 0);

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator color={C.purple} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Matches</Text>
        {totalUnread > 0 && (
          <Text style={s.sub}>{totalUnread} unread</Text>
        )}
      </View>

      <FlatList
        data={matches}
        keyExtractor={m => m.id}
        contentContainerStyle={matches.length === 0 ? s.emptyContainer : s.list}
        ItemSeparatorComponent={() => <View style={s.sep} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true); }}
            tintColor={C.purple}
          />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>💜</Text>
            <Text style={s.emptyTitle}>No matches yet</Text>
            <Text style={s.emptyText}>Keep swiping — someone's out there tonight.</Text>
          </View>
        }
        renderItem={({ item: m }) => {
          const col = GENDER_COLOR[m.partner_gender ?? 'm'] ?? C.purple;
          const emoji = GENDER_EMOJI[m.partner_gender ?? 'm'] ?? '🌙';
          const timeLabel = m.lastMsgTime ?? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return (
            <TouchableOpacity style={s.row} onPress={() => openChat(m)}>
              <View style={[s.avatar, { borderColor: col }]}>
                <Text style={s.emoji}>{emoji}</Text>
                <View style={[
                  s.status,
                  { backgroundColor: m.presence === 'online' ? C.green : m.presence === 'away' ? C.amber : C.border },
                ]} />
              </View>

              <View style={s.info}>
                <View style={s.nameRow}>
                  <Text style={s.name}>{m.partner_name}</Text>
                  <Text style={s.time}>{timeLabel}</Text>
                </View>
                <Text
                  style={[s.msg, m.unread > 0 && { color: C.text, fontWeight: '600' }]}
                  numberOfLines={1}
                >
                  {m.lastMsg ?? 'New match — say hello 👋'}
                </Text>
              </View>

              {m.unread > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{m.unread}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: C.bg },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 20, paddingVertical: 16 },
  title:          { fontSize: 26, fontWeight: '900', color: C.text },
  sub:            { fontSize: 12, color: C.purple },
  list:           { paddingHorizontal: 16 },
  emptyContainer: { flex: 1 },
  sep:            { height: 1, backgroundColor: C.border, marginLeft: 76 },
  row:            { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  avatar:         { width: 52, height: 52, borderRadius: 26, borderWidth: 2, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', marginRight: 14, position: 'relative' },
  emoji:          { fontSize: 24 },
  status:         { position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: C.bg },
  info:           { flex: 1 },
  nameRow:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  name:           { fontSize: 15, fontWeight: '700', color: C.text },
  time:           { fontSize: 11, color: C.textDim },
  msg:            { fontSize: 13, color: C.textDim },
  badge:          { backgroundColor: C.purple, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, marginLeft: 8 },
  badgeText:      { color: '#fff', fontSize: 11, fontWeight: '800' },
  empty:          { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 120 },
  emptyEmoji:     { fontSize: 48, marginBottom: 16 },
  emptyTitle:     { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 8 },
  emptyText:      { fontSize: 14, color: C.textDim, textAlign: 'center' },
});

export default MatchesScreen;
