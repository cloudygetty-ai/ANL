/* eslint-disable @typescript-eslint/no-explicit-any */
// src/screens/RegisterScreen.tsx
// OTP verification step. Receives phone from LoginScreen params,
// user enters the 6-digit SMS code to complete auth.
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authService } from '@services/auth';
import { useAuthStore } from '../stores/authStore';

const C = {
  bg:      '#04040a',
  surface: '#0d0d14',
  border:  'rgba(168,85,247,0.25)',
  purple:  '#a855f7',
  text:    '#f0eee8',
  textDim: 'rgba(240,238,232,0.5)',
  red:     '#f87171',
};

export default function RegisterScreen({ navigation, route }: any) {
  const phone            = route?.params?.phone ?? '';
  const [code,   setCode]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const inputRef = useRef<TextInput>(null);
  const setUser  = useAuthStore((s) => s.setUser);

  useEffect(() => {
    // Auto-focus the OTP input on mount
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const handleVerify = async () => {
    if (code.length < 4) { setError('Enter the code from your SMS'); return; }

    setError('');
    setLoading(true);
    try {
      const session = await authService.verifyOTP(phone, code);
      if (!session) { setError('Invalid or expired code. Try again.'); return; }

      const profile = await authService.getOrCreateProfile(session.userId, session.phone);

      setUser({
        id:               session.userId,
        phone:            session.phone,
        token:            session.accessToken,
        subscriptionTier: 'free',
      });

      // New user — send to onboarding; existing user → main app (handled by RootNavigator)
      if (!profile?.displayName) {
        navigation.replace('Onboarding');
      }
      // If display name exists, RootNavigator re-renders to Main automatically
    } catch (err: any) {
      setError(err.message ?? 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>{'← Back'}</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Verify</Text>
            <Text style={styles.subtitle}>We sent a code to</Text>
            <Text style={styles.phone}>{phone}</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={code}
              onChangeText={(t) => { setCode(t.replace(/\D/g, '').slice(0, 6)); setError(''); }}
              placeholder="000000"
              placeholderTextColor="rgba(168,85,247,0.25)"
              keyboardType="number-pad"
              maxLength={6}
              returnKeyType="done"
              onSubmitEditing={handleVerify}
            />
            {!!error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleVerify}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Verify</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: C.bg },
  flex:      { flex: 1 },
  container: { flex: 1, paddingHorizontal: 28, paddingTop: 20, gap: 40 },

  back:     { alignSelf: 'flex-start' },
  backText: { fontSize: 16, color: C.textDim },

  header:   { alignItems: 'center', gap: 8 },
  title:    { fontSize: 36, fontWeight: '900', color: C.text },
  subtitle: { fontSize: 15, color: C.textDim },
  phone:    { fontSize: 18, fontWeight: '700', color: C.purple },

  form:  { gap: 12 },
  input: {
    height: 72, borderWidth: 1.5, borderColor: C.border,
    borderRadius: 20, textAlign: 'center',
    backgroundColor: C.surface, color: C.purple,
    fontSize: 38, fontWeight: '900', letterSpacing: 16,
  },
  error: { fontSize: 13, color: C.red },

  btn: {
    height: 54, borderRadius: 14, backgroundColor: C.purple,
    alignItems: 'center', justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnText:     { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 1 },
});
