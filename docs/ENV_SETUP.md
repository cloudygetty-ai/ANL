# Environment Setup

## Step 1 — Create your local .env

```bash
cp .env.example .env
```

Then fill in each value below.

---

## Mapbox (3D Map)

1. Go to [account.mapbox.com](https://account.mapbox.com/access-tokens/)
2. Click **Create a token**
3. Name it `ANL Dev`
4. Under **Public scopes** keep defaults (styles:read, tiles:read)
5. Copy the token — starts with `pk.`

```
EXPO_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...
```

**Free tier:** 50,000 map loads/month — plenty for dev and early users.

---

## Supabase (Chat + NightPulse)

1. Go to [supabase.com](https://supabase.com) → New project
2. Name it `anl-prod`, pick a region close to NJ (us-east-1)
3. **Settings → API**
   - Copy **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - Copy **anon / public key** → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

```
EXPO_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

**Free tier:** 500MB DB, 2GB bandwidth, 50k realtime messages/month.

### Supabase tables to create

Run this in the Supabase SQL editor:

```sql
-- Channels (DM + group rooms)
create table channels (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('dm','event','venue','neighborhood')),
  name        text,
  dm_id       text unique,          -- sorted user_id pair for DMs
  member_ids  uuid[] default '{}',
  event_id    uuid,
  updated_at  timestamptz default now()
);

-- Messages
create table messages (
  id          uuid primary key default gen_random_uuid(),
  channel_id  uuid references channels(id) on delete cascade,
  sender_id   uuid not null,
  content     text,
  type        text default 'text' check (type in ('text','image','vibe','system')),
  read_by     uuid[] default '{}',
  created_at  timestamptz default now()
);

-- Read receipts
create table message_reads (
  channel_id  uuid references channels(id) on delete cascade,
  user_id     uuid not null,
  read_at     timestamptz default now(),
  primary key (channel_id, user_id)
);

-- Indexes
create index on messages(channel_id, created_at desc);
create index on channels(updated_at desc);

-- Enable Realtime on messages
alter publication supabase_realtime add table messages;
```

---

## LiveKit (Video)

Two options:

### Option A — LiveKit Cloud (easiest)
1. Go to [livekit.io](https://livekit.io) → Sign up free
2. Create a project
3. Copy **API Key** and **API Secret** — these go on your **backend**, not in the app
4. Copy **WebSocket URL** (e.g. `wss://your-app.livekit.cloud`)

Your backend issues tokens like this (Node.js):

```js
import { AccessToken } from 'livekit-server-sdk';

app.post('/video/token', async (req, res) => {
  const { userId, targetId, roomType } = req.body;
  const roomName = roomType === 'dm'
    ? [userId, targetId].sort().join('-')
    : `group-${targetId}`;

  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    { identity: userId, ttl: '1h' }
  );
  token.addGrant({ roomJoin: true, room: roomName });

  res.json({
    token:    await token.toJwt(),
    roomName,
    serverUrl: process.env.LIVEKIT_URL,
  });
});
```

**Free tier:** 100 concurrent participants.

### Option B — Daily.co (zero infra)
1. Go to [daily.co](https://daily.co) → Sign up
2. Copy API key
3. Rooms created via REST — no server SDK needed

---

## Running locally

```bash
npm install
npx expo start
```

Scan QR with Expo Go (iOS/Android) or press `i` for iOS simulator.

---

## Production (Expo EAS)

```bash
npm install -g eas-cli
eas login
eas build:configure

# Add secrets to EAS (never commits to git)
eas secret:create --name EXPO_PUBLIC_MAPBOX_TOKEN --value "pk.eyJ1..."
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://..."
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJ..."
eas secret:create --name EXPO_PUBLIC_API_URL --value "https://api.allnightlong.app"

# Build
eas build --platform ios
eas build --platform android
```
