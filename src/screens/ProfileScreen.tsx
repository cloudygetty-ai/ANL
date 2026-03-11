// src/screens/ProfileScreen.tsx
// Shows the current user's own profile from userStore.
// Has two modes: view (read-only) and edit (fields become editable).
// Includes an "Out Tonight" toggle switch, account stats, and a sign-out button.

import React, { useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { GlowButton } from '@components';
import { AuthService } from '@services/auth';
import { useUserStore } from '@services/state/userStore';
import { COLORS } from '@config/constants';
import type { Gender } from '@types/index';

// ---------------------------------------------------------------------------
// Module-level service
// ---------------------------------------------------------------------------

const authService = new AuthService();

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GENDER_OPTIONS: Array<{ key: Gender; label: string; color: string }> = [
  { key: 'female',      label: 'Woman',       color: COLORS.female },
  { key: 'male',        label: 'Man',         color: COLORS.male },
  { key: 'trans_woman', label: 'Trans Woman', color: COLORS.transWoman },
  { key: 'trans_man',   label: 'Trans Man',   color: COLORS.transMan },
  { key: 'non_binary',  label: 'Non-Binary',  color: COLORS.nonBinary },
];

const GENDER_LABEL: Record<Gender, string> = {
  female:      'Woman',
  male:        'Man',
  trans_woman: 'Trans Woman',
  trans_man:   'Trans Man',
  non_binary:  'Non-Binary',
};

// Map gender key to its design-token color
const GENDER_COLOR: Record<Gender, string> = {
  female:      COLORS.female,
  male:        COLORS.male,
  trans_woman: COLORS.transWoman,
  trans_man:   COLORS.transMan,
  non_binary:  COLORS.nonBinary,
};

const VIBE_SUGGESTIONS = [
  'rooftops', 'jazz', 'dancing', 'music', 'art', 'foodie',
  'chill', 'creative', 'techno', 'bars', 'karaoke', 'live music',
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Section heading with the same uppercase muted style used throughout the app. */
function SectionTitle({ text }: { text: string }) {
  return <Text style={styles.sectionTitle}>{text}</Text>;
}

/** Single stat pill (label + value). */
function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** Vibe tag shown in both view and edit mode. */
function VibePill({
  tag,
  active,
  onPress,
}: {
  tag: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={[styles.vibePill, active && styles.vibePillActive]}
      activeOpacity={0.75}
    >
      <Text style={[styles.vibePillText, active && styles.vibePillTextActive]}>
        {tag}
      </Text>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const ProfileScreen: React.FC = () => {
  const { profile, updateProfile, clearProfile } = useUserStore();

  // Edit mode flag — toggling it switches between read-only display and form
  const [isEditing, setIsEditing] = useState(false);

  // Editable field mirrors — populated from profile on edit-mode entry
  const [editName, setEditName] = useState(profile?.displayName ?? '');
  const [editAge, setEditAge] = useState(profile?.age ? String(profile.age) : '');
  const [editGender, setEditGender] = useState<Gender>(profile?.gender ?? 'non_binary');
  const [editBio, setEditBio] = useState(profile?.bio ?? '');
  const [editVibes, setEditVibes] = useState<string[]>(profile?.vibeTags ?? []);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Derived display values
  const displayName = profile?.displayName ?? 'Guest';
  const initial = displayName.charAt(0).toUpperCase();
  const gender = profile?.gender ?? 'non_binary';
  const genderColor = GENDER_COLOR[gender];
  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Unknown';

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleEditPress() {
    // Snapshot current profile values into editable state before entering edit mode
    setEditName(profile?.displayName ?? '');
    setEditAge(profile?.age ? String(profile.age) : '');
    setEditGender(profile?.gender ?? 'non_binary');
    setEditBio(profile?.bio ?? '');
    setEditVibes(profile?.vibeTags ?? []);
    setSaveError(null);
    setIsEditing(true);
  }

  function handleCancelEdit() {
    setIsEditing(false);
    setSaveError(null);
  }

  async function handleSave() {
    if (!editName.trim()) { setSaveError('Name is required.'); return; }
    const ageNum = parseInt(editAge, 10);
    if (isNaN(ageNum) || ageNum < 18 || ageNum > 99) {
      setSaveError('Enter a valid age (18–99).');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      updateProfile({
        displayName: editName.trim(),
        age: ageNum,
        gender: editGender,
        bio: editBio.trim(),
        vibeTags: editVibes,
      });
      // TODO[NORMAL]: also persist via AuthService.updateProfile(profile.id, updates)
      setIsEditing(false);
    } catch {
      setSaveError('Could not save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleToggleOutTonight(value: boolean) {
    updateProfile({ isOutTonight: value });
  }

  function handleSignOut() {
    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.signOut();
            } catch {
              // Ignore — clearProfile still gates the UI
            } finally {
              // Clearing the profile causes RootNavigator to show OnboardingScreen
              clearProfile();
            }
          },
        },
      ],
    );
  }

  function toggleEditVibe(tag: string) {
    setEditVibes((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Header — avatar, name, meta */}
      {/* ------------------------------------------------------------------ */}
      <View style={styles.header}>
        {/* Colored avatar ring reflects gender */}
        <View style={[styles.avatarRing, { borderColor: genderColor }]}>
          <View style={[styles.avatarInner, { backgroundColor: genderColor + '22' }]}>
            <Text style={[styles.avatarInitial, { color: genderColor }]}>{initial}</Text>
          </View>
        </View>

        {isEditing ? (
          <TextInput
            style={styles.nameInput}
            value={editName}
            onChangeText={setEditName}
            placeholder="Your name"
            placeholderTextColor={COLORS.textMuted}
            maxLength={30}
            autoFocus
          />
        ) : (
          <Text style={styles.name}>{displayName}</Text>
        )}

        <Text style={styles.meta}>
          {profile?.age ?? '—'} · {GENDER_LABEL[gender]}
        </Text>
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* Out Tonight toggle */}
      {/* ------------------------------------------------------------------ */}
      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleLabel}>
            <Text style={styles.toggleTitle}>Out Tonight</Text>
            <Text style={styles.toggleSub}>Let others know you're out</Text>
          </View>
          <Switch
            value={profile?.isOutTonight ?? false}
            onValueChange={handleToggleOutTonight}
            trackColor={{ false: 'rgba(255,255,255,0.1)', true: COLORS.accent + '80' }}
            thumbColor={profile?.isOutTonight ? COLORS.accent : COLORS.textMuted}
            ios_backgroundColor="rgba(255,255,255,0.1)"
          />
        </View>
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* Account stats */}
      {/* ------------------------------------------------------------------ */}
      <View style={styles.statsRow}>
        <StatPill label="Member since" value={memberSince} />
        <StatPill label="Vibes" value={String(profile?.vibeTags?.length ?? 0)} />
        <StatPill label="Status" value={profile?.presence ?? 'offline'} />
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* Bio */}
      {/* ------------------------------------------------------------------ */}
      <View style={styles.card}>
        <SectionTitle text="Bio" />
        {isEditing ? (
          <>
            <TextInput
              style={styles.bioInput}
              value={editBio}
              onChangeText={setEditBio}
              placeholder="Tell people what you're about tonight..."
              placeholderTextColor={COLORS.textMuted}
              maxLength={160}
              multiline
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{editBio.length}/160</Text>
          </>
        ) : (
          <Text style={styles.bioText}>
            {profile?.bio?.trim() ? profile.bio : 'No bio yet.'}
          </Text>
        )}
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* Gender — editable picker */}
      {/* ------------------------------------------------------------------ */}
      {isEditing && (
        <View style={styles.card}>
          <SectionTitle text="I am a..." />
          <View style={styles.genderGrid}>
            {GENDER_OPTIONS.map((opt) => {
              const active = editGender === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.genderChip,
                    active && { backgroundColor: opt.color + '22', borderColor: opt.color },
                  ]}
                  onPress={() => setEditGender(opt.key)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.genderDot, { backgroundColor: opt.color }]} />
                  <Text style={[styles.genderLabel, active && { color: opt.color }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Vibe tags */}
      {/* ------------------------------------------------------------------ */}
      <View style={styles.card}>
        <SectionTitle text="Vibes" />
        <View style={styles.vibeRow}>
          {isEditing
            ? VIBE_SUGGESTIONS.map((tag) => (
                <VibePill
                  key={tag}
                  tag={tag}
                  active={editVibes.includes(tag)}
                  onPress={() => toggleEditVibe(tag)}
                />
              ))
            : profile?.vibeTags && profile.vibeTags.length > 0
            ? profile.vibeTags.map((tag) => <VibePill key={tag} tag={tag} active />)
            : <Text style={styles.emptyText}>No vibes added yet.</Text>
          }
        </View>
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* Save error */}
      {/* ------------------------------------------------------------------ */}
      {saveError && <Text style={styles.errorText}>{saveError}</Text>}

      {/* ------------------------------------------------------------------ */}
      {/* Action buttons */}
      {/* ------------------------------------------------------------------ */}
      <View style={styles.actions}>
        {isEditing ? (
          <>
            <GlowButton
              title={isSaving ? 'Saving...' : 'Save Changes'}
              onPress={handleSave}
              disabled={isSaving}
              size="lg"
            />
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelEdit}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <GlowButton
            title="Edit Profile"
            onPress={handleEditPress}
            variant="outline"
            size="lg"
          />
        )}

        {/* Sign out always visible */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  content: {
    paddingTop: Platform.OS === 'ios' ? 60 : 36,
    paddingHorizontal: 20,
    paddingBottom: 60,
    gap: 12,
  },

  // --- Header ---
  header: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2.5,
    padding: 4,
    marginBottom: 4,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 34,
    fontWeight: '700',
  },
  name: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  nameInput: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.accent,
    paddingBottom: 4,
    minWidth: 180,
  },
  meta: {
    color: COLORS.textMuted,
    fontSize: 14,
  },

  // --- Card container ---
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 10,
  },

  // --- Section title ---
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // --- Out Tonight toggle ---
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: { gap: 2 },
  toggleTitle: { color: COLORS.text, fontSize: 16, fontWeight: '600' },
  toggleSub: { color: COLORS.textMuted, fontSize: 13 },

  // --- Stats ---
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statPill: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  statLabel: { color: COLORS.textMuted, fontSize: 11 },

  // --- Bio ---
  bioText: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 22,
  },
  bioInput: {
    backgroundColor: '#1a1a24',
    borderRadius: 10,
    padding: 12,
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 22,
    height: 90,
  },
  charCount: { color: COLORS.textMuted, fontSize: 11, textAlign: 'right' },

  // --- Gender picker ---
  genderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  genderDot: { width: 8, height: 8, borderRadius: 4 },
  genderLabel: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },

  // --- Vibe tags ---
  vibeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vibePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'transparent',
  },
  vibePillActive: {
    backgroundColor: COLORS.accent + '18',
    borderColor: COLORS.accent + '50',
  },
  vibePillText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  vibePillTextActive: { color: COLORS.accent },

  emptyText: { color: COLORS.textMuted, fontSize: 14, fontStyle: 'italic' },

  // --- Actions ---
  actions: { gap: 12, marginTop: 8 },
  cancelBtn: { alignSelf: 'center', paddingVertical: 8 },
  cancelBtnText: { color: COLORS.textMuted, fontSize: 15, fontWeight: '600' },
  signOutBtn: {
    marginTop: 8,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  signOutText: { color: COLORS.error, fontSize: 15, fontWeight: '600' },

  errorText: { color: COLORS.error, fontSize: 13, textAlign: 'center' },
});

export default ProfileScreen;
