/* eslint-disable @typescript-eslint/no-explicit-any */
// src/screens/LoginScreen.tsx
// Phone-number OTP login entry point.
// Step 1 of auth flow: user enters E.164 phone → OTP is sent via Supabase
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authService } from '@services/auth';

const { width: SW } = Dimensions.get('window');

const C = {
  bg:      '#04040a',
  surface: '#0d0d14',
  border:  'rgba(168,85,247,0.25)',
  purple:  '#a855f7',
  text:    '#f0eee8',
  textDim: 'rgba(240,238,232,0.5)',
  red:     '#f87171',
};

export default function LoginScreen({ navigation }: any) {
  const [phone,   setPhone]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleSend = async () => {
    const normalized = phone.trim();
    if (!normalized.startsWith('+') || normalized.length < 10) {
      setError('Enter your phone number in international format, e.g. +12015551234');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const result = await authService.sendOTP(normalized);
      if (result.success) {
        navigation.navigate('Register', { phone: normalized });
      } else {
        setError(result.error ?? 'Failed to send code. Try again.');
      }
    } catch (err: any) {
      setError(err.message ?? 'Unexpected error');
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
          {/* Title */}
          <View style={styles.header}>
            <Text style={styles.title}>ANL</Text>
            <Text style={styles.subtitle}>All Night Long</Text>
            <Text style={styles.tagline}>Dark. Late. Real.</Text>
          </View>

          {/* Input */}
          <View style={styles.form}>
            <Text style={styles.label}>Phone number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={(t) => { setPhone(t); setError(''); }}
              placeholder="+1 (201) 555-0123"
              placeholderTextColor={C.textDim}
              keyboardType="phone-pad"
              autoComplete="tel"
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
            {!!error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleSend}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Send code</Text>
              }
            </TouchableOpacity>
          </View>

          <Text style={styles.legal}>
            By continuing you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: C.bg },
  flex:      { flex: 1 },
  container: { flex: 1, paddingHorizontal: 28, justifyContent: 'space-between', paddingVertical: 40 },

  header:   { alignItems: 'center', marginTop: 40 },
  title:    { fontSize: 52, fontWeight: '900', color: C.purple, letterSpacing: 8 },
  subtitle: { fontSize: 16, color: C.text, fontWeight: '600', marginTop: 4, letterSpacing: 4 },
  tagline:  { fontSize: 13, color: C.textDim, marginTop: 8, letterSpacing: 2 },

  form:  { gap: 12 },
  label: { fontSize: 13, fontWeight: '700', color: C.textDim, letterSpacing: 1, textTransform: 'uppercase' },
  input: {
    height: 54, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, paddingHorizontal: 18,
    backgroundColor: C.surface, color: C.text, fontSize: 17,
  },
  error: { fontSize: 13, color: C.red, marginTop: -4 },

  btn: {
    height: 54, borderRadius: 14, backgroundColor: C.purple,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
    width: SW - 56,
  },
  btnDisabled: { opacity: 0.5 },
  btnText:     { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 1 },

  legal: { fontSize: 11, color: C.textDim, textAlign: 'center', lineHeight: 16 },
});
