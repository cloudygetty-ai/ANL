// src/screens/OnboardingScreen.tsx
// Multi-step onboarding flow with progress dots at the top.
//   Step 1 — Phone number entry (calls AuthService.sendOTP)
//   Step 2 — OTP verification  (calls AuthService.verifyOTP)
//   Step 3 — Profile setup     (name, age, gender picker, bio, vibe tags)
//
// On step 3 completion the profile is saved to userStore and isOnboarded is
// set to true, which triggers RootNavigator to render MainTabs.

import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { GlowButton } from '@components';
import { AuthService } from '@services/auth';
import { useUserStore } from '@services/state/userStore';
import { COLORS } from '@config/constants';
import type { Gender, UserProfile } from '@types/index';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOTAL_STEPS = 3;

const GENDER_OPTIONS: Array<{ key: Gender; label: string; color: string }> = [
  { key: 'female',      label: 'Woman',       color: COLORS.female },
  { key: 'male',        label: 'Man',         color: COLORS.male },
  { key: 'trans_woman', label: 'Trans Woman', color: COLORS.transWoman },
  { key: 'trans_man',   label: 'Trans Man',   color: COLORS.transMan },
  { key: 'non_binary',  label: 'Non-Binary',  color: COLORS.nonBinary },
];

const VIBE_SUGGESTIONS = [
  'rooftops', 'jazz', 'dancing', 'music', 'art', 'foodie',
  'chill', 'creative', 'techno', 'bars', 'karaoke', 'live music',
];

// ---------------------------------------------------------------------------
// Module-level service
// ---------------------------------------------------------------------------

const authService = new AuthService();

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Progress dot row shown at the top of every step. */
function ProgressDots({ current }: { current: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === current - 1 && styles.dotActive,
            i < current - 1 && styles.dotDone,
          ]}
        />
      ))}
    </View>
  );
}

/** Uppercase label above a field. */
function FieldLabel({ text }: { text: string }) {
  return <Text style={styles.fieldLabel}>{text}</Text>;
}

/** Dark-themed text input used across all steps. */
function StyledInput({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
  multiline,
  autoFocus,
  onSubmitEditing,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
  maxLength?: number;
  multiline?: boolean;
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
}) {
  return (
    <TextInput
      style={[styles.input, multiline && styles.inputMultiline]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textMuted}
      keyboardType={keyboardType}
      maxLength={maxLength}
      multiline={multiline}
      autoFocus={autoFocus}
      onSubmitEditing={onSubmitEditing}
      returnKeyType={multiline ? 'default' : 'done'}
    />
  );
}

/** Inline red error message. Hidden when text is null. */
function ErrorMessage({ text }: { text: string | null }) {
  if (!text) return null;
  return <Text style={styles.errorText}>{text}</Text>;
}

// ---------------------------------------------------------------------------
// Step 1 — Phone number
// ---------------------------------------------------------------------------

interface Step1Props {
  onNext: (phone: string) => void;
}

function Step1Phone({ onNext }: Step1Props) {
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    const cleaned = phone.trim();
    if (!cleaned) { setError('Please enter your phone number.'); return; }

    // Minimal E.164 sanity check — full validation happens on the server
    if (!/^\+?[1-9]\d{7,14}$/.test(cleaned.replace(/[\s\-()\s]/g, ''))) {
      setError('Enter a valid phone number including country code (e.g. +12125551234).');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const e164 = cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
      await authService.sendOTP(e164);
      onNext(e164);
    } catch {
      setError('Could not send code. Check your number and try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={styles.stepRoot}>
      <Text style={styles.stepTitle}>What's your number?</Text>
      <Text style={styles.stepSub}>
        We'll send a one-time code to verify it's you.{'\n'}Standard SMS rates may apply.
      </Text>

      <FieldLabel text="Phone number" />
      <StyledInput
        value={phone}
        onChangeText={(t) => { setPhone(t); setError(null); }}
        placeholder="+1 212 555 1234"
        keyboardType="phone-pad"
        autoFocus
        onSubmitEditing={handleSend}
      />
      <ErrorMessage text={error} />

      <View style={styles.stepAction}>
        <GlowButton
          title={isLoading ? 'Sending...' : 'Send Code'}
          onPress={handleSend}
          disabled={isLoading}
          size="lg"
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — OTP verification
// ---------------------------------------------------------------------------

interface Step2Props {
  phone: string;
  onNext: () => void;
}

function Step2OTP({ phone, onNext }: Step2Props) {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setAuthed } = useUserStore();
  const inputRefs = useRef<Array<TextInput | null>>([null, null, null, null, null, null]);

  function handleDigitChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const chars = otp.padEnd(6, ' ').split('');
    chars[index] = digit || ' ';
    const next = chars.join('').trimEnd();
    setOtp(next);
    setError(null);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyPress(index: number, key: string) {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const chars = otp.padEnd(6, ' ').split('');
      chars[index - 1] = ' ';
      setOtp(chars.join('').trimEnd());
    }
  }

  async function handleVerify() {
    const code = otp.replace(/\s/g, '');
    if (code.length !== 6) { setError('Enter all 6 digits.'); return; }

    setIsLoading(true);
    setError(null);
    try {
      await authService.verifyOTP(phone, code);
      setAuthed(true);
      onNext();
    } catch {
      setError('Invalid code. Check your SMS and try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={styles.stepRoot}>
      <Text style={styles.stepTitle}>Enter your code</Text>
      <Text style={styles.stepSub}>Sent to {phone}</Text>

      {/* 6-digit OTP boxes */}
      <View style={styles.otpRow}>
        {Array.from({ length: 6 }).map((_, i) => (
          <TextInput
            key={i}
            ref={(r) => { inputRefs.current[i] = r; }}
            style={styles.otpBox}
            value={otp[i] && otp[i] !== ' ' ? otp[i] : ''}
            onChangeText={(v) => handleDigitChange(i, v)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
            keyboardType="number-pad"
            maxLength={1}
            textAlign="center"
            autoFocus={i === 0}
            selectionColor={COLORS.accent}
          />
        ))}
      </View>

      <ErrorMessage text={error} />

      <View style={styles.stepAction}>
        <GlowButton
          title={isLoading ? 'Verifying...' : 'Verify'}
          onPress={handleVerify}
          disabled={isLoading}
          size="lg"
        />
      </View>

      <TouchableOpacity
        style={styles.resendBtn}
        onPress={() => authService.sendOTP(phone)}
      >
        <Text style={styles.resendText}>Resend code</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Profile setup
// ---------------------------------------------------------------------------

interface Step3Props {
  onDone: () => void;
}

function Step3Profile({ onDone }: Step3Props) {
  const { profile, updateProfile, setOnboarded } = useUserStore();

  const [name, setName] = useState(profile?.displayName ?? '');
  const [age, setAge] = useState(profile?.age ? String(profile.age) : '');
  const [gender, setGender] = useState<Gender>(profile?.gender ?? 'non_binary');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [vibeTags, setVibeTags] = useState<string[]>(profile?.vibeTags ?? []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleVibe(tag: string) {
    setVibeTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  async function handleDone() {
    if (!name.trim()) { setError('Your name is required.'); return; }
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 18 || ageNum > 99) {
      setError('Enter a valid age (18–99).');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const updates: Partial<UserProfile> = {
        displayName: name.trim(),
        age: ageNum,
        gender,
        bio: bio.trim(),
        vibeTags,
      };
      updateProfile(updates);
      // TODO[NORMAL]: persist to AuthService.updateProfile(userId, updates) once
      // userId is available in the store after verifyOTP.
      setOnboarded(true);
      onDone();
    } catch {
      setError('Could not save your profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <ScrollView
      style={styles.stepScroll}
      contentContainerStyle={styles.stepScrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.stepTitle}>Set up your profile</Text>
      <Text style={styles.stepSub}>This is what others see when they find you.</Text>

      <FieldLabel text="Display name" />
      <StyledInput
        value={name}
        onChangeText={(t) => { setName(t); setError(null); }}
        placeholder="How should we call you?"
        maxLength={30}
        autoFocus
      />

      <FieldLabel text="Age" />
      <StyledInput
        value={age}
        onChangeText={(t) => { setAge(t.replace(/\D/g, '')); setError(null); }}
        placeholder="e.g. 24"
        keyboardType="number-pad"
        maxLength={2}
      />

      <FieldLabel text="I am a..." />
      <View style={styles.genderGrid}>
        {GENDER_OPTIONS.map((opt) => {
          const active = gender === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.genderChip,
                active && { backgroundColor: opt.color + '22', borderColor: opt.color },
              ]}
              onPress={() => setGender(opt.key)}
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

      <FieldLabel text="Bio (optional)" />
      <StyledInput
        value={bio}
        onChangeText={setBio}
        placeholder="Tell people what you're about tonight..."
        maxLength={160}
        multiline
      />
      <Text style={styles.charCount}>{bio.length}/160</Text>

      <FieldLabel text="Your vibes" />
      <View style={styles.vibeGrid}>
        {VIBE_SUGGESTIONS.map((tag) => {
          const active = vibeTags.includes(tag);
          return (
            <TouchableOpacity
              key={tag}
              style={[styles.vibeChip, active && styles.vibeChipActive]}
              onPress={() => toggleVibe(tag)}
              activeOpacity={0.75}
            >
              <Text style={[styles.vibeChipLabel, active && styles.vibeChipLabelActive]}>
                {tag}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ErrorMessage text={error} />

      <View style={styles.stepAction}>
        <GlowButton
          title={isLoading ? 'Saving...' : "Let's go"}
          onPress={handleDone}
          disabled={isLoading}
          size="lg"
        />
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Main OnboardingScreen
// ---------------------------------------------------------------------------

const OnboardingScreen: React.FC = () => {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');

  function goToStep2(verifiedPhone: string) {
    setPhone(verifiedPhone);
    setStep(2);
  }

  function goToStep3() {
    setStep(3);
  }

  // Step3Profile calls setOnboarded(true) directly, which causes RootNavigator
  // to unmount this screen and show MainTabs. No navigation call needed here.
  function handleProfileDone() {}

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.appName}>All Night Long</Text>
        <ProgressDots current={step} />
      </View>

      {step === 1 && <Step1Phone onNext={goToStep2} />}
      {step === 2 && <Step2OTP phone={phone} onNext={goToStep3} />}
      {step === 3 && <Step3Profile onDone={handleProfileDone} />}
    </KeyboardAvoidingView>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  // --- Top bar ---
  topBar: {
    paddingTop: Platform.OS === 'ios' ? 60 : 36,
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 16,
  },
  appName: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // --- Progress dots ---
  dotsRow: { flexDirection: 'row', gap: 8 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  dotActive: { backgroundColor: COLORS.accent, width: 24 },
  dotDone: { backgroundColor: COLORS.accent + '60' },

  // --- Step shared layout ---
  stepRoot: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 36,
    gap: 8,
  },
  stepScroll: { flex: 1 },
  stepScrollContent: {
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 60,
    gap: 8,
  },
  stepTitle: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  stepSub: {
    color: COLORS.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  stepAction: { marginTop: 24 },

  // --- Field label ---
  fieldLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 16,
  },

  // --- Text input ---
  input: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 16,
  },
  inputMultiline: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  charCount: { color: COLORS.textMuted, fontSize: 11, textAlign: 'right', marginTop: 4 },

  // --- OTP boxes ---
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    marginBottom: 8,
    justifyContent: 'center',
  },
  otpBox: {
    width: 46,
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },

  // --- Resend ---
  resendBtn: { marginTop: 20, alignSelf: 'center' },
  resendText: { color: COLORS.accent, fontSize: 14, fontWeight: '600' },

  // --- Gender picker ---
  genderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  genderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  genderDot: { width: 8, height: 8, borderRadius: 4 },
  genderLabel: { color: COLORS.textMuted, fontSize: 14, fontWeight: '600' },

  // --- Vibe tags ---
  vibeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  vibeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  vibeChipActive: {
    backgroundColor: COLORS.accent + '18',
    borderColor: COLORS.accent + '50',
  },
  vibeChipLabel: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  vibeChipLabelActive: { color: COLORS.accent },

  // --- Error ---
  errorText: { color: COLORS.error, fontSize: 13, marginTop: 8, lineHeight: 18 },
});

export default OnboardingScreen;
