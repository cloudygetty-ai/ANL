# AllNightLong (ANL)

> The dating app built for the night.

**Stack**: React Native (Expo) · Node/Express · PostgreSQL/PostGIS · Socket.io · LiveKit WebRTC · Stripe · AWS S3

---

## Status

| Layer | Status |
|---|---|
| 10 UI screens (Auth, Discovery, Map, Chat, Video, Matches, Profile, AI, Settings, Pricing) | ✅ |
| Navigation stack | ✅ |
| Weighted matching engine | ✅ |
| Socket.io realtime (messages, typing, presence, WebRTC signaling) | ✅ |
| Backend API (80+ files) + PostGIS schema | ✅ |
| AI intelligence layer (coach, compat, date-ideas) | ✅ |
| NightPulse heatmap + Mapbox 3D + gender SVG pins | ✅ |
| WebRTC video calling (TURN-backed) | ✅ |
| Stripe subscriptions + paywall | ✅ |
| S3/Cloudflare photo upload + moderation | ✅ |
| Admin dashboard | ✅ |
| Push notifications (Expo + Firebase) | ✅ |
| App icon (all sizes) | ✅ |
| Splash screen | ✅ |
| App Store screenshots (5) | ✅ |
| Privacy policy + Terms of service | ✅ |
| docker-compose + Nginx + Certbot | ✅ |
| EAS build config | ✅ |
| Trademark filing (USPTO Classes 9 + 45) | 🔄 In progress |

---

## Repo Structure

```
ANL/
├── src/
│   ├── screens/          # All 10 screens
│   ├── navigation/       # RootNavigator + stack configs
│   ├── hooks/            # useVideoCall, useSubscription, usePhotoUpload, useGate, useSocket
│   ├── services/         # API client, push, socket
│   └── stores/           # Zustand: auth, matching, chat
├── backend/
│   ├── server.js         # Express + Socket.io (all routes mounted)
│   ├── routes/           # auth, users, discovery, chat, upload, stripe, admin, ice, push
│   ├── services/         # push.js, turn.js, moderation.js, s3.js
│   ├── middleware/       # auth.js (JWT)
│   ├── db/
│   │   ├── schema.sql
│   │   └── migrations/   # 001–005
│   └── socket/
│       ├── index.js      # All socket events
│       └── adapter.js    # Redis adapter (horizontal scaling)
├── turn-server/          # coturn Dockerfile + config
├── docker/               # docker-compose, Nginx config
├── scripts/              # deploy.sh, build.sh
├── assets/               # Icons, splash, screenshots
├── app.config.js
├── eas.json
├── metro.config.js
└── .gitignore
```

---

## Quick Start (Local Dev)

```bash
# 1. Clone
git clone https://github.com/cloudygetty-ai/ANL
cd ANL

# 2. Install
npm install
cd backend && npm install && cd ..

# 3. Environment
cp .env.example .env
# Fill in: DB_PASSWORD, JWT_SECRET, AWS keys, Stripe keys, TURN_SECRET, EXPO_ACCESS_TOKEN

# 4. Database
createdb anl
psql anl -c "CREATE EXTENSION postgis"
cd backend && npm run migrate && cd ..

# 5. Backend
cd backend && npm run dev

# 6. React Native
npx expo start
```

---

## Deploy (Self-hosted)

```bash
./scripts/deploy.sh --prod
```

Validates `.env` → builds Docker images → runs migrations → health checks → starts Nginx.

## Deploy (Railway)

```bash
railway login
railway up
railway variables set JWT_SECRET=... STRIPE_SECRET_KEY=... # etc
```

---

## EAS Build → TestFlight

```bash
# Fill in eas.json (appleId, ascAppId, appleTeamId)
./scripts/build.sh ios
# or submit directly:
./scripts/build.sh ios --submit
```

---

## Subscriptions

| Tier | Price | Key Features |
|---|---|---|
| Free | $0 | 10 likes/day, basic discovery |
| Plus | $9.99/mo | Unlimited likes, advanced filters, read receipts |
| Premium | $24.99/mo | All Plus + Boosts, Super Likes, AI coach, video calls |

---

## Environment Variables

See `.env.example` for all variables. Required before first deploy:

- `DATABASE_URL` or `DB_*` vars
- `JWT_SECRET` (32+ char random string)
- `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` + price IDs
- `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` + `S3_BUCKET`
- `TURN_SECRET` + `TURN_HOST`
- `EXPO_ACCESS_TOKEN`

---

## Legal

- Privacy Policy: `legal/privacy-policy.md` → host at `https://anl.app/privacy`
- Terms of Service: `legal/terms-of-service.md` → host at `https://anl.app/terms`
- Trademark: "ALLNIGHTLONG" — USPTO Classes 9 + 45 (filing in progress)

---

## Contact

**CloudyGetty AI**
privacy@anl.app · support@anl.app · legal@anl.app
