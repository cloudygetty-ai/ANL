// src/navigation/RootNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';

import { useAuthStore } from '../stores/authStore';
import { useSocketStore } from '../stores/socketStore';
import { useVideoCall } from '../hooks/useVideoCall';

// ─── Auth ─────────────────────────────────────────────────────
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

// ─── Main ─────────────────────────────────────────────────────
import DiscoveryScreen from '../screens/DiscoveryScreen';
import MatchesScreen from '../screens/MatchesScreen';
import MapScreen from '../screens/MapScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';

// ─── Modals ───────────────────────────────────────────────────
import ChatScreen from '../screens/ChatScreen';
import VideoCallScreen from '../screens/VideoCallScreen';
import AIAssistantScreen from '../screens/AIAssistantScreen';
import PaywallScreen from '../screens/PaywallScreen';
import IncomingCallModal from '../screens/IncomingCallModal';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Chat: { matchId: string; userId: string; displayName: string };
  VideoCall: { callId: string; targetUserId: string; callType: 'video' | 'audio'; isIncoming: boolean };
  AIAssistant: { matchId?: string };
  Paywall: { featureGate?: string };
  IncomingCall: { callId: string; callerId: string; callerName: string; callType: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

// ─── BADGE ────────────────────────────────────────────────────
function TabBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

// ─── MAIN TABS ────────────────────────────────────────────────
function MainTabs() {
  const unreadMatches = useSocketStore((s) => s.unreadMatches ?? 0);
  const unreadMessages = useSocketStore((s) => s.unreadMessages ?? 0);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#a855f7',
        tabBarInactiveTintColor: '#4b5563',
        tabBarShowLabel: false,
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<string, [string, string]> = {
            Discovery: ['flame', 'flame-outline'],
            Matches:   ['heart', 'heart-outline'],
            Map:       ['map', 'map-outline'],
            Profile:   ['person', 'person-outline'],
          };
          const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
          return (
            <View>
              <Ionicons name={(focused ? active : inactive) as any} size={size} color={color} />
              {route.name === 'Matches' && <TabBadge count={unreadMatches + unreadMessages} />}
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Discovery" component={DiscoveryScreen} />
      <Tab.Screen name="Matches"   component={MatchesScreen} />
      <Tab.Screen name="Map"       component={MapScreen} />
      <Tab.Screen name="Profile"   component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ─── AUTH STACK ───────────────────────────────────────────────
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login"      component={LoginScreen} />
      <Stack.Screen name="Register"   component={RegisterScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    </Stack.Navigator>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────
export default function RootNavigator() {
  const { user } = useAuthStore();
  const { callStatus, acceptCall, rejectCall } = useVideoCall();

  // Listen for incoming calls via socket
  const socket = useSocketStore((s) => s.socket);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Auth" component={AuthStack} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="VideoCall"
            component={VideoCallScreen}
            options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
          />
          <Stack.Screen
            name="AIAssistant"
            component={AIAssistantScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="Paywall"
            component={PaywallScreen}
            options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
          />
          <Stack.Screen
            name="IncomingCall"
            component={IncomingCallModal}
            options={{ animation: 'fade', presentation: 'transparentModal', gestureEnabled: false }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#04040a',
    borderTopColor: 'rgba(255,255,255,0.06)',
    borderTopWidth: 1,
    height: 80,
    paddingBottom: 20,
  },
  badge: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: '#a855f7', borderRadius: 8,
    minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});
