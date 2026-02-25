// src/App.tsx
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '@screens/HomeScreen';
import { initializeSystem, shutdownSystem } from '@core/SystemInitializer';

const Stack = createNativeStackNavigator();

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    initializeSystem()
      .then(() => { if (mounted) setReady(true); })
      .catch((err) => {
        console.error('[App] System init failed:', err);
        if (mounted) setReady(true); // Still render, system will degrade gracefully
      });

    return () => {
      mounted = false;
      shutdownSystem().catch(console.warn);
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
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: '#7fffd4',
          background: '#0a0a0f',
          card: '#111118',
          text: '#f0eee8',
          border: 'rgba(255,255,255,0.07)',
          notification: '#7fffd4',
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '900' },
        },
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: true }}>
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'ANL System' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: '#0a0a0f', justifyContent: 'center', alignItems: 'center' },
});
