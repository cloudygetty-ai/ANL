// src/screens/SettingsScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../stores/authStore';

const C = {
  bg: '#04040a', surface: '#0d0d14', border: 'rgba(168,85,247,0.18)',
  purple: '#a855f7', red: '#f87171', text: '#f0eee8', textDim: 'rgba(240,238,232,0.5)',
};

const Row: React.FC<{ label: string; value?: string; danger?: boolean; onPress?: () => void; toggle?: boolean; toggled?: boolean; onToggle?: (v: boolean) => void }> =
  ({ label, value, danger, onPress, toggle, toggled, onToggle }) => (
    <TouchableOpacity style={s.row} onPress={onPress} disabled={!onPress && !toggle}>
      <Text style={[s.rowLabel, danger && { color: C.red }]}>{label}</Text>
      {toggle && onToggle
        ? <Switch value={toggled} onValueChange={onToggle} thumbColor={C.purple} trackColor={{ false: '#333', true: `${C.purple}55` }}/>
        : <Text style={s.rowValue}>{value ?? '›'}</Text>
      }
    </TouchableOpacity>
  );

const SettingsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { signOut } = useAuthStore();
  const [notifications, setNotifications] = React.useState(true);
  const [ghostMode,      setGhostMode]     = React.useState(false);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.title}>Settings</Text>

        <Text style={s.section}>ACCOUNT</Text>
        <View style={s.group}>
          <Row label="Phone Number" value="•••• ••• ••••"/>
          <Row label="Subscription" value="Free"/>
          <Row label="Privacy Policy" value="›" onPress={() => {}}/>
          <Row label="Terms of Service" value="›" onPress={() => {}}/>
        </View>

        <Text style={s.section}>PREFERENCES</Text>
        <View style={s.group}>
          <Row label="Notifications" toggle toggled={notifications} onToggle={setNotifications}/>
          <Row label="Ghost Mode"    toggle toggled={ghostMode}      onToggle={setGhostMode}/>
        </View>

        <Text style={s.section}>ACCOUNT ACTIONS</Text>
        <View style={s.group}>
          <Row label="Sign Out" danger onPress={signOut}/>
          <Row label="Delete Account" danger onPress={() => {}}/>
        </View>

        <Text style={s.version}>ANL v1.0.0 · All Night Long</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: C.bg },
  scroll:   { paddingHorizontal: 20, paddingBottom: 40 },
  title:    { fontSize: 28, fontWeight: '900', color: C.text, marginTop: 16, marginBottom: 24 },
  section:  { fontSize: 10, color: C.textDim, letterSpacing: 2, fontWeight: '700', marginBottom: 8, marginTop: 24 },
  group:    { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  row:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  rowLabel: { fontSize: 15, color: C.text },
  rowValue: { fontSize: 15, color: C.textDim },
  version:  { fontSize: 11, color: C.textDim, textAlign: 'center', marginTop: 32 },
});

export default SettingsScreen;
