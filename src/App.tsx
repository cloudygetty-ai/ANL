// src/App.tsx
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { initializeSystem, shutdownSystem } from '@core/SystemInitializer';
import MapScreen   from '@screens/MapScreen';
import ChatScreen  from '@screens/ChatScreen';
import VideoScreen from '@screens/VideoScreen';
import HomeScreen  from '@screens/HomeScreen';

// NightPulseScreen is a lightweight tab entry point
import { View as RNView, Text as RNText, StyleSheet as SS } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { nightPulse, pulseColor } from '@services/pulse';
import type { NightPulseSnapshot } from '@types/index';
import { Animated, Easing } from 'react-native';
import { useRef } from 'react';

const PulseTab: React.FC = () => {
  const [snap, setSnap] = React.useState<NightPulseSnapshot | null>(null);
  React.useEffect(() => {
    nightPulse.getSnapshot().then(setSnap);
    const unsub = nightPulse.subscribe(setSnap);
    return unsub;
  }, []);

  const peak = snap?.zones.reduce((a, b) => a.intensity > b.intensity ? a : b);

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:'#04040a' }} edges={['top']}>
      <RNView style={{ paddingHorizontal:20, paddingTop:8, paddingBottom:16 }}>
        <RNText style={{ fontSize:26, fontWeight:'900', color:'#f0eee8', letterSpacing:2 }}>
          ⚡ <RNText style={{ color:'#a855f7' }}>NIGHT</RNText>PULSE
        </RNText>
        <RNText style={{ fontSize:11, color:'rgba(240,238,232,0.35)', marginTop:2, letterSpacing:1 }}>
          {snap ? `${snap.cityTotal} people out right now` : 'Loading...'}
        </RNText>
      </RNView>
      {snap?.zones.map(z => {
        const w = `${Math.round(z.intensity * 100)}%`;
        return (
          <RNView key={z.id} style={{ marginHorizontal:20, marginBottom:14 }}>
            <RNView style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:6 }}>
              <RNText style={{ fontSize:14, fontWeight:'700', color:'#f0eee8' }}>{z.name}</RNText>
              <RNText style={{ fontSize:12, color: z.color, fontWeight:'800' }}>
                {z.activeCount} out {z.trend === 'peaking' ? '🔥' : z.trend === 'rising' ? '📈' : '📉'}
              </RNText>
            </RNView>
            <RNView style={{ height:6, backgroundColor:'rgba(255,255,255,0.07)', borderRadius:3 }}>
              <RNView style={{ height:6, width: w as any, backgroundColor: z.color, borderRadius:3 }} />
            </RNView>
          </RNView>
        );
      })}
      {peak && (
        <RNView style={{ margin:20, backgroundColor:`${peak.color}15`, borderWidth:1, borderColor:`${peak.color}44`, borderRadius:16, padding:16 }}>
          <RNText style={{ fontSize:11, color:'rgba(240,238,232,0.4)', letterSpacing:2, fontWeight:'700', marginBottom:4 }}>HOTTEST SPOT RIGHT NOW</RNText>
          <RNText style={{ fontSize:22, fontWeight:'900', color: peak.color }}>{peak.name} 🔥</RNText>
          <RNText style={{ fontSize:13, color:'rgba(240,238,232,0.5)', marginTop:4 }}>{peak.activeCount} people active · Peaks at {peak.peakHour}:00</RNText>
        </RNView>
      )}
    </SafeAreaView>
  );
};

const Tab = createBottomTabNavigator();

const NAV_THEME = {
  dark: true,
  colors: {
    primary:      '#a855f7',
    background:   '#04040a',
    card:         '#0d0d14',
    text:         '#f0eee8',
    border:       'rgba(168,85,247,0.15)',
    notification: '#a855f7',
  },
  fonts: {
    regular: { fontFamily:'System', fontWeight:'400' as const },
    medium:  { fontFamily:'System', fontWeight:'500' as const },
    bold:    { fontFamily:'System', fontWeight:'700' as const },
    heavy:   { fontFamily:'System', fontWeight:'900' as const },
  },
};

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    initializeSystem()
      .then(() => { if (mounted) setReady(true); })
      .catch(err => {
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
        <Text style={styles.loadingText}>ALLNIGHTLONG</Text>
      </View>
    );
  }

  return (
    <NavigationContainer theme={NAV_THEME}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor:    '#0d0d14',
            borderTopColor:     'rgba(168,85,247,0.18)',
            borderTopWidth:     1,
            height:             64,
            paddingBottom:      10,
            paddingTop:         8,
          },
          tabBarActiveTintColor:   '#a855f7',
          tabBarInactiveTintColor: 'rgba(255,255,255,0.25)',
          tabBarLabelStyle: { fontSize:10, fontWeight:'700', letterSpacing:0.5 },
        }}
      >
        <Tab.Screen name="Nearby"  component={MapScreen}   options={{ tabBarLabel:'🌐 Nearby'  }} />
        <Tab.Screen name="Chat"    component={ChatScreen}  options={{ tabBarLabel:'💬 Chat'    }} />
        <Tab.Screen name="Pulse"   component={PulseTab}    options={{ tabBarLabel:'⚡ Pulse'   }} />
        <Tab.Screen name="Video"   component={VideoScreen} options={{ tabBarLabel:'📹 Video'   }} />
        <Tab.Screen name="System"  component={HomeScreen}  options={{ tabBarLabel:'⚙️ System'  }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading:     { flex:1, backgroundColor:'#04040a', justifyContent:'center', alignItems:'center', gap:16 },
  loadingText: { fontSize:14, fontWeight:'900', color:'rgba(240,238,232,0.2)', letterSpacing:4 },
});
