// src/config/constants.ts
export const APP_NAME    = 'ALLNIGHTLONG';
export const APP_VERSION = '1.0.0';

export const LATE_NIGHT_START_HOUR = 22; // 10pm
export const LATE_NIGHT_END_HOUR   = 5;  // 5am

export const PROXIMITY = {
  NEARBY_M:    1600,  // 1 mile — shown on map
  CLOSE_M:     400,   // 0.25 mile — "close" badge
  FUZZ_M:      120,   // location fuzzing radius
  MAX_M:       8000,  // max discovery radius
};

export const PRESENCE = {
  ACTIVE_TTL_MS:   2 * 60 * 60 * 1000,  // 2h — auto-offline
  UPDATE_INTERVAL: 60 * 1000,            // 60s location update
  PULSE_INTERVAL:  60 * 1000,            // 60s NightPulse refresh
};

export const MATCH = {
  DISTANCE_WEIGHT:  0.30,
  INTERESTS_WEIGHT: 0.25,
  AGE_WEIGHT:       0.15,
  ACTIVITY_WEIGHT:  0.20,
  PREMIUM_WEIGHT:   0.10,
};

export const VIDEO = {
  MAX_GROUP_SIZE:   12,
  CALL_TTL_MS:      60 * 60 * 1000,   // 1h max call
  TOKEN_TTL:        '1h',
};

export const CHAT = {
  MAX_MESSAGE_LEN:  500,
  EPHEMERAL_TTL_MS: 24 * 60 * 60 * 1000, // 24h
  PAGE_SIZE:        50,
};

export const COLORS = {
  bg:        '#04040a',
  surface:   '#0d0d14',
  surfaceUp: '#14141f',
  border:    'rgba(168,85,247,0.18)',
  purple:    '#a855f7',
  pink:      '#ec4899',
  amber:     '#fbbf24',
  cyan:      '#22d3ee',
  green:     '#4ade80',
  red:       '#f87171',
  text:      '#f0eee8',
  textDim:   'rgba(240,238,232,0.5)',
  textMuted: 'rgba(240,238,232,0.22)',
  femalePin: '#ff3c64',
  malePin:   '#7c3aed',
  twPin:     '#f7a8c4',
  tmPin:     '#55cdfc',
};
