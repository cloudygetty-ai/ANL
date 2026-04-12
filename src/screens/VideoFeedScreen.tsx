// src/screens/VideoFeedScreen.tsx
// Short-clip video feed — vertical pager, one video per screen (TikTok-style).
// Actual video playback requires expo-av; this renders the full UI shell
// with placeholders so the feature is immediately navigable and testable.
import React, { useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Dimensions,
  FlatList, TouchableOpacity, Animated,
  ViewToken, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { VideoPost } from '@types/index';

const { width: SW, height: SH } = Dimensions.get('window');

const C = {
  bg:        '#000',
  surface:   '#0d0d14',
  purple:    '#a855f7',
  pink:      '#ec4899',
  amber:     '#fbbf24',
  green:     '#4ade80',
  red:       '#f87171',
  text:      '#f0eee8',
  textDim:   'rgba(240,238,232,0.7)',
  textMuted: 'rgba(240,238,232,0.3)',
};

const genderColor = (g: string) => {
  if (g === 'f')  return '#ff3c64';
  if (g === 'm')  return '#a855f7';
  if (g === 'tw') return '#f7a8c4';
  if (g === 'tm') return '#55cdfc';
  return '#aaa';
};

const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

// ── Mock feed data ─────────────────────────────────────────────────────────────
// TODO[NORMAL]: replace with real Supabase query once video_posts table is created
const MOCK_POSTS: VideoPost[] = Array.from({ length: 10 }, (_, i) => ({
  id:           `v${i}`,
  authorId:     `u${i}`,
  authorName:   ['Skylar', 'Devon', 'Reese', 'Jordan', 'Avery', 'Quinn', 'Morgan', 'Blake', 'Casey', 'Taylor'][i],
  authorAge:    20 + (i % 12),
  authorGender: (['f', 'm', 'tw', 'f', 'm', 'f', 'nb', 'm', 'f', 'tw'] as const)[i],
  videoUrl:     '',   // real URL populated by VideoService
  thumbnailUrl: '',
  caption:      [
    'come find me 🌙',
    'free tonight, what\'s good 👀',
    'downtown vibes rn 🔥',
    'who\'s up?',
    'last night was wild lmao',
    'let\'s link fr',
    'out here looking like this tho 💀',
    'dm me if u see this',
    'late night adventures 🌃',
    'catch me if u can 😈',
  ][i],
  likes:       Math.floor(Math.random() * 5000) + 100,
  views:       Math.floor(Math.random() * 50000) + 500,
  durationSec: 15 + (i % 30),
  createdAt:   Date.now() - i * 3_600_000,
  isLiked:     i % 3 === 0,
}));

// ── Action button ─────────────────────────────────────────────────────────────
const ActionBtn: React.FC<{
  icon: string;
  label: string;
  active?: boolean;
  color?: string;
  onPress: () => void;
}> = ({ icon, label, active, color = C.text, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.8, duration: 80, useNativeDriver: true }),
      Animated.spring(scale,  { toValue: 1,   useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.9} style={styles.actionBtn}>
      <Animated.Text style={[styles.actionIcon, { transform: [{ scale }], color: active ? color : C.text }]}>
        {icon}
      </Animated.Text>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
};

// ── Single video card ─────────────────────────────────────────────────────────
interface VideoCardProps {
  post:    VideoPost;
  active:  boolean;
}

const VideoCard: React.FC<VideoCardProps> = ({ post, active }) => {
  const [liked, setLiked] = useState(post.isLiked);
  const [likes, setLikes] = useState(post.likes);
  const col = genderColor(post.authorGender);

  const handleLike = () => {
    setLiked(p => {
      setLikes(l => p ? l - 1 : l + 1);
      return !p;
    });
  };

  return (
    <View style={styles.card}>
      {/* Video placeholder — replace with expo-av Video component */}
      <View style={styles.videoPlaceholder}>
        <View style={[styles.videoGrad1, { backgroundColor: col }]} />
        <View style={styles.videoGrad2} />
        {active
          ? <Text style={styles.playIcon}>▶</Text>
          : <ActivityIndicator color={col} />
        }
        <Text style={styles.durationBadge}>{post.durationSec}s</Text>
      </View>

      {/* Overlay — bottom info */}
      <View style={styles.overlay}>
        {/* Author */}
        <View style={styles.authorRow}>
          <View style={[styles.avatar, { borderColor: col }]}>
            <Text style={[styles.avatarText, { color: col }]}>
              {post.authorName[0].toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.authorName}>{post.authorName}, {post.authorAge}</Text>
            <Text style={styles.viewCount}>{fmt(post.views)} views</Text>
          </View>
          <TouchableOpacity style={[styles.followBtn, { borderColor: col }]}>
            <Text style={[styles.followBtnText, { color: col }]}>+ Follow</Text>
          </TouchableOpacity>
        </View>

        {/* Caption */}
        <Text style={styles.caption} numberOfLines={2}>{post.caption}</Text>
      </View>

      {/* Action column — right side */}
      <View style={styles.actions}>
        <ActionBtn
          icon={liked ? '❤️' : '🤍'}
          label={fmt(likes)}
          active={liked}
          color={C.red}
          onPress={handleLike}
        />
        <ActionBtn icon="💬" label="Reply"    onPress={() => {}} />
        <ActionBtn icon="🔥" label="Flash"    onPress={() => {}} />
        <ActionBtn icon="↗️" label="Share"    onPress={() => {}} />
      </View>
    </View>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
const VideoFeedScreen: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
  }).current;

  return (
    <View style={styles.safe}>
      <FlatList
        data={MOCK_POSTS}
        keyExtractor={p => p.id}
        renderItem={({ item, index }) => (
          <VideoCard post={item} active={index === activeIndex} />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />

      {/* Header overlay */}
      <SafeAreaView style={styles.headerOverlay} edges={['top']} pointerEvents="box-none">
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            <Text style={{ color: C.purple }}>VIDEOS</Text>
          </Text>
          <TouchableOpacity style={styles.uploadBtn}>
            <Text style={styles.uploadBtnText}>+ Post</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  card:             { width: SW, height: SH, backgroundColor: C.bg },
  videoPlaceholder: { width: SW, height: SH, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  videoGrad1:       { position: 'absolute', top: 0, left: 0, right: 0, height: SH / 2, opacity: 0.12 },
  videoGrad2:       { position: 'absolute', bottom: 0, left: 0, right: 0, height: SH * 0.4, backgroundColor: 'rgba(0,0,0,0.5)' },
  playIcon:         { fontSize: 64, color: 'rgba(255,255,255,0.3)' },
  durationBadge: {
    position: 'absolute', top: 60, right: 14,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },

  overlay: {
    position: 'absolute', bottom: 100, left: 16, right: 90, gap: 10,
  },
  authorRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar:      { width: 40, height: 40, borderRadius: 20, borderWidth: 2, backgroundColor: '#111120', alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontSize: 16, fontWeight: '900' },
  authorName:  { fontSize: 14, fontWeight: '800', color: C.text },
  viewCount:   { fontSize: 11, color: C.textDim },
  followBtn:   { marginLeft: 'auto', borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  followBtnText: { fontSize: 12, fontWeight: '800' },
  caption:     { fontSize: 14, color: C.text, lineHeight: 20 },

  actions: {
    position: 'absolute', bottom: 90, right: 12,
    alignItems: 'center', gap: 20,
  },
  actionBtn:   { alignItems: 'center', gap: 3 },
  actionIcon:  { fontSize: 28 },
  actionLabel: { fontSize: 11, fontWeight: '700', color: C.textDim },

  // Header overlay
  headerOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: C.text, letterSpacing: 2 },
  uploadBtn:   { backgroundColor: 'rgba(168,85,247,0.3)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(168,85,247,0.5)' },
  uploadBtnText: { fontSize: 13, fontWeight: '800', color: C.purple },
});

export default VideoFeedScreen;
