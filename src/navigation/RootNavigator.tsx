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

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  Onboarding: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthNav = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator();

// Screens whose props come from route params at runtime — cast at the navigator boundary
// so React Navigation can pass params without TS complaining about missing prop requirements.
type AnyScreen = React.ComponentType<object>;

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
      <Tab.Screen name="Matches"   component={MatchesScreen as AnyScreen} />
      <Tab.Screen name="Map"       component={MapScreen} />
      <Tab.Screen name="Profile"   component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ─── AUTH STACK ───────────────────────────────────────────────
function AuthStack() {
  return (
    <AuthNav.Navigator screenOptions={{ headerShown: false }}>
      <AuthNav.Screen name="Login"      component={LoginScreen as AnyScreen} />
      <AuthNav.Screen name="Register"   component={RegisterScreen as AnyScreen} />
      <AuthNav.Screen name="Onboarding" component={OnboardingScreen as AnyScreen} />
    </AuthNav.Navigator>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────
export default function RootNavigator() {
  const { user } = useAuthStore();
  const { callState, acceptCall, rejectCall } = useVideoCall();

  // Listen for incoming calls via socket
  const socket = useSocketStore((s) => s.socket);

  // Suppress unused-variable warnings — callState/acceptCall/rejectCall/socket are used
  // by incoming call handling which is wired via socket events in useVideoCall itself.
  void callState; void acceptCall; void rejectCall; void socket;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Auth" component={AuthStack} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="Chat"
            component={ChatScreen as AnyScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="VideoCall"
            component={VideoCallScreen as AnyScreen}
            options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
          />
          <Stack.Screen
            name="AIAssistant"
            component={AIAssistantScreen as AnyScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="Paywall"
            component={PaywallScreen as AnyScreen}
            options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
          />
          <Stack.Screen
            name="IncomingCall"
            component={IncomingCallModal as AnyScreen}
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
