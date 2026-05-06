# ANL — Claude Code Task Queue
# P0 = ship blocker, P1 = next, P2 = growth

## P0 — Deploy run in order
[ ] scaffold all source files from session output
[ ] fly launch --no-deploy --name anl-api --region ewr
[ ] fly secrets set all vars from .env.example
[ ] fly deploy
[ ] verify curl https://anl-api.fly.dev/health
[ ] run prisma migrations on live DB
[ ] enable PostGIS extensions on Fly Postgres
[ ] npx expo build --platform ios
[ ] submit to TestFlight

## P1 — Complete Core
[ ] build MatchesScreen — src/screens/MatchesScreen.tsx
[ ] ffmpeg sidecar for webm decode — src/lib/audio.ts + Dockerfile
[ ] venue seeding script Foursquare or OSM — scripts/seed-venues.ts
[ ] Sentry integration API + RN — src/index.ts + app/_layout.tsx
[ ] Redis adapter for Socket.io — src/socket/index.ts
[ ] wire push notifications to reveal matched — src/routes/reveal.ts
[ ] add expoPushToken + pushEnabled to Prisma User model
[ ] write Vitest unit tests for all 5 scoring services

## P2 — Growth
[ ] Stripe subscription tiers Free Plus Pro — src/routes/payments.ts
[ ] match paywall Free = 5 reveals per day — src/middleware/paywall.ts
[ ] contact import UX RN Contacts API — src/screens/ProfileScreen.tsx
[ ] block and report flow — src/screens/MatchDetailScreen.tsx
[ ] PostHog analytics — src/lib/analytics.ts
[ ] admin panel — src/routes/admin.ts
[ ] Android build + Play Store

## IP URGENT
[ ] file provisional patent USPTO EFS-Web
[ ] Class 9 + Class 45
[ ] 5 independent claims: CCS, VAS, VCS, Mutual Reveal, Social Graph Exclusion
