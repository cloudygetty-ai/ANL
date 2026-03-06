// src/services/video/VideoService.ts
// Stack: LiveKit (open-source WebRTC, self-hostable or livekit.io cloud)
// Supports: 1:1 video calls, group video rooms (up to 12 for ANL groups)
import type { VideoRoom, VideoParticipant } from '@types/index';

// Lazy LiveKit import
let LiveKit: any = null;
const getLiveKit = () => {
  if (LiveKit) return LiveKit;
  try { LiveKit = require('@livekit/react-native'); } catch { /* not linked */ }
  return LiveKit;
};

export interface VideoToken {
  token: string;
  roomName: string;
  serverUrl: string;
}

export class VideoService {
  private userId: string;
  private apiBase: string;

  constructor(userId: string, apiBase = process.env.EXPO_PUBLIC_API_URL ?? '') {
    this.userId  = userId;
    this.apiBase = apiBase;
  }

  /**
   * Request a LiveKit token from your backend.
   * Backend validates the match exists between userId + targetId
   * and issues a short-lived JWT room token.
   */
  async getToken(targetId: string, roomType: 'dm' | 'group' = 'dm'): Promise<VideoToken> {
    if (!this.apiBase) {
      // Dev stub — real token needed for LiveKit
      return {
        token:    'dev-stub-token',
        roomName: `anl-${[this.userId, targetId].sort().join('-')}`,
        serverUrl: 'wss://your-livekit-server.livekit.cloud',
      };
    }

    const res = await fetch(`${this.apiBase}/video/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId:   this.userId,
        targetId,
        roomType,
      }),
    });
    if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);
    return res.json();
  }

  /**
   * Join a video room.
   * Returns a disconnect function.
   */
  async joinRoom(token: VideoToken, onParticipantUpdate: (p: VideoParticipant[]) => void): Promise<() => void> {
    const lk = getLiveKit();
    if (!lk) {
      console.warn('[VideoService] @livekit/react-native not installed');
      return () => {};
    }

    const room = new lk.Room({
      adaptiveStream: true,
      dynacast:       true,
      videoCaptureDefaults: { resolution: lk.VideoPresets.h720.resolution },
    });

    room.on(lk.RoomEvent.ParticipantConnected,    () => syncParticipants(room, onParticipantUpdate));
    room.on(lk.RoomEvent.ParticipantDisconnected, () => syncParticipants(room, onParticipantUpdate));
    room.on(lk.RoomEvent.TrackMuted,              () => syncParticipants(room, onParticipantUpdate));
    room.on(lk.RoomEvent.TrackUnmuted,            () => syncParticipants(room, onParticipantUpdate));
    room.on(lk.RoomEvent.ActiveSpeakersChanged,   () => syncParticipants(room, onParticipantUpdate));

    await room.connect(token.serverUrl, token.token, {
      autoSubscribe: true,
    });

    await room.localParticipant.setCameraEnabled(true);
    await room.localParticipant.setMicrophoneEnabled(true);

    syncParticipants(room, onParticipantUpdate);

    return () => room.disconnect();
  }

  /** Toggle local camera */
  async setCameraEnabled(room: any, enabled: boolean): Promise<void> {
    await room?.localParticipant?.setCameraEnabled(enabled);
  }

  /** Toggle local mic */
  async setMicEnabled(room: any, enabled: boolean): Promise<void> {
    await room?.localParticipant?.setMicrophoneEnabled(enabled);
  }
}

function syncParticipants(room: any, cb: (p: VideoParticipant[]) => void): void {
  const participants: VideoParticipant[] = [
    ...Array.from(room.participants.values()),
    room.localParticipant,
  ].map((p: any) => ({
    id:          p.sid ?? p.identity ?? 'unknown',
    name:        p.name ?? p.identity ?? 'Unknown',
    isMuted:     !p.isMicrophoneEnabled,
    isCamOff:    !p.isCameraEnabled,
    isSpeaking:  p.isSpeaking ?? false,
  }));
  cb(participants);
}
