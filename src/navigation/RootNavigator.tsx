// src/navigation/RootNavigator.tsx
// Auth gate: onboarding → main app
// Checks Supabase session on mount, routes accordingly
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useUserStore } from '@services/state/userStore';
import { authService } from '@services/auth';

import OnboardingScreen from '@screens/OnboardingScreen';
import MapScreen        from '@screens/MapScreen';
import ChatScreen       from '@screens/ChatScreen';
import VideoScreen      from '@screens/VideoScreen';
import HomeScreen       from '@screens/HomeScreen';
import ProfileScreen    from '@screens/ProfileScreen';

// NightPulse tab (inline)
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ScrollView } from 'react-native';
import { nightPulse, pulseColor } from '@services/pulse';
import type { NightPulseSnapshot } from '@types/index';

const PulseScreen: React.FC = () => {
  const [snap, setSnap] = React.useState<NightPulseSnapshot | null>(null);
  React.useEffect(() => {
    nightPulse.getSnapshot().then(setSnap);
    return nightPulse.subscribe(setSnap);
  }, []);
  const peak = snap?.zones.reduce((a, b) => a.intensity > b.intensity ? a : b);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#04040a' }} edges={['top']}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        <Text style={{ fontSize: 26, fontWeight: '900', color: '#f0eee8', letterSpacing: 2 }}>
          ⚡ <Text style={{ color: '#a855f7' }}>NIGHT</Text>PULSE
        </Text>
        <Text style={{ fontSize: 11, color: 'rgba(240,238,232,0.35)', marginTop: 2, letterSpacing: 1 }}>
          {snap ? `${snap.cityTotal} people out right now` : 'Loading...'}
        </Text>
      </View>
      {snap?.zones.map(z => (
        <View key={z.id} style={{ marginHorizontal: 20, marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#f0eee8' }}>{z.name}</Text>
            <Text style={{ fontSize: 12, color: z.color, fontWeight: '800' }}>
              {z.activeCount} out {z.trend === 'peaking' ? '🔥' : z.trend === 'rising' ? '📈' : '📉'}
            </Text>
          </View>
          <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 3 }}>
            <View style={{ height: 6, width: `${z.intensity * 100}%` as any, backgroundColor: z.color, borderRadius: 3 }} />
          </View>
        </View>
      ))}
      {peak && (
        <View style={{ margin: 20, backgroundColor: `${peak.color}15`, borderWidth: 1, borderColor: `${peak.color}44`, borderRadius: 16, padding: 16 }}>
          <Text style={{ fontSize: 11, color: 'rgba(240,238,232,0.4)', letterSpacing: 2, fontWeight: '700', marginBottom: 4 }}>HOTTEST SPOT RIGHT NOW</Text>
          <Text style={{ fontSize: 22, fontWeight: '900', color: peak.color }}>{peak.name} 🔥</Text>
          <Text style={{ fontSize: 13, color: 'rgba(240,238,232,0.5)', marginTop: 4 }}>
            {peak.activeCount} people active · Peaks at {peak.peakHour}:00
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

// ── Navigators ────────────────────────────────────────────────────────────────
const Tab    = createBottomTabNavigator();
const Stack  = createNativeStackNavigator();

const NAV_THEME = {
  dark: true,
  colors: {
    primary:      '#a855f7',
    background:   '#04040a',
    card:         '#0d0d14',
    text:         '#f0eee8',
    border:       'rgba(168,85,247,0.15)',
    notification: '#a855f7',
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium:  { fontFamily: 'System', fontWeight: '500' as const },
    bold:    { fontFamily: 'System', fontWeight: '700' as const },
    heavy:   { fontFamily: 'System', fontWeight: '900' as const },
  },
};

const TAB_STYLE = {
  backgroundColor:    '#0d0d14',
  borderTopColor:     'rgba(168,85,247,0.18)',
  borderTopWidth:     1,
  height:             64,
  paddingBottom:      10,
  paddingTop:         8,
};

// Main tab navigator
const MainTabs: React.FC = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown:             false,
      tabBarStyle:             TAB_STYLE,
      tabBarActiveTintColor:   '#a855f7',
      tabBarInactiveTintColor: 'rgba(255,255,255,0.25)',
      tabBarLabelStyle:        { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
    }}
  >
    <Tab.Screen name="Nearby"  component={MapScreen}    options={{ tabBarLabel: '🌐 Nearby'  }} />
    <Tab.Screen name="Chat"    component={ChatScreen}   options={{ tabBarLabel: '💬 Chat'    }} />
    <Tab.Screen name="Pulse"   component={PulseScreen}  options={{ tabBarLabel: '⚡ Pulse'   }} />
    <Tab.Screen name="Video"   component={VideoScreen}  options={{ tabBarLabel: '📹 Video'   }} />
    <Tab.Screen name="System"  component={HomeScreen}   options={{ tabBarLabel: '⚙️ System'  }} />
  </Tab.Navigator>
);

// Root stack — swaps between onboarding and main
const RootStack: React.FC = () => {
  const { isOnboarded } = useUserStore();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {isOnboarded ? (
        <>
          <Stack.Screen name="Main"    component={MainTabs}      />
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Video"   component={VideoScreen}   options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }} />
        </>
      ) : (
        <Stack.Screen name="Onboarding" component={OnboardingScreen as any} />
      )}
    </Stack.Navigator>
  );
};

// ── Root Navigator export ─────────────────────────────────────────────────────
const RootNavigator: React.FC = () => {
  const { setProfile, setOnboarded } = useUserStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    authService.getSession().then(async (session) => {
      if (session) {
        const profile = await authService.getOrCreateProfile(session.userId, session.phone);
        if (profile) {
          setProfile(profile);
          if (profile.displayName) setOnboarded(true);
        }
      }
      setChecking(false);
    });
  }, []);

  if (checking) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#a855f7" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={NAV_THEME}>
      <RootStack />
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: '#04040a', alignItems: 'center', justifyContent: 'center' },
});

export default RootNavigator;
