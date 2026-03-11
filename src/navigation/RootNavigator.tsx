// src/navigation/RootNavigator.tsx
// Root navigation tree for the ANL app.
//
// Structure:
//   NavigationContainer
//   └─ RootStack (native-stack, no headers)
//      ├─ Main  → BottomTabNavigator (4 tabs)
//      ├─ Video → VideoScreen        (modal, presented over tabs)
//      └─ Onboarding → OnboardingScreen (fullScreenModal, shown pre-auth)
//
// Auth gating: if the user is not logged in or has not completed onboarding,
// the stack shows only the Onboarding screen.  Once authenticated it shows
// Main (tabs) with Video accessible as a modal from any tab.

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '@hooks/useAuth';
import { useUserStore } from '@services/state/userStore';
import { useChatStore } from '@services/state/chatStore';
import { NightPulseService } from '@services/pulse';
import type { NightPulseSnapshot } from '@types/index';
import { COLORS } from '@config/constants';

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------

import MapScreen from '@screens/MapScreen';
import ChatScreen from '@screens/ChatScreen';
import ProfileScreen from '@screens/ProfileScreen';
import VideoScreen from '@screens/VideoScreen';
import OnboardingScreen from '@screens/OnboardingScreen';

// ---------------------------------------------------------------------------
// Tab bar icon helper
// We use plain Text emoji to avoid adding an icon-library dependency.
// Each glyph receives the active/inactive tint color from the tab navigator.
// ---------------------------------------------------------------------------

function TabIcon({ glyph, color }: { glyph: string; color: string }) {
  return <Text style={{ fontSize: 20, color }}>{glyph}</Text>;
}

// ---------------------------------------------------------------------------
// Tab bar appearance constants (dark theme as specified)
// ---------------------------------------------------------------------------

const TAB_BG = '#111118';       // tab bar background
const TAB_ACTIVE = '#7fffd4';   // aqua — active tab tint
const TAB_INACTIVE = '#555555'; // muted grey — inactive tab tint

// ---------------------------------------------------------------------------
// PulseScreen — inline because it is small and tightly coupled to the tab
// navigator context. Polling NightPulseService directly keeps the tab
// self-contained without needing its own top-level file.
// ---------------------------------------------------------------------------

/** Maps intensity (0-1) to a display color: low = blue, mid = amber, high = aqua. */
function pulseColor(intensity: number): string {
  if (intensity >= 0.75) return COLORS.accent;  // high
  if (intensity >= 0.4) return COLORS.warning;   // mid
  return COLORS.info;                            // low
}

function IntensityBar({ intensity }: { intensity: number }) {
  const color = pulseColor(intensity);
  return (
    <View style={pulse.barTrack}>
      <View
        style={[
          pulse.barFill,
          {
            // WHY: cast required by RN StyleSheet for percentage widths
            width: `${Math.round(intensity * 100)}%` as `${number}%`,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

function PulseScreen() {
  const [snapshot, setSnapshot] = useState<NightPulseSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  // Keep service in a ref to avoid re-creating it on every render
  const serviceRef = useRef(new NightPulseService());

  useEffect(() => {
    let mounted = true;

    async function fetchSnapshot() {
      try {
        const snap = await serviceRef.current.getSnapshot();
        if (mounted) {
          setSnapshot(snap);
          setLoading(false);
        }
      } catch {
        if (mounted) setLoading(false);
      }
    }

    fetchSnapshot();
    // Re-poll every 30 s to keep zone intensity numbers fresh
    const interval = setInterval(fetchSnapshot, 30_000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <View style={pulse.centered}>
        <ActivityIndicator color={COLORS.accent} />
      </View>
    );
  }

  const zones = snapshot?.zones ?? [];

  return (
    <View style={pulse.root}>
      <View style={pulse.header}>
        <Text style={pulse.title}>Night Pulse</Text>
        {snapshot && (
          <Text style={pulse.sub}>
            {snapshot.totalActive.toLocaleString()} active · {zones.length} zones
          </Text>
        )}
      </View>

      <FlatList
        data={zones}
        keyExtractor={(z) => z.id}
        contentContainerStyle={pulse.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: zone }) => {
          const color = pulseColor(zone.intensity);
          const pct = Math.round(zone.intensity * 100);
          return (
            <View style={pulse.zoneCard}>
              {/* Left accent bar reflects intensity color */}
              <View style={[pulse.zoneAccent, { backgroundColor: color }]} />
              <View style={pulse.zoneBody}>
                <View style={pulse.zoneTop}>
                  <Text style={pulse.zoneName}>{zone.name}</Text>
                  <Text style={[pulse.zoneIntPct, { color }]}>{pct}%</Text>
                </View>
                <IntensityBar intensity={zone.intensity} />
                <View style={pulse.zoneMeta}>
                  <Text style={pulse.zoneCat}>{zone.category}</Text>
                  <Text style={pulse.zoneUsers}>{zone.activeUsers} people out</Text>
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const pulse = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text, letterSpacing: 0.3 },
  sub: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
  zoneCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  zoneAccent: { width: 4 },
  zoneBody: { flex: 1, padding: 14, gap: 8 },
  zoneTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  zoneName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  zoneIntPct: { fontSize: 15, fontWeight: '800' },
  barTrack: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
  zoneMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  zoneCat: { fontSize: 12, color: COLORS.textMuted },
  zoneUsers: { fontSize: 12, color: COLORS.textMuted },
});

// ---------------------------------------------------------------------------
// Bottom tab navigator — 4 tabs: Map, Chat, Pulse, Profile
// ---------------------------------------------------------------------------

const Tab = createBottomTabNavigator();

function MainTabs() {
  // WHY: calling getUnreadTotal() as a selector gives us the live count without
  // subscribing the whole store — only re-renders when the badge value changes.
  const unreadCount = useChatStore((s) => s.getUnreadTotal());

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: TAB_BG,
          borderTopColor: 'rgba(255,255,255,0.06)',
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: TAB_ACTIVE,
        tabBarInactiveTintColor: TAB_INACTIVE,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.3,
        },
      }}
    >
      {/* Map — nearby people on the radar */}
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarLabel: 'Map',
          tabBarIcon: ({ color }) => <TabIcon glyph="📍" color={color} />,
        }}
      />

      {/* Chat — conversations with unread badge */}
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          tabBarLabel: 'Chat',
          tabBarIcon: ({ color }) => <TabIcon glyph="🗨️" color={color} />,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          // WHY: badge text is dark so it reads against the aqua background
          tabBarBadgeStyle: { backgroundColor: TAB_ACTIVE, color: COLORS.bg },
        }}
      />

      {/* Pulse — NightPulse zone intensity feed */}
      <Tab.Screen
        name="Pulse"
        component={PulseScreen}
        options={{
          tabBarLabel: 'Pulse',
          tabBarIcon: ({ color }) => <TabIcon glyph="💜" color={color} />,
        }}
      />

      {/* Profile — the current user's own profile and settings */}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <TabIcon glyph="👤" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Root stack navigator — wraps tabs and adds modal screens on top
// ---------------------------------------------------------------------------

const Stack = createNativeStackNavigator();

// Navigation theme — dark to match the app palette
const NAV_THEME = {
  dark: true,
  colors: {
    primary: COLORS.accent,
    background: COLORS.bg,
    card: COLORS.card,
    text: COLORS.text,
    border: COLORS.border,
    notification: COLORS.accent,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium: { fontFamily: 'System', fontWeight: '500' as const },
    bold: { fontFamily: 'System', fontWeight: '700' as const },
    heavy: { fontFamily: 'System', fontWeight: '900' as const },
  },
};

export default function RootNavigator() {
  const { isLoading, isLoggedIn } = useAuth();
  const isOnboarded = useUserStore((s) => s.isOnboarded);

  // Show a spinner while auth state is being restored from storage
  if (isLoading) {
    return (
      <View style={root.loading}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  // A user must be both logged in AND have completed onboarding to see tabs
  const showOnboarding = !isLoggedIn || !isOnboarded;

  return (
    <NavigationContainer theme={NAV_THEME}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {showOnboarding ? (
          // Pre-auth / onboarding flow — fullScreenModal keeps the system
          // chrome (status bar etc.) hidden so the welcome UI is uninterrupted.
          <Stack.Screen
            name="Onboarding"
            component={OnboardingScreen}
            options={{ presentation: 'fullScreenModal', animation: 'fade' }}
          />
        ) : (
          <>
            {/* Main tab shell — the default post-auth destination */}
            <Stack.Screen
              name="Main"
              component={MainTabs}
              options={{ animation: 'fade' }}
            />

            {/* Video call — presented as a modal over any tab so the user can
                swipe-dismiss to return to the map/chat they were in */}
            <Stack.Screen
              name="Video"
              component={VideoScreen}
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const root = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
