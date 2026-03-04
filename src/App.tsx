// src/App.tsx
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { initializeSystem, shutdownSystem } from '@core/SystemInitializer';
import HomeScreen from '@screens/HomeScreen';
import MapScreen from '@screens/MapScreen';

const Tab = createBottomTabNavigator();

const NAV_THEME = {
  dark: true,
  colors: {
    primary:      '#a855f7',
    background:   '#060609',
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

const TabIcon = ({ emoji, focused }: { emoji: string; focused: boolean }) => (
  <View style={{ opacity: focused ? 1 : 0.4 }}>
    <View style={{ fontSize: 20 } as any}>
      {/* plain emoji label handled by tabBarLabel */}
    </View>
  </View>
);

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    initializeSystem()
      .then(() => { if (mounted) setReady(true); })
      .catch((err) => {
        console.error('[App] System init failed:', err);
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
      shutdownSystem().catch(console.warn);
    };
  }, []);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#a855f7" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={NAV_THEME}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#0d0d14',
            borderTopColor:  'rgba(168,85,247,0.2)',
            borderTopWidth:  1,
            height:          64,
            paddingBottom:   10,
            paddingTop:      8,
          },
          tabBarActiveTintColor:   '#a855f7',
          tabBarInactiveTintColor: 'rgba(255,255,255,0.3)',
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
        }}
      >
        <Tab.Screen
          name="Map"
          component={MapScreen}
          options={{ tabBarIcon: ({ focused }) => <View style={{ opacity: focused ? 1 : 0.4 }}><View /></View>, tabBarLabel: '🌐 Nearby' }}
        />
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ tabBarLabel: '⚙️ System' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: '#060609', justifyContent: 'center', alignItems: 'center' },
});
