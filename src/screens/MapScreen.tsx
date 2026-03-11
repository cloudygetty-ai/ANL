// src/screens/MapScreen.tsx
// Primary nearby-user map view. Tries to render a Mapbox map; falls back to
// a simulated "ring view" when Mapbox is unavailable or errored.
import React, { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useMapStore } from '@services/state/mapStore';
import { useLocation } from '@hooks/useLocation';
import { bearing } from '@utils/geo';
import { COLORS } from '@config/constants';
import type { GenderFilter, MapUser } from '@types/index';

import PinMarker from '@components/pins/PinMarker';
import ProfileCard from '@components/profile/ProfileCard';

// ---------------------------------------------------------------------------
// Mock users — generated around Manhattan for dev/demo mode
// ---------------------------------------------------------------------------

const NYC_LAT = 40.7128;
const NYC_LON = -74.006;

const MOCK_USERS: MapUser[] = [
  { id: 'u1', displayName: 'Aria', age: 24, gender: 'female', latitude: 40.7145, longitude: -74.009, presence: 'online', matchScore: 88, avatarUrl: null, vibeTags: ['rooftops', 'jazz'], isOutTonight: true, distanceMi: 0.1 },
  { id: 'u2', displayName: 'Marcus', age: 27, gender: 'male', latitude: 40.7112, longitude: -74.003, presence: 'online', matchScore: 72, avatarUrl: null, vibeTags: ['dancing'], isOutTonight: true, distanceMi: 0.2 },
  { id: 'u3', displayName: 'River', age: 22, gender: 'non_binary', latitude: 40.716, longitude: -74.012, presence: 'away', matchScore: 61, avatarUrl: null, vibeTags: ['music', 'art'], isOutTonight: false, distanceMi: 0.4 },
  { id: 'u4', displayName: 'Sofia', age: 29, gender: 'trans_woman', latitude: 40.71, longitude: -73.999, presence: 'online', matchScore: 55, avatarUrl: null, vibeTags: ['foodie'], isOutTonight: true, distanceMi: 0.5 },
  { id: 'u5', displayName: 'Kai', age: 25, gender: 'trans_man', latitude: 40.7155, longitude: -73.997, presence: 'online', matchScore: 44, avatarUrl: null, vibeTags: ['chill'], isOutTonight: true, distanceMi: 0.7 },
  { id: 'u6', displayName: 'Luna', age: 23, gender: 'female', latitude: 40.709, longitude: -74.005, presence: 'away', matchScore: 79, avatarUrl: null, vibeTags: ['creative'], isOutTonight: true, distanceMi: 0.8 },
  { id: 'u7', displayName: 'Jordan', age: 31, gender: 'male', latitude: 40.717, longitude: -74.001, presence: 'online', matchScore: 34, avatarUrl: null, vibeTags: [], isOutTonight: false, distanceMi: 0.9 },
  { id: 'u8', displayName: 'Nadia', age: 26, gender: 'female', latitude: 40.718, longitude: -74.008, presence: 'offline', matchScore: 51, avatarUrl: null, vibeTags: ['dancer'], isOutTonight: true, distanceMi: 1.1 },
  { id: 'u9', displayName: 'Dev', age: 28, gender: 'male', latitude: 40.708, longitude: -74.01, presence: 'online', matchScore: 67, avatarUrl: null, vibeTags: ['music'], isOutTonight: true, distanceMi: 1.3 },
  { id: 'u10', displayName: 'Sage', age: 21, gender: 'non_binary', latitude: 40.72, longitude: -73.998, presence: 'online', matchScore: 82, avatarUrl: null, vibeTags: ['art', 'rooftops'], isOutTonight: true, distanceMi: 1.5 },
];

// ---------------------------------------------------------------------------
// Gender filter configuration
// ---------------------------------------------------------------------------

type FilterDef = { key: GenderFilter; label: string };

const GENDER_FILTERS: FilterDef[] = [
  { key: 'all', label: 'All' },
  { key: 'female', label: 'F' },
  { key: 'male', label: 'M' },
  { key: 'trans_woman', label: 'TW' },
  { key: 'trans_man', label: 'TM' },
  { key: 'non_binary', label: 'NB' },
];

// Color accent associated with each gender filter button
const FILTER_COLOR: Record<GenderFilter, string> = {
  all: COLORS.accent,
  female: COLORS.female,
  male: COLORS.male,
  trans_woman: COLORS.transWoman,
  trans_man: COLORS.transMan,
  non_binary: COLORS.nonBinary,
};

// ---------------------------------------------------------------------------
// Ring view — simulated map built from concentric distance rings
// ---------------------------------------------------------------------------

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
// Radius of the outermost ring (the full nearby radius)
const MAX_RING_R = Math.min(SCREEN_W, SCREEN_H) * 0.38;

interface RingViewProps {
  users: MapUser[];
  centerLat: number;
  centerLon: number;
  selectedId: string | null;
  onPressUser: (user: MapUser) => void;
}

function RingView({ users, centerLat, centerLon, selectedId, onPressUser }: RingViewProps) {
  const maxDistMi = PROXIMITY.nearbyRadiusMi;

  return (
    <View style={ring.container}>
      {/* Background rings at 1/4, 1/2, 3/4 and full radius */}
      {[0.25, 0.5, 0.75, 1].map((factor) => (
        <View
          key={factor}
          style={[
            ring.circle,
            {
              width: MAX_RING_R * 2 * factor,
              height: MAX_RING_R * 2 * factor,
              borderRadius: MAX_RING_R * factor,
            },
          ]}
        />
      ))}

      {/* You-are-here dot */}
      <View style={ring.center} />

      {/* User pins placed by polar coordinates (bearing + distance) */}
      {users.map((user) => {
        const distFraction = Math.min(user.distanceMi / maxDistMi, 1);
        const bear = bearing(centerLat, centerLon, user.latitude, user.longitude);
        const radians = ((bear - 90) * Math.PI) / 180;
        const r = distFraction * MAX_RING_R;
        const x = SCREEN_W / 2 + r * Math.cos(radians) - 20; // 20 = half pin width
        const y = SCREEN_H * 0.45 + r * Math.sin(radians) - 25; // 25 = half pin height

        return (
          <View key={user.id} style={[ring.pin, { left: x, top: y }]}>
            <PinMarker
              user={user}
              isSelected={selectedId === user.id}
              onPress={() => onPressUser(user)}
            />
          </View>
        );
      })}
    </View>
  );
}

const ring = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    position: 'relative',
  },
  circle: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(127,255,212,0.07)',
    left: '50%',
    top: '40%',
    // WHY: translateX/Y shift the circle so it is centered on the "you" dot
    transform: [
      { translateX: -MAX_RING_R },
      { translateY: -MAX_RING_R },
    ],
  },
  center: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.accent,
    borderWidth: 2,
    borderColor: '#0a0a0f',
    left: '50%',
    top: '40%',
    transform: [{ translateX: -7 }, { translateY: -7 }],
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 6,
  },
  pin: {
    position: 'absolute',
  },
});

// ---------------------------------------------------------------------------
// MapScreen
// ---------------------------------------------------------------------------

const MapScreen: React.FC = () => {
  const { users, filter, mode, selectedUser, setUsers, setFilter, setMode, selectUser, filteredUsers } = useMapStore();
  const { coords } = useLocation();

  const [mapboxError, setMapboxError] = useState(false);
  const [MapboxGL, setMapboxGL] = useState<null | typeof import('@rnmapbox/maps')>(null);

  // Populate store with mock data on first render if store is empty
  useEffect(() => {
    if (users.length === 0) {
      setUsers(MOCK_USERS);
    }
  }, [users.length, setUsers]);

  // Attempt to load Mapbox — if it fails (missing native module) we fall back
  useEffect(() => {
    import('@rnmapbox/maps')
      .then((mod) => setMapboxGL(mod))
      .catch(() => setMapboxError(true));
  }, []);

  const centerLat = coords?.latitude ?? NYC_LAT;
  const centerLon = coords?.longitude ?? NYC_LON;
  const visible = filteredUsers();

  const handleSelectUser = useCallback((user: MapUser) => {
    selectUser(user);
  }, [selectUser]);

  const handleCloseCard = useCallback(() => {
    selectUser(null);
  }, [selectUser]);

  const useRingView = mapboxError || !MapboxGL;

  return (
    <View style={styles.root}>
      {/* ------------------------------------------------------------------ */}
      {/* Filter bar */}
      {/* ------------------------------------------------------------------ */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          {GENDER_FILTERS.map((f) => {
            const active = filter === f.key;
            const accentColor = FILTER_COLOR[f.key];
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[
                  styles.filterBtn,
                  active && { backgroundColor: accentColor + '22', borderColor: accentColor },
                ]}
              >
                <Text style={[styles.filterLabel, { color: active ? accentColor : COLORS.textMuted }]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* NightPulse mode toggle */}
        <Pressable
          onPress={() => setMode(mode === 'normal' ? 'nightpulse' : 'normal')}
          style={[styles.pulseToggle, mode === 'nightpulse' && styles.pulseToggleActive]}
        >
          <Text style={[styles.pulseToggleText, mode === 'nightpulse' && { color: COLORS.accent }]}>
            {mode === 'nightpulse' ? '💓 Live' : '💓'}
          </Text>
        </Pressable>
      </View>

      {/* ------------------------------------------------------------------ */}
      {/* Map or ring view */}
      {/* ------------------------------------------------------------------ */}
      {useRingView ? (
        <RingView
          users={visible}
          centerLat={centerLat}
          centerLon={centerLon}
          selectedId={selectedUser?.id ?? null}
          onPressUser={handleSelectUser}
        />
      ) : (
        // Mapbox renders here when available. The try/catch handles runtime
        // errors from the native module after the dynamic import succeeds.
        <MapboxMapView
          MapboxGL={MapboxGL!}
          users={visible}
          centerLat={centerLat}
          centerLon={centerLon}
          selectedId={selectedUser?.id ?? null}
          onPressUser={handleSelectUser}
          onError={() => setMapboxError(true)}
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Profile card overlay */}
      {/* ------------------------------------------------------------------ */}
      {selectedUser && (
        <ProfileCard
          user={selectedUser}
          onClose={handleCloseCard}
          onChat={handleCloseCard}
          onVideo={handleCloseCard}
        />
      )}
    </View>
  );
};

// ---------------------------------------------------------------------------
// MapboxMapView — wrapped in its own component so errors are contained here
// ---------------------------------------------------------------------------

interface MapboxMapViewProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  MapboxGL: any;
  users: MapUser[];
  centerLat: number;
  centerLon: number;
  selectedId: string | null;
  onPressUser: (user: MapUser) => void;
  onError: () => void;
}

class MapboxErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onError: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

function MapboxMapView({ MapboxGL, users, centerLat, centerLon, selectedId, onPressUser, onError }: MapboxMapViewProps) {
  return (
    <MapboxErrorBoundary onError={onError}>
      <MapboxGL.MapView
        style={{ flex: 1 }}
        styleURL={MapboxGL.StyleURL.Dark}
      >
        <MapboxGL.Camera
          centerCoordinate={[centerLon, centerLat]}
          zoomLevel={13}
          pitch={45}
          animationMode="none"
        />

        {users.map((user) => (
          <MapboxGL.MarkerView
            key={user.id}
            coordinate={[user.longitude, user.latitude]}
          >
            <PinMarker
              user={user}
              isSelected={selectedId === user.id}
              onPress={() => onPressUser(user)}
            />
          </MapboxGL.MarkerView>
        ))}
      </MapboxGL.MapView>
    </MapboxErrorBoundary>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0f' },

  filterBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 52,
    paddingBottom: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(10,10,15,0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 8,
  },
  filterContent: { gap: 6, paddingRight: 8 },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  filterLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.4 },

  pulseToggle: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pulseToggleActive: {
    borderColor: COLORS.accent,
    backgroundColor: 'rgba(127,255,212,0.1)',
  },
  pulseToggleText: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
});

export default MapScreen;
