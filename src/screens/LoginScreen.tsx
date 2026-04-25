// src/screens/LoginScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

const C = {
  bg: '#04040a', surface: '#0d0d14', border: 'rgba(168,85,247,0.2)',
  purple: '#a855f7', text: '#f0eee8', textDim: 'rgba(240,238,232,0.5)',
};

type Props = NativeStackScreenProps<any, 'Login'>;

const LoginScreen: React.FC<Props> = ({ navigation }) => (
  <SafeAreaView style={s.safe}>
    <View style={s.wrap}>
      <Text style={s.logo}>ANL</Text>
      <Text style={s.tagline}>All Night Long</Text>
      <Text style={s.sub}>Nightlife. Connections. Real-time.</Text>

      <TouchableOpacity style={s.btn} onPress={() => navigation.navigate('Onboarding')}>
        <Text style={s.btnText}>Get Started</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.ghost} onPress={() => navigation.navigate('Register')}>
        <Text style={s.ghostText}>Create Account</Text>
      </TouchableOpacity>
    </View>
  </SafeAreaView>
);

const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: C.bg },
  wrap:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  logo:      { fontSize: 56, fontWeight: '900', color: C.purple, letterSpacing: 4 },
  tagline:   { fontSize: 20, fontWeight: '700', color: C.text, marginTop: 8, letterSpacing: 1 },
  sub:       { fontSize: 14, color: C.textDim, marginTop: 6, marginBottom: 48 },
  btn:       { width: '100%', backgroundColor: C.purple, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 14 },
  btnText:   { fontSize: 16, fontWeight: '700', color: '#fff' },
  ghost:     { width: '100%', borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  ghostText: { fontSize: 16, fontWeight: '600', color: C.purple },
});

export default LoginScreen;
