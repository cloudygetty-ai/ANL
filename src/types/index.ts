// src/types/index.ts

// ── System types ──────────────────────────────────────────────────────────────
export type TaskPriority  = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
export type SystemStatus  = 'initializing' | 'running' | 'degraded' | 'stopped';
export type PresenceStatus = 'online' | 'away' | 'offline';

export interface SystemState {
  status:    SystemStatus;
  startedAt: number;
  iteration: number;
  errors:    SystemError[];
  recovery:  RecoveryInfo;
}
export interface SystemError {
  id:          string;
  message:     string;
  module:      string;
  timestamp:   number;
  recoverable: boolean;
}
export interface RecoveryInfo {
  count:                number;
  lastRecoveredAt:      number | null;
  restoredFromSnapshot: boolean;
}
export interface Task {
  id:          string;
  name:        string;
  priority:    TaskPriority;
  execute:     () => Promise<void>;
  scheduledAt: number;
  lastRunAt:   number | null;
  intervalMs:  number;
}
export interface HealthMetrics {
  uptimeMs:             number;
  errorCount:           number;
  errorLog:             SystemError[];
  memoryPressureEvents: number;
  avgIterationMs:       number;
  p95IterationMs:       number;
  recoveryEvents:       number;
}
export interface PersistedSnapshot {
  version:     number;
  timestamp:   number;
  systemState: SystemState;
  health:      HealthMetrics;
}

// ── User / Profile ────────────────────────────────────────────────────────────
export type Gender   = 'f' | 'm' | 'tw' | 'tm' | 'nb';
export type Position = 'top' | 'bottom' | 'vers' | 'side' | 'na';

export interface UserProfile {
  id:           string;
  displayName:  string;
  age:          number;
  gender:       Gender;
  photos:       string[];      // signed URLs
  bio:          string;
  vibe:         string;        // free-text status e.g. "Tonight only 🔥"
  position:     Position;
  bodyType?:    string;
  height?:      number;        // cm
  vibeTagIds:   string[];
  isVerified:   boolean;
  isPremium:    boolean;
  presence:     PresenceStatus;
  lastActiveAt: number;
  coords?:      LatLng;        // fuzzy — never exact
  distanceM?:   number;        // computed server-side
  match?:       number;        // 0-100 compatibility score
  isNew?:       boolean;
  isTop?:       boolean;
  blockedIds:   string[];
}

// ── Map ───────────────────────────────────────────────────────────────────────
export interface LatLng {
  lat: number;
  lng: number;
}
export interface MapUser {
  id:       string;
  name:     string;
  age:      number;
  gender:   Gender;
  coords:   LatLng;
  online:   boolean;
  vibe:     string;
  match:    number;
  isNew:    boolean;
  isTop:    boolean;
  photoUrl?: string;
}
export interface MapEvent {
  id:     string;
  name:   string;
  coords: LatLng;
  type:   'party' | 'bar' | 'venue' | 'popup';
  count:  number;
}
export interface CameraState {
  center:  LatLng;
  zoom:    number;
  pitch:   number;   // 0-60 degrees for 3D
  bearing: number;
}

// ── Chat ──────────────────────────────────────────────────────────────────────
export type ChannelType = 'dm' | 'event' | 'venue' | 'neighborhood';
export interface Channel {
  id:          string;
  type:        ChannelType;
  name:        string;
  photoUrl?:   string;
  lastMessage?: ChatMessage;
  unreadCount: number;
  memberCount: number;
  members:     string[];    // user IDs
  createdAt:   number;
  eventId?:    string;      // linked map event
}
export interface ChatMessage {
  id:         string;
  channelId:  string;
  senderId:   string;
  senderName: string;
  content:    string;
  type:       'text' | 'image' | 'vibe' | 'system';
  imageUrl?:  string;
  readBy:     string[];
  createdAt:  number;
  expiresAt?: number;       // ephemeral messages
}

// ── Video ─────────────────────────────────────────────────────────────────────
export type VideoRoomType = 'dm' | 'group';
export interface VideoRoom {
  id:          string;
  type:        VideoRoomType;
  token:       string;       // LiveKit JWT
  url:         string;       // LiveKit server URL
  participants: VideoParticipant[];
  createdAt:   number;
  expiresAt:   number;
}
export interface VideoParticipant {
  id:          string;
  name:        string;
  photoUrl?:   string;
  isMuted:     boolean;
  isCamOff:    boolean;
  isSpeaking:  boolean;
}

// ── Visits ────────────────────────────────────────────────────────────────────
export interface Visit {
  id:          string;
  visitorId:   string;
  visitorName: string;
  visitorAge:  number;
  visitorGender: Gender;
  visitorPhotoUrl?: string;
  visitedAt:   number;
  isNew:       boolean;    // unseen since last check
}

// ── Subscription ──────────────────────────────────────────────────────────────
export type SubscriptionTier = 'free' | 'premium' | 'premium_plus';

export interface SubscriptionPlan {
  id:          SubscriptionTier;
  name:        string;
  priceMonth:  number;         // USD cents
  priceYear:   number;         // USD cents (annual)
  features:    string[];
  highlight:   boolean;        // featured/recommended plan
  color:       string;
}

export interface UserSubscription {
  tier:        SubscriptionTier;
  expiresAt:   number | null;  // null = never (lifetime) or free
  autoRenew:   boolean;
  purchasedAt: number | null;
  boostTokens: number;         // remaining boosts
  boostActiveUntil: number | null;
}

// ── Security / Discreet ───────────────────────────────────────────────────────
export interface DiscreetSettings {
  enabled:           boolean;   // hide from map entirely
  hiddenFromSearch:  boolean;   // don't appear in member lists
  appearOffline:     boolean;   // show as offline even when active
  requirePinToOpen:  boolean;   // app-lock pin
  discreetIcon:      boolean;   // replace app icon with neutral icon
  screenshotAlert:   boolean;   // alert me when someone screenshots
}

// ── Video Feed (short clips) ───────────────────────────────────────────────────
export interface VideoPost {
  id:           string;
  authorId:     string;
  authorName:   string;
  authorAge:    number;
  authorGender: Gender;
  authorPhotoUrl?: string;
  videoUrl:     string;
  thumbnailUrl: string;
  caption:      string;
  likes:        number;
  views:        number;
  durationSec:  number;
  createdAt:    number;
  isLiked:      boolean;
}

// ── Night Pulse ───────────────────────────────────────────────────────────────
export interface PulseZone {
  id:           string;
  name:         string;        // "East Village", "SoHo"
  center:       LatLng;
  radiusM:      number;
  intensity:    number;        // 0.0 – 1.0 live heat score
  activeCount:  number;        // anonymous count
  trend:        'rising' | 'peaking' | 'fading';
  peakHour:     number;        // 0-23 historical peak hour
  color:        string;        // hex derived from intensity
  updatedAt:    number;
}
export interface NightPulseSnapshot {
  zones:       PulseZone[];
  cityTotal:   number;
  updatedAt:   number;
  peakZoneId:  string;
}
