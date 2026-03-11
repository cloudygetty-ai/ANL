// src/services/video/index.ts — Barrel export
// Import from this file, not from VideoService directly, so the module
// boundary stays stable when internal file names change.

export { VideoService, videoService } from './VideoService';

// WHY: backward-compat re-export — VideoScreen checks this flag to decide
// whether to render the LiveKit UI or a fallback placeholder. The new service
// derives readiness from EXPO_PUBLIC_API_URL instead of dedicated LiveKit env
// vars, but the boolean semantic is identical.
export const isLiveKitReady = Boolean(process.env.EXPO_PUBLIC_API_URL);
