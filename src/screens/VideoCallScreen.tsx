// src/screens/VideoCallScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoCall } from '../hooks/useVideoCall';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

const { width: SW, height: SH } = Dimensions.get('window');

const C = {
  bg: '#04040a', surface: '#0d0d14', border: 'rgba(168,85,247,0.18)',
  purple: '#a855f7', red: '#f87171', green: '#4ade80', text: '#f0eee8', textDim: 'rgba(240,238,232,0.5)',
};

type Props = NativeStackScreenProps<any, 'VideoCall'>;

const VideoCallScreen: React.FC<Props> = ({ route, navigation }) => {
  const { callId, targetUserId, callType, isIncoming } = route.params ?? {};
  const { callState, isMuted, isCameraOff, endCall, toggleMute, toggleCamera } = useVideoCall();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;

  const handleEnd = () => { endCall(); navigation.goBack(); };

  return (
    <View style={s.bg}>
      {/* Remote video placeholder */}
      <View style={s.remotePlaceholder}>
        <Text style={s.callerEmoji}>🌙</Text>
        <Text style={s.callerName}>{callType === 'audio' ? '🎙' : '📹'} {isIncoming ? 'Incoming' : 'Calling'}…</Text>
        <Text style={s.timer}>{fmt(elapsed)}</Text>
      </View>

      {/* Controls */}
      <SafeAreaView style={s.controls} edges={['bottom']}>
        <TouchableOpacity style={[s.ctrl, isMuted && s.ctrlActive]} onPress={toggleMute}>
          <Text style={s.ctrlIcon}>{isMuted ? '🔇' : '🎤'}</Text>
          <Text style={s.ctrlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.endBtn} onPress={handleEnd}>
          <Text style={s.endIcon}>📞</Text>
        </TouchableOpacity>

        {callType !== 'audio' && (
          <TouchableOpacity style={[s.ctrl, isCameraOff && s.ctrlActive]} onPress={toggleCamera}>
            <Text style={s.ctrlIcon}>{isCameraOff ? '📵' : '📷'}</Text>
            <Text style={s.ctrlLabel}>{isCameraOff ? 'Cam On' : 'Cam Off'}</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </View>
  );
};

const s = StyleSheet.create({
  bg:                { flex: 1, backgroundColor: '#000' },
  remotePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  callerEmoji:       { fontSize: 80, marginBottom: 20 },
  callerName:        { fontSize: 18, color: '#fff', fontWeight: '600', marginBottom: 8 },
  timer:             { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  controls:          { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 40, paddingBottom: 20, paddingTop: 16 },
  ctrl:              { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 40, padding: 16, width: 72 },
  ctrlActive:        { backgroundColor: 'rgba(248,113,113,0.25)' },
  ctrlIcon:          { fontSize: 24 },
  ctrlLabel:         { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  endBtn:            { width: 72, height: 72, borderRadius: 36, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
  endIcon:           { fontSize: 30 },
});

export default VideoCallScreen;
