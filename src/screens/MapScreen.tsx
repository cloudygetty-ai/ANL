/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-var-requires */
// src/screens/MapScreen.tsx
// Stack: @rnmapbox/maps + custom SVG pin markers + NightPulse heat overlay
// 3D buildings via fill-extrusion, night skin, 45° pitch camera
import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Easing, Dimensions, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { MapUser, MapEvent, CameraState, PulseZone } from '@types/index';

// ── Mapbox lazy import (native module) ────────────────────────────────────────
// Wrapped so TypeScript compiles even before native linking
let MapboxGL: any = null;
try { MapboxGL = require('@rnmapbox/maps').default; } catch { /* not linked yet */ }

const { width: _SW, height: _SH } = Dimensions.get('window');

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:        '#04040a',
  surface:   '#0d0d14',
  surfaceUp: '#14141f',
  border:    'rgba(168,85,247,0.2)',
  purple:    '#a855f7',
  pink:      '#ec4899',
  amber:     '#fbbf24',
  cyan:      '#22d3ee',
  green:     '#4ade80',
  red:       '#f87171',
  text:      '#f0eee8',
  textDim:   'rgba(240,238,232,0.5)',
  textMuted: 'rgba(240,238,232,0.22)',
  femalePin: '#ff3c64',
  malePin:   '#7c3aed',
  twPin:     '#f7a8c4',
  tmPin:     '#55cdfc',
};

// ── Mapbox night style with 3D buildings ──────────────────────────────────────
const MAPBOX_STYLE  = 'mapbox://styles/mapbox/dark-v11';
const MAPBOX_TOKEN  = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';

// ── Mock data (replace with Supabase realtime query) ─────────────────────────
const MOCK_USERS: MapUser[] = [
  { id:'1', name:'Mia',  age:24, gender:'f',  coords:{lat:40.7128,lng:-74.006},  online:true,  vibe:'Tonight only 🔥',   match:94, isNew:false, isTop:false },
  { id:'2', name:'Jade', age:27, gender:'f',  coords:{lat:40.714, lng:-74.002},  online:true,  vibe:'Down for anything', match:88, isNew:false, isTop:false },
  { id:'3', name:'Dre',  age:26, gender:'m',  coords:{lat:40.711, lng:-74.009},  online:true,  vibe:"What's good 👊",    match:89, isNew:false, isTop:true  },
  { id:'4', name:'Luna', age:25, gender:'tw', coords:{lat:40.716, lng:-74.004},  online:true,  vibe:'Good energy only ✨',match:93, isNew:false, isTop:false },
  { id:'5', name:'Kai',  age:23, gender:'tm', coords:{lat:40.710, lng:-74.013},  online:true,  vibe:'Free tonight',      match:72, isNew:true,  isTop:false },
  { id:'6', name:'Nova', age:25, gender:'f',  coords:{lat:40.718, lng:-74.001},  online:true,  vibe:'No strings 😈',     match:91, isNew:false, isTop:false },
];

const MOCK_EVENTS: MapEvent[] = [
  { id:'e1', name:'Late Night Rooftop', coords:{lat:40.7135,lng:-74.0055}, type:'party', count:34 },
  { id:'e2', name:'Bar Night',          coords:{lat:40.7118,lng:-74.0072}, type:'bar',   count:18 },
];

const MOCK_PULSE: PulseZone[] = [
  { id:'z1', name:'Lower East Side', center:{lat:40.715,lng:-73.988}, radiusM:600, intensity:.92, activeCount:47, trend:'peaking', peakHour:1, color:'#a855f7', updatedAt:Date.now() },
  { id:'z2', name:'West Village',    center:{lat:40.734,lng:-74.005}, radiusM:500, intensity:.71, activeCount:31, trend:'rising',  peakHour:0, color:'#ec4899', updatedAt:Date.now() },
  { id:'z3', name:'East Village',    center:{lat:40.727,lng:-73.985}, radiusM:550, intensity:.58, activeCount:22, trend:'rising',  peakHour:2, color:'#7c3aed', updatedAt:Date.now() },
];

// ── Pin color helper ──────────────────────────────────────────────────────────
const pinColor = (u: MapUser) => {
  if (u.gender === 'f')  return u.match >= 90 ? '#ff3c64' : u.match >= 75 ? '#ffa032' : '#ffcc44';
  if (u.gender === 'm')  return u.match >= 90 ? '#7c3aed' : u.match >= 75 ? '#9333ea' : '#a855f7';
  if (u.gender === 'tw') return u.match >= 90 ? '#f7a8c4' : '#55cdfc';
  return '#55cdfc'; // tm / nb
};

// ── Pin emoji helper ──────────────────────────────────────────────────────────
const pinEmoji = (g: string) =>
  g === 'f' ? '🍑' : g === 'm' ? '🍆' : g === 'tw' ? '🦋' : '⚡';

// ── Filter types ──────────────────────────────────────────────────────────────
type FilterGender = 'all' | 'f' | 'm' | 'tw' | 'tm';
type FilterStatus = 'all' | 'online' | 'close';
type MapMode     = 'pins' | 'pulse';

// ── User card component ───────────────────────────────────────────────────────
const UserCard: React.FC<{ user: MapUser; onClose: () => void; onChat: () => void; onVideo: () => void }> = ({
  user, onClose, onChat, onVideo,
}) => {
  const slide = useRef(new Animated.Value(300)).current;
  useEffect(() => {
    Animated.spring(slide, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
  }, []);

  const col = pinColor(user);
  const isTW = user.gender === 'tw' || user.gender === 'tm';

  return (
    <Animated.View style={[styles.card, { transform: [{ translateY: slide }] }]}>
      {isTW && <View style={styles.transFlagStripe} />}
      <View style={styles.cardHeader}>
        <View style={[styles.cardAvatar, { borderColor: col, backgroundColor: `${col}22` }]}>
          <Text style={styles.cardAvatarText}>{user.name[0]}</Text>
          {user.online && <View style={[styles.cardOnlineDot, { backgroundColor: C.green }]} />}
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.cardName}>{user.name}, {user.age}</Text>
          <Text style={styles.cardVibe}>{user.vibe}</Text>
          <Text style={[styles.cardGender, { color: col }]}>{pinEmoji(user.gender)} {user.gender.toUpperCase()}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.cardClose}>
          <Text style={styles.cardCloseText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Match bar */}
      <View style={styles.matchBarWrap}>
        <Text style={styles.matchLabel}>MATCH</Text>
        <View style={styles.matchTrack}>
          <View style={[styles.matchFill, { width: `${user.match}%` as any, backgroundColor: col }]} />
        </View>
        <Text style={[styles.matchPct, { color: col }]}>{user.match}%</Text>
      </View>

      {/* Distance */}
      <Text style={styles.cardDistance}>
        📍 {((user.coords.lat - 40.7128) ** 2 + (user.coords.lng + 74.006) ** 2) < 1
          ? '< 0.5 mi away' : '~1 mi away'}
      </Text>

      {/* Actions */}
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.cardActionVibe}>
          <Text style={styles.cardActionVibeText}>Send a Vibe {pinEmoji(user.gender)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.cardActionIcon, { borderColor: C.cyan }]} onPress={onChat}>
          <Text style={{ fontSize: 18 }}>💬</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.cardActionIcon, { borderColor: C.purple }]} onPress={onVideo}>
          <Text style={{ fontSize: 18 }}>📹</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// ── Pulse zone card ───────────────────────────────────────────────────────────
const PulseCard: React.FC<{ zone: PulseZone }> = ({ zone }) => {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.06, duration: 1200, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,    duration: 1200, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  const trendIcon = zone.trend === 'peaking' ? '🔥' : zone.trend === 'rising' ? '📈' : '📉';

  return (
    <View style={[styles.pulseCard, { borderColor: `${zone.color}44` }]}>
      <Animated.View style={[styles.pulseCardGlow, { backgroundColor: `${zone.color}22`, transform: [{ scale: pulse }] }]} />
      <Text style={[styles.pulseCardName, { color: zone.color }]}>{zone.name}</Text>
      <Text style={styles.pulseCardCount}>{zone.activeCount} out {trendIcon}</Text>
      <View style={styles.pulseBarTrack}>
        <View style={[styles.pulseBarFill, { width: `${zone.intensity * 100}%` as any, backgroundColor: zone.color }]} />
      </View>
    </View>
  );
};

// ── Main MapScreen ────────────────────────────────────────────────────────────
const MapScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const [selectedUser, setSelectedUser] = useState<MapUser | null>(null);
  const [filterGender, setFilterGender] = useState<FilterGender>('all');
  const [filterStatus, _setFilterStatus] = useState<FilterStatus>('all');
  const [mapMode,      setMapMode]      = useState<MapMode>('pins');
  const [camera,       _setCamera]       = useState<CameraState>({
    center:  { lat: 40.7128, lng: -74.006 },
    zoom:    14.5,
    pitch:   45,
    bearing: -15,
  });

  const cameraRef  = useRef<any>(null);
  const pulseAnim  = useRef(new Animated.Value(0)).current;

  // Pulse mode entrance
  useEffect(() => {
    if (mapMode === 'pulse') {
      Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } else {
      Animated.timing(pulseAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [mapMode]);

  const filteredUsers = MOCK_USERS.filter(u => {
    if (filterGender !== 'all' && u.gender !== filterGender) return false;
    if (filterStatus === 'online' && !u.online) return false;
    return true;
  });

  const handlePinPress = useCallback((user: MapUser) => {
    setSelectedUser(user);
    cameraRef.current?.setCamera({
      centerCoordinate: [user.coords.lng, user.coords.lat],
      zoomLevel: 15.5,
      pitch: 50,
      animationDuration: 600,
    });
  }, []);

  // ── Render Mapbox or fallback ─────────────────────────────────────────────
  const renderMap = () => {
    if (!MapboxGL) {
      // Fallback dark map canvas until @rnmapbox/maps is linked
      return (
        <View style={styles.mapFallback}>
          <View style={styles.mapFallbackGrid} />
          {/* Simulated distance rings */}
          {[100, 200, 300].map(r => (
            <View key={r} style={[styles.ring, { width: r*2, height: r*2, borderRadius: r, marginLeft: -r, marginTop: -r }]} />
          ))}
          {/* You dot */}
          <View style={styles.youDot} />
          <View style={styles.youGlow} />
          {/* Simulated pins */}
          {filteredUsers.map((u, i) => {
            const angle = (i / filteredUsers.length) * Math.PI * 2;
            const dist  = 60 + (i * 30) % 120;
            const x     = Math.cos(angle) * dist;
            const y     = Math.sin(angle) * dist;
            const col   = pinColor(u);
            return (
              <TouchableOpacity
                key={u.id}
                style={[styles.simPin, { transform: [{ translateX: x }, { translateY: y }] }]}
                onPress={() => handlePinPress(u)}
              >
                <View style={[styles.simPinDot, { backgroundColor: col, borderColor: `${col}66` }]}>
                  <Text style={{ fontSize: 11 }}>{pinEmoji(u.gender)}</Text>
                </View>
                {u.online && <View style={[styles.simPinOnline, { backgroundColor: C.green }]} />}
                {mapMode === 'pins' && (
                  <Text style={[styles.simPinName, { color: col }]}>{u.name}</Text>
                )}
              </TouchableOpacity>
            );
          })}
          {/* Night Pulse zones */}
          {mapMode === 'pulse' && MOCK_PULSE.map((z, i) => {
            const angle = (i / MOCK_PULSE.length) * Math.PI * 2 + 0.5;
            const dist  = 100 + i * 40;
            return (
              <Animated.View
                key={z.id}
                style={[
                  styles.pulseBlob,
                  {
                    width:  z.radiusM * 0.4,
                    height: z.radiusM * 0.4,
                    borderRadius: z.radiusM * 0.2,
                    backgroundColor: `${z.color}`,
                    transform: [
                      { translateX: Math.cos(angle) * dist },
                      { translateY: Math.sin(angle) * dist },
                    ],
                    opacity: pulseAnim.interpolate({ inputRange:[0,1], outputRange:[0, z.intensity * 0.45] }),
                  },
                ]}
              />
            );
          })}
          <Text style={styles.mapNote}>Install @rnmapbox/maps for 3D city view</Text>
        </View>
      );
    }

    // ── Full Mapbox 3D implementation ────────────────────────────────────────
    MapboxGL.setAccessToken(MAPBOX_TOKEN);
    return (
      <MapboxGL.MapView
        style={{ flex: 1 }}
        styleURL={MAPBOX_STYLE}
        logoEnabled={false}
        compassEnabled={false}
        attributionEnabled={false}
        onPress={() => setSelectedUser(null)}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          centerCoordinate={[camera.center.lng, camera.center.lat]}
          zoomLevel={camera.zoom}
          pitch={camera.pitch}
          bearing={camera.bearing}
          animationMode="flyTo"
          animationDuration={800}
        />

        {/* 3D Buildings layer */}
        <MapboxGL.FillExtrusionLayer
          id="3d-buildings"
          sourceLayerID="building"
          filter={['==', 'extrude', 'true']}
          minZoomLevel={12}
          style={{
            fillExtrusionColor: [
              'interpolate', ['linear'], ['get', 'height'],
              0,   '#0d0d14',
              50,  '#13131e',
              100, '#1a1a2e',
              200, '#16213e',
            ],
            fillExtrusionHeight:    ['get', 'height'],
            fillExtrusionBase:      ['get', 'min_height'],
            fillExtrusionOpacity:   0.85,
          }}
        />

        {/* Heat layer for NightPulse mode */}
        {mapMode === 'pulse' && (
          <MapboxGL.HeatmapLayer
            id="nightpulse-heat"
            sourceID="pulse-source"
            style={{
              heatmapRadius:    60,
              heatmapOpacity:   0.7,
              heatmapIntensity: 1.2,
              heatmapColor: [
                'interpolate', ['linear'], ['heatmap-density'],
                0,    'rgba(168,85,247,0)',
                0.2,  'rgba(168,85,247,0.4)',
                0.5,  'rgba(236,72,153,0.7)',
                0.8,  'rgba(251,191,36,0.85)',
                1,    'rgba(255,255,255,0.9)',
              ],
            }}
          />
        )}

        {/* User pins */}
        {mapMode === 'pins' && filteredUsers.map(u => (
          <MapboxGL.MarkerView
            key={u.id}
            coordinate={[u.coords.lng, u.coords.lat]}
          >
            <TouchableOpacity onPress={() => handlePinPress(u)} style={{ alignItems: 'center' }}>
              <View style={[
                styles.mbPin,
                { backgroundColor: pinColor(u), borderColor: `${pinColor(u)}88` },
                selectedUser?.id === u.id && styles.mbPinSelected,
              ]}>
                <Text style={{ fontSize: 12 }}>{pinEmoji(u.gender)}</Text>
              </View>
              {u.online && <View style={[styles.mbPinOnline, { backgroundColor: C.green }]} />}
              {selectedUser?.id === u.id && (
                <Text style={[styles.mbPinLabel, { color: pinColor(u) }]}>{u.name}</Text>
              )}
            </TouchableOpacity>
          </MapboxGL.MarkerView>
        ))}

        {/* Event markers */}
        {MOCK_EVENTS.map(ev => (
          <MapboxGL.MarkerView
            key={ev.id}
            coordinate={[ev.coords.lng, ev.coords.lat]}
          >
            <View style={styles.eventPin}>
              <Text style={{ fontSize: 14 }}>{ev.type === 'party' ? '🎉' : '🍸'}</Text>
              <Text style={styles.eventCount}>{ev.count}</Text>
            </View>
          </MapboxGL.MarkerView>
        ))}
      </MapboxGL.MapView>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>ALL<Text style={{ color: C.amber }}>NIGHT</Text>LONG</Text>
          <Text style={styles.sub}>🌙 {filteredUsers.filter(u => u.online).length} ACTIVE NEARBY</Text>
        </View>
        {/* Mode toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, mapMode === 'pins' && styles.modeBtnActive]}
            onPress={() => setMapMode('pins')}
          >
            <Text style={[styles.modeBtnText, mapMode === 'pins' && { color: C.text }]}>PINS</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mapMode === 'pulse' && { ...styles.modeBtnActive, borderColor: C.purple }]}
            onPress={() => setMapMode('pulse')}
          >
            <Text style={[styles.modeBtnText, mapMode === 'pulse' && { color: C.purple }]}>⚡ PULSE</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapWrap}>
        {renderMap()}
      </View>

      {/* Night Pulse zone cards */}
      {mapMode === 'pulse' && (
        <Animated.View style={[styles.pulseRow, { opacity: pulseAnim }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
            {MOCK_PULSE.map(z => <PulseCard key={z.id} zone={z} />)}
          </ScrollView>
        </Animated.View>
      )}

      {/* Filter bar */}
      {mapMode === 'pins' && (
        <View style={styles.filterBar}>
          {([['all','All'],['f','🍑'],['m','🍆'],['tw','🦋'],['tm','⚡']] as [FilterGender, string][]).map(([g, label]) => (
            <TouchableOpacity
              key={g}
              style={[styles.filterPill, filterGender === g && styles.filterPillActive]}
              onPress={() => setFilterGender(g)}
            >
              <Text style={[styles.filterLabel, filterGender === g && { color: C.text }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* User card */}
      {selectedUser && (
        <UserCard
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onChat={() => navigation?.navigate('Chat', { userId: selectedUser.id, userName: selectedUser.name })}
          onVideo={() => navigation?.navigate('Video', { userId: selectedUser.id, userName: selectedUser.name })}
        />
      )}
    </SafeAreaView>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  header:  { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:20, paddingVertical:12 },
  brand:   { fontSize:20, fontWeight:'900', color:C.text, letterSpacing:2 },
  sub:     { fontSize:10, color:C.textMuted, letterSpacing:1, marginTop:2 },

  modeToggle:    { flexDirection:'row', backgroundColor:C.surface, borderRadius:12, borderWidth:1, borderColor:C.border, overflow:'hidden' },
  modeBtn:       { paddingHorizontal:12, paddingVertical:7 },
  modeBtnActive: { backgroundColor:C.surfaceUp, borderWidth:1, borderColor:'rgba(255,255,255,0.12)', borderRadius:10 },
  modeBtnText:   { fontSize:10, fontWeight:'700', letterSpacing:1.5, color:C.textMuted },

  mapWrap:     { flex:1, position:'relative' },
  mapFallback: { flex:1, backgroundColor:'#04040a', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' },
  mapFallbackGrid: { position:'absolute', inset:0 },

  ring:    { position:'absolute', top:'50%', left:'50%', borderWidth:1, borderColor:'rgba(255,255,255,0.05)' },
  youDot:  { width:14, height:14, borderRadius:7, backgroundColor:C.amber, borderWidth:3, borderColor:'#fff', zIndex:10 },
  youGlow: { position:'absolute', width:70, height:70, borderRadius:35, backgroundColor:'rgba(251,191,36,0.15)', top:'50%', left:'50%', marginLeft:-35, marginTop:-35 },

  simPin:       { position:'absolute', alignItems:'center' },
  simPinDot:    { width:36, height:36, borderRadius:18, alignItems:'center', justifyContent:'center', borderWidth:2 },
  simPinOnline: { position:'absolute', top:0, right:0, width:10, height:10, borderRadius:5, borderWidth:2, borderColor:C.bg },
  simPinName:   { fontSize:10, fontWeight:'700', marginTop:3, letterSpacing:0.3 },

  pulseBlob: { position:'absolute', filter:'blur(20px)' } as any,
  mapNote:   { position:'absolute', bottom:16, fontSize:11, color:C.textMuted, textAlign:'center' },

  mbPin:         { width:34, height:34, borderRadius:17, alignItems:'center', justifyContent:'center', borderWidth:2 },
  mbPinSelected: { transform:[{scale:1.3}], shadowColor:'#fff', shadowOpacity:.5, shadowRadius:8, elevation:8 },
  mbPinOnline:   { position:'absolute', top:-1, right:-1, width:10, height:10, borderRadius:5, borderWidth:2, borderColor:C.bg },
  mbPinLabel:    { fontSize:10, fontWeight:'800', marginTop:3 },
  eventPin:      { backgroundColor:C.surfaceUp, borderRadius:10, padding:6, alignItems:'center', borderWidth:1, borderColor:C.border },
  eventCount:    { fontSize:9, color:C.textDim, fontWeight:'700' },

  // Filter
  filterBar:       { flexDirection:'row', paddingHorizontal:16, paddingVertical:10, gap:8, justifyContent:'center', flexWrap:'wrap' },
  filterPill:      { paddingHorizontal:14, paddingVertical:6, borderRadius:20, borderWidth:1, borderColor:'rgba(255,255,255,0.1)', backgroundColor:'rgba(255,255,255,0.03)' },
  filterPillActive:{ borderColor:C.amber, backgroundColor:'rgba(251,191,36,0.1)' },
  filterLabel:     { fontSize:11, fontWeight:'600', color:C.textMuted },

  // Night Pulse row
  pulseRow: { paddingVertical:10 },
  pulseCard: { width:140, backgroundColor:C.surface, borderRadius:14, padding:12, borderWidth:1, overflow:'hidden' },
  pulseCardGlow: { position:'absolute', inset:0, borderRadius:14 },
  pulseCardName:  { fontSize:11, fontWeight:'800', letterSpacing:0.3, marginBottom:2 },
  pulseCardCount: { fontSize:11, color:C.textDim, marginBottom:8 },
  pulseBarTrack:  { height:3, backgroundColor:'rgba(255,255,255,0.08)', borderRadius:2 },
  pulseBarFill:   { height:3, borderRadius:2 },

  // User card
  card:           { position:'absolute', bottom:0, left:0, right:0, backgroundColor:C.surface, borderTopLeftRadius:24, borderTopRightRadius:24, padding:20, borderWidth:1, borderColor:C.border, borderBottomWidth:0 },
  transFlagStripe:{ position:'absolute', top:0, left:0, right:0, height:3, borderTopLeftRadius:24, borderTopRightRadius:24, backgroundColor:'transparent',
    // Trans flag gradient effect via multiple Views would need LinearGradient — stubbed
  },
  cardHeader:     { flexDirection:'row', alignItems:'center', marginBottom:16 },
  cardAvatar:     { width:52, height:52, borderRadius:26, alignItems:'center', justifyContent:'center', borderWidth:2 },
  cardAvatarText: { fontSize:22, fontWeight:'900', color:C.text },
  cardOnlineDot:  { position:'absolute', bottom:1, right:1, width:12, height:12, borderRadius:6, borderWidth:2, borderColor:C.surface },
  cardName:       { fontSize:18, fontWeight:'800', color:C.text },
  cardVibe:       { fontSize:12, color:C.textDim, marginTop:2 },
  cardGender:     { fontSize:11, fontWeight:'700', marginTop:3, letterSpacing:0.5 },
  cardClose:      { width:32, height:32, borderRadius:16, backgroundColor:'rgba(255,255,255,0.06)', alignItems:'center', justifyContent:'center' },
  cardCloseText:  { fontSize:12, color:C.textMuted },
  cardDistance:   { fontSize:12, color:C.textMuted, marginBottom:14 },

  matchBarWrap: { flexDirection:'row', alignItems:'center', marginBottom:8 },
  matchLabel:   { fontSize:9, color:C.textMuted, fontWeight:'700', letterSpacing:1.5, width:40 },
  matchTrack:   { flex:1, height:4, backgroundColor:'rgba(255,255,255,0.08)', borderRadius:2, marginHorizontal:10 },
  matchFill:    { height:4, borderRadius:2 },
  matchPct:     { fontSize:12, fontWeight:'800', width:36, textAlign:'right' },

  cardActions:      { flexDirection:'row', gap:10, alignItems:'center' },
  cardActionVibe:   { flex:1, backgroundColor:C.femalePin, borderRadius:14, paddingVertical:13, alignItems:'center' },
  cardActionVibeText:{ fontSize:13, fontWeight:'800', color:'#fff', letterSpacing:0.3 },
  cardActionIcon:   { width:48, height:48, borderRadius:14, borderWidth:1.5, alignItems:'center', justifyContent:'center', backgroundColor:'rgba(255,255,255,0.04)' },
});

export default MapScreen;
