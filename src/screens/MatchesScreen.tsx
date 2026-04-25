// src/screens/MatchesScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

const C = {
  bg: '#04040a', surface: '#0d0d14', border: 'rgba(168,85,247,0.18)',
  purple: '#a855f7', green: '#4ade80', amber: '#fbbf24',
  text: '#f0eee8', textDim: 'rgba(240,238,232,0.5)',
};

const GENDER_COLOR: Record<string, string> = {
  f: '#ff3c64', m: '#a855f7', tw: '#f7a8c4', tm: '#55cdfc', nb: '#a8d5a2',
};

const SEED_MATCHES = [
  { id:'1', name:'Nova',   age:24, gender:'f',  emoji:'🔥', lastMsg:'Hey, you free tonight?',    time:'11:42pm', unread:2, presence:'online' },
  { id:'2', name:'Remy',   age:27, gender:'m',  emoji:'🌙', lastMsg:'Come through 🔥',           time:'11:18pm', unread:0, presence:'online' },
  { id:'3', name:'Lyric',  age:22, gender:'nb', emoji:'✨', lastMsg:'What part of the city?',    time:'10:55pm', unread:1, presence:'away'   },
  { id:'4', name:'Marcus', age:31, gender:'m',  emoji:'⚡', lastMsg:'Sent a photo',              time:'10:30pm', unread:0, presence:'online' },
];

type Props = NativeStackScreenProps<any, 'Matches'>;

const MatchesScreen: React.FC<Props> = ({ navigation }) => {
  const [matches] = useState(SEED_MATCHES);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>Matches</Text>
        <Text style={s.sub}>{matches.filter(m => m.unread > 0).length} unread</Text>
      </View>

      <FlatList
        data={matches}
        keyExtractor={m => m.id}
        contentContainerStyle={s.list}
        ItemSeparatorComponent={() => <View style={s.sep}/>}
        renderItem={({ item: m }) => {
          const col = GENDER_COLOR[m.gender] ?? C.purple;
          return (
            <TouchableOpacity
              style={s.row}
              onPress={() => navigation.navigate('Chat', { matchId: m.id, userId: m.id, displayName: m.name })}
            >
              <View style={[s.avatar, { borderColor: col }]}>
                <Text style={s.emoji}>{m.emoji}</Text>
                <View style={[s.status, { backgroundColor: m.presence === 'online' ? C.green : C.amber }]}/>
              </View>
              <View style={s.info}>
                <View style={s.nameRow}>
                  <Text style={s.name}>{m.name}<Text style={s.age}> {m.age}</Text></Text>
                  <Text style={s.time}>{m.time}</Text>
                </View>
                <Text style={[s.msg, m.unread > 0 && { color: C.text, fontWeight: '600' }]} numberOfLines={1}>
                  {m.lastMsg}
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
  safe:      { flex: 1, backgroundColor: C.bg },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 20, paddingVertical: 16 },
  title:     { fontSize: 26, fontWeight: '900', color: C.text },
  sub:       { fontSize: 12, color: C.purple },
  list:      { paddingHorizontal: 16 },
  sep:       { height: 1, backgroundColor: C.border, marginLeft: 76 },
  row:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  avatar:    { width: 52, height: 52, borderRadius: 26, borderWidth: 2, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', marginRight: 14, position: 'relative' },
  emoji:     { fontSize: 24 },
  status:    { position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: C.bg },
  info:      { flex: 1 },
  nameRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  name:      { fontSize: 15, fontWeight: '700', color: C.text },
  age:       { fontSize: 13, fontWeight: '400', color: C.textDim },
  time:      { fontSize: 11, color: C.textDim },
  msg:       { fontSize: 13, color: C.textDim },
  badge:     { backgroundColor: C.purple, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, marginLeft: 8 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});

export default MatchesScreen;
