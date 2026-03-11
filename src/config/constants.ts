// src/config/constants.ts — Design tokens and scoring weights

export const COLORS = {
  bg: '#0a0a0f',
  card: '#111118',
  text: '#f0eee8',
  textMuted: '#8b8a99',
  accent: '#7fffd4',
  border: 'rgba(255,255,255,0.07)',

  female: '#ffa032',
  male: '#4488ff',
  transWoman: '#f7a8c4',
  transMan: '#55cdfc',
  nonBinary: '#c084fc',

  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
} as const;

export const MATCH_WEIGHTS = {
  proximity: 0.35,
  interests: 0.25,
  ageDiff: 0.15,
  activity: 0.15,
  presence: 0.10,
} as const;

export const PROXIMITY = {
  nearbyRadiusMi: 5,
  closeRadiusMi: 1,
  fuzzMeters: 50,
} as const;

export const PRESENCE = {
  onlineThresholdMs: 5 * 60 * 1000,
  awayThresholdMs: 30 * 60 * 1000,
  expireMs: 2 * 60 * 60 * 1000,
} as const;

export const VIDEO = {
  maxParticipants: 6,
  controlsAutoHideMs: 5000,
} as const;

export const CHAT = {
  pageSize: 50,
  maxMessageLength: 2000,
  typingTimeoutMs: 3000,
} as const;
