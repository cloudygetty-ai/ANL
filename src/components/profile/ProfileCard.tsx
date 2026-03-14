// src/components/profile/ProfileCard.tsx
// Full-screen profile card — used in map tap + discovery feed
import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, ScrollView,
} from 'react-native';
import type { UserProfile } from '@types/index';
import { timeAgo, formatDistance, matchLabel } from '@utils/format';

const { width: _SW } = Dimensions.get('window');

const C = {
  bg:      '#0d0d14',
  border:  'rgba(168,85,247,0.2)',
  purple:  '#a855f7',
  amber:   '#fbbf24',
  green:   '#4ade80',
  text:    '#f0eee8',
  textDim: 'rgba(240,238,232,0.5)',
  textMuted: 'rgba(240,238,232,0.2)',
};

const pinColor = (g: string, match: number): string => {
  if (g === 'f')  return match >= 90 ? '#ff3c64' : match >= 75 ? '#ffa032' : '#ffcc44';
  if (g === 'm')  return match >= 90 ? '#7c3aed' : '#a855f7';
  if (g === 'tw') return '#f7a8c4';
  return '#55cdfc';
};

interface Props {
  profile:  UserProfile;
  onClose:  () => void;
  onChat:   () => void;
  onVideo:  () => void;
  onVibe:   () => void;
  onBlock?: () => void;
}

const ProfileCard: React.FC<Props> = ({ profile, onClose, onChat, onVideo, onVibe, onBlock }) => {
  const slide = useRef(new Animated.Value(600)).current;
  const fade  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slide, { toValue: 0, tension: 70, friction: 13, useNativeDriver: true }),
      Animated.timing(fade,  { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slide, { toValue: 600, duration: 250, useNativeDriver: true }),
      Animated.timing(fade,  { toValue: 0,   duration: 200, useNativeDriver: true }),
    ]).start(onClose);
  };

  const col   = pinColor(profile.gender, profile.match ?? 0);
  const match = profile.match ?? 0;
  const isTW  = profile.gender === 'tw' || profile.gender === 'tm';

  const GENDER_LABELS: Record<string, string> = {
    f: 'Woman', m: 'Man', tw: 'Trans Woman', tm: 'Trans Man', nb: 'Non-binary',
  };

  return (
    <>
      {/* Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: fade }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={dismiss} />
      </Animated.View>

      {/* Card */}
      <Animated.View style={[styles.card, { transform: [{ translateY: slide }] }]}>
        {/* Trans flag accent bar */}
        {isTW && <View style={styles.transBar} />}

        <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {/* Header */}
          <View style={styles.header}>
            {/* Avatar */}
            <View style={[styles.avatar, { borderColor: col, shadowColor: col }]}>
              {profile.photos.length > 0 ? null : (
                <Text style={styles.avatarLetter}>{profile.displayName[0]?.toUpperCase() ?? '?'}</Text>
              )}
              {profile.presence === 'online' && <View style={styles.onlineDot} />}
            </View>

            <View style={{ flex: 1, marginLeft: 16 }}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{profile.displayName}</Text>
                <Text style={styles.age}>{profile.age}</Text>
                {profile.isVerified && <Text style={styles.verified}>✓</Text>}
              </View>
              <Text style={[styles.genderLabel, { color: col }]}>
                {GENDER_LABELS[profile.gender] ?? profile.gender}
              </Text>
              <Text style={styles.vibe}>"{profile.vibe}"</Text>
            </View>

            <TouchableOpacity onPress={dismiss} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Match bar */}
          <View style={styles.matchSection}>
            <View style={styles.matchRow}>
              <Text style={styles.matchTitle}>{matchLabel(match)}</Text>
              <Text style={[styles.matchPct, { color: col }]}>{match}%</Text>
            </View>
            <View style={styles.matchTrack}>
              <Animated.View style={[styles.matchFill, { width: `${match}%`, backgroundColor: col }]} />
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            {profile.distanceM !== undefined && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatDistance(profile.distanceM)}</Text>
                <Text style={styles.statLabel}>away</Text>
              </View>
            )}
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{timeAgo(profile.lastActiveAt)}</Text>
              <Text style={styles.statLabel}>active</Text>
            </View>
            {profile.isPremium && (
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: C.amber }]}>⭐ PRO</Text>
                <Text style={styles.statLabel}>member</Text>
              </View>
            )}
          </View>

          {/* Bio */}
          {profile.bio ? (
            <View style={styles.bioSection}>
              <Text style={styles.bioText}>{profile.bio}</Text>
            </View>
          ) : null}

          {/* Vibe tags */}
          {profile.vibeTagIds.length > 0 && (
            <View style={styles.tagsRow}>
              {profile.vibeTagIds.slice(0, 6).map((tag) => (
                <View key={tag} style={[styles.tag, { borderColor: `${col}44` }]}>
                  <Text style={[styles.tagText, { color: col }]}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionPrimary, { backgroundColor: col }]} onPress={onVibe}>
            <Text style={styles.actionPrimaryText}>Send a Vibe ✨</Text>
          </TouchableOpacity>
          <View style={styles.actionSecondary}>
            <TouchableOpacity style={[styles.actionIcon, { borderColor: '#22d3ee' }]} onPress={onChat}>
              <Text style={{ fontSize: 20 }}>💬</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionIcon, { borderColor: C.purple }]} onPress={onVideo}>
              <Text style={{ fontSize: 20 }}>📹</Text>
            </TouchableOpacity>
            {onBlock && (
              <TouchableOpacity style={[styles.actionIcon, { borderColor: 'rgba(255,255,255,0.1)' }]} onPress={onBlock}>
                <Text style={{ fontSize: 20 }}>🚫</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop:    { backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 10 },
  card:        { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: C.border, borderBottomWidth: 0, maxHeight: '85%', zIndex: 20, paddingBottom: 34 },
  transBar:    { height: 4, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: '#f7a8c4' },

  header:      { flexDirection: 'row', padding: 20, alignItems: 'flex-start' },
  avatar:      { width: 64, height: 64, borderRadius: 32, backgroundColor: '#14141f', borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.6, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  avatarLetter:{ fontSize: 26, fontWeight: '900', color: C.text },
  onlineDot:   { position: 'absolute', bottom: 1, right: 1, width: 14, height: 14, borderRadius: 7, backgroundColor: '#4ade80', borderWidth: 2, borderColor: C.bg },

  nameRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name:       { fontSize: 22, fontWeight: '900', color: C.text },
  age:        { fontSize: 18, fontWeight: '700', color: C.textDim },
  verified:   { fontSize: 14, color: '#22d3ee', fontWeight: '800' },
  genderLabel:{ fontSize: 12, fontWeight: '700', marginTop: 3, letterSpacing: 0.5 },
  vibe:       { fontSize: 12, color: C.textDim, marginTop: 4, fontStyle: 'italic' },

  closeBtn:     { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 13, color: C.textMuted },

  matchSection: { paddingHorizontal: 20, marginBottom: 16 },
  matchRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  matchTitle:   { fontSize: 12, fontWeight: '700', color: C.textDim, letterSpacing: 0.5 },
  matchPct:     { fontSize: 14, fontWeight: '900' },
  matchTrack:   { height: 5, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 3 },
  matchFill:    { height: 5, borderRadius: 3 },

  statsRow:  { flexDirection: 'row', gap: 24, paddingHorizontal: 20, marginBottom: 16 },
  statItem:  { alignItems: 'center' },
  statValue: { fontSize: 14, fontWeight: '800', color: C.text },
  statLabel: { fontSize: 10, color: C.textMuted, marginTop: 2, letterSpacing: 0.5 },

  bioSection: { paddingHorizontal: 20, marginBottom: 16 },
  bioText:    { fontSize: 14, color: C.textDim, lineHeight: 22 },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, marginBottom: 20 },
  tag:     { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.04)' },
  tagText: { fontSize: 11, fontWeight: '600' },

  actions:          { paddingHorizontal: 20, paddingTop: 12, gap: 10, borderTopWidth: 1, borderTopColor: C.border },
  actionPrimary:    { borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  actionPrimaryText:{ fontSize: 15, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  actionSecondary:  { flexDirection: 'row', gap: 10 },
  actionIcon:       { flex: 1, height: 52, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
});

export default ProfileCard;
