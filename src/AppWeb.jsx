// src/AppWeb.jsx
// Web entry point — wraps the RN/Expo app for Vite/browser builds.
// Stubs native-only modules are handled in vite.config.js aliases.

import React, { useEffect } from "react";
import { StatusBar } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import RootNavigator from "./navigation/RootNavigator";
import { useAuthStore } from "./stores/authStore";
import { useSocketStore } from "./stores/socketStore";
import { setApiToken } from "./lib/api";

// ─── Web-safe app shell (no Expo, no Sentry, no Stripe, no Push) ─
export default function AppWeb() {
  const { user, token, restoreSession } = useAuthStore();
  const { connect, disconnect } = useSocketStore();

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    if (user) {
      setApiToken(token);
      connect(token);
    } else {
      setApiToken(null);
      disconnect();
    }
    return () => disconnect();
  }, [user?.id]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#04040a" />
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
