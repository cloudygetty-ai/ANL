// src/App.tsx
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from '@navigation/index';
import { initializeSystem, shutdownSystem } from '@core/SystemInitializer';

export default function App() {
  useEffect(() => {
    initializeSystem().catch(console.error);
    return () => { shutdownSystem().catch(console.warn); };
  }, []);

  return (
    <SafeAreaProvider>
      <RootNavigator />
    </SafeAreaProvider>
  );
}
