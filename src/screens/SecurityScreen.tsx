// src/screens/SecurityScreen.tsx
// Discreet mode, app PIN lock, screenshot alerts, and block list management.
// Some features gated behind Premium+.
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Switch, TouchableOpacity, Alert, TextInput,
  Modal, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserStore } from '@services/state/userStore';
import { securityService } from '@services/security';
import type { DiscreetSettings } from '@types/index';

const C = {
  bg:        '#04040a',
  surface:   '#0d0d14',
  surfaceUp: '#13131e',
  border:    'rgba(168,85,247,0.18)',
  purple:    '#a855f7',
  amber:     '#fbbf24',
  green:     '#4ade80',
  red:       '#f87171',
  text:      '#f0eee8',
  textDim:   'rgba(240,238,232,0.5)',
  textMuted: 'rgba(240,238,232,0.2)',
};

// ── Setting row ───────────────────────────────────────────────────────────────
interface SettingRowProps {
  label:        string;
  description:  string;
  value:        boolean;
  onChange:     (v: boolean) => void;
  premiumOnly?: boolean;
  isPremium?:   boolean;
  onUpgrade?:   () => void;
  color?:       string;
  last?:        boolean;
}

const SettingRow: React.FC<SettingRowProps> = ({
  label, description, value, onChange,
  premiumOnly, isPremium, onUpgrade, color = C.purple, last,
}) => {
  const locked = premiumOnly && !isPremium;

  return (
    <View style={[styles.settingRow, !last && styles.settingRowBorder]}>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.settingLabel}>{label}</Text>
          {premiumOnly && (
            <View style={[styles.premiumTag, locked && styles.premiumTagLocked]}>
              <Text style={styles.premiumTagText}>{isPremium ? '⭐' : '🔒'} PRO</Text>
            </View>
          )}
        </View>
        <Text style={styles.settingDesc}>{description}</Text>
      </View>
      {locked
        ? (
          <TouchableOpacity
            style={styles.upgradeSmall}
            onPress={onUpgrade}
          >
            <Text style={styles.upgradeSmallText}>Unlock</Text>
          </TouchableOpacity>
        )
        : (
          <Switch
            value={value}
            onValueChange={onChange}
            trackColor={{ false: '#333', true: `${color}66` }}
            thumbColor={value ? color : '#888'}
          />
        )
      }
    </View>
  );
};

// ── PIN modal ─────────────────────────────────────────────────────────────────
interface PinModalProps {
  visible:  boolean;
  mode:     'set' | 'verify';
  onDone:   (pin: string) => void;
  onCancel: () => void;
}

const PinModal: React.FC<PinModalProps> = ({ visible, mode, onDone, onCancel }) => {
  const [pin,    setPin]    = useState('');
  const [pin2,   setPin2]   = useState('');
  const [error,  setError]  = useState('');

  const handleConfirm = () => {
    if (mode === 'set') {
      if (pin.length < 4) { setError('PIN must be at least 4 digits'); return; }
      if (pin !== pin2)   { setError('PINs do not match'); return; }
    }
    setPin(''); setPin2(''); setError('');
    onDone(pin);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>
            {mode === 'set' ? '🔐 Set PIN Lock' : '🔐 Enter PIN'}
          </Text>
          <TextInput
            style={styles.pinInput}
            placeholder="PIN (4+ digits)"
            placeholderTextColor={C.textMuted}
            secureTextEntry
            keyboardType="number-pad"
            maxLength={8}
            value={pin}
            onChangeText={setPin}
          />
          {mode === 'set' && (
            <TextInput
              style={styles.pinInput}
              placeholder="Confirm PIN"
              placeholderTextColor={C.textMuted}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={8}
              value={pin2}
              onChangeText={setPin2}
            />
          )}
          {!!error && <Text style={styles.pinError}>{error}</Text>}
          <View style={styles.modalBtnRow}>
            <TouchableOpacity style={styles.modalBtnCancel} onPress={onCancel}>
              <Text style={styles.modalBtnCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtnConfirm} onPress={handleConfirm}>
              <Text style={styles.modalBtnConfirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
interface SecurityScreenProps {
  navigation?: any;
}

const SecurityScreen: React.FC<SecurityScreenProps> = ({ navigation }) => {
  const { profile, updateProfile } = useUserStore();
  const isPremiumPlus = profile?.isPremium ?? false; // TODO: check premium_plus tier specifically

  const [settings,   setSettings]   = useState<DiscreetSettings | null>(null);
  const [hasPIN,     setHasPIN]     = useState(false);
  const [pinModal,   setPinModal]   = useState<'set' | 'verify' | null>(null);
  const [saving,     setSaving]     = useState(false);

  useEffect(() => {
    securityService.getSettings().then(setSettings);
    securityService.hasPinSet().then(setHasPIN);
  }, []);

  const handleToggle = async (key: keyof DiscreetSettings, value: boolean) => {
    if (!settings || !profile) return;
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    setSaving(true);
    await securityService.saveSettings(profile.id, updated);
    setSaving(false);
  };

  const handlePinDone = async (pin: string) => {
    await securityService.setPin(pin);
    setHasPIN(true);
    if (settings) handleToggle('requirePinToOpen', true);
    setPinModal(null);
    Alert.alert('PIN Set', 'Your app lock PIN has been set.');
  };

  const handleRemovePin = async () => {
    Alert.alert('Remove PIN?', 'This will disable app lock.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          await securityService.clearPin();
          setHasPIN(false);
          if (settings) handleToggle('requirePinToOpen', false);
        },
      },
    ]);
  };

  const handleBlockedList = () => {
    // TODO[NORMAL]: navigate to a dedicated blocked users list screen
    Alert.alert('Blocked Users', `You have blocked ${profile?.blockedIds?.length ?? 0} users.\n\nFull management coming soon.`);
  };

  const handleUpgrade = () => navigation?.navigate('Premium');

  if (!settings) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ActivityIndicator style={{ marginTop: 60 }} color={C.purple} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>‹</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>SECURITY</Text>
            <Text style={styles.titleSub}>Privacy & discreet mode</Text>
          </View>
          {saving && <ActivityIndicator color={C.purple} size="small" style={{ marginLeft: 'auto' }} />}
        </View>

        {/* Discreet mode hero */}
        <View style={[
          styles.discreetHero,
          settings.enabled && styles.discreetHeroActive,
        ]}>
          <View style={styles.discreetHeroGlow} />
          <View style={{ flex: 1 }}>
            <Text style={styles.discreetTitle}>
              {settings.enabled ? '🕵️  Discreet Mode ON' : '🕵️  Discreet Mode'}
            </Text>
            <Text style={styles.discreetSub}>
              {settings.enabled
                ? 'You are hidden from the map and search.'
                : 'Hide yourself from the map and all search results.'}
            </Text>
          </View>
          <Switch
            value={settings.enabled}
            onValueChange={v => handleToggle('enabled', v)}
            trackColor={{ false: '#333', true: `${C.purple}88` }}
            thumbColor={settings.enabled ? C.purple : '#888'}
          />
        </View>

        {/* Privacy settings */}
        <Text style={styles.sectionLabel}>PRIVACY</Text>
        <View style={styles.card}>
          <SettingRow
            label="Hide from search"
            description="Don't appear in member lists or filters"
            value={settings.hiddenFromSearch}
            onChange={v => handleToggle('hiddenFromSearch', v)}
          />
          <SettingRow
            label="Appear offline"
            description="Show as offline even when you're active"
            value={settings.appearOffline}
            onChange={v => handleToggle('appearOffline', v)}
          />
          <SettingRow
            label="Incognito browse"
            description="View profiles without them seeing your visit"
            value={false}
            onChange={() => {}}
            premiumOnly
            isPremium={isPremiumPlus}
            onUpgrade={handleUpgrade}
          />
          <SettingRow
            label="Screenshot alert"
            description="Alert you when someone screenshots your profile"
            value={settings.screenshotAlert}
            onChange={v => handleToggle('screenshotAlert', v)}
            premiumOnly
            isPremium={isPremiumPlus}
            onUpgrade={handleUpgrade}
            last
          />
        </View>

        {/* App lock */}
        <Text style={styles.sectionLabel}>APP LOCK</Text>
        <View style={styles.card}>
          <SettingRow
            label="Require PIN to open"
            description="Lock the app with a PIN code"
            value={settings.requirePinToOpen && hasPIN}
            onChange={v => {
              if (v && !hasPIN) { setPinModal('set'); return; }
              handleToggle('requirePinToOpen', v);
            }}
            last={!hasPIN}
          />
          {hasPIN && (
            <View style={[styles.settingRow]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Change / Remove PIN</Text>
                <Text style={styles.settingDesc}>Update your app lock passcode</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => setPinModal('set')}>
                  <Text style={styles.actionBtnText}>Change</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnDanger]}
                  onPress={handleRemovePin}
                >
                  <Text style={[styles.actionBtnText, { color: C.red }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Display */}
        <Text style={styles.sectionLabel}>APPEARANCE</Text>
        <View style={styles.card}>
          <SettingRow
            label="Discreet app icon"
            description="Replace app icon with a neutral placeholder"
            value={settings.discreetIcon}
            onChange={v => handleToggle('discreetIcon', v)}
            premiumOnly
            isPremium={isPremiumPlus}
            onUpgrade={handleUpgrade}
            last
          />
        </View>

        {/* Block list */}
        <Text style={styles.sectionLabel}>BLOCKED USERS</Text>
        <TouchableOpacity style={styles.card} onPress={handleBlockedList} activeOpacity={0.8}>
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Blocked list</Text>
              <Text style={styles.settingDesc}>
                {profile?.blockedIds?.length ?? 0} users blocked
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {pinModal && (
        <PinModal
          visible
          mode={pinModal}
          onDone={handlePinDone}
          onCancel={() => setPinModal(null)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },

  header:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 12 },
  backBtn:   { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 28, color: C.text, lineHeight: 32 },
  title:     { fontSize: 22, fontWeight: '900', color: C.text, letterSpacing: 2 },
  titleSub:  { fontSize: 12, color: C.textDim, marginTop: 2 },

  discreetHero: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: 18, padding: 18, marginBottom: 24,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden', gap: 14,
  },
  discreetHeroActive: { borderColor: 'rgba(168,85,247,0.5)', backgroundColor: '#0f0f1e' },
  discreetHeroGlow: {
    position: 'absolute', top: -30, right: -20,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(168,85,247,0.12)',
  },
  discreetTitle: { fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 4 },
  discreetSub:   { fontSize: 12, color: C.textDim, lineHeight: 18 },

  sectionLabel: { fontSize: 10, fontWeight: '800', color: C.textMuted, letterSpacing: 2, marginBottom: 8, marginTop: 4 },

  card: {
    backgroundColor: C.surface, borderRadius: 16, marginBottom: 20,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },

  settingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  settingRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(168,85,247,0.08)' },
  settingLabel: { fontSize: 14, fontWeight: '700', color: C.text },
  settingDesc:  { fontSize: 11, color: C.textDim, lineHeight: 16 },

  premiumTag: {
    backgroundColor: 'rgba(168,85,247,0.2)', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  premiumTagLocked: { backgroundColor: 'rgba(255,255,255,0.07)' },
  premiumTagText:   { fontSize: 9, fontWeight: '900', color: C.purple, letterSpacing: 0.5 },

  upgradeSmall: {
    backgroundColor: C.purple, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  upgradeSmallText: { fontSize: 11, fontWeight: '800', color: '#fff' },

  actionBtn: {
    borderWidth: 1, borderColor: C.border, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  actionBtnDanger: { borderColor: 'rgba(248,113,113,0.3)' },
  actionBtnText:   { fontSize: 11, fontWeight: '700', color: C.textDim },

  chevron: { fontSize: 22, color: C.textMuted },

  // PIN modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalCard: {
    backgroundColor: '#0d0d1e', borderRadius: 20, padding: 24,
    width: '85%', borderWidth: 1, borderColor: C.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: C.text, marginBottom: 16, textAlign: 'center' },
  pinInput: {
    backgroundColor: C.surfaceUp, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    color: C.text, fontSize: 16, letterSpacing: 6,
    borderWidth: 1, borderColor: C.border,
    marginBottom: 12, textAlign: 'center',
  },
  pinError: { fontSize: 12, color: C.red, textAlign: 'center', marginBottom: 8 },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalBtnCancel: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  modalBtnCancelText: { color: C.textDim, fontWeight: '700' },
  modalBtnConfirm: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: C.purple, alignItems: 'center' },
  modalBtnConfirmText: { color: '#fff', fontWeight: '900' },
});

export default SecurityScreen;
