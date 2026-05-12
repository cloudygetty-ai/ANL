// src/screens/ProfileScreen.tsx
// Edit own profile — name, bio, vibe, gender, age, tags, presence toggle
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserStore } from '@services/state/userStore';
import { authService } from '@services/auth';
import GlowButton from '@components/ui/GlowButton';

const C = {
  bg:      '#04040a',
  surface: '#0d0d14',
  border:  'rgba(168,85,247,0.2)',
  purple:  '#a855f7',
  amber:   '#fbbf24',
  green:   '#4ade80',
  text:    '#f0eee8',
  textDim: 'rgba(240,238,232,0.5)',
  textMuted: 'rgba(240,238,232,0.2)',
};

const VIBE_TAGS = [
  'Tonight only', 'Down for anything', 'No strings', 'Good vibes only',
  'Spontaneous', 'Late night magic', 'Come find me', 'Free tonight',
  'Let's link', 'Adventurous', 'Just got out', 'Dream energy',
];

const ProfileScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { profile, updateProfile } = useUserStore();

  const [name,     setName]     = useState(profile?.displayName ?? '');
  const [bio,      setBio]      = useState(profile?.bio ?? '');
  const [vibe,     setVibe]     = useState(profile?.vibe ?? '');
  const [tags,     setTags]     = useState<string[]>(profile?.vibeTagIds ?? []);
  const [isOut,    setIsOut]    = useState(profile?.presence === 'online');
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  const toggleTag = (tag: string) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag].slice(0, 5));
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const updates = {
      displayName:  name.trim(),
      bio:          bio.trim(),
      vibe:         vibe.trim(),
      vibeTagIds:   tags,
      presence:     (isOut ? 'online' : 'away') as 'online' | 'away',
      lastActiveAt: Date.now(),
    };
    await authService.updateProfile(profile.id, updates);
    updateProfile(updates);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const pinColor = () => {
    const g = profile?.gender ?? 'f';
    if (g === 'f')  return '#ff3c64';
    if (g === 'm')  return '#a855f7';
    if (g === 'tw') return '#f7a8c4';
    return '#55cdfc';
  };

  const col = pinColor();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>MY PROFILE</Text>
          {saved && <Text style={styles.savedBadge}>✓ SAVED</Text>}
        </View>

        {/* Avatar placeholder */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { borderColor: col, shadowColor: col }]}>
            <Text style={styles.avatarLetter}>{name[0]?.toUpperCase() ?? '?'}</Text>
            <View style={[styles.onlineDot, { backgroundColor: isOut ? C.green : '#555' }]} />
          </View>
          <TouchableOpacity style={styles.photoBtn}>
            <Text style={styles.photoBtnText}>+ Add Photos</Text>
          </TouchableOpacity>
        </View>

        {/* I'm out toggle */}
        <View style={styles.outToggle}>
          <View>
            <Text style={styles.outLabel}>I'm out tonight 🌙</Text>
            <Text style={styles.outSub}>Show me on the map to nearby people</Text>
          </View>
          <Switch
            value={isOut}
            onValueChange={setIsOut}
            trackColor={{ false: '#333', true: `${col}66` }}
            thumbColor={isOut ? col : '#888'}
          />
        </View>

        {/* Fields */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>NAME</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={C.textMuted} maxLength={30} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>VIBE TONIGHT</Text>
          <TextInput
            style={styles.input}
            value={vibe}
            onChangeText={setVibe}
            placeholder="Tonight only 🔥"
            placeholderTextColor={C.textMuted}
            maxLength={60}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>BIO</Text>
          <TextInput
            style={[styles.input, styles.inputMulti]}
            value={bio}
            onChangeText={setBio}
            placeholder="Say something real..."
            placeholderTextColor={C.textMuted}
            multiline
            maxLength={200}
          />
        </View>

        {/* Vibe tags */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>VIBE TAGS <Text style={styles.sectionLabelSub}>(max 5)</Text></Text>
          <View style={styles.tagsGrid}>
            {VIBE_TAGS.map(tag => {
              const active = tags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tagPill, active && { borderColor: col, backgroundColor: `${col}15` }]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text style={[styles.tagText, active && { color: C.text }]}>{tag}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Stats — read only */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: col }]}>{profile?.match ?? 0}%</Text>
            <Text style={styles.statLabel}>avg match</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile?.isPremium ? '⭐ PRO' : 'Free'}</Text>
            <Text style={styles.statLabel}>plan</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: profile?.isVerified ? C.green : C.textMuted }]}>
              {profile?.isVerified ? '✓ Verified' : 'Unverified'}
            </Text>
            <Text style={styles.statLabel}>status</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <GlowButton
            label={saving ? 'Saving...' : 'Save Changes'}
            onPress={handleSave}
            disabled={saving}
            size="lg"
            color={col}
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 60 },

  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 12 },
  backBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 28, color: C.text, lineHeight: 32 },
  title:       { flex: 1, fontSize: 16, fontWeight: '900', color: C.text, letterSpacing: 2 },
  savedBadge:  { fontSize: 11, fontWeight: '800', color: C.green, letterSpacing: 1 },

  avatarSection: { alignItems: 'center', paddingVertical: 24, gap: 12 },
  avatar:        { width: 80, height: 80, borderRadius: 40, backgroundColor: '#14141f', borderWidth: 3, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.6, shadowRadius: 16, shadowOffset: { width: 0, height: 0 }, elevation: 10 },
  avatarLetter:  { fontSize: 32, fontWeight: '900', color: C.text },
  onlineDot:     { position: 'absolute', bottom: 2, right: 2, width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: C.bg },
  photoBtn:      { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: 'rgba(255,255,255,0.04)' },
  photoBtnText:  { fontSize: 13, fontWeight: '600', color: C.textDim },

  outToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, marginBottom: 24, backgroundColor: C.surface, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: C.border },
  outLabel:  { fontSize: 15, fontWeight: '700', color: C.text },
  outSub:    { fontSize: 11, color: C.textMuted, marginTop: 3 },

  section:      { paddingHorizontal: 20, marginBottom: 20 },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: C.textMuted, letterSpacing: 2, marginBottom: 8 },
  sectionLabelSub: { fontWeight: '400', color: C.textMuted },
  input:        { backgroundColor: C.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: C.text, fontSize: 15, borderWidth: 1, borderColor: C.border },
  inputMulti:   { minHeight: 100, textAlignVertical: 'top' },

  tagsGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagPill:      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)' },
  tagText:      { fontSize: 12, fontWeight: '600', color: C.textDim },

  statsRow:  { flexDirection: 'row', justifyContent: 'space-around', marginHorizontal: 20, marginBottom: 24, backgroundColor: C.surface, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: C.border },
  statItem:  { alignItems: 'center' },
  statValue: { fontSize: 15, fontWeight: '800', color: C.text },
  statLabel: { fontSize: 10, color: C.textMuted, marginTop: 3, letterSpacing: 0.5 },
});

export default ProfileScreen;
