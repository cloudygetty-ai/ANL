/* eslint-disable @typescript-eslint/no-explicit-any */
// src/screens/IncomingCallModal.tsx
import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Vibration, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useVideoCall } from '../hooks/useVideoCall';

const VIBRATE_PATTERN = [0, 500, 300, 500, 300, 500];

export default function IncomingCallModal({ route, navigation }: any) {
  const { callId, callerId, callerName, callType } = route.params;
  const { acceptCall, rejectCall } = useVideoCall();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulse animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    pulse.start();

    // Vibration
    if (Platform.OS !== 'web') Vibration.vibrate(VIBRATE_PATTERN, true);

    return () => {
      pulse.stop();
      Vibration.cancel();
    };
  }, []);

  const handleAccept = async () => {
    Vibration.cancel();
    await acceptCall(callId, callerId);
    navigation.replace('VideoCall', {
      callId, targetUserId: callerId, callType, isIncoming: true,
    });
  };

  const handleReject = () => {
    Vibration.cancel();
    rejectCall(callId);
    navigation.goBack();
  };

  return (
    <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
      <View style={styles.container}>
        {/* Avatar pulse */}
        <Animated.View style={[styles.avatarRing, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {callerName?.charAt(0)?.toUpperCase() ?? '?'}
            </Text>
          </View>
        </Animated.View>

        <Text style={styles.callType}>
          Incoming {callType === 'video' ? '📹 Video' : '📞 Audio'} Call
        </Text>
        <Text style={styles.callerName}>{callerName}</Text>
        <Text style={styles.subtitle}>AllNightLong</Text>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.rejectBtn} onPress={handleReject}>
            <Ionicons name="call" size={28} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept}>
            <Ionicons name={callType === 'video' ? 'videocam' : 'call'} size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>Swipe up to message</Text>
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  avatarRing: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 3, borderColor: 'rgba(168,85,247,0.5)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#1f0a2e',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#a855f7', fontSize: 40, fontWeight: '700' },
  callType: { color: '#9ca3af', fontSize: 14, letterSpacing: 1 },
  callerName: { color: '#fff', fontSize: 32, fontWeight: '700', marginTop: 4 },
  subtitle: { color: '#4b5563', fontSize: 13 },
  actions: {
    flexDirection: 'row', gap: 60, marginTop: 48,
  },
  rejectBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#ef4444',
    alignItems: 'center', justifyContent: 'center',
  },
  acceptBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#22c55e',
    alignItems: 'center', justifyContent: 'center',
  },
  hint: { color: '#374151', fontSize: 12, marginTop: 32 },
});
