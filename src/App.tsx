// src/App.tsx
import React, { useEffect } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StripeProvider } from '@stripe/stripe-react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';

import RootNavigator from './navigation/RootNavigator';
import { useAuthStore } from './stores/authStore';
import { useSocketStore } from './stores/socketStore';
import { setupPushNotifications } from './services/pushNotifications';

LogBox.ignoreLogs(['Non-serializable values were found']);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  const { user, restoreSession } = useAuthStore();
  const { connect, disconnect } = useSocketStore();

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    if (user) {
      connect(user.token);
      setupPushNotifications(user.id);
    } else {
      disconnect();
    }
    return () => disconnect();
  }, [user?.id]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StripeProvider
          publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}
          merchantIdentifier="merchant.app.allnightlong"
          urlScheme="anl"
        >
          <StatusBar barStyle="light-content" backgroundColor="#04040a" />
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </StripeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
