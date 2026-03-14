# ANL — AllNightLong

> Dark. Late-night. Location-based. Real connections, no noise.

## What This Is

ANL is a React Native / Expo app with two layers:

1. **Continuous Operation Engine** — autonomous background system (EventLoop, TaskQueue, HealthMonitor, PersistenceLayer, BackgroundService)
2. **Late-Night Dating App** — proximity-based map UI with gender-specific SVG pin system, real-time chat, and matching

---

## Stack

| Layer       | Choice                          |
|-------------|---------------------------------|
| Framework   | React Native 0.73 + Expo ~50    |
| Language    | TypeScript 5.3 (strict)         |
| State       | Zustand                         |
| Navigation  | React Navigation 6 (bottom tabs)|
| Persistence | AsyncStorage                    |
| Background  | react-native-background-fetch   |
| CI          | GitHub Actions                  |

---

## Structure

```
src/
├── App.tsx                    ← Root + bottom tab navigator
├── core/                      ← Engine (EventLoop, TaskQueue, Persistence)
├── services/
│   ├── background/            ← iOS+Android background fetch abstraction
│   ├── health/                ← HealthMonitor
│   └── state/                 ← Zustand systemStore
├── screens/
│   ├── HomeScreen.tsx         ← System dashboard (dark neon UI)
│   └── MapScreen.tsx          ← Proximity map + pin system
└── types/                     ← Central type definitions

ANL/
├── screens/MapView.jsx        ← Web preview of full map UI
└── components/pins/           ← SVG pin showcases (F, M, TM, TW variants)
```

---

## Setup

```bash
npm install
npx expo start
```

Path aliases (`@core/*`, `@services/*`, etc.) work via `babel-plugin-module-resolver`.

---

## Pin System

Gender-specific map pins with smart routing logic:

| Gender      | Default     | Selected      | 90%+ Match   | New       | Offline     |
|-------------|-------------|---------------|--------------|-----------|-------------|
| Women       | Classic Butt| Heart Drop    | Match Color  | Cartoon   | Minimal     |
| Men         | Eggplant    | Eggplant Drop | Chest        | Skull     | Shield      |
| Trans Women | Star        | Flag Drop     | Butterfly    | Lotus     | Crescent    |
| Trans Men   | Mars        | Flag Drop     | Dragon       | Lightning | Warrior Shield |

---

## Architecture

See `CLAUDE.md` for full autonomous agent instructions and system design.
