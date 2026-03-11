# Environment Setup — ANL

This guide walks through every external service the app depends on and exactly what you need to configure to run ANL locally or deploy it to production.

All credentials go in a `.env` file at the project root. A template is provided at `.env.example`. Copy it before starting:

```bash
cp .env.example .env
```

Never commit `.env`. It is in `.gitignore`.

---

## 1. Mapbox

Mapbox powers the map view, pin rendering, and location search.

### Sign up

1. Go to [mapbox.com](https://www.mapbox.com) and create a free account.
2. Navigate to your account page: **Account → Tokens**.
3. Click **Create a token**.
4. Give it a name (e.g. `anl-dev`) and leave the default public scopes enabled.
5. Copy the token — it starts with `pk.`.

### Add to .env

```env
EXPO_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...
```

### Notes

- The free tier allows 50,000 map loads per month — more than enough for development and early production.
- For production, create a separate token with the **Allowed URLs** scope locked to your app's domain or bundle ID to prevent token theft.
- The token is embedded in the built app binary. Do not use a secret token (starting with `sk.`) here — only public tokens belong in client code.

---

## 2. Supabase

Supabase provides the database, authentication, realtime subscriptions, and storage layer.

### Create a project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New project**.
3. Choose your organization, set a project name (e.g. `anl`), pick a region close to your users, and set a strong database password. Save the password — you will need it later.
4. Wait for the project to initialize (~2 minutes).

### Run the schema

Once the project is ready:

1. In the Supabase dashboard, go to **SQL Editor**.
2. Click **New query**.
3. Open `supabase/schema.sql` from this repo and paste the entire contents into the editor.
4. Click **Run**.

The script is idempotent — `create extension if not exists` and `on conflict do nothing` make it safe to re-run if anything goes wrong partway through.

### Get your credentials

1. In the Supabase dashboard, go to **Settings → API**.
2. Copy the **Project URL** (looks like `https://abcdefgh.supabase.co`).
3. Copy the **anon / public** key (a long JWT starting with `eyJ`).

Do not use the service role key on the client. The anon key is the correct one for mobile apps — RLS policies protect what users can access.

### Add to .env

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Enable Phone Auth (optional)

If you want SMS-based login:

1. Go to **Authentication → Providers → Phone**.
2. Enable it and configure a Twilio or Vonage account.
3. For local development, Supabase supports OTP verification in the dashboard so you can test without an SMS provider.

### Realtime

Realtime is already enabled for the required tables in `schema.sql` via:

```sql
alter publication supabase_realtime add table public.messages;
```

No additional dashboard configuration is required.

### Storage (avatars)

1. Go to **Storage** in the Supabase dashboard.
2. Click **New bucket** and name it `avatars`.
3. Set the bucket to **Public** so avatar URLs can be served without authentication.
4. Add an RLS policy on the `avatars` bucket so only the owning user can upload to their own path:
   - Policy name: `Avatar uploads by owner`
   - Allowed operation: `INSERT`
   - Using expression: `(auth.uid())::text = (storage.foldername(name))[1]`

---

## 3. LiveKit (Video & Audio)

LiveKit powers the in-app video calls and audio rooms. You can self-host or use LiveKit Cloud.

### Option A: LiveKit Cloud (recommended for development)

1. Sign up at [livekit.io](https://livekit.io).
2. Create a new project.
3. Copy the **WebSocket URL** (e.g. `wss://your-project.livekit.cloud`).
4. Go to **Settings → Keys** and copy an API key and secret.

### Option B: Self-hosted

Run LiveKit server locally using Docker:

```bash
docker run --rm \
  -p 7880:7880 \
  -p 7881:7881 \
  -p 7882:7882/udp \
  livekit/livekit-server \
  --dev \
  --bind 0.0.0.0
```

The `--dev` flag generates a static API key/secret pair printed to stdout on startup.

### Token generation endpoint

LiveKit tokens must be generated server-side (they include a signed secret). You need a small token endpoint — a Supabase Edge Function is the simplest option.

Create the function at `supabase/functions/livekit-token/index.ts`:

```ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { AccessToken } from 'npm:livekit-server-sdk';

serve(async (req) => {
  const { roomName, participantName } = await req.json();

  const token = new AccessToken(
    Deno.env.get('LIVEKIT_API_KEY')!,
    Deno.env.get('LIVEKIT_API_SECRET')!,
    { identity: participantName }
  );
  token.addGrant({ roomJoin: true, room: roomName });

  return new Response(JSON.stringify({ token: await token.toJwt() }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

Deploy it:

```bash
supabase functions deploy livekit-token
supabase secrets set LIVEKIT_API_KEY=your_key LIVEKIT_API_SECRET=your_secret
```

### Add to .env

```env
EXPO_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
EXPO_PUBLIC_LIVEKIT_TOKEN_ENDPOINT=https://your-project-ref.supabase.co/functions/v1/livekit-token
```

---

## 4. ANL Backend API

`EXPO_PUBLIC_API_URL` points to the ANL backend REST API that the mobile app calls for operations not handled directly by Supabase (e.g. aggregated venue data, push notification triggers, server-side processing).

### Local development

Use your machine's LAN IP address so physical devices on the same network can reach the server:

```bash
# Find your LAN IP on macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Find your LAN IP on Windows
ipconfig | findstr "IPv4"
```

Then set:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.x:3000
```

> Do not use `http://localhost:3000` when testing on a physical device. The device cannot route to your machine's loopback address. Use the LAN IP or a tunnel tool such as `ngrok` (`ngrok http 3000` gives you a public HTTPS URL).

### Staging / production

Set this to your deployed API URL (e.g. a Vercel, Railway, or Fly.io deployment):

```env
EXPO_PUBLIC_API_URL=https://api.allnightlong.app
```

### Add to .env

```env
EXPO_PUBLIC_API_URL=http://192.168.1.x:3000
```

---

## 5. Expo EAS Build

EAS Build compiles native iOS and Android binaries in the cloud without requiring local Xcode or Android Studio.

### Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

### Configure the project

Initialize EAS in the project root (only needed once):

```bash
eas build:configure
```

This generates `eas.json`. The default configuration is sufficient for development builds. A working `eas.json`:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "distribution": "store"
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Run a build

Development build (installs on your device, connects to local Metro):

```bash
eas build --platform android --profile development
eas build --platform ios --profile development
```

Production build (for App Store / Play Store submission):

```bash
eas build --platform all --profile production
```

### Environment variables in EAS

EAS reads `.env` at build time for variables prefixed with `EXPO_PUBLIC_`. For secrets that should not be embedded in the binary (server-only values like LiveKit API secret), set them as EAS secrets:

```bash
eas secret:create --scope project --name LIVEKIT_API_SECRET --value your_secret
```

---

## .env.example

The complete template — copy this to `.env` and fill in real values:

```env
# Mapbox
EXPO_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...

# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# LiveKit
EXPO_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
EXPO_PUBLIC_LIVEKIT_TOKEN_ENDPOINT=https://your-project-ref.supabase.co/functions/v1/livekit-token

# ANL Backend API
EXPO_PUBLIC_API_URL=http://localhost:3000
```

---

## Verification Checklist

Run through this after completing setup to confirm everything is wired correctly:

- [ ] `expo start` launches without crashing.
- [ ] The map loads and displays tiles (Mapbox token working).
- [ ] Sign-in flow completes and creates a row in `public.users` (Supabase auth working).
- [ ] Sending a message in a chat channel appears in the Supabase `messages` table (DB write working).
- [ ] A second device or simulator receives the message in real time without refreshing (Realtime working).
- [ ] A video call connects between two accounts (LiveKit working).
- [ ] `eas build --platform android --profile development` completes without error (EAS working).

---

*Last updated: 2026-03-06*
