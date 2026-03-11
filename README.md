# ANL — All Night Long

A React Native social and dating app built for nightlife. Real-time map discovery, gender-inclusive design, continuous background operation, and live vibe-based matching — all in one.

---

## What It Is

All Night Long puts your night in your hands. See who is out nearby, send vibes, start chats, and join the pulse of your city — all live, all night.

The app is built to stay running. An adaptive event loop persists state across OS kills, heals from errors automatically, and keeps location and chat alive whether or not you are looking at the screen.

---

## Key Features

- **Live map with gender-inclusive pins** — Female, male, trans, and non-binary users each get a distinct pin shape and color system. No one is reduced to a generic dot.
- **NightPulse heatmap** — Zone-level activity intensity shown as a live overlay on the map. See where the night is actually happening.
- **Vibe signaling** — Send and receive lightweight signals (waves, reactions) without the friction of a full message. Mutual vibes create a match.
- **Real-time chat** — Direct messages and group channels powered by Supabase Realtime. Read receipts, optimistic updates, and instant delivery.
- **Video and audio rooms** — In-app calls via LiveKit. No third-party app required.
- **Continuous background operation** — The adaptive event loop runs regardless of whether the app is foregrounded, backgrounded, or the screen is off.
- **Self-healing system** — When error thresholds are crossed, the system clears non-critical tasks, restores from the last valid state snapshot, and continues without user intervention.
- **State persistence** — AsyncStorage snapshots survive OS-level app kills. Next boot restores exactly where you left off.

---

## Quick Start

```bash
git clone https://github.com/your-org/all-night-long.git
cd all-night-long
npm install
cp .env.example .env        # fill in Mapbox, Supabase, LiveKit credentials
cp config.example.js config.js
```

Initialize the database by running `supabase/schema.sql` in your Supabase SQL editor, then:

```bash
expo start
```

Full setup including credential acquisition, database initialization, and build configuration is in [`docs/QUICKSTART.md`](docs/QUICKSTART.md).

---

## Architecture

The system is organized in strict layers:

```
screens  →  services  →  core  →  utils / types
```

Each layer imports only from layers below it. The core engine (event loop, task queue, persistence) runs independently of the UI and starts before the first screen renders.

Full architecture documentation covering every module, data flow diagrams, background behavior, and the pin system is in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Tech Stack

| Layer | Library | Notes |
|---|---|---|
| Framework | React Native 0.72+ | Cross-platform iOS + Android |
| Language | TypeScript 5.0+ | Strict mode on. No implicit `any`. |
| State | Zustand | Single store per domain. No Redux. |
| Persistence | AsyncStorage | State snapshots on a 30-second interval. |
| Database | Supabase (PostgreSQL) | RLS policies on all user tables. |
| Realtime | Supabase Realtime | WebSocket subscriptions for chat, vibes, pulse zones. |
| Auth | Supabase Auth | Phone OTP flow. |
| Maps | Mapbox | Custom pin rendering via React Native Maps + SVG. |
| Video | LiveKit | In-app video and audio rooms. |
| Background (Android) | react-native-background-fetch + Headless JS | Keeps the event loop alive in background. |
| Background (iOS) | react-native-background-fetch + BGTaskScheduler | iOS background modes via native module. |
| Testing | Jest + React Native Testing Library | Co-located test files. Every module has one. |
| Linting | ESLint + Prettier | Enforced in CI. |
| CI/CD | GitHub Actions | Defined in `.github/workflows/ci.yml`. |
| Builds | Expo EAS Build | Cloud compilation for iOS and Android. |

---

## Screenshots

_Coming soon. The app is in active development._

---

## Development

```bash
npm test          # Run the full test suite (must pass before any commit)
npm run lint      # Check for lint errors
expo start        # Start the Expo development server
expo start --android
expo start --ios
```

For production builds:

```bash
eas build --platform all --profile production
```

For environment setup (Mapbox token, Supabase project, LiveKit server, EAS configuration):

See [`docs/ENV_SETUP.md`](docs/ENV_SETUP.md).

---

## License

MIT
