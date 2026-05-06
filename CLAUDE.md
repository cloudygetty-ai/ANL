# ANL — AllNightLong · CLAUDE.md
# Sentinel Engine v5.0 · Entropy-Zero V3.0
# Last updated: 2026-05-06

## PRIME DIRECTIVE
Maximum Leverage, Minimum Surface Area.
Goal: Homeostasis — optimal system equilibrium.
Per 100 lines added, identify 10 to deprecate.

## PROJECT
Dating app. Dark luxury. React Native + Expo + Express + PostGIS + Socket.io + LiveKit + Stripe + AWS S3 + Supabase Auth.
Deploy: Fly.io API — Expo mobile.
Aesthetic: Obsidian/purple — Cinzel display — DM Mono UI.

## STACK
Mobile: React Native + Expo TypeScript strict
Backend: Node.js + Express + Prisma + PostgreSQL/PostGIS
Auth: Supabase anonymous-first
Realtime: Socket.io sticky sessions on Fly
Video: LiveKit WebRTC
Storage: AWS S3 presigned URLs
Payments: Stripe
State: Zustand
Deploy: Fly.io + GitHub Actions
Testing: Vitest + Jest

## METACOGNITIVE GATES
1. PREDICTOR — blast radius, map data, type, event dependencies
2. PESSIMIST — null state, network loss, race condition
3. MINIMALIST — config or type change only, prefer constraints over logic

## ARCHITECTURE RULES
One file, one job. More than 40 lines of logic means split.
Events over direct calls. Eventual consistency.
No hidden state. No upward imports.
Comments explain WHY not WHAT.
Every module answers: HEALTH / PRESSURE / EFFICIENCY

## PATENT FEATURES
Do not modify core scoring logic without explicit instruction.
1. CCS — Circadian Compatibility Score — src/services/circadian.service.ts
2. VAS — Venue Affinity Score — src/services/venue.service.ts
3. VCS — Voice Chemistry Score — src/services/voice.service.ts
4. Cryptographic Mutual Reveal — src/services/reveal.service.ts
5. Social Graph Exclusion Engine — src/services/socialGraph.service.ts

## VCMS+ PIPELINE
VCMS+ = Proximity 0.35 + CCS 0.25 + VAS 0.25 + VCS 0.15
File: src/services/matching.service.ts

## ENV VARS
API: DATABASE_URL, DIRECT_URL, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET
API: LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_WS_URL
API: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET
API: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
API: JWT_SECRET, REVEAL_HMAC_SECRET, CORS_ORIGIN, PORT, NODE_ENV
RN: EXPO_PUBLIC_API_URL, EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
RN: EXPO_PUBLIC_LIVEKIT_WS_URL, EXPO_PUBLIC_MAPBOX_TOKEN, EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY

## CURRENT BLOCKER
Fly.io not yet deployed.
Step 1: fly launch --no-deploy --name anl-api --region ewr
Step 2: fly secrets set all vars from .env.example
Step 3: fly deploy

## DO NOT
Modify VCMS+ weights without explicit instruction
Add dependencies without checking existing utils first
Skip error boundaries on any new RN screen
Commit without running typecheck and lint
Deploy without health check passing at /health

## COMMIT PATTERN
feat(scope): description
fix(scope): description
chore(scope): description
