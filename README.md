# ANL — AllNightLong

> Dark. Late-night. Location-based. Real connections, no noise.

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/cloudygetty-ai/ANL)

---

## Overview

ANL is a full-stack React Native dating app built for the night. Proximity-based discovery, real-time chat, WebRTC video calling, AI relationship intelligence, and five patent-pending matching technologies — all wrapped in a dark purple aesthetic built for late-night use.

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | React Native + Expo 51 |
| Language | TypeScript 5.3 (strict) |
| State | Zustand |
| Navigation | React Navigation 6 |
| Backend | Node.js + Express + Socket.io |
| Database | PostgreSQL 14 + PostGIS |
| Auth | JWT + AsyncStorage |
| Payments | Stripe (Free / Plus $9.99 / Premium $24.99) |
| Media | AWS S3 + CloudFront |
| Video | WebRTC (react-native-webrtc) |
| Push | Firebase Cloud Messaging + Expo Notifications |
| Maps | Mapbox + PostGIS |

---

## Features

### Core
- Swipe-based discovery with weighted matching engine
- Real-time chat with typing indicators + read receipts
- WebRTC video & audio calling
- NightPulse heatmap — live venue activity visualization
- Gender-specific SVG map pins with smart routing logic
- AI intelligence layer — conversation coaching, compatibility scoring, date ideas

### Monetization
- Stripe subscription paywall (Free / Plus / Premium)
- Profile boosts ($4.99 one-time)
- Feature gating via `useGate()` hook

### Safety
- Photo moderation — Sightengine + AWS Rekognition
- Face verification
- User reports + admin review queue
- Block / report system

### Patent-Pending Features
| Feature | Description |
|---|---|
| **Circadian Compatibility** | Passive activity time profiling → chronotype matching score |
| **Venue-Anchored Matching** | Dwell-time gated mutual presence detection at venues |
| **Voice Tone Chemistry** | Acoustic feature extraction → real-time chemistry score during calls |
| **Cryptographic Reveal** | AES-256-GCM encrypted profiles, revealed only on mutual consent via split-key protocol |
| **Social Graph Exclusion** | Multi-signal proximity detection filters real-world contacts from discovery |

---

## Project Structure

```
ANL/
├── src/
│   ├── App.tsx                     ← Root + StripeProvider + socket init
│   ├── navigation/
│   │   └── RootNavigator.tsx       ← All screens wired + tab badges
│   ├── screens/
│   │   ├── DiscoveryScreen.tsx
│   │   ├── MatchesScreen.tsx
│   │   ├── MapScreen.tsx           ← NightPulse heatmap
│   │   ├── ChatScreen.tsx
│   │   ├── VideoCallScreen.tsx     ← WebRTC
│   │   ├── AIAssistantScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   ├── PaywallScreen.tsx       ← Stripe subscription
│   │   ├── IncomingCallModal.tsx
│   │   └── OnboardingScreen.tsx
│   ├── hooks/
│   │   ├── useSubscription.ts      ← Stripe payment sheet
│   │   ├── useVideoCall.ts         ← WebRTC peer connection
│   │   ├── usePhotoUpload.ts       ← S3 presigned upload
│   │   ├── useGate.ts              ← Feature gating → paywall
│   │   └── usePatentFeatures.ts   ← All 5 patent features
│   └── services/
│       └── pushNotifications.ts
│
├── backend/
│   ├── server.js                   ← Express + Socket.io entry
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js                ← Contacts sync, reveal, push token
│   │   ├── discovery.js            ← Feed, swipe, location, venue pulse
│   │   ├── matches.js
│   │   ├── chat.js
│   │   ├── upload.js               ← S3 photo CRUD
│   │   ├── stripe.js               ← Checkout, webhook, boost
│   │   └── admin.js                ← Stats, moderation, reports
│   ├── services/
│   │   ├── circadian.js            ← Chronotype scoring
│   │   ├── venueMatching.js        ← Dwell-time presence detection
│   │   ├── voiceTone.js            ← Chemistry scoring
│   │   ├── cryptoReveal.js         ← Encrypted profile reveal
│   │   ├── socialGraphExclusion.js ← Contact exclusion engine
│   │   ├── moderation.js           ← Photo moderation
│   │   └── s3.js                   ← Upload service
│   ├── socket/
│   │   └── index.js                ← All real-time events
│   ├── webrtc/
│   │   └── server.js               ← Standalone signaling server
│   └── db/
│       └── migrations/
│           ├── 003_completion.sql
│           ├── 004_admin.sql
│           └── 005_patent_features.sql
```

---

## Quick Start

### Option 1 — GitHub Codespaces (no laptop needed)

Click the **Open in Codespaces** badge above. Everything installs automatically. Then:

```bash
npx expo start --tunnel
```

Scan the QR code with **Expo Go** on your phone.

### Option 2 — Local

```bash
npm install
npx expo start
```

### Backend

```bash
cd backend
cp .env.example .env   # fill in your keys
npm install
npm run dev
```

### Database

```bash
psql $DATABASE_URL -f backend/db/migrations/003_completion.sql
psql $DATABASE_URL -f backend/db/migrations/004_admin.sql
psql $DATABASE_URL -f backend/db/migrations/005_patent_features.sql
```

---

## Environment Variables

See `.env.additions` in the root for the full list. Key variables:

```env
EXPO_PUBLIC_API_URL=
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
AWS_S3_BUCKET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
JWT_SECRET=
DATABASE_URL=
```

---

## Trademark

ALLNIGHTLONG — USPTO trademark application pending, Classes 9 + 45.

---

## License

Private. All rights reserved. © 2026 cloudygetty-ai.
