// src/types/index.ts — Central type definitions

// === System Core ===
export type TaskPriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
export type SystemStatus = 'initializing' | 'running' | 'degraded' | 'stopped';
export type PresenceStatus = 'online' | 'away' | 'offline';
export type AppLifecycleState = 'active' | 'background' | 'inactive';
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface SystemState {
  status: SystemStatus;
  startedAt: number;
  iteration: number;
  errors: SystemError[];
  recovery: RecoveryInfo;
}

export interface SystemError {
  id: string;
  message: string;
  module: string;
  timestamp: number;
  recoverable: boolean;
}

export interface RecoveryInfo {
  count: number;
  lastRecoveredAt: number | null;
  restoredFromSnapshot: boolean;
}

export interface Task {
  id: string;
  name: string;
  priority: TaskPriority;
  execute: () => Promise<void>;
  scheduledAt: number;
  lastRunAt: number | null;
  intervalMs: number;
}

export interface HealthMetrics {
  uptimeMs: number;
  errorCount: number;
  errorLog: SystemError[];
  memoryPressureEvents: number;
  avgIterationMs: number;
  p95IterationMs: number;
  recoveryEvents: number;
}

export interface PersistedSnapshot {
  version: number;
  timestamp: number;
  systemState: SystemState;
  health: HealthMetrics;
}

export interface LogEntry {
  level: LogLevel;
  module: string;
  message: string;
  timestamp: number;
  data?: unknown;
}

export interface BackgroundTaskConfig {
  minimumFetchInterval: number;
  stopOnTerminate: boolean;
  startOnBoot: boolean;
  enableHeadless: boolean;
}

// === User & Profile ===
export type Gender = 'female' | 'male' | 'trans_woman' | 'trans_man' | 'non_binary';

export interface UserProfile {
  id: string;
  phone: string;
  displayName: string;
  age: number;
  gender: Gender;
  bio: string;
  avatarUrl: string | null;
  vibeTags: string[];
  isOutTonight: boolean;
  isPremium: boolean;
  location: { latitude: number; longitude: number } | null;
  presence: PresenceStatus;
  lastActiveAt: number;
  createdAt: number;
}

// === Map ===
export interface MapUser {
  id: string;
  displayName: string;
  age: number;
  gender: Gender;
  latitude: number;
  longitude: number;
  presence: PresenceStatus;
  matchScore: number;
  avatarUrl: string | null;
  vibeTags: string[];
  isOutTonight: boolean;
  distanceMi: number;
}

export interface MapEvent {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  attendeeCount: number;
  category: string;
  startsAt: number;
}

export type MapMode = 'normal' | 'nightpulse';
export type GenderFilter = 'all' | Gender;

export interface CameraState {
  latitude: number;
  longitude: number;
  zoom: number;
  pitch: number;
  heading: number;
}

// === Chat ===
export interface Channel {
  id: string;
  name: string;
  isGroup: boolean;
  members: string[];
  lastMessage: string | null;
  lastMessageAt: number | null;
  unreadCount: number;
  avatarUrl: string | null;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: 'text' | 'vibe' | 'system';
  createdAt: number;
  readBy: string[];
}

// === Video ===
export interface VideoRoom {
  id: string;
  token: string;
  url: string;
  participants: VideoParticipant[];
  isConnected: boolean;
}

export interface VideoParticipant {
  id: string;
  name: string;
  isCameraOn: boolean;
  isMicOn: boolean;
  isLocal: boolean;
  avatarUrl: string | null;
}

// === NightPulse ===
export interface PulseZone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  intensity: number; // 0-1
  activeUsers: number;
  category: string;
}

export interface NightPulseSnapshot {
  zones: PulseZone[];
  timestamp: number;
  totalActive: number;
  peakZoneId: string | null;
}
