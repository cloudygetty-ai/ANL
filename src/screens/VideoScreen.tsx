// src/screens/VideoScreen.tsx
// Video call screen. Accepts route params {roomId, token, peerName} when
// launched from a deep link or ProfileCard. When no params are provided it
// renders a "no active call" placeholder so it can also live as a tab.
//
// LiveKit is imported dynamically — if the native module is not linked the
// screen falls back to a "Video unavailable" message rather than crashing.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { GlowButton } from '@components';
import { videoService, isLiveKitReady } from '@services/video';
import { useUserStore } from '@services/state/userStore';
import { COLORS, VIDEO } from '@config/constants';
import type { VideoRoom } from '@types/index';

// ---------------------------------------------------------------------------
// LiveKit — loaded conditionally so the app doesn't crash without the native
// module. The RN LiveKit SDK re-exports from livekit-client.
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let LiveKit: any = null;
try {
  // WHY: dynamic require isolates the native-module dependency; screens that
  // don't navigate here never pay the load cost.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  LiveKit = require('@livekit/react-native');
} catch {
  // LiveKit not installed — fallback UI will render instead.
}

// ---------------------------------------------------------------------------
// Module-level service
// ---------------------------------------------------------------------------

// WHY: use the singleton exported from the service module — not a new instance —
// so all screens share the same connection state.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Route params expected when the screen is opened from another screen. */
export interface VideoScreenParams {
  roomId?: string;
  token?: string;
  peerName?: string;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Circular icon button used in the bottom toolbar. */
function ToolbarButton({
  glyph,
  label,
  active,
  danger,
  onPress,
}: {
  glyph: string;
  label: string;
  active?: boolean;
  danger?: boolean;
  onPress: () => void;
}) {
  const bg = danger
    ? COLORS.error
    : active
    ? COLORS.accent
    : 'rgba(255,255,255,0.1)';

  const glyphColor = active && !danger ? COLORS.bg : COLORS.text;

  return (
    <TouchableOpacity style={styles.toolbarBtn} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.toolbarBtnInner, { backgroundColor: bg }]}>
        <Text style={[styles.toolbarGlyph, { color: glyphColor }]}>{glyph}</Text>
      </View>
      <Text style={styles.toolbarLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

/** Overlay shown when video is not available at all (no LiveKit module). */
function VideoUnavailable() {
  return (
    <View style={styles.centered}>
      <Text style={styles.unavailableGlyph}>🎥</Text>
      <Text style={styles.unavailableTitle}>Video Unavailable</Text>
      <Text style={styles.unavailableSub}>
        The video module is not installed in this build.
        {'\n'}Reach out via chat instead.
      </Text>
    </View>
  );
}

/** Shown on the tab when no call is in progress. */
function NoCallPlaceholder() {
  return (
    <View style={styles.centered}>
      <Text style={styles.placeholderGlyph}>📹</Text>
      <Text style={styles.placeholderTitle}>No active call</Text>
      <Text style={styles.placeholderSub}>
        Start a video call from someone's profile.
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface VideoScreenProps {
  // React Navigation passes route when the screen is in a stack navigator.
  // When it lives as a tab, route.params may be undefined.
  route?: { params?: VideoScreenParams };
}

const VideoScreen: React.FC<VideoScreenProps> = ({ route }) => {
  const params: VideoScreenParams = route?.params ?? {};
  const { roomId, peerName } = params;

  const profile = useUserStore((s) => s.profile);
  const localName = profile?.displayName ?? 'Guest';

  // Connection state
  const [room, setRoom] = useState<VideoRoom | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Control state
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);

  // Auto-hide controls timer — toolbar fades after VIDEO.controlsAutoHideMs
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------------------------------------------------------------------------
  // Connect to room when roomId param is available
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!roomId) return;

    let cancelled = false;

    async function connect() {
      setIsConnecting(true);
      setConnectError(null);

      try {
        const preparedRoom = await videoService.createRoom(roomId!);
        if (!cancelled) {
          setRoom(preparedRoom);
          setIsConnected(preparedRoom.isConnected);
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Connection failed';
          setConnectError(msg);
        }
      } finally {
        if (!cancelled) setIsConnecting(false);
      }
    }

    connect();
    return () => { cancelled = true; };
  }, [roomId, localName]);

  // ---------------------------------------------------------------------------
  // Controls auto-hide
  // ---------------------------------------------------------------------------
  const resetHideTimer = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setControlsVisible(true);
    hideTimer.current = setTimeout(
      () => setControlsVisible(false),
      VIDEO.controlsAutoHideMs,
    );
  }, []);

  useEffect(() => {
    if (isConnected) resetHideTimer();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [isConnected, resetHideTimer]);

  // ---------------------------------------------------------------------------
  // Action handlers
  // ---------------------------------------------------------------------------
  function handleEndCall() {
    // TODO[NORMAL]: call LiveKit room.disconnect() when SDK is wired in
    setRoom(null);
    setIsConnected(false);
    setConnectError(null);
  }

  function handleToggleMic() {
    setIsMicOn((prev) => !prev);
    // TODO[NORMAL]: call LiveKit localParticipant.setMicrophoneEnabled()
  }

  function handleToggleCamera() {
    setIsCameraOn((prev) => !prev);
    // TODO[NORMAL]: call LiveKit localParticipant.setCameraEnabled()
  }

  function handleTapScreen() {
    if (isConnected) resetHideTimer();
  }

  // ---------------------------------------------------------------------------
  // Early exits — no LiveKit, no params
  // ---------------------------------------------------------------------------

  if (!LiveKit && !isLiveKitReady) {
    return (
      <View style={styles.root}>
        <VideoUnavailable />
      </View>
    );
  }

  if (!roomId) {
    return (
      <View style={styles.root}>
        <NoCallPlaceholder />
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Connecting spinner
  // ---------------------------------------------------------------------------
  if (isConnecting) {
    return (
      <View style={styles.root}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.connectingText}>Connecting to {peerName ?? 'room'}...</Text>
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------
  if (connectError) {
    return (
      <View style={styles.root}>
        <View style={styles.centered}>
          <Text style={styles.errorGlyph}>⚠️</Text>
          <Text style={styles.errorTitle}>Could not connect</Text>
          <Text style={styles.errorSub}>{connectError}</Text>
          <View style={styles.errorAction}>
            <GlowButton
              title="Try Again"
              onPress={() => {
                setConnectError(null);
                setIsConnecting(false);
              }}
            />
          </View>
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Active call layout
  // ---------------------------------------------------------------------------
  return (
    <TouchableOpacity
      style={styles.root}
      activeOpacity={1}
      onPress={handleTapScreen}
    >
      {/* Remote video — full screen background */}
      <View style={styles.remoteVideo}>
        {/* WHY: When LiveKit is wired, replace this View with
            <VideoView trackRef={remoteTrack} style={StyleSheet.absoluteFill} />
            from @livekit/react-native */}
        <View style={styles.remoteVideoPlaceholder}>
          <Text style={styles.remoteName}>{peerName ?? 'Remote'}</Text>
          <Text style={styles.remoteSubtext}>
            {isConnected ? 'Connected' : 'Waiting for connection...'}
          </Text>
        </View>
      </View>

      {/* Local camera — small overlay in top-right */}
      <View style={styles.localVideo}>
        {/* WHY: When LiveKit is wired, replace this View with
            <VideoView trackRef={localTrack} style={{ flex: 1 }} mirror /> */}
        <View style={styles.localVideoPlaceholder}>
          <Text style={styles.localInitial}>
            {localName.charAt(0).toUpperCase()}
          </Text>
        </View>

        {/* Camera off indicator */}
        {!isCameraOn && (
          <View style={styles.cameraOffOverlay}>
            <Text style={styles.cameraOffIcon}>📵</Text>
          </View>
        )}
      </View>

      {/* Toolbar — auto-hides after inactivity */}
      {controlsVisible && (
        <View style={styles.toolbar} pointerEvents="box-none">
          {/* Peer name badge */}
          <Text style={styles.peerBadge}>{peerName ?? 'Video Call'}</Text>

          {/* Control buttons */}
          <View style={styles.toolbarButtons}>
            <ToolbarButton
              glyph={isMicOn ? '🎙️' : '🔇'}
              label={isMicOn ? 'Mute' : 'Unmute'}
              active={isMicOn}
              onPress={handleToggleMic}
            />

            <ToolbarButton
              glyph={isCameraOn ? '📷' : '🚫'}
              label={isCameraOn ? 'Camera' : 'Camera Off'}
              active={isCameraOn}
              onPress={handleToggleCamera}
            />

            <ToolbarButton
              glyph="📵"
              label="End"
              danger
              onPress={handleEndCall}
            />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  // --- Remote video (full screen) ---
  remoteVideo: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0d0d14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  remoteVideoPlaceholder: {
    alignItems: 'center',
    gap: 8,
  },
  remoteName: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  remoteSubtext: {
    color: COLORS.textMuted,
    fontSize: 14,
  },

  // --- Local video overlay ---
  localVideo: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 20,
    right: 16,
    width: 100,
    height: 140,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    // Drop shadow so it floats visually above the remote feed
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 10,
  },
  localVideoPlaceholder: {
    flex: 1,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  localInitial: {
    color: COLORS.accent,
    fontSize: 32,
    fontWeight: '700',
  },
  cameraOffOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraOffIcon: { fontSize: 28 },

  // --- Toolbar (bottom controls) ---
  toolbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 44 : 20,
    paddingTop: 16,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.55)',
    gap: 12,
  },
  peerBadge: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  toolbarButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  toolbarBtn: {
    alignItems: 'center',
    gap: 6,
  },
  toolbarBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarGlyph: { fontSize: 22 },
  toolbarLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },

  // --- Shared states ---
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  connectingText: {
    color: COLORS.textMuted,
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },

  // --- Video unavailable ---
  unavailableGlyph: { fontSize: 48, marginBottom: 8 },
  unavailableTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
  },
  unavailableSub: {
    color: COLORS.textMuted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },

  // --- No active call ---
  placeholderGlyph: { fontSize: 48, marginBottom: 8 },
  placeholderTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
  },
  placeholderSub: {
    color: COLORS.textMuted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },

  // --- Error state ---
  errorGlyph: { fontSize: 40, marginBottom: 8 },
  errorTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
  },
  errorSub: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorAction: {
    marginTop: 12,
  },
});

export default VideoScreen;
