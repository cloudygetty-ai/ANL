// src/screens/MapScreen.tsx
// ANL NightPulse Map
// Stack: @rnmapbox/maps + custom SVG pin markers + heatmap layer
// 3D buildings via fill-extrusion, dark-v11 style, 45° pitch camera

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Easing, Dimensions, ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';

// Mapbox lazy import — compiles before native linking
let MapboxGL: any = null;
try { MapboxGL = require('@rnmapbox/maps').default; } catch {}

const { width: SW } = Dimensions.get('window');

// ── Tokens ────────────────────────────────────────────────────────
const C = {
  bg:         '#04040a',
  surface:    '#0d0d14',
  surfaceUp:  '#14141f',
  border:     'rgba(168,85,247,0.2)',
  purple:     '#a855f7',
  purpleDim:  'rgba(168,85,247,0.25)',
  pink:       '#ec4899',
  amber:      '#fbbf24',
  green:      '#4ade80',
  text:       '#f0eee8',
  textDim:    'rgba(240,238,232,0.5)',
  textMuted:  'rgba(240,238,232,0.22)',
  femalePin:  '#f43f5e',
  malePin:    '#7c3aed',
  nbPin:      '#f59e0b',
  twPin:      '#f7a8c4',
};

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';
const MAP_STYLE    = 'mapbox://styles/mapbox/dark-v11';

// ── Types ─────────────────────────────────────────────────────────
interface MapUser {
  id: string;
  name: string;
  age: number;
  gender: 'woman' | 'man' | 'nonbinary' | 'transwoman' | 'transman';
  coords: { lat: number; lng: number };
  online: boolean;
  distanceMi: number;
  compatibility: number; // 0–100
  photos: string[];
  bio: string;
}

interface MapEvent {
  id: string;
  name: string;
  type: 'party' | 'bar' | 'concert' | 'popup';
  coords: { lat: number; lng: number };
  attendees: number;
}

interface PulseZone {
  id: string;
  coords: { lat: number; lng: number };
  intensity: number; // 0–1
}

type MapMode = 'pins' | 'heat';
type GenderFilter = 'all' | 'women' | 'men' | 'nonbinary';

// ── Mock data ─────────────────────────────────────────────────────
const MOCK_USERS: MapUser[] = [
  { id: '1', name: 'Jade',    age: 26, gender: 'woman',     coords: { lat: 40.7538, lng: -73.9840 }, online: true,  distanceMi: 0.3, compatibility: 91, photos: [], bio: 'Late night energy' },
  { id: '2', name: 'Marcus',  age: 29, gender: 'man',       coords: { lat: 40.7520, lng: -73.9860 }, online: true,  distanceMi: 0.5, compatibility: 78, photos: [], bio: 'DJ / producer' },
  { id: '3', name: 'Riley',   age: 24, gender: 'nonbinary', coords: { lat: 40.7555, lng: -73.9820 }, online: true,  distanceMi: 0.4, compatibility: 85, photos: [], bio: 'Art kid, night owl' },
  { id: '4', name: 'Zara',    age: 28, gender: 'woman',     coords: { lat: 40.7510, lng: -73.9870 }, online: false, distanceMi: 0.7, compatibility: 72, photos: [], bio: 'Barista by day' },
  { id: '5', name: 'Devon',   age: 31, gender: 'man',       coords: { lat: 40.7545, lng: -73.9800 }, online: true,  distanceMi: 0.9, compatibility: 67, photos: [], bio: 'Tech / coffee' },
  { id: '6', name: 'Nova',    age: 23, gender: 'nonbinary', coords: { lat: 40.7560, lng: -73.9850 }, online: true,  distanceMi: 0.6, compatibility: 88, photos: [], bio: 'Fashion + nightlife' },
  { id: '7', name: 'Simone',  age: 27, gender: 'woman',     coords: { lat: 40.7495, lng: -73.9835 }, online: false, distanceMi: 1.1, compatibility: 74, photos: [], bio: 'Writer, insomniac' },
  { id: '8', name: 'Theo',    age: 25, gender: 'man',       coords: { lat: 40.7530, lng: -73.9815 }, online: true,  distanceMi: 0.8, compatibility: 82, photos: [], bio: 'Skater / photographer' },
];

const MOCK_EVENTS: MapEvent[] = [
  { id: 'e1', name: 'Neon Rave',    type: 'party',   coords: { lat: 40.7548, lng: -73.9832 }, attendees: 214 },
  { id: 'e2', name: 'Rooftop Bar',  type: 'bar',     coords: { lat: 40.7515, lng: -73.9856 }, attendees: 87 },
  { id: 'e3', name: 'Late Set',     type: 'concert', coords: { lat: 40.7562, lng: -73.9808 }, attendees: 156 },
];

const MOCK_ZONES: PulseZone[] = [
  { id: 'z1', coords: { lat: 40.7548, lng: -73.9832 }, intensity: 0.95 },
  { id: 'z2', coords: { lat: 40.7520, lng: -73.9855 }, intensity: 0.70 },
  { id: 'z3', coords: { lat: 40.7535, lng: -73.9810 }, intensity: 0.55 },
  { id: 'z4', coords: { lat: 40.7505, lng: -73.9840 }, intensity: 0.40 },
  { id: 'z5', coords: { lat: 40.7558, lng: -73.9845 }, intensity: 0.80 },
];

// ── SVG pin generators ────────────────────────────────────────────
function makePinSvg(color: string, emoji: string, selected = false): string {
  const size  = selected ? 48 : 36;
  const r     = size / 2;
  const ring  = selected ? `<circle cx="${r}" cy="${r}" r="${r - 1}" fill="none" stroke="${color}" stroke-width="2" opacity="0.4"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 8}">
    ${ring}
    <circle cx="${r}" cy="${r}" r="${r - 3}" fill="${color}" opacity="0.15"/>
    <circle cx="${r}" cy="${r}" r="${r - 6}" fill="${color}"/>
    <text x="${r}" y="${r + 5}" text-anchor="middle" font-size="${selected ? 16 : 13}">${emoji}</text>
    <polygon points="${r - 5},${size - 3} ${r + 5},${size - 3} ${r},${size + 5}" fill="${color}"/>
  </svg>`;
}

function pinColor(g: MapUser['gender']): string {
  return { woman: C.femalePin, man: C.malePin, nonbinary: C.nbPin, transwoman: C.twPin, transman: C.malePin }[g];
}
function pinEmoji(g: MapUser['gender']): string {
  return { woman: '👩', man: '👨', nonbinary: '🧑', transwoman: '🏳️', transman: '🏳️' }[g];
}

function eventEmoji(t: MapEvent['type']): string {
  return { party: '🎉', bar: '🍸', concert: '🎵', popup: '✨' }[t];
}

// ── Heatmap GeoJSON ───────────────────────────────────────────────
function buildHeatGeoJSON(zones: PulseZone[]) {
  return {
    type: 'FeatureCollection' as const,
    features: zones.map(z => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [z.coords.lng, z.coords.lat] },
      properties: { intensity: z.intensity },
    })),
  };
}

// ── Component ─────────────────────────────────────────────────────
export default function MapScreen() {
  const [mapMode,      setMapMode]      = useState<MapMode>('pins');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [selectedUser, setSelectedUser] = useState<MapUser | null>(null);
  const [onlineOnly,   setOnlineOnly]   = useState(false);

  const pulseAnim = useRef(new Animated.Value(0)).current;
  const cardAnim  = useRef(new Animated.Value(0)).current;

  // Pulse ring animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Card slide-in
  useEffect(() => {
    Animated.spring(cardAnim, {
      toValue: selectedUser ? 1 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [selectedUser]);

  const filteredUsers = MOCK_USERS.filter(u => {
    if (onlineOnly && !u.online) return false;
    if (genderFilter === 'women'    && u.gender !== 'woman')     return false;
    if (genderFilter === 'men'      && u.gender !== 'man')       return false;
    if (genderFilter === 'nonbinary' && u.gender !== 'nonbinary') return false;
    return true;
  });

  const handlePinPress = useCallback((u: MapUser) => {
    setSelectedUser(prev => prev?.id === u.id ? null : u);
  }, []);

  const heatGeoJSON = buildHeatGeoJSON(MOCK_ZONES);

  const pulseScale   = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] });
  const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.3, 0] });
  const cardTranslateY = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [200, 0] });

  // ── Fallback UI when Mapbox not linked ─────────────────────────
  if (!MapboxGL) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center', gap: 12 }]}>
        <Text style={{ color: C.purple, fontSize: 32 }}>🗺</Text>
        <Text style={[styles.labelBold, { textAlign: 'center' }]}>Mapbox not linked</Text>
        <Text style={[styles.textDim, { textAlign: 'center', maxWidth: 260 }]}>
          Run: npx expo install @rnmapbox/maps{'\n'}then set EXPO_PUBLIC_MAPBOX_TOKEN in .env
        </Text>
      </View>
    );
  }

  MapboxGL.setAccessToken(MAPBOX_TOKEN);

  return (
    <View style={styles.root}>
      {/* ── Map ───────────────────────────────────────────────── */}
      <MapboxGL.MapView
        style={StyleSheet.absoluteFill}
        styleURL={MAP_STYLE}
        compassEnabled={false}
        logoEnabled={false}
        attributionEnabled={false}
        onPress={() => setSelectedUser(null)}
      >
        <MapboxGL.Camera
          centerCoordinate={[-73.9840, 40.7530]}
          zoomLevel={14.5}
          pitch={45}
          heading={0}
          animationDuration={0}
        />

        {/* 3D buildings */}
        <MapboxGL.FillExtrusionLayer
          id="buildings-3d"
          sourceLayerID="building"
          sourceID="composite"
          style={{
            fillExtrusionColor:   '#1a0a2e',
            fillExtrusionHeight:  ['get', 'height'],
            fillExtrusionBase:    ['get', 'min_height'],
            fillExtrusionOpacity: 0.85,
          }}
        />

        {/* NightPulse heatmap layer */}
        {mapMode === 'heat' && (
          <>
            <MapboxGL.ShapeSource id="pulse-source" shape={heatGeoJSON}>
              <MapboxGL.HeatmapLayer
                id="nightpulse-heat"
                sourceID="pulse-source"
                style={{
                  heatmapRadius:    70,
                  heatmapOpacity:   0.75,
                  heatmapIntensity: 1.4,
                  heatmapWeight: ['interpolate', ['linear'], ['get', 'intensity'], 0, 0, 1, 1],
                  heatmapColor: [
                    'interpolate', ['linear'], ['heatmap-density'],
                    0,    'rgba(168,85,247,0)',
                    0.15, 'rgba(168,85,247,0.35)',
                    0.35, 'rgba(139,92,246,0.55)',
                    0.6,  'rgba(236,72,153,0.75)',
                    0.8,  'rgba(251,191,36,0.88)',
                    1,    'rgba(255,255,255,0.95)',
                  ],
                }}
              />
            </MapboxGL.ShapeSource>
          </>
        )}

        {/* User pins */}
        {mapMode === 'pins' && filteredUsers.map(u => (
          <MapboxGL.MarkerView
            key={u.id}
            coordinate={[u.coords.lng, u.coords.lat]}
            anchor={{ x: 0.5, y: 1 }}
          >
            <TouchableOpacity
              onPress={() => handlePinPress(u)}
              activeOpacity={0.85}
              style={styles.pinContainer}
            >
              {u.online && selectedUser?.id === u.id && (
                <Animated.View style={[
                  styles.pulseRing,
                  { borderColor: pinColor(u.gender), transform: [{ scale: pulseScale }], opacity: pulseOpacity },
                ]} />
              )}
              <SvgXml
                xml={makePinSvg(pinColor(u.gender), pinEmoji(u.gender), selectedUser?.id === u.id)}
                width={selectedUser?.id === u.id ? 48 : 36}
                height={selectedUser?.id === u.id ? 56 : 44}
              />
              {u.online && (
                <View style={[styles.onlineDot, { backgroundColor: C.green }]} />
              )}
            </TouchableOpacity>
          </MapboxGL.MarkerView>
        ))}

        {/* Event pins */}
        {MOCK_EVENTS.map(ev => (
          <MapboxGL.MarkerView
            key={ev.id}
            coordinate={[ev.coords.lng, ev.coords.lat]}
            anchor={{ x: 0.5, y: 1 }}
          >
            <TouchableOpacity activeOpacity={0.85}>
              <View style={styles.eventPin}>
                <Text style={{ fontSize: 12 }}>{eventEmoji(ev.type)}</Text>
                <Text style={styles.eventPinText}>{ev.attendees}</Text>
              </View>
            </TouchableOpacity>
          </MapboxGL.MarkerView>
        ))}
      </MapboxGL.MapView>

      {/* ── HUD overlay ──────────────────────────────────────── */}
      <SafeAreaView style={styles.hud} pointerEvents="box-none">

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.wordmark}>ALL<Text style={{ color: C.purple }}>NIGHT</Text>LONG</Text>
            <Text style={styles.subline}>
              {filteredUsers.filter(u => u.online).length} active nearby
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.modePill, mapMode === 'heat' && styles.modePillActive]}
            onPress={() => setMapMode(m => m === 'pins' ? 'heat' : 'pins')}
          >
            <Text style={[styles.modePillText, mapMode === 'heat' && { color: C.purple }]}>
              {mapMode === 'heat' ? '🔥 NightPulse' : '📍 Pins'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterBar}
          contentContainerStyle={styles.filterBarContent}
        >
          {(['all', 'women', 'men', 'nonbinary'] as GenderFilter[]).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterPill, genderFilter === f && styles.filterPillActive]}
              onPress={() => setGenderFilter(f)}
            >
              <Text style={[styles.filterPillText, genderFilter === f && styles.filterPillTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.filterPill, onlineOnly && styles.filterPillActive]}
            onPress={() => setOnlineOnly(v => !v)}
          >
            <Text style={[styles.filterPillText, onlineOnly && styles.filterPillTextActive]}>
              Online only
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Spacer */}
        <View style={{ flex: 1 }} pointerEvents="none" />

        {/* Selected user card */}
        <Animated.View
          style={[styles.userCard, { transform: [{ translateY: cardTranslateY }] }]}
          pointerEvents={selectedUser ? 'auto' : 'none'}
        >
          {selectedUser && (
            <>
              <View style={styles.cardRow}>
                <View style={[styles.avatarCircle, { borderColor: pinColor(selectedUser.gender) }]}>
                  <Text style={{ fontSize: 22 }}>{pinEmoji(selectedUser.gender)}</Text>
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={styles.cardNameRow}>
                    <Text style={styles.cardName}>{selectedUser.name}, {selectedUser.age}</Text>
                    {selectedUser.online && (
                      <View style={styles.onlineBadge}>
                        <View style={[styles.onlineDotSmall, { backgroundColor: C.green }]} />
                        <Text style={styles.onlineBadgeText}>online</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.cardBio} numberOfLines={1}>{selectedUser.bio}</Text>
                  <Text style={styles.cardMeta}>
                    {selectedUser.distanceMi} mi away · {selectedUser.compatibility}% match
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedUser(null)} style={styles.closeBtn}>
                  <Text style={{ color: C.textDim, fontSize: 18 }}>×</Text>
                </TouchableOpacity>
              </View>

              {/* Compatibility bar */}
              <View style={styles.compatBar}>
                <View style={[styles.compatFill, {
                  width: `${selectedUser.compatibility}%` as any,
                  backgroundColor: selectedUser.compatibility >= 80 ? C.purple
                    : selectedUser.compatibility >= 60 ? C.amber : C.pink,
                }]} />
              </View>

              {/* Actions */}
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionBtnGhost}>
                  <Text style={styles.actionBtnGhostText}>Skip</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.purple }]}>
                  <Text style={styles.actionBtnText}>Like</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.pink }]}>
                  <Text style={styles.actionBtnText}>Message</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </Animated.View>

        {/* Pin legend */}
        <View style={styles.legend}>
          {[
            { label: 'Women',    color: C.femalePin },
            { label: 'Men',      color: C.malePin },
            { label: 'Nonbinary', color: C.nbPin },
          ].map(l => (
            <View key={l.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: l.color }]} />
              <Text style={styles.legendText}>{l.label}</Text>
            </View>
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:               { flex: 1, backgroundColor: C.bg },
  hud:                { flex: 1 },
  header:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  wordmark:           { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 20, fontWeight: '700', color: C.text, letterSpacing: 2 },
  subline:            { fontSize: 11, color: C.textDim, marginTop: 2, letterSpacing: 0.5 },
  modePill:           { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  modePillActive:     { backgroundColor: 'rgba(168,85,247,0.12)', borderColor: 'rgba(168,85,247,0.4)' },
  modePillText:       { fontSize: 12, color: C.textDim, fontWeight: '500' },
  filterBar:          { maxHeight: 44 },
  filterBarContent:   { paddingHorizontal: 16, gap: 8, flexDirection: 'row', alignItems: 'center' },
  filterPill:         { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.05)' },
  filterPillActive:   { backgroundColor: C.purpleDim, borderColor: C.purple },
  filterPillText:     { fontSize: 12, color: C.textDim, fontWeight: '500' },
  filterPillTextActive: { color: C.purple },
  pinContainer:       { alignItems: 'center', justifyContent: 'center' },
  pulseRing:          { position: 'absolute', width: 50, height: 50, borderRadius: 25, borderWidth: 1.5, zIndex: -1 },
  onlineDot:          { position: 'absolute', bottom: 10, right: 0, width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: C.bg },
  onlineDotSmall:     { width: 6, height: 6, borderRadius: 3 },
  eventPin:           { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(244,63,94,0.9)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 0.5, borderColor: 'rgba(244,63,94,0.6)' },
  eventPinText:       { fontSize: 11, color: '#fff', fontWeight: '600' },
  userCard:           { marginHorizontal: 12, marginBottom: 8, backgroundColor: C.surface, borderRadius: 20, borderWidth: 0.5, borderColor: C.border, padding: 16, gap: 12 },
  cardRow:            { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarCircle:       { width: 52, height: 52, borderRadius: 26, backgroundColor: C.surfaceUp, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  cardNameRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName:           { fontSize: 17, fontWeight: '600', color: C.text },
  cardBio:            { fontSize: 13, color: C.textDim },
  cardMeta:           { fontSize: 12, color: C.textMuted },
  onlineBadge:        { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(74,222,128,0.12)', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 },
  onlineBadgeText:    { fontSize: 11, color: C.green },
  closeBtn:           { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  compatBar:          { height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  compatFill:         { height: '100%', borderRadius: 2 },
  cardActions:        { flexDirection: 'row', gap: 8 },
  actionBtnGhost:     { flex: 1, paddingVertical: 11, borderRadius: 12, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center' },
  actionBtnGhostText: { fontSize: 14, color: C.textDim, fontWeight: '500' },
  actionBtn:          { flex: 2, paddingVertical: 11, borderRadius: 12, alignItems: 'center' },
  actionBtnText:      { fontSize: 14, color: '#fff', fontWeight: '600' },
  legend:             { flexDirection: 'row', gap: 14, paddingHorizontal: 16, paddingBottom: 4, justifyContent: 'center' },
  legendItem:         { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:          { width: 7, height: 7, borderRadius: 3.5 },
  legendText:         { fontSize: 11, color: C.textMuted },
  labelBold:          { fontSize: 15, fontWeight: '600', color: C.text },
  textDim:            { fontSize: 13, color: C.textDim, lineHeight: 20 },
});
