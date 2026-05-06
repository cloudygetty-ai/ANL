# ANL — Project Context

## Status
Backend: 82% complete
Frontend: 80% complete
Deploy: NOT LIVE — Fly.io configured, secrets not set
IP: Provisional patent not yet filed

## File Map — Backend src/
config/env.ts — zod env validation boot-time guard
middleware/auth.ts — JWT verify via Supabase REST
middleware/socketAuth.ts — JWT gate on WS handshake
middleware/rateLimit.ts — global + auth + media limiters
routes/health.ts — /health Fly.io healthcheck
routes/auth.ts — Supabase token exchange
routes/users.ts — GET and PATCH /users/me
routes/matches.ts — GET /matches VCMS+ ranked
routes/livekit.ts — POST /livekit/token
routes/media.ts — POST /media/upload-url
routes/voice.ts — POST /voice/consent upload-url analyze — DELETE /voice/sample
routes/reveal.ts — POST /reveal/commit — GET /reveal/payload/:id — DELETE /reveal/commit/:id
routes/social.ts — POST /social/contacts block — DELETE /social/block/:id
routes/messages.ts — GET /messages/:matchId
routes/payments.ts — Stripe webhook
routes/venues.ts — GET /venues/heatmap — GET /venues/:id/occupants
routes/push.ts — POST /push/register disable
services/circadian.service.ts — CCS engine Patent 1
services/venue.service.ts — VAS engine + dwell detection Patent 2
services/voice.service.ts — VCS engine Patent 3
services/reveal.service.ts — Cryptographic mutual reveal Patent 4
services/socialGraph.service.ts — Social graph exclusion Patent 5
services/matching.service.ts — VCMS+ unified ranking pipeline
services/proximity.service.ts — PostGIS nearby users
services/s3.service.ts — presigned upload/download
services/stripe.service.ts — subscription management
services/push.service.ts — Expo push notifications
services/livekit.service.ts — LiveKit token generation
socket/index.ts — Socket.io server init + auth middleware
socket/presence.ts — online state + location + venue dwell
socket/messaging.ts — real-time chat + typing + read receipts
lib/prisma.ts — Prisma client pool tuned for Fly 512mb
lib/audio.ts — JS audio feature extraction MFCC pitch energy
lib/supabase.ts — Supabase admin client
jobs/nightly.ts — Batch recompute Fly cron 3am UTC
app.ts — Express init + all route mounts
index.ts — HTTP server + Socket.io + graceful shutdown

## File Map — Frontend src/
theme/tokens.ts — colors fonts spacing radius
store/index.ts — Zustand app store
store/onboarding.store.ts — Wizard state machine
hooks/useSocket.ts — Socket.io client hook
hooks/useLocation.ts — Expo Location + Socket.io presence
hooks/useVoiceRecorder.ts — expo-av record + S3 upload + analyze
hooks/useActivityTracking.ts — AppState foreground/background CCS signal
hooks/usePushNotifications.ts — Expo push token registration
hooks/useProfileUpdate.ts — profile patch + S3 upload
lib/api.ts — typed API client base URL from env
components/ErrorBoundary.tsx — RN error boundary all screen roots
components/MatchCard.tsx — VCMS+ score display + reveal badge
components/PhotoGrid.tsx — 3x2 photo grid add/remove
components/VibeTags.tsx — tag selector max 5
components/ProgressDots.tsx — onboarding progress indicator
navigation/index.tsx — Stack + Tab navigator
screens/onboarding/OnboardingScreen.tsx — wizard shell + step router
screens/onboarding/steps/StepWelcome.tsx — brand intro + anon entry
screens/onboarding/steps/StepName.tsx — display name input
screens/onboarding/steps/StepGender.tsx — gender + preference chips
screens/onboarding/steps/StepPhotos.tsx — photo upload 1-6 S3
screens/onboarding/steps/StepBio.tsx — bio + vibe tags
screens/onboarding/steps/StepVoice.tsx — voice consent + recorder
screens/onboarding/steps/StepPermissions.tsx — location + push consent
screens/DiscoverScreen.tsx — NightPulse map + match cards
screens/MatchDetailScreen.tsx — VCMS+ breakdown + reveal CTA
screens/ChatScreen.tsx — Socket.io messaging + typing
screens/VideoCallScreen.tsx — LiveKit WebRTC call
screens/VoiceSampleScreen.tsx — record + analyze + confidence
screens/ProfileScreen.tsx — full edit + settings + account
screens/MatchesScreen.tsx — TODO P1

## Infrastructure
Dockerfile — multi-stage non-root user
fly.toml — ewr region sticky sessions health check
.github/workflows/fly-deploy.yml — CI typecheck lint test fly deploy
prisma/schema.prisma — full schema with all 5 patent feature tables

## Migrations run in order
001_init — users matches messages base tables
002_postgis — PostGIS extension + location column + GIST index
003_circadian — activity_events + circadian_profiles
004_venues — venues + venue_visits + venue_affinity_profiles
005_voice — voice_profiles
006_reveal — reveal_commitments + reveal_audit_log
007_social — contact_hashes + social_exclusions
008_push — expoPushToken + pushEnabled columns on users

## Known Issues
ffmpeg sidecar missing: voice analysis receives raw buffer, decode step is placeholder
Redis adapter not wired: Socket.io will fail at more than 1 Fly VM, stay at min_machines=1
Venue seeding: venues table is empty, need Foursquare/OSM import script
MatchesScreen not built
Provisional patent not filed

## Deployment Checklist
fly launch --no-deploy --name anl-api --region ewr
fly secrets set all vars from .env.example
fly deploy
curl https://anl-api.fly.dev/health
npx prisma migrate deploy runs inside Fly CMD automatically
CREATE EXTENSION IF NOT EXISTS postgis on DB
npx expo build --platform ios
Submit to TestFlight

## Patent Filing
Class 9: Software application
Class 45: Dating/social introduction services
Claims: CCS, VAS, VCS, Cryptographic Mutual Reveal, Social Graph Exclusion
File provisional ASAP — all 5 features built
