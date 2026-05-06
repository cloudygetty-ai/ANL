// src/App.tsx
import React, { useEffect } from 'react';
import { StatusBar, LogBox, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StripeProvider } from '@stripe/stripe-react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as Sentry from '@sentry/react-native';

import RootNavigator from './navigation/RootNavigator';
import { useAuthStore } from './stores/authStore';
import { useSocketStore } from './stores/socketStore';
import { setupPushNotifications } from './services/pushNotifications';
import { setApiToken } from './lib/api';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.EXPO_PUBLIC_ENV || 'development',
  tracesSampleRate: 0.1,
  enableNative: true,
});

LogBox.ignoreLogs(['Non-serializable values were found']);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  const { user, token, restoreSession } = useAuthStore();
  const { connect, disconnect } = useSocketStore();

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    if (user) {
      setApiToken(token);
      connect(token!);
      setupPushNotifications(user.id);
      Sentry.setUser({ id: user.id });
    } else {
      setApiToken(null);
      disconnect();
      Sentry.setUser(null);
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
