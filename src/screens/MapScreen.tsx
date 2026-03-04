// src/screens/MapScreen.tsx
// WHY: Wraps ANL MapView in RN SafeAreaView and handles full-screen layout.
// The MapView itself is in ANL/screens/MapView.jsx (web-preview JSX).
// In production RN we'd use react-native-maps — this screen is the container.
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// TODO[HIGH]: Replace placeholder with react-native-maps MapView integration
// when adding native map. The pin SVG system in ANL/components/pins/ defines
// the visual language to port to react-native-maps Markers.

const C = {
  bg:      '#060609',
  surface: '#0d0d14',
  purple:  '#a855f7',
  amber:   '#fbbf24',
  text:    '#f0eee8',
  textDim: 'rgba(240,238,232,0.4)',
  border:  'rgba(168,85,247,0.18)',
};

const MapScreen: React.FC = () => (
  <SafeAreaView style={styles.safe} edges={['top']}>
    {/* Header */}
    <View style={styles.header}>
      <View>
        <Text style={styles.brand}>
          ALL<Text style={{ color: C.amber }}>NIGHT</Text>LONG
        </Text>
        <Text style={styles.sub}>🌙 LATE NIGHT · 12 ACTIVE NEARBY</Text>
      </View>
      <TouchableOpacity style={styles.heatBtn}>
        <Text style={styles.heatLabel}>HEAT</Text>
      </TouchableOpacity>
    </View>

    {/* Map placeholder */}
    <View style={styles.mapArea}>
      {/* Grid lines */}
      <View style={styles.gridOverlay} />

      {/* Center dot — you */}
      <View style={styles.youDot} />
      <View style={styles.youGlow} />

      {/* Rings */}
      {[120, 220, 320].map((r) => (
        <View key={r} style={[styles.ring, { width: r * 2, height: r * 2, borderRadius: r, marginLeft: -r, marginTop: -r }]} />
      ))}

      {/* Placeholder pins */}
      {[
        { x: '42%', y: '38%', col: '#ff3c64', emoji: '🍑' },
        { x: '60%', y: '55%', col: '#8844ff', emoji: '🍆' },
        { x: '32%', y: '60%', col: '#f7a8c4', emoji: '🦋' },
        { x: '68%', y: '35%', col: '#ff3c64', emoji: '🍑' },
        { x: '25%', y: '45%', col: '#8844ff', emoji: '🍆' },
      ].map((p, i) => (
        <View key={i} style={[styles.pin, { left: p.x as any, top: p.y as any }]}>
          <View style={[styles.pinDot, { backgroundColor: p.col }]}>
            <Text style={{ fontSize: 10 }}>{p.emoji}</Text>
          </View>
          <View style={[styles.pinPulse, { borderColor: p.col }]} />
        </View>
      ))}

      <Text style={styles.mapNote}>
        {'Map integration ready\nreact-native-maps + pin system'}
      </Text>
    </View>

    {/* Filter bar */}
    <View style={styles.filterBar}>
      {[
        { label: '🍑 Women', col: '#ff3c64' },
        { label: '🍆 Men',   col: '#8844ff' },
        { label: '🦋 Trans', col: '#f7a8c4' },
        { label: '🟢 Online', col: C.purple },
      ].map((f, i) => (
        <TouchableOpacity key={i} style={[styles.filterPill, i === 0 && styles.filterPillActive]}>
          <Text style={[styles.filterLabel, i === 0 && { color: f.col }]}>{f.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  brand:   { fontSize: 22, fontWeight: '900', color: C.text, letterSpacing: 2 },
  sub:     { fontSize: 10, color: C.textDim, letterSpacing: 1, marginTop: 2 },
  heatBtn: { backgroundColor: 'rgba(251,191,36,0.12)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  heatLabel: { fontSize: 10, fontWeight: '700', color: C.amber, letterSpacing: 1.5 },

  mapArea:  { flex: 1, backgroundColor: '#0a0a0d', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
  gridOverlay: { position: 'absolute', inset: 0, opacity: 0.04, backgroundColor: 'transparent' },

  ring: { position: 'absolute', top: '50%', left: '50%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  youDot:  { width: 14, height: 14, borderRadius: 7, backgroundColor: C.amber, borderWidth: 3, borderColor: '#fff', zIndex: 10 },
  youGlow: { position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(251,191,36,0.2)', top: '50%', left: '50%', marginLeft: -30, marginTop: -30 },

  pin:      { position: 'absolute', alignItems: 'center', justifyContent: 'center', width: 40, height: 40 },
  pinDot:   { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', opacity: 0.9 },
  pinPulse: { position: 'absolute', width: 42, height: 42, borderRadius: 21, borderWidth: 1, opacity: 0.4 },

  mapNote:  { position: 'absolute', bottom: 20, fontSize: 11, color: C.textDim, textAlign: 'center', letterSpacing: 0.5 },

  filterBar:       { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12, flexWrap: 'wrap', justifyContent: 'center' },
  filterPill:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)' },
  filterPillActive:{ borderColor: '#ff3c64', backgroundColor: 'rgba(255,60,100,0.1)' },
  filterLabel:     { fontSize: 11, fontWeight: '600', color: C.textDim, letterSpacing: 0.3 },
});

export default MapScreen;
