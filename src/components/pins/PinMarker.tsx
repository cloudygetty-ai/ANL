// src/components/pins/PinMarker.tsx
// React Native SVG pin marker — used as MapView Marker children
import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import type { MapUser } from '@types/index';

interface Props {
  user:       MapUser;
  selected?:  boolean;
  onPress?:   () => void;
  size?:      number;
}

const pinColor = (u: MapUser): string => {
  if (u.gender === 'f')  return u.match >= 90 ? '#ff3c64' : u.match >= 75 ? '#ffa032' : '#ffcc44';
  if (u.gender === 'm')  return u.match >= 90 ? '#7c3aed' : u.match >= 75 ? '#9333ea' : '#a855f7';
  if (u.gender === 'tw') return u.match >= 90 ? '#f7a8c4' : '#55cdfc';
  return '#55cdfc';
};

const PinMarker: React.FC<Props> = ({ user, selected = false, onPress, size = 40 }) => {
  const pulse  = useRef(new Animated.Value(1)).current;
  const ring   = useRef(new Animated.Value(0)).current;
  const col    = pinColor(user);

  useEffect(() => {
    if (!user.online) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.08, duration: 900, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,    duration: 900, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
    ]));
    const ringLoop = Animated.loop(Animated.sequence([
      Animated.timing(ring, { toValue: 1, duration: 2400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.delay(400),
    ]));
    loop.start();
    ringLoop.start();
    return () => { loop.stop(); ringLoop.stop(); };
  }, [user.online]);

  const ringScale   = ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.6, 0.3, 0] });

  const s = selected ? size * 1.3 : size;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.wrap}>
      {/* Pulse ring */}
      {user.online && (
        <Animated.View style={[
          styles.ring,
          {
            width:  s * 1.6,
            height: s * 1.6,
            borderRadius: s * 0.8,
            borderColor: col,
            transform: [{ scale: ringScale }],
            opacity: ringOpacity,
            marginLeft: -(s * 1.6 - s) / 2,
            marginTop:  -(s * 1.6 - s) / 2,
          },
        ]} />
      )}

      {/* Pin body */}
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <Svg width={s} height={s * 1.2} viewBox="0 0 56 68">
          <Defs>
            <RadialGradient id="pinGrad" cx="40%" cy="35%" r="65%">
              <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
              <Stop offset="100%" stopColor={col} stopOpacity="1" />
            </RadialGradient>
          </Defs>
          {/* Teardrop shape */}
          <Path
            d="M28,2 C16,2 6,12 6,24 C6,40 28,66 28,66 C28,66 50,40 50,24 C50,12 40,2 28,2Z"
            fill={selected ? col : "url(#pinGrad)"}
            stroke={selected ? "#fff" : col}
            strokeWidth={selected ? 3 : 1.5}
          />
          {/* Inner circle */}
          <Circle cx="28" cy="24" r="11" fill="rgba(0,0,0,0.25)" />
          {/* Gender icon center */}
          {user.gender === 'f'  && <Path d="M28,18 C24,18 21,21 21,25 C21,29 24,32 28,32 C32,32 35,29 35,25 C35,21 32,18 28,18Z" fill="#fff" opacity="0.9"/>}
          {user.gender === 'm'  && <Path d="M22,30 L34,18 M34,18 L34,24 M34,18 L28,18" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" fill="none"/>}
          {user.gender === 'tw' && <Path d="M28,18 L25,28 L28,32 L31,28 Z" fill="#fff" opacity="0.9"/>}
          {user.gender === 'tm' && <Path d="M23,25 L33,25 M28,20 L28,30" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>}
        </Svg>
      </Animated.View>

      {/* Online dot */}
      {user.online && (
        <View style={[styles.onlineDot, { backgroundColor: '#4ade80', right: s * 0.05, top: s * 0.05 }]} />
      )}

      {/* Match badge */}
      {user.match >= 90 && (
        <View style={[styles.matchBadge, { backgroundColor: col, right: -4, top: -4 }]}>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrap:       { alignItems: 'center', justifyContent: 'center' },
  ring:       { position: 'absolute', borderWidth: 1.5 },
  onlineDot:  { position: 'absolute', width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#04040a' },
  matchBadge: { position: 'absolute', width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: '#fff' },
});

export default PinMarker;
