// src/App.tsx
// Root application component. Boots the continuous system, waits for it to
// be ready, then hands off to RootNavigator which owns all navigation logic.
// SafeAreaProvider must wrap all navigation to ensure system UI insets are
// respected on iOS notch and Android cutout devices.
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initializeSystem, shutdownSystem } from '@core/SystemInitializer';
import { logger } from '@utils/Logger';
import RootNavigator from '@navigation/RootNavigator';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    initializeSystem()
      .then(() => { if (mounted) setReady(true); })
      .catch((err) => {
        logger.error('App', 'System init failed', err);
        // WHY: degrade gracefully — the system is designed to self-heal,
        // so we still render even if initialization threw
        if (mounted) setReady(true);
      });

    return () => {
      mounted = false;
      shutdownSystem().catch((err) => logger.warn('App', 'Shutdown error', err));
    };
  }, []);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#7fffd4" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <RootNavigator />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: '#0a0a0f', justifyContent: 'center', alignItems: 'center' },
});
