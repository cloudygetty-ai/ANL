// src/screens/DiscoveryScreen.tsx
// Swipe card discovery — shows nearby users with vibe match, distance, presence
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';

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

const SEED = [
  { id:'1', name:'Nova',    age:24, gender:'f',  vibe:'Tonight only',      dist:'80m',  presence:'online', emoji:'🔥', tags:['No strings','Spontaneous'] },
  { id:'2', name:'Remy',    age:27, gender:'m',  vibe:'Down for anything', dist:'150m', presence:'online', emoji:'🌙', tags:['Late night magic','Free tonight'] },
  { id:'3', name:'Lyric',   age:22, gender:'nb', vibe:'Dream energy',      dist:'220m', presence:'away',   emoji:'✨', tags:['Good vibes only','Adventurous'] },
  { id:'4', name:'Dani',    age:29, gender:'tw', vibe:'Come find me',      dist:'310m', presence:'online', emoji:'💜', tags:['Just got out','Let\'s link'] },
  { id:'5', name:'Marcus',  age:31, gender:'m',  vibe:'No strings',        dist:'95m',  presence:'online', emoji:'⚡', tags:['Tonight only','Spontaneous'] },
];

const DiscoveryScreen: React.FC = () => {
  const [idx, setIdx] = useState(0);
  const [liked, setLiked] = useState<string[]>([]);

  const user = SEED[idx % SEED.length];
  const col = GENDER_COLOR[user.gender] ?? C.purple;

  const pass = () => setIdx(i => i + 1);
  const like = () => { setLiked(l => [...l, user.id]); setIdx(i => i + 1); };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.wordmark}><Text style={{ color: C.purple }}>ANL</Text>  <Text style={s.wordmarkSub}>DISCOVER</Text></Text>
        <View style={s.pill}>
          <View style={[s.dot, { backgroundColor: C.green }]} />
          <Text style={s.pillText}>{SEED.filter(u => u.presence === 'online').length} near you</Text>
        </View>
      </View>

      <View style={s.cardWrap}>
        <LinearGradient
          colors={[`${col}22`, '#04040a']}
          style={s.card}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          {/* Avatar */}
          <View style={[s.avatar, { borderColor: col }]}>
            <Text style={s.avatarEmoji}>{user.emoji}</Text>
          </View>

          <Text style={[s.name, { color: col }]}>{user.name}</Text>
          <Text style={s.meta}>{user.age} · {user.dist} · {user.presence === 'online' ? '🟢 Online' : '🟡 Away'}</Text>
          <Text style={s.vibe}>"{user.vibe}"</Text>

          <View style={s.tags}>
            {user.tags.map(t => (
              <View key={t} style={[s.tag, { borderColor: `${col}55` }]}>
                <Text style={[s.tagText, { color: col }]}>{t}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* Actions */}
        <View style={s.actions}>
          <TouchableOpacity style={s.passBtn} onPress={pass}>
            <Text style={s.passBtnText}>✕ Pass</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.likeBtn, { backgroundColor: col }]} onPress={like}>
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
  safe:        { flex: 1, backgroundColor: C.bg },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  wordmark:    { fontSize: 20, fontWeight: '900', color: C.text, letterSpacing: 2 },
  wordmarkSub: { fontSize: 20, fontWeight: '300', color: C.textDim, letterSpacing: 5 },
  pill:        { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: C.border },
  dot:         { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  pillText:    { fontSize: 11, color: C.textDim },
  cardWrap:    { flex: 1, paddingHorizontal: 20, paddingBottom: 20 },
  card:        { flex: 1, borderRadius: 24, borderWidth: 1, borderColor: C.border, padding: 28, alignItems: 'center', justifyContent: 'center' },
  avatar:      { width: 100, height: 100, borderRadius: 50, borderWidth: 3, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  avatarEmoji: { fontSize: 46 },
  name:        { fontSize: 30, fontWeight: '900', marginBottom: 6 },
  meta:        { fontSize: 13, color: C.textDim, marginBottom: 12 },
  vibe:        { fontSize: 16, color: C.text, fontStyle: 'italic', marginBottom: 20, textAlign: 'center' },
  tags:        { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  tag:         { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  tagText:     { fontSize: 12, fontWeight: '600' },
  actions:     { flexDirection: 'row', gap: 16, paddingTop: 16 },
  passBtn:     { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  passBtnText: { fontSize: 16, fontWeight: '700', color: C.textDim },
  likeBtn:     { flex: 1, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  likeBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  likedBar:    { paddingHorizontal: 20, paddingBottom: 12, alignItems: 'center' },
  likedText:   { fontSize: 12, color: C.purple },
});

export default DiscoveryScreen;
