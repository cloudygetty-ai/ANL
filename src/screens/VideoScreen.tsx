/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-var-requires */
// src/screens/VideoScreen.tsx
// Full-screen video call UI — 1:1 (DM) and group (up to 12)
// Stack: @livekit/react-native | falls back to placeholder if not linked
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VideoService } from '@services/video/VideoService';
import type { VideoParticipant } from '@types/index';

const { width: SW, height: _SH } = Dimensions.get('window');

const C = {
  bg:      '#000',
  overlay: 'rgba(4,4,10,0.85)',
  surface: 'rgba(13,13,20,0.9)',
  border:  'rgba(168,85,247,0.25)',
  purple:  '#a855f7',
  amber:   '#fbbf24',
  green:   '#4ade80',
  red:     '#f87171',
  cyan:    '#22d3ee',
  text:    '#f0eee8',
  textDim: 'rgba(240,238,232,0.5)',
};

const CURRENT_USER_ID = 'me';

// ── Participant tile ──────────────────────────────────────────────────────────
const ParticipantTile: React.FC<{
  participant: VideoParticipant;
  isLocal:     boolean;
  size:        'full' | 'pip' | 'grid';
  videoTrack?: any;
}> = ({ participant, isLocal, size, videoTrack }) => {
  const speakerPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (participant.isSpeaking) {
      const loop = Animated.loop(Animated.sequence([
        Animated.timing(speakerPulse, { toValue: 1.06, duration: 200, useNativeDriver: true }),
        Animated.timing(speakerPulse, { toValue: 1,    duration: 200, useNativeDriver: true }),
      ]));
      loop.start();
      return () => loop.stop();
    } else {
      speakerPulse.setValue(1);
    }
  }, [participant.isSpeaking]);

  // Attempt LiveKit VideoView render
  let LiveKitVideoView: any = null;
  try {
    const lk = require('@livekit/react-native');
    LiveKitVideoView = lk.VideoView;
  } catch { /* not linked */ }

  const containerStyle = size === 'full' ? styles.tileFull
    : size === 'pip'  ? styles.tilePip
    : styles.tileGrid;

  return (
    <Animated.View style={[containerStyle, participant.isSpeaking && { transform: [{ scale: speakerPulse }] }]}>
      {/* Video track or avatar fallback */}
      {LiveKitVideoView && videoTrack ? (
        <LiveKitVideoView
          style={StyleSheet.absoluteFill}
          videoTrack={videoTrack}
          objectFit="cover"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.avatarFill]}>
          <Text style={styles.avatarInitial}>{(participant.name[0] ?? '?').toUpperCase()}</Text>
          {participant.isCamOff && (
            <View style={styles.camOffBadge}>
              <Text style={{ fontSize: 16 }}>📷</Text>
              <Text style={styles.camOffText}>Camera off</Text>
            </View>
          )}
        </View>
      )}

      {/* Speaker border */}
      {participant.isSpeaking && (
        <View style={[StyleSheet.absoluteFill, styles.speakerBorder]} />
      )}

      {/* Name + mute badge */}
      <View style={styles.tileFooter}>
        {isLocal && <View style={styles.youBadge}><Text style={styles.youBadgeText}>YOU</Text></View>}
        <Text style={styles.tileName} numberOfLines={1}>{participant.name}</Text>
        {participant.isMuted && <Text style={{ fontSize: 12 }}>🔇</Text>}
      </View>
    </Animated.View>
  );
};

// ── Control button ─────────────────────────────────────────────────────────────
const CtrlBtn: React.FC<{
  icon:     string;
  label:    string;
  active?:  boolean;
  danger?:  boolean;
  onPress:  () => void;
}> = ({ icon, label, active = true, danger = false, onPress }) => (
  <TouchableOpacity style={styles.ctrlBtnWrap} onPress={onPress}>
    <View style={[
      styles.ctrlBtn,
      !active && styles.ctrlBtnOff,
      danger  && styles.ctrlBtnDanger,
    ]}>
      <Text style={{ fontSize: 22 }}>{icon}</Text>
    </View>
    <Text style={styles.ctrlLabel}>{label}</Text>
  </TouchableOpacity>
);

// ── Main VideoScreen ──────────────────────────────────────────────────────────
const VideoScreen: React.FC<{ navigation?: any; route?: any }> = ({ navigation, route }) => {
  const targetId   = route?.params?.userId   ?? 'demo-user';
  const targetName = route?.params?.userName ?? 'Someone';

  const [participants, setParticipants]   = useState<VideoParticipant[]>([
    { id: 'demo-remote', name: targetName, isMuted: false, isCamOff: false, isSpeaking: false },
    { id: CURRENT_USER_ID, name: 'You', isMuted: false, isCamOff: false, isSpeaking: false },
  ]);
  const [isMuted,   setIsMuted]   = useState(false);
  const [isCamOff,  setIsCamOff]  = useState(false);
  const [callState, setCallState] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const [duration,  setDuration]  = useState(0);
  const [_showCtrl,  setShowCtrl]  = useState(true);
  const [room,      setRoom]      = useState<any>(null);

  const ctrlOpacity = useRef(new Animated.Value(1)).current;
  const connectAnim = useRef(new Animated.Value(0)).current;
  const service     = useRef(new VideoService(CURRENT_USER_ID)).current;
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideCtrlRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Connect to LiveKit
    (async () => {
      try {
        const token = await service.getToken(targetId);
        const disconnect = await service.joinRoom(token, (p) => setParticipants(p));
        setCallState('connected');
        setRoom({ disconnect });

        Animated.timing(connectAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        durationRef.current = setInterval(() => setDuration(d => d + 1), 1000);

        return () => {
          disconnect();
          if (durationRef.current) clearInterval(durationRef.current);
        };
      } catch (err) {
        console.warn('[VideoScreen] Connection failed, using preview mode:', err);
        setCallState('connected'); // Show UI in dev mode
        Animated.timing(connectAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        durationRef.current = setInterval(() => setDuration(d => d + 1), 1000);
      }
    })();

    return () => {
      if (durationRef.current) clearInterval(durationRef.current);
    };
  }, []);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleEnd = useCallback(() => {
    room?.disconnect?.();
    if (durationRef.current) clearInterval(durationRef.current);
    setCallState('ended');
    setTimeout(() => navigation?.goBack(), 800);
  }, [room]);

  const handleToggleMute = useCallback(async () => {
    setIsMuted(v => !v);
    await service.setMicEnabled(room, isMuted); // flip
  }, [isMuted, room]);

  const handleToggleCam = useCallback(async () => {
    setIsCamOff(v => !v);
    await service.setCameraEnabled(room, isCamOff);
  }, [isCamOff, room]);

  // Auto-hide controls after 4s
  const showControls = useCallback(() => {
    setShowCtrl(true);
    Animated.timing(ctrlOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    if (hideCtrlRef.current) clearTimeout(hideCtrlRef.current);
    hideCtrlRef.current = setTimeout(() => {
      Animated.timing(ctrlOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(
        () => setShowCtrl(false)
      );
    }, 4000);
  }, []);

  useEffect(() => { showControls(); }, []);

  const isGroup     = participants.length > 2;
  const remoteUser  = participants.find(p => p.id !== CURRENT_USER_ID);
  const localUser   = participants.find(p => p.id === CURRENT_USER_ID);

  if (callState === 'ended') {
    return (
      <View style={styles.endedScreen}>
        <Text style={styles.endedIcon}>📞</Text>
        <Text style={styles.endedTitle}>Call ended</Text>
        <Text style={styles.endedDuration}>{formatDuration(duration)}</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Full-screen remote video (or avatar) */}
      {!isGroup && remoteUser && (
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={showControls} activeOpacity={1}>
          <ParticipantTile
            participant={remoteUser}
            isLocal={false}
            size="full"
          />
        </TouchableOpacity>
      )}

      {/* Group grid */}
      {isGroup && (
        <ScrollView contentContainerStyle={styles.groupGrid}>
          {participants.filter(p => p.id !== CURRENT_USER_ID).map(p => (
            <ParticipantTile key={p.id} participant={p} isLocal={false} size="grid" />
          ))}
        </ScrollView>
      )}

      {/* Header overlay */}
      <Animated.View style={[styles.callHeader, { opacity: ctrlOpacity }]}>
        <SafeAreaView edges={['top']}>
          <View style={styles.callHeaderInner}>
            <View>
              <Text style={styles.callName}>{isGroup ? `Group · ${participants.length}` : targetName}</Text>
              <Text style={styles.callTimer}>
                {callState === 'connecting' ? 'Connecting...' : formatDuration(duration)}
              </Text>
            </View>
            <View style={styles.callQuality}>
              <View style={[styles.qualityDot, { backgroundColor: C.green }]} />
              <Text style={styles.qualityText}>HD</Text>
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>

      {/* PiP local video */}
      {!isGroup && localUser && (
        <View style={styles.pip}>
          <ParticipantTile participant={{ ...localUser, isMuted, isCamOff }} isLocal size="pip" />
        </View>
      )}

      {/* Controls */}
      <Animated.View style={[styles.controls, { opacity: ctrlOpacity }]}>
        <View style={styles.controlsRow}>
          <CtrlBtn icon={isMuted   ? '🔇' : '🎙️'} label={isMuted   ? 'Unmute' : 'Mute'}   active={!isMuted}   onPress={handleToggleMute} />
          <CtrlBtn icon={isCamOff  ? '📷' : '📹'}  label={isCamOff  ? 'Show'   : 'Camera'} active={!isCamOff}  onPress={handleToggleCam}  />
          <CtrlBtn icon="🔄" label="Flip"   onPress={() => {}} />
          <CtrlBtn icon="📞" label="End"    danger onPress={handleEnd} />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex:1, backgroundColor:C.bg },

  // Tiles
  tileFull: { ...StyleSheet.absoluteFillObject, backgroundColor:'#0a0a0f' },
  tilePip:  { width:110, height:160, borderRadius:16, overflow:'hidden', backgroundColor:'#0d0d14', borderWidth:2, borderColor:C.border },
  tileGrid: { width:(SW-48)/2, height:(SW-48)/2, borderRadius:16, overflow:'hidden', backgroundColor:'#0d0d14', borderWidth:1, borderColor:C.border },

  avatarFill:   { alignItems:'center', justifyContent:'center', backgroundColor:'#0d0d14' },
  avatarInitial:{ fontSize:72, fontWeight:'900', color:'rgba(240,238,232,0.15)' },
  camOffBadge:  { position:'absolute', bottom:16, alignItems:'center', gap:4 },
  camOffText:   { fontSize:11, color:'rgba(240,238,232,0.4)', fontWeight:'600' },
  speakerBorder:{ borderWidth:2, borderColor:C.green, borderRadius:0 },
  tileFooter:   { position:'absolute', bottom:0, left:0, right:0, flexDirection:'row', alignItems:'center', gap:6, padding:10, background:'linear-gradient(transparent,rgba(0,0,0,0.7))' } as any,
  tileName:     { flex:1, fontSize:12, fontWeight:'700', color:C.text },
  youBadge:     { backgroundColor:C.purple, borderRadius:6, paddingHorizontal:6, paddingVertical:2 },
  youBadgeText: { fontSize:9, fontWeight:'800', color:'#fff', letterSpacing:1 },

  // Group grid
  groupGrid: { flexDirection:'row', flexWrap:'wrap', gap:12, padding:16, paddingTop:100 },

  // Header
  callHeader:      { position:'absolute', top:0, left:0, right:0 },
  callHeaderInner: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:20, paddingBottom:16 },
  callName:        { fontSize:18, fontWeight:'800', color:C.text },
  callTimer:       { fontSize:13, color:C.textDim, marginTop:2 },
  callQuality:     { flexDirection:'row', alignItems:'center', gap:5, backgroundColor:C.surface, paddingHorizontal:10, paddingVertical:5, borderRadius:12, borderWidth:1, borderColor:C.border },
  qualityDot:      { width:6, height:6, borderRadius:3 },
  qualityText:     { fontSize:11, fontWeight:'700', color:C.text },

  // PiP
  pip: { position:'absolute', top:100, right:16 },

  // Controls
  controls:    { position:'absolute', bottom:0, left:0, right:0, paddingBottom:Platform.OS === 'ios' ? 40 : 24 },
  controlsRow: { flexDirection:'row', justifyContent:'center', gap:16, paddingHorizontal:24 },
  ctrlBtnWrap: { alignItems:'center', gap:6 },
  ctrlBtn:     { width:60, height:60, borderRadius:20, backgroundColor:'rgba(13,13,20,0.85)', alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:'rgba(255,255,255,0.12)' },
  ctrlBtnOff:  { backgroundColor:'rgba(168,85,247,0.2)', borderColor:'rgba(168,85,247,0.4)' },
  ctrlBtnDanger:{ backgroundColor:'rgba(248,113,113,0.25)', borderColor:'rgba(248,113,113,0.5)' },
  ctrlLabel:   { fontSize:10, color:C.textDim, fontWeight:'600', letterSpacing:0.3 },

  // Ended
  endedScreen:   { flex:1, backgroundColor:C.bg, alignItems:'center', justifyContent:'center', gap:12 },
  endedIcon:     { fontSize:48 },
  endedTitle:    { fontSize:24, fontWeight:'900', color:C.text, letterSpacing:1 },
  endedDuration: { fontSize:16, color:C.textDim },
});

export default VideoScreen;
