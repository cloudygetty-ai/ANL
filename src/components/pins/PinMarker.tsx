// src/components/pins/PinMarker.tsx
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { COLORS } from '@config/constants';
import type { MapUser } from '@types/index';

// === Constants ===

const PIN_W = 40;
const PIN_H = 50;
const PULSE_SIZE = 60;

// Maps Gender -> fill color using design tokens from constants
const GENDER_COLOR: Record<MapUser['gender'], string> = {
  female: COLORS.female,
  male: COLORS.male,
  trans_woman: COLORS.transWoman,
  trans_man: COLORS.transMan,
  non_binary: COLORS.nonBinary,
};

// Presence dot colors
const PRESENCE_DOT: Record<MapUser['presence'], string> = {
  online: COLORS.success,
  away: COLORS.warning,
  offline: COLORS.textMuted,
};

// === Types ===

interface PinMarkerProps {
  user: MapUser;
  onPress: () => void;
  isSelected: boolean;
}

// === Component ===

const PinMarker: React.FC<PinMarkerProps> = ({ user, onPress, isSelected }) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  const pinColor = GENDER_COLOR[user.gender];
  const initial = user.displayName.charAt(0).toUpperCase();
  const dotColor = PRESENCE_DOT[user.presence];
  const showBadge = user.matchScore > 0;

  // Start / stop the pulsing ring animation based on selection state
  useEffect(() => {
    if (isSelected) {
      pulseAnim.setValue(0);
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(0);
    }

    return () => {
      pulseLoop.current?.stop();
    };
  }, [isSelected, pulseAnim]);

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1.1],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.5, 0],
  });

  return (
    <Pressable onPress={onPress} style={styles.container}>
      {/* Pulsing selection ring — rendered behind the pin */}
      {isSelected && (
        <Animated.View
          style={[
            styles.pulse,
            {
              transform: [{ scale: pulseScale }],
              opacity: pulseOpacity,
              borderColor: pinColor,
            },
          ]}
        />
      )}

      {/* Teardrop SVG pin body */}
      <Svg width={PIN_W} height={PIN_H} viewBox="0 0 40 50">
        {/* Teardrop path: circle top + pointed bottom tip */}
        <Path
          d="M20 2 C9.507 2 1 10.507 1 21 C1 31.493 20 48 20 48 C20 48 39 31.493 39 21 C39 10.507 30.493 2 20 2Z"
          fill={pinColor}
          stroke="rgba(0,0,0,0.35)"
          strokeWidth="1.5"
        />
        {/* Inner circle that frames the initial letter */}
        <Circle cx="20" cy="20" r="13" fill="rgba(0,0,0,0.28)" />
      </Svg>

      {/* Initial letter centered inside the pin circle */}
      <View style={styles.initialOverlay}>
        <Text style={styles.initial}>{initial}</Text>
      </View>

      {/* Presence dot — bottom-right of the pin head */}
      <View style={[styles.dot, { backgroundColor: dotColor }]} />

      {/* Match badge — top-right corner, shown only when score > 0 */}
      {showBadge && (
        <View style={[styles.badge, { backgroundColor: pinColor }]}>
          <Text style={styles.badgeText}>{user.matchScore}%</Text>
        </View>
      )}
    </Pressable>
  );
};

// === Styles ===

const styles = StyleSheet.create({
  container: {
    width: PIN_W,
    height: PIN_H,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  pulse: {
    position: 'absolute',
    width: PULSE_SIZE,
    height: PULSE_SIZE,
    borderRadius: PULSE_SIZE / 2,
    borderWidth: 2,
    top: (PIN_W - PULSE_SIZE) / 2,
    left: (PIN_W - PULSE_SIZE) / 2,
  },
  // WHY: absolute overlay so the SVG and the text don't fight for layout space
  initialOverlay: {
    position: 'absolute',
    top: 7,
    left: 0,
    width: PIN_W,
    alignItems: 'center',
  },
  initial: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  dot: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 4.5,
    bottom: 14,
    right: 2,
    borderWidth: 1.5,
    borderColor: '#0a0a0f',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 28,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});

export default PinMarker;
