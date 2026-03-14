# Quick Start — ANL

Get ANL running locally in under 15 minutes.

---

## Prerequisites

| Tool | Version | Check | Install |
|---|---|---|---|
| Node.js | 18+ | `node --version` | [nodejs.org](https://nodejs.org) |
| npm | 9+ | `npm --version` | Included with Node |
| Expo CLI | Latest | `expo --version` | `npm install -g expo-cli` |
| EAS CLI | Latest | `eas --version` | `npm install -g eas-cli` |
| Xcode | 14+ | Mac only | App Store (for iOS builds) |
| Android Studio | Latest | Optional | [developer.android.com](https://developer.android.com/studio) |

You also need accounts with:

- **Supabase** — database, auth, realtime ([supabase.com](https://supabase.com))
- **Mapbox** — maps and pin rendering ([mapbox.com](https://mapbox.com))
- **LiveKit** — optional, required only for video features ([livekit.io](https://livekit.io))

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-org/all-night-long.git
cd all-night-long
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in your credentials:

```env
EXPO_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EXPO_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
EXPO_PUBLIC_LIVEKIT_TOKEN_ENDPOINT=https://your-project-ref.supabase.co/functions/v1/livekit-token
```

Full instructions for obtaining each credential are in [`docs/ENV_SETUP.md`](docs/ENV_SETUP.md).

### 4. Initialize the database

In the Supabase dashboard, open **SQL Editor**, paste the contents of `supabase/schema.sql`, and run it. This creates all tables, RLS policies, RPCs, realtime subscriptions, and seed data in one shot.

### 5. Copy the local config

```bash
cp config.example.js config.js
```

`config.js` is gitignored — adjust any local overrides there without risk of committing secrets.

---

## Running the App

### Expo Go (fastest, no native modules)

Start the development server:

```bash
expo start
```

Scan the QR code with the **Expo Go** app on your phone (iOS or Android). This works for most features but excludes modules that require native compilation (background fetch, some camera features).

### Development build (full native support)

Build a development client for your device:

```bash
# Android
eas build --platform android --profile development

# iOS (Mac + Xcode required)
eas build --platform ios --profile development
```

Install the resulting binary on your device or simulator, then:

```bash
expo start --dev-client
```

### Simulators

```bash
# Android emulator (requires Android Studio with an AVD configured)
expo start --android

# iOS Simulator (Mac only)
expo start --ios
```

---

## Testing

Run the full test suite:

```bash
npm test
```

Watch mode for active development:

```bash
npm test -- --watch
```

Run a single file:

```bash
npm test -- src/core/eventLoop/EventLoopManager.test.ts
```

Run only tests matching a name pattern:

```bash
npm test -- --testNamePattern="persistence"
```

Tests are co-located with source files. `EventLoopManager.ts` has a sibling `EventLoopManager.test.ts` in the same directory. If you add a module, add its test file alongside it.

Tests must pass before any change is considered complete. CI will block merges if tests fail.

---

## Linting

Check for errors:

```bash
npm run lint
```

Auto-fix where possible:

```bash
npm run lint -- --fix
```

Linting is enforced in CI. Code that does not pass lint will not merge.

---

## Project Structure

```
AllNightLong/
├── .env.example              ← Environment variable template (copy to .env)
├── config.example.js         ← App config template (copy to config.js)
├── app.json                  ← Expo app metadata
├── index.js                  ← React Native entry point
├── package.json
├── tsconfig.json             ← TypeScript config (path aliases defined here)
│
├── supabase/
│   └── schema.sql            ← Complete DB schema — run this first
│
├── docs/
│   ├── ARCHITECTURE.md       ← Full system architecture
│   ├── ENV_SETUP.md          ← Service credential setup guide
│   └── QUICKSTART.md         ← This file
│
├── public/
│   └── index.html            ← Web landing page / waitlist
│
└── src/
    ├── App.tsx               ← Root component, bootstraps the system
    ├── core/                 ← Event loop, task queue, persistence (the engine)
    ├── services/             ← Business logic: auth, chat, location, matching
    ├── hooks/                ← React hooks wrapping service calls
    ├── screens/              ← UI screens (thin — read state, render, dispatch)
    ├── components/           ← Reusable UI primitives and pin components
    ├── utils/                ← Pure utilities: logger, geo math, formatters
    └── types/                ← TypeScript interfaces and type definitions
```

For a full explanation of every module and the rules governing how they interact, read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Common Issues

**`expo: command not found`**

Install Expo CLI globally:

```bash
npm install -g expo-cli
```

**Metro bundler port conflict**

Another process is using port 8081. Kill it or use a different port:

```bash
expo start --port 8082
```

**Tests fail immediately after clone**

Run `npm install` first. Jest needs `node_modules` present.

**Config errors on startup**

Make sure `config.js` exists. It is not committed to the repo:

```bash
cp config.example.js config.js
```

**Supabase `auth.uid()` returns null in RLS**

You are querying without a valid session. Make sure the user is signed in before calling any protected query. In tests, use the Supabase service role key (server-side only).

**Map is blank / tiles not loading**

Check that `EXPO_PUBLIC_MAPBOX_TOKEN` is set and begins with `pk.`. Secret tokens (`sk.`) will not work in client code.

**Build fails with `eas build`**

Run `eas whoami` to confirm you are logged in. Run `eas build:configure` if `eas.json` is missing.

---

*Last updated: 2026-03-06*
