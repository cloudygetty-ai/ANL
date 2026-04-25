// src/screens/RegisterScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

const C = {
  bg: '#04040a', border: 'rgba(168,85,247,0.2)',
  purple: '#a855f7', text: '#f0eee8', textDim: 'rgba(240,238,232,0.5)',
};

type Props = NativeStackScreenProps<any, 'Register'>;

const RegisterScreen: React.FC<Props> = ({ navigation }) => (
  <SafeAreaView style={s.safe}>
    <View style={s.wrap}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
        <Text style={s.backText}>‹ Back</Text>
      </TouchableOpacity>
      <Text style={s.title}>Create Account</Text>
      <Text style={s.sub}>We use phone verification for your privacy.</Text>

      <TouchableOpacity style={s.btn} onPress={() => navigation.navigate('Onboarding')}>
        <Text style={s.btnText}>Continue with Phone</Text>
      </TouchableOpacity>
    </View>
  </SafeAreaView>
);

const s = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: C.bg },
  wrap:     { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
  back:     { marginBottom: 32 },
  backText: { fontSize: 18, color: C.purple },
  title:    { fontSize: 28, fontWeight: '800', color: C.text, marginBottom: 8 },
  sub:      { fontSize: 14, color: C.textDim, marginBottom: 40 },
  btn:      { backgroundColor: C.purple, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnText:  { fontSize: 16, fontWeight: '700', color: '#fff' },
});

export default RegisterScreen;
