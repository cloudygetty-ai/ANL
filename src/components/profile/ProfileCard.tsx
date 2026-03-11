// src/components/profile/ProfileCard.tsx
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { COLORS } from '@config/constants';
import { matchLabel } from '@utils/format';
import { formatDistance } from '@utils/geo';
import type { MapUser } from '@types/index';

// === Constants ===

const { height: SCREEN_H } = Dimensions.get('window');
const CARD_HEIGHT = SCREEN_H * 0.72;

// Gender display labels
const GENDER_LABEL: Record<MapUser['gender'], string> = {
  female: 'Woman',
  male: 'Man',
  trans_woman: 'Trans Woman',
  trans_man: 'Trans Man',
  non_binary: 'Non-Binary',
};

// Gender colors for avatar ring
const GENDER_COLOR: Record<MapUser['gender'], string> = {
  female: COLORS.female,
  male: COLORS.male,
  trans_woman: COLORS.transWoman,
  trans_man: COLORS.transMan,
  non_binary: COLORS.nonBinary,
};

// Match percentage -> bar color
function matchBarColor(score: number): string {
  if (score >= 70) return COLORS.success;
  if (score >= 40) return COLORS.warning;
  return COLORS.error;
}

// === Types ===

interface ProfileCardProps {
  user: MapUser;
  onClose: () => void;
  onChat: () => void;
  onVideo: () => void;
}

// === Sub-components ===

function AvatarCircle({ user }: { user: MapUser }) {
  const ringColor = GENDER_COLOR[user.gender];
  const initial = user.displayName.charAt(0).toUpperCase();

  return (
    <View style={[styles.avatarRing, { borderColor: ringColor }]}>
      <View style={[styles.avatarInner, { backgroundColor: ringColor + '33' }]}>
        <Text style={[styles.avatarInitial, { color: ringColor }]}>{initial}</Text>
      </View>
    </View>
  );
}

function MatchBar({ score }: { score: number }) {
  const barColor = matchBarColor(score);
  const label = matchLabel(score);
  return (
    <View style={styles.matchBarWrapper}>
      <View style={styles.matchBarTrack}>
        <View
          style={[
            styles.matchBarFill,
            { width: `${score}%` as any, backgroundColor: barColor },
          ]}
        />
      </View>
      <View style={styles.matchBarLabels}>
        <Text style={[styles.matchPct, { color: barColor }]}>{score}% match</Text>
        <Text style={styles.matchLabel}>{label}</Text>
      </View>
    </View>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function VibePill({ tag }: { tag: string }) {
  return (
    <View style={styles.vibePill}>
      <Text style={styles.vibeText}>{tag}</Text>
    </View>
  );
}

// === Component ===

const ProfileCard: React.FC<ProfileCardProps> = ({ user, onClose, onChat, onVideo }) => {
  const slideAnim = useRef(new Animated.Value(CARD_HEIGHT)).current;

  // Slide up on mount
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [slideAnim]);

  function handleClose() {
    Animated.timing(slideAnim, {
      toValue: CARD_HEIGHT,
      duration: 220,
      useNativeDriver: true,
    }).start(onClose);
  }

  const presenceLabel =
    user.presence === 'online' ? 'Online now' : user.presence === 'away' ? 'Away' : 'Offline';

  const presenceColor =
    user.presence === 'online'
      ? COLORS.success
      : user.presence === 'away'
      ? COLORS.warning
      : COLORS.textMuted;

  return (
    <Modal visible transparent animationType="none" onRequestClose={handleClose}>
      {/* Scrim — tap to dismiss */}
      <Pressable style={styles.scrim} onPress={handleClose} />

      <Animated.View
        style={[styles.card, { transform: [{ translateY: slideAnim }] }]}
      >
        {/* Drag handle */}
        <View style={styles.handle} />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Header: avatar + name/meta */}
          <View style={styles.header}>
            <AvatarCircle user={user} />
            <View style={styles.headerText}>
              <Text style={styles.name} numberOfLines={1}>
                {user.displayName}
              </Text>
              <Text style={styles.meta}>
                {user.age} · {GENDER_LABEL[user.gender]}
              </Text>
              <Text style={[styles.presenceLabel, { color: presenceColor }]}>
                {presenceLabel}
              </Text>
            </View>
          </View>

          {/* Match percentage bar */}
          <MatchBar score={user.matchScore} />

          {/* Stats row */}
          <View style={styles.statsRow}>
            <StatPill label="Distance" value={formatDistance(user.distanceMi)} />
            <StatPill label="Age" value={String(user.age)} />
            <StatPill label="Status" value={presenceLabel} />
          </View>

          {/* Bio */}
          {user.vibeTags.length > 0 || true ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              {/* MapUser doesn't carry bio; show a friendly placeholder */}
              <Text style={styles.bio}>
                {user.isOutTonight ? 'Out tonight  ' : ''}
                {user.vibeTags.length > 0 ? '' : 'No bio yet.'}
              </Text>
            </View>
          ) : null}

          {/* Vibe tags */}
          {user.vibeTags.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vibes</Text>
              <View style={styles.tagRow}>
                {user.vibeTags.map((tag) => (
                  <VibePill key={tag} tag={tag} />
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Action buttons */}
        <View style={styles.actions}>
          <Pressable
            style={[styles.btnSolid, { backgroundColor: COLORS.accent }]}
            onPress={() => {}}
          >
            <Text style={[styles.btnText, { color: '#0a0a0f' }]}>Send Vibe</Text>
          </Pressable>

          <View style={styles.actionRow}>
            <Pressable style={styles.btnOutline} onPress={onChat}>
              <Text style={[styles.btnText, { color: COLORS.accent }]}>Chat</Text>
            </Pressable>

            <Pressable style={styles.btnOutline} onPress={onVideo}>
              <Text style={[styles.btnText, { color: COLORS.accent }]}>Video</Text>
            </Pressable>

            <Pressable style={[styles.btnOutline, styles.btnDanger]}>
              <Text style={[styles.btnText, { color: COLORS.error }]}>Block</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
};

// === Styles ===

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  card: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: CARD_HEIGHT,
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  handle: {
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  scroll: {
    padding: 20,
    paddingBottom: 8,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 18,
  },
  avatarRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    padding: 3,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  meta: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  presenceLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },

  // Match bar
  matchBarWrapper: {
    marginBottom: 18,
    gap: 6,
  },
  matchBarTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  matchBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  matchBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchPct: {
    fontSize: 13,
    fontWeight: '700',
  },
  matchLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
  },

  // Sections
  section: {
    marginBottom: 18,
    gap: 8,
  },
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  bio: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 22,
  },

  // Vibe tags
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vibePill: {
    backgroundColor: 'rgba(127,255,212,0.12)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(127,255,212,0.25)',
  },
  vibeText: {
    color: COLORS.accent,
    fontSize: 13,
    fontWeight: '600',
  },

  // Action buttons
  actions: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  btnSolid: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btnOutline: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(127,255,212,0.3)',
  },
  btnDanger: {
    borderColor: 'rgba(239,68,68,0.3)',
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default ProfileCard;
