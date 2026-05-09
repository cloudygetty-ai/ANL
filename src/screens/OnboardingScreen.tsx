// src/screens/OnboardingScreen.tsx
// Phone OTP → Profile setup — 4-step flow
// Steps: Phone → Verify → Profile basics → Vibe/tags
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Animated, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authService } from '@services/auth';
import { useUserStore } from '@services/state/userStore';
import GlowButton from '@components/ui/GlowButton';

const C = {
  bg:      '#04040a',
  surface: '#0d0d14',
  border:  'rgba(168,85,247,0.2)',
  purple:  '#a855f7',
  amber:   '#fbbf24',
  green:   '#4ade80',
  red:     '#f87171',
  text:    '#f0eee8',
  textDim: 'rgba(240,238,232,0.5)',
  textMuted: 'rgba(240,238,232,0.2)',
};

type Step = 'phone' | 'verify' | 'profile' | 'vibe';
type Gender = 'f' | 'm' | 'tw' | 'tm' | 'nb';

const VIBE_TAGS = [
  'Tonight only', 'Down for anything', 'No strings', 'Host',
  'Spontaneous', 'Late night magic', 'Come find me', 'Free tonight',
  "Let's link", 'Adventurous', 'Just got out', 'Top 🔝',
  'Bottom 👇', 'Versatile 🔄', 'Oral 👅', 'Curious 👀',
  'Kink friendly ⛓️', 'Into groups', 'Discreet', 'DDF',
];

const AVATAR_EMOJIS = ['🍆','🍑','💦','👅','🫦','😏','🔥','👍','⛓️','🌶️','💋','🥵','😈','⚡','🎭','🍒','👁️','🌈','🐻','🐷'];

const POSITION_IDS = ['doggy','oral','standing','ride','69','bent','missionary','group','kneel','spoon'];
const POSITION_LABELS: Record<string, string> = {
  doggy:'Doggy', oral:'Oral', standing:'Standing', ride:'Ride',
  '69':'69', bent:'Bent over', missionary:'Missionary', group:'Group',
  kneel:'Kneel', spoon:'Spoon',
};

const GENDER_OPTIONS: { key: Gender; label: string; emoji: string }[] = [
  { key: 'f',  label: 'Woman',       emoji: '🍑' },
  { key: 'm',  label: 'Man',         emoji: '🍆' },
  { key: 'tw', label: 'Trans Woman', emoji: '🦋' },
  { key: 'tm', label: 'Trans Man',   emoji: '⚡' },
  { key: 'nb', label: 'Non-binary',  emoji: '✨' },
];

const OnboardingScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [step,        setStep]        = useState<Step>('phone');
  const [phone,       setPhone]       = useState('');
  const [otp,         setOtp]         = useState('');
  const [name,        setName]        = useState('');
  const [age,         setAge]         = useState('');
  const [gender,      setGender]      = useState<Gender>('f');
  const [selectedTags,setSelectedTags]= useState<string[]>([]);
  const [avatarEmoji, setAvatarEmoji] = useState('🔥');
  const [selectedPos, setSelectedPos] = useState<string[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  const togglePos = (id: string) =>
    setSelectedPos(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);

  const setProfile  = useUserStore(s => s.setProfile);
  const setOnboarded = useUserStore(s => s.setOnboarded);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateIn = () => {
    slideAnim.setValue(40);
    Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }).start();
  };

  const goTo = (s: Step) => { setStep(s); animateIn(); setError(''); };

  const handleSendOTP = async () => {
    if (phone.length < 10) { setError('Enter a valid phone number'); return; }
    setLoading(true);
    const formatted = phone.startsWith('+') ? phone : `+1${phone.replace(/\D/g, '')}`;
    const result = await authService.sendOTP(formatted);
    setLoading(false);
    if (!result.success) { setError(result.error ?? 'Failed to send code'); return; }
    goTo('verify');
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) { setError('Enter the 6-digit code'); return; }
    setLoading(true);
    const formatted = phone.startsWith('+') ? phone : `+1${phone.replace(/\D/g, '')}`;
    const session = await authService.verifyOTP(formatted, otp);
    setLoading(false);
    if (!session) { setError('Invalid code — try again'); return; }
    goTo('profile');
  };

  const handleSaveProfile = async () => {
    if (!name.trim())           { setError('Enter your name'); return; }
    if (!age || parseInt(age) < 18) { setError('You must be 18+'); return; }
    goTo('vibe');
  };

  const handleComplete = async () => {
    setLoading(true);
    const session = await authService.getSession();
    if (!session) { setError('Session expired — restart'); setLoading(false); return; }

    const profile = await authService.getOrCreateProfile(session.userId, session.phone);
    if (!profile) { setError('Could not save profile'); setLoading(false); return; }

    await authService.updateProfile(session.userId, {
      displayName:  name.trim(),
      age:          parseInt(age),
      gender,
      vibeTagIds:   selectedTags,
      avatarEmoji,
      positions:    selectedPos,
      presence:     'online',
      lastActiveAt: Date.now(),
    });

    setProfile({ ...profile, displayName: name.trim(), age: parseInt(age), gender, vibeTagIds: selectedTags });
    setOnboarded(true);
    setLoading(false);
    onComplete();
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag].slice(0, 5)
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Brand */}
          <View style={styles.brand}>
            <Text style={styles.brandText}>ALL<Text style={{ color: C.amber }}>NIGHT</Text>LONG</Text>
            <Text style={styles.brandSub}>🌙 LATE NIGHT · REAL PROXIMITY</Text>
          </View>

          <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>

            {/* ── STEP: Phone ── */}
            {step === 'phone' && (
              <View style={styles.stepWrap}>
                <Text style={styles.stepTitle}>What's your number?</Text>
                <Text style={styles.stepSub}>We'll text you a code. No spam, ever.</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+1 (201) 555-0100"
                  placeholderTextColor={C.textMuted}
                  keyboardType="phone-pad"
                  autoFocus
                  maxLength={15}
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <GlowButton label={loading ? 'Sending...' : 'Send Code'} onPress={handleSendOTP} disabled={loading} size="lg" />
              </View>
            )}

            {/* ── STEP: Verify ── */}
            {step === 'verify' && (
              <View style={styles.stepWrap}>
                <Text style={styles.stepTitle}>Enter the code</Text>
                <Text style={styles.stepSub}>Sent to {phone}</Text>
                <TextInput
                  style={[styles.input, styles.inputOTP]}
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="000000"
                  placeholderTextColor={C.textMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <GlowButton label={loading ? 'Verifying...' : 'Verify'} onPress={handleVerifyOTP} disabled={loading} size="lg" />
                <TouchableOpacity onPress={() => goTo('phone')} style={styles.backLink}>
                  <Text style={styles.backLinkText}>← Change number</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── STEP: Profile ── */}
            {step === 'profile' && (
              <View style={styles.stepWrap}>
                <Text style={styles.stepTitle}>Set up your profile</Text>
                <Text style={styles.stepSub}>Keep it real — people see this.</Text>

                <Text style={styles.inputLabel}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor={C.textMuted}
                  autoFocus
                  maxLength={30}
                />

                <Text style={styles.inputLabel}>Age (must be 18+)</Text>
                <TextInput
                  style={styles.input}
                  value={age}
                  onChangeText={setAge}
                  placeholder="25"
                  placeholderTextColor={C.textMuted}
                  keyboardType="number-pad"
                  maxLength={2}
                />

                <Text style={styles.inputLabel}>I am a...</Text>
                <View style={styles.genderGrid}>
                  {GENDER_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.genderPill, gender === opt.key && styles.genderPillActive]}
                      onPress={() => setGender(opt.key)}
                    >
                      <Text style={styles.genderEmoji}>{opt.emoji}</Text>
                      <Text style={[styles.genderLabel, gender === opt.key && { color: C.text }]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {error ? <Text style={styles.error}>{error}</Text> : null}
                <GlowButton label="Continue →" onPress={handleSaveProfile} size="lg" />
              </View>
            )}

            {/* ── STEP: Vibe ── */}
            {step === 'vibe' && (
              <View style={styles.stepWrap}>
                <Text style={styles.stepTitle}>What's your vibe tonight?</Text>
                <Text style={styles.stepSub}>Pick tags, your icon, and positions.</Text>

                {/* Vibe tags */}
                <View style={styles.tagsGrid}>
                  {VIBE_TAGS.map(tag => {
                    const active = selectedTags.includes(tag);
                    return (
                      <TouchableOpacity
                        key={tag}
                        style={[styles.tagPill, active && styles.tagPillActive]}
                        onPress={() => toggleTag(tag)}
                      >
                        <Text style={[styles.tagText, active && { color: C.text }]}>{tag}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Avatar emoji picker */}
                <Text style={styles.sectionLabel}>YOUR ICON</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                  <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4, paddingVertical: 4 }}>
                    {AVATAR_EMOJIS.map(e => (
                      <TouchableOpacity
                        key={e}
                        onPress={() => setAvatarEmoji(e)}
                        style={[styles.emojiBtn, avatarEmoji === e && styles.emojiBtnActive]}
                      >
                        <Text style={{ fontSize: 22 }}>{e}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                {/* Position icons */}
                <Text style={styles.sectionLabel}>POSITIONS</Text>
                <View style={styles.posGrid}>
                  {POSITION_IDS.map(id => {
                    const active = selectedPos.includes(id);
                    return (
                      <TouchableOpacity
                        key={id}
                        onPress={() => togglePos(id)}
                        style={[styles.posBtn, active && styles.posBtnActive]}
                      >
                        <Text style={{ fontSize: 18 }}>
                          {id === 'doggy' ? '🔛' : id === 'oral' ? '👅' : id === 'standing' ? '🧍' :
                           id === 'ride' ? '🏇' : id === '69' ? '6️⃣9️⃣' : id === 'bent' ? '🫳' :
                           id === 'missionary' ? '🛌' : id === 'group' ? '👥' :
                           id === 'kneel' ? '🙇' : '🥄'}
                        </Text>
                        <Text style={[styles.posLabel, active && { color: C.amber }]}>
                          {POSITION_LABELS[id]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {error ? <Text style={styles.error}>{error}</Text> : null}
                <GlowButton
                  label={loading ? 'Setting up...' : 'Drop In 🌙'}
                  onPress={handleComplete}
                  disabled={loading}
                  size="lg"
                  color={C.amber}
                />
              </View>
            )}

          </Animated.View>

          {/* Step dots */}
          <View style={styles.stepDots}>
            {(['phone', 'verify', 'profile', 'vibe'] as Step[]).map((s) => (
              <View key={s} style={[styles.dot, step === s && styles.dotActive]} />
            ))}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },

  brand:    { alignItems: 'center', paddingVertical: 40 },
  brandText:{ fontSize: 32, fontWeight: '900', color: C.text, letterSpacing: 3 },
  brandSub: { fontSize: 10, color: C.textMuted, letterSpacing: 2, marginTop: 6 },

  stepWrap:  { gap: 16 },
  stepTitle: { fontSize: 26, fontWeight: '900', color: C.text, letterSpacing: 0.5 },
  stepSub:   { fontSize: 14, color: C.textDim, marginTop: -8, lineHeight: 20 },

  inputLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, letterSpacing: 1.5, marginBottom: -8 },
  input:      { backgroundColor: C.surface, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16, color: C.text, fontSize: 16, borderWidth: 1, borderColor: C.border },
  inputOTP:   { fontSize: 28, fontWeight: '900', letterSpacing: 12, textAlign: 'center' },

  error:    { fontSize: 12, color: C.red, fontWeight: '600' },

  genderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  genderPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)' },
  genderPillActive: { borderColor: C.purple, backgroundColor: 'rgba(168,85,247,0.15)' },
  genderEmoji: { fontSize: 16 },
  genderLabel: { fontSize: 13, fontWeight: '600', color: C.textDim },

  tagsGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tagPill:      { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)' },
  tagPillActive:{ borderColor: C.amber, backgroundColor: 'rgba(251,191,36,0.12)' },
  tagText:      { fontSize: 13, fontWeight: '600', color: C.textDim },

  sectionLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5, marginBottom: -4 },

  emojiBtn:      { width: 44, height: 44, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center' },
  emojiBtnActive:{ borderColor: C.amber, backgroundColor: 'rgba(251,191,36,0.15)' },

  posGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  posBtn:       { width: '18%', aspectRatio: 1, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', gap: 4 },
  posBtnActive: { borderColor: C.amber, backgroundColor: 'rgba(251,191,36,0.12)' },
  posLabel:     { fontSize: 8, fontWeight: '600', color: 'rgba(255,255,255,0.3)', textAlign: 'center' },

  backLink:     { alignItems: 'center', paddingTop: 4 },
  backLinkText: { fontSize: 13, color: C.textMuted },

  stepDots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingTop: 32 },
  dot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)' },
  dotActive:{ backgroundColor: C.purple, width: 20 },
});

export default OnboardingScreen;
