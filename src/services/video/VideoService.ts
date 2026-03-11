// src/services/video/VideoService.ts
// LiveKit video service: token acquisition, room lifecycle, and local track control.
// All methods degrade gracefully — when the backend is unreachable the service
// returns mock data so the UI can render without a real server connection.

import type { VideoRoom, VideoParticipant } from '@types/index';
import { logger } from '@utils/Logger';

const MODULE = 'VideoService';

// ---------------------------------------------------------------------------
// Environment config
// ---------------------------------------------------------------------------

// WHY: token generation is handled by our own backend, not by LiveKit directly,
// so we only need the project API base URL rather than a LiveKit-specific endpoint.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

// If the API URL is not set the service cannot reach the token endpoint.
const IS_BACKEND_READY = Boolean(API_URL);

// ---------------------------------------------------------------------------
// Mock data helper
// ---------------------------------------------------------------------------

/** Builds a minimal VideoRoom descriptor used when the backend is unavailable. */
function buildMockRoom(roomId: string): VideoRoom {
  return {
    id: roomId,
    token: `mock-token-${roomId}-${Date.now()}`,
    // WHY: localhost URL prevents any real WebSocket connections in mock mode
    url: 'ws://localhost:7880',
    isConnected: false,
    participants: [
      {
        id: 'local-mock',
        name: 'You (mock)',
        isCameraOn: true,
        isMicOn: true,
        isLocal: true,
        avatarUrl: null,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Service class
// ---------------------------------------------------------------------------

export class VideoService {
  // Track state kept on the instance so toggle methods mutate once and callers
  // read the result from getParticipants() without needing an SDK connection.
  private currentRoom: VideoRoom | null = null;
  private cameraOn = true;
  private micOn = true;
  private participants: VideoParticipant[] = [];

  // --------------------------------------------------------------------------
  // Public API — matches the contract defined in the task spec
  // --------------------------------------------------------------------------

  /**
   * Creates or joins a LiveKit room for the given peer ID.
   *
   * Fetches a LiveKit access token from `EXPO_PUBLIC_API_URL/video/token`.
   * On any network failure or non-2xx response the method falls back to a mock
   * VideoRoom so callers always receive a usable object.
   */
  async createRoom(peerId: string): Promise<VideoRoom> {
    const roomId = `room-${peerId}`;
    logger.info(MODULE, 'createRoom', { peerId, backendReady: IS_BACKEND_READY });

    if (!IS_BACKEND_READY) {
      logger.debug(MODULE, 'createRoom — backend not configured, using mock');
      return this._applyRoom(buildMockRoom(roomId));
    }

    try {
      const response = await fetch(`${API_URL}/video/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId }),
      });

      if (!response.ok) {
        throw new Error(`Token endpoint responded with HTTP ${response.status}`);
      }

      const body = (await response.json()) as { token: string; url: string };

      const room: VideoRoom = {
        id: roomId,
        token: body.token,
        url: body.url,
        isConnected: false,
        // Start with only the local participant; remotes are added via joinRoom
        participants: [
          {
            id: 'local',
            name: 'You',
            isCameraOn: this.cameraOn,
            isMicOn: this.micOn,
            isLocal: true,
            avatarUrl: null,
          },
        ],
      };

      logger.info(MODULE, 'createRoom — token acquired', { roomId });
      return this._applyRoom(room);
    } catch (err) {
      logger.error(MODULE, 'createRoom — token fetch failed, falling back to mock', err);
      return this._applyRoom(buildMockRoom(roomId));
    }
  }

  /**
   * Records the service as connected to the given room.
   *
   * The actual WebSocket handshake belongs to the LiveKit SDK, which the screen
   * layer instantiates. This method updates our internal state record and
   * validates that the caller passed non-empty credentials.
   */
  async joinRoom(roomId: string, token: string): Promise<void> {
    if (!roomId || !token) {
      const msg = 'joinRoom called with empty roomId or token';
      logger.error(MODULE, msg);
      throw new Error(msg);
    }

    logger.info(MODULE, 'joinRoom', { roomId });

    if (this.currentRoom?.id === roomId) {
      this.currentRoom = { ...this.currentRoom, isConnected: true };
    }
  }

  /**
   * Disconnects from the current room and resets all session state.
   * Safe to call when no room is active — silently returns in that case.
   */
  leaveRoom(): void {
    if (!this.currentRoom) {
      logger.debug(MODULE, 'leaveRoom — no active room, skipping');
      return;
    }

    logger.info(MODULE, 'leaveRoom', { roomId: this.currentRoom.id });
    this.currentRoom = null;
    this.participants = [];
    // WHY: reset track state so the next createRoom starts with tracks enabled
    this.cameraOn = true;
    this.micOn = true;
  }

  /**
   * Toggles the local camera track on/off.
   * Immediately reflected in getParticipants() without needing an SDK call.
   */
  toggleCamera(): void {
    this.cameraOn = !this.cameraOn;
    this.participants = this.participants.map((p) =>
      p.isLocal ? { ...p, isCameraOn: this.cameraOn } : p
    );
    logger.debug(MODULE, 'toggleCamera', { cameraOn: this.cameraOn });
  }

  /**
   * Toggles the local microphone track on/off.
   * Immediately reflected in getParticipants() without needing an SDK call.
   */
  toggleMic(): void {
    this.micOn = !this.micOn;
    this.participants = this.participants.map((p) =>
      p.isLocal ? { ...p, isMicOn: this.micOn } : p
    );
    logger.debug(MODULE, 'toggleMic', { micOn: this.micOn });
  }

  /**
   * Returns a shallow copy of the current participant list (local + remote).
   * Callers must not mutate the returned array.
   */
  getParticipants(): VideoParticipant[] {
    return [...this.participants];
  }

  // --------------------------------------------------------------------------
  // Helpers used by VideoScreen when bridging raw LiveKit SDK events
  // --------------------------------------------------------------------------

  /**
   * Converts a LiveKit SDK participant object to our typed VideoParticipant.
   * Accepts `any` because the SDK types are not re-exported through our types
   * layer — we normalise the shape at the service boundary.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  participantFromLiveKit(raw: any, isLocal = false): VideoParticipant {
    return {
      id: String(raw?.sid ?? raw?.identity ?? 'unknown'),
      name: String(raw?.name ?? raw?.identity ?? 'Participant'),
      isCameraOn: Boolean(raw?.isCameraEnabled ?? raw?.isCameraOn ?? true),
      isMicOn: Boolean(raw?.isMicrophoneEnabled ?? raw?.isMicOn ?? true),
      isLocal,
      avatarUrl: null,
    };
  }

  /**
   * Replaces the full participant list (called by VideoScreen on SDK events).
   * The screen owns the live SDK room; it pushes participant snapshots here so
   * the rest of the app can read them through getParticipants().
   */
  setParticipants(participants: VideoParticipant[]): void {
    this.participants = participants;
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  /** Stores the room internally and seeds the participants cache. */
  private _applyRoom(room: VideoRoom): VideoRoom {
    this.currentRoom = room;
    this.participants = room.participants;
    return room;
  }
}

// WHY: singleton so all screens share the same connection state; a new instance
// per screen would result in concurrent disconnected rooms.
export const videoService = new VideoService();
