# ANL — All Night Long: Architecture

This document describes the full architecture of the ANL app: its layers, the modules within each layer, how data flows between them, and the rules that govern what may import from what.

Read this before modifying anything in `src/core/` or `src/services/`. Read `CLAUDE.md` before reading this.

---

## System Overview

ANL is a React Native app built for nightlife social discovery. It combines real-time map features, gender-inclusive pin systems, chat, vibe signaling, and background operation into a single continuously-running application.

The system has four core guarantees:

1. **It does not die.** The event loop catches all errors at the iteration level and continues.
2. **It remembers.** State is snapshotted to AsyncStorage and restored on the next boot.
3. **It heals.** When error thresholds are crossed, the system triggers a self-heal sequence.
4. **It reports.** Every significant event is captured by HealthMonitor and surfaced to the dashboard.

---

## Layer Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        screens/                             │
│   HomeScreen  MapScreen  ChatScreen  ProfileScreen  etc.    │
│   (UI only — reads state, dispatches actions, renders)      │
└───────────────────────────┬─────────────────────────────────┘
                            │ imports from
┌───────────────────────────▼─────────────────────────────────┐
│                       services/                             │
│  AuthService  ChatService  LocationService  MatchingService │
│  NightPulseService  NotificationsService  VideoService      │
│  systemStore  userStore  mapStore  chatStore                │
└───────────────────────────┬─────────────────────────────────┘
                            │ imports from
┌───────────────────────────▼─────────────────────────────────┐
│                         core/                               │
│   EventLoopManager  TaskQueue  PersistenceLayer             │
│   SystemInitializer  BackgroundService                      │
└───────────────────────────┬─────────────────────────────────┘
                            │ imports from
┌───────────────────────────▼─────────────────────────────────┐
│                    types/  │  utils/                        │
│      TypeScript interfaces │ Logger  geo  format            │
└─────────────────────────────────────────────────────────────┘
```

### Layer Rules (strict — do not violate)

| Layer | Can import from | Cannot import from |
|---|---|---|
| `screens/` | `services/`, `hooks/`, `components/`, `utils/`, `types/` | `core/` directly |
| `services/` | `core/`, `utils/`, `types/` | `screens/` |
| `core/` | `utils/`, `types/` | `services/`, `screens/` |
| `hooks/` | `services/`, `utils/`, `types/` | `core/` directly, `screens/` |
| `components/` | `utils/`, `types/` | everything else |
| `utils/` | `types/` | everything else |

Violating these rules breaks the dependency graph and makes isolated testing impossible. If a module needs to cross layers, it is a sign the abstraction boundary is wrong — fix the structure, not the rule.

---

## Core Engine (`src/core/`)

The engine runs independently of the UI. It starts before the first screen renders and continues regardless of what the user does.

### SystemInitializer (`src/core/SystemInitializer.ts`)

The startup orchestrator. Called once from `App.tsx`. Runs in this order:

```
1. Check for an existing PersistenceLayer snapshot
2. If valid: restore state into the Zustand stores
3. If corrupt or absent: boot with default state, log a recovery event
4. Initialize HealthMonitor
5. Register BackgroundService with the OS
6. Start the EventLoopManager
```

Nothing else starts until SystemInitializer completes. All other modules depend on it having run.

---

### EventLoopManager (`src/core/eventLoop/EventLoopManager.ts`)

The heartbeat of the system. Runs a continuous loop that drives all scheduled tasks.

**Cycle per iteration:**

```
processEvents()
      │
      ▼
executeTasks()          ← pulls from TaskQueue by priority
      │
      ▼
updateState()           ← writes metrics to systemStore
      │
      ▼
checkHealth()           ← reads error count, uptime from HealthMonitor
      │
      └─► [if threshold exceeded]
                └─► heal()
                      ├─► TaskQueue.clearNonCritical()
                      ├─► PersistenceLayer.restoreSnapshot()
                      └─► HealthMonitor.recordRecovery()
      │
      ▼
persistCheckpoint()     ← snapshots current state via PersistenceLayer
      │
      ▼
adaptiveDelay()         ← waits, then loops
      │
      ▼
LOOP ◄──────────────────────────────────────────────────────────
```

**Adaptive delay:** The wait between iterations scales with system load. Under high task pressure the delay shortens toward `minDelayMs`. Under idle conditions it relaxes toward `maxDelayMs`. This preserves battery without sacrificing responsiveness.

**AppState awareness:** The loop listens to React Native's `AppState` API. When the app moves to the background, only `CRITICAL` priority tasks execute and the delay ceiling doubles. When foregrounded, full operation resumes on the next iteration without a restart.

**Error containment:** Every iteration is wrapped in a try/catch. A crash in any step logs the error, records it in HealthMonitor, and lets the next iteration begin. The loop does not stop.

---

### TaskQueue (`src/core/scheduler/TaskQueue.ts`)

Manages all tasks scheduled for execution by the event loop.

**Priority levels:**

| Level | Integer | When to use | Behavior under pressure |
|---|---|---|---|
| `CRITICAL` | 0 | System survival (health checks, persistence) | Always executes |
| `HIGH` | 1 | Core functionality (sync, event processing) | Executes unless critically resource-constrained |
| `NORMAL` | 2 | Standard operations (analytics, UI updates) | May be deferred |
| `LOW` | 3 | Nice-to-have (cache warming, prefetch) | Dropped under resource pressure |

Tasks are pulled in priority order each iteration. The queue is non-blocking — if a task fails, it is removed and the failure is recorded in HealthMonitor. Recurring tasks re-enqueue themselves on completion.

---

### PersistenceLayer (`src/core/persistence/PersistenceLayer.ts`)

Snapshots system state to AsyncStorage at a configurable interval (`snapshotIntervalMs`, default: 30 seconds).

**Contract:** PersistenceLayer is the only place in the codebase that touches AsyncStorage. No other module reads or writes to it directly.

**Snapshot lifecycle:**

```
WRITE:
  systemStore.getState()  →  serialize  →  AsyncStorage.setItem(key, json)

READ (on boot):
  AsyncStorage.getItem(key)  →  parse  →  validate schema  →  systemStore.setState()
  If parse fails or schema invalid:  →  log recovery event  →  boot with defaults
```

**Adding persistent state:** When new state must survive restarts, add it to `src/types/`, include it in the snapshot payload in `PersistenceLayer`, and write a recovery test. Do not skip the test — recovery is the hardest thing to get right and the easiest to break silently.

---

## Services Layer (`src/services/`)

Business logic that runs on top of the core engine. Services talk to Supabase, manage subscriptions, and expose callable methods that screens and hooks consume.

### AuthService (`src/services/auth/AuthService.ts`)

Manages the authentication lifecycle via Supabase Auth.

- **Sign in:** Phone OTP flow. Calls `supabase.auth.signInWithOtp({ phone })`.
- **Session restore:** On boot, reads the stored session and refreshes the token if needed.
- **Sign out:** Clears the Supabase session and resets `userStore`.
- **Profile creation:** After first sign-in, inserts a row into `public.users` if none exists.

All auth state is written to `userStore`. No screen ever calls Supabase Auth directly.

---

### ChatService (`src/services/chat/ChatService.ts`)

Manages real-time chat channels and messages.

- **DM creation:** Calls the `get_or_create_dm` RPC to get or create a channel.
- **Message send:** Inserts into `public.messages`. Optimistic update in `chatStore` before the DB write resolves.
- **Realtime subscription:** Subscribes to `messages` table changes for the active channel. On receipt, appends to `chatStore`.
- **Read receipts:** Upserts into `public.message_reads` when the user views a message.

---

### LocationService (`src/services/location/`)

Manages device GPS and publishes coordinates.

- Requests `expo-location` foreground permissions on first use.
- Polls location at an interval defined in `config` (default: every 30 seconds).
- Writes `latitude`, `longitude` to `userStore` and updates the `public.users` row via Supabase.
- On background: reduces polling frequency to once per 5 minutes to conserve battery.
- Exposes `getNearbyUsers(radiusMi)` which calls the `get_nearby_users` RPC.

---

### MatchingService (`src/services/matching/`)

Drives the match queue and vibe exchange logic.

- Fetches candidate users via `get_nearby_users` and scores them against the current user's `vibe_tags`.
- A match is created in `public.matches` when two users have mutually sent vibes.
- Exposes `sendVibe(toUserId, type)` which inserts into `public.vibes` and checks for a reciprocal vibe.
- Match creation triggers a notification via `NotificationsService`.

---

### NightPulseService (`src/services/nightpulse/NightPulseService.ts`)

Manages the NightPulse heatmap layer shown on the map.

- Calls `get_pulse_snapshot()` RPC on mount and on a 60-second poll interval.
- Subscribes to `pulse_zones` realtime changes for live intensity updates.
- Writes zone data to `mapStore`.
- Zone `intensity` (0–1) and `activeUsers` are computed server-side by a separate aggregation job; this service is read-only.

---

### NotificationsService (`src/services/notifications/`)

Handles push notifications via Expo Notifications.

- Registers for push tokens on first boot and stores the token in `public.users`.
- Listens for incoming notification events and routes them to the correct screen.
- Sends local notifications for match events and new messages when the app is foregrounded.

---

### VideoService (`src/services/video/`)

Manages LiveKit video and audio room sessions.

- Fetches a room token from the `LIVEKIT_TOKEN_ENDPOINT` (a Supabase Edge Function).
- Connects to the LiveKit room and exposes `localTrack`, `remoteTracks`, and room state.
- Cleans up room connections on unmount or app background.

---

## State Management (`src/services/state/`)

All global state lives in Zustand stores. No Redux. No React Context for global state.

### systemStore (`systemStore.ts`)

Operational health and loop metrics. Read by the dashboard screen.

```ts
interface SystemState {
  isRunning: boolean;
  loopIteration: number;
  averageLoopMs: number;
  errorCount: number;
  uptime: number;
  lastHealedAt: number | null;
  appState: 'active' | 'background' | 'inactive';
}
```

### userStore (`userStore.ts`)

The authenticated user's own profile and session.

```ts
interface UserState {
  userId: string | null;
  displayName: string;
  gender: Gender | null;
  avatarUrl: string | null;
  vibeTags: string[];
  isOutTonight: boolean;
  isPremium: boolean;
  latitude: number | null;
  longitude: number | null;
  presence: PresenceStatus;
}
```

### mapStore (`mapStore.ts`)

Nearby users, pulse zones, and map camera state.

```ts
interface MapState {
  nearbyUsers: User[];
  pulseZones: PulseZone[];
  cameraLatitude: number;
  cameraLongitude: number;
  cameraZoom: number;
  selectedUserId: string | null;
}
```

### chatStore (`chatStore.ts`)

Active channel state and message history.

```ts
interface ChatState {
  activeChannelId: string | null;
  channels: Channel[];
  messages: Record<string, Message[]>;
  unreadCounts: Record<string, number>;
}
```

**Store rules:**
- State shape is defined in `src/types/`. Stores import types, never define them.
- All mutations are named actions. `setState` is not called directly from outside the store file.
- Derived/computed values are selectors, not stored state — nothing is duplicated.
- Stores have no knowledge of AsyncStorage. Persistence is entirely handled by `PersistenceLayer`.

---

## Hooks (`src/hooks/`)

Hooks wrap service calls and store reads into ergonomic React APIs for use in screens. No business logic lives in hooks — they delegate to services.

### `useAuth` (`src/hooks/useAuth.ts`)

```ts
const { user, signIn, signOut, isLoading } = useAuth();
```

Reads from `userStore`. Calls `AuthService.signIn` / `AuthService.signOut`. Used on the auth screen and in any screen that needs to know the current user.

### `useLocation` (`src/hooks/useLocation.ts`)

```ts
const { latitude, longitude, nearbyUsers, requestPermission } = useLocation();
```

Reads from `userStore` and `mapStore`. Calls `LocationService.getNearbyUsers`. Handles permission request state.

### `usePresence` (`src/hooks/usePresence.ts`)

```ts
const { presence, setPresence, isOutTonight, toggleOutTonight } = usePresence();
```

Reads and writes `presence` and `is_out_tonight` via `AuthService.updateProfile`. Debounces rapid toggles before writing to Supabase.

---

## Logger (`src/utils/Logger.ts`)

Centralized logging. All modules log through this — no raw `console.log` in production code.

**Features:**
- **Level filtering:** `DEBUG` → `INFO` → `WARN` → `ERROR`. Logs below `minLevel` are suppressed.
- **Ring buffer:** Retains the last `maxBufferSize` entries in memory. Older entries are discarded automatically.
- **Subscriber pattern:** External consumers (dashboard, HealthMonitor) receive log events without coupling to Logger's internals.

**Usage:**

```ts
import { logger } from '@utils/logger';

logger.info('EventLoop', 'Iteration complete', { durationMs: 42 });
logger.error('PersistenceLayer', 'Snapshot restore failed', error);
```

The first argument is the module tag, used to filter log output per component.

---

## Data Flow Diagrams

### User sends a message

```
User types message in ChatScreen
        │
        ▼
chatStore.optimisticAdd(message)    ← immediate UI update
        │
        ▼
ChatService.sendMessage(channelId, content)
        │
        ▼
supabase.from('messages').insert()  ← DB write
        │
        ▼
Supabase Realtime broadcasts to channel subscribers
        │
        ▼
ChatService.onMessage handler fires on all member devices
        │
        ▼
chatStore.appendMessage(message)    ← updates remote user's UI
```

### Location update cycle

```
LocationService.poll() [every 30s]
        │
        ▼
expo-location.getCurrentPositionAsync()
        │
        ▼
userStore.setLocation(lat, lon)
        │
        ▼
supabase.from('users').update({ latitude, longitude })
        │
        ▼
Supabase Realtime broadcasts user row change
        │
        ▼
Other users' mapStore.updateNearbyUser() fires
        │
        ▼
Map pin moves to new position
```

### Self-heal sequence

```
EventLoopManager.tick()
        │
        ▼
HealthMonitor.check()  →  errorCount > selfHealErrorThreshold
        │
        ▼
EventLoopManager.heal()
        ├─► TaskQueue.clearNonCritical()
        ├─► HealthMonitor.resetErrorCount()
        ├─► PersistenceLayer.restoreSnapshot()
        │           │
        │           ▼
        │   systemStore.setState(snapshot)
        │
        └─► HealthMonitor.recordRecovery()
        │
        ▼
Loop continues at next iteration with clean state
```

---

## Background Behavior

When the app moves to the background (`AppState` → `'background'` or `'inactive'`):

1. **Task filtering:** Only `CRITICAL` priority tasks are dequeued and executed.
2. **Delay doubling:** The adaptive delay ceiling doubles, reducing CPU wake frequency.
3. **Background fetch:** `BackgroundService` registers with the OS to wake the app at the `minimumFetchInterval` (default: 15 minutes) for a short execution window.
4. **No UI updates:** State writes that exist solely to drive UI re-renders are skipped.
5. **Location polling:** Reduced from 30-second to 5-minute intervals.
6. **Realtime subscriptions:** Maintained — Supabase websocket stays connected as long as the OS allows.

When the app returns to the foreground, full operation resumes on the next iteration without a restart.

**iOS constraint:** Background tasks on iOS must complete within ~30 seconds. Any task that requires longer must be split into chunks and rescheduled. This is a hard OS limit.

---

## Pin System

ANL uses a gender-inclusive custom pin system for the map view. Each user appears as a distinct pin shape and color based on their `gender` field:

| Gender | Pin shape | Primary color |
|---|---|---|
| `female` | Circle | `#f7a8c4` (pink) |
| `male` | Square | `#4488ff` (blue) |
| `trans_woman` | Diamond | `#55cdfc` / `#f7a8c4` (trans flag) |
| `trans_man` | Diamond | `#55cdfc` / `#f7a8c4` (trans flag) |
| `non_binary` | Hexagon | `#ffd700` / `#9b59b6` (NB colors) |

Pins are rendered as React Native SVG components in `src/components/pins/`. They are composable — the same pin component renders in the map, in profile cards, and in the legend.

---

## File Reference

```
src/
├── App.tsx                                    ← Root. Calls SystemInitializer, renders nav.
├── core/
│   ├── SystemInitializer.ts                   ← Boot orchestrator
│   ├── eventLoop/
│   │   └── EventLoopManager.ts               ← Main loop
│   ├── scheduler/
│   │   └── TaskQueue.ts                      ← Priority task queue
│   └── persistence/
│       └── PersistenceLayer.ts               ← AsyncStorage snapshots
├── services/
│   ├── auth/
│   │   ├── AuthService.ts                    ← Supabase Auth wrapper
│   │   └── index.ts
│   ├── chat/
│   │   ├── ChatService.ts                    ← Realtime chat
│   │   └── index.ts
│   ├── background/
│   │   ├── BackgroundService.ts              ← Platform background abstraction
│   │   └── index.ts
│   ├── health/
│   │   └── HealthMonitor.ts                  ← Metrics recorder
│   ├── location/
│   │   └── LocationService.ts                ← GPS + nearby user queries
│   ├── matching/
│   │   └── MatchingService.ts                ← Vibe exchange + match creation
│   ├── nightpulse/
│   │   └── NightPulseService.ts              ← Heatmap data
│   ├── notifications/
│   │   └── NotificationsService.ts           ← Push + local notifications
│   ├── video/
│   │   └── VideoService.ts                   ← LiveKit integration
│   └── state/
│       ├── systemStore.ts                    ← Loop + health metrics
│       ├── userStore.ts                      ← Current user profile
│       ├── mapStore.ts                       ← Nearby users + pulse zones
│       └── chatStore.ts                      ← Channels + messages
├── hooks/
│   ├── useAuth.ts
│   ├── useLocation.ts
│   └── usePresence.ts
├── components/
│   ├── pins/                                 ← Gender-inclusive map pin SVGs
│   ├── profile/                              ← Profile card components
│   └── ui/                                  ← Generic UI primitives
├── utils/
│   ├── Logger.ts                             ← Centralized logger
│   ├── geo.ts                                ← Distance / coordinate math
│   └── format.ts                             ← Date, number formatters
└── types/
    └── index.ts                              ← All TypeScript interfaces
```

---

*Last updated: 2026-03-06*
