# ANL — All Night Long

Real-time nightlife dating app. Connect with people nearby. Tonight.

## Stack

- **Frontend:** React + Vite (PWA)
- **Backend:** Express + Socket.io + PostgreSQL
- **Mobile:** React Native + Expo (future)
- **Realtime:** Socket.io WebSocket
- **Auth:** Supabase (phone OTP)
- **Video:** LiveKit WebRTC
- **Storage:** AWS S3

## Quick Start

### Local Development

```bash
# Run everything on localhost
bash scripts/start-dev.sh

# Open http://localhost:5173
# Backend on http://localhost:3001
```

**Test credentials:**
- Phone: +1 234 567 8900 (any phone works)
- OTP: `123456` or `000000`

### Project Structure

```
ANL/
├── src/                    # React app
│   ├── App.tsx            # Root component
│   ├── AppWeb.tsx         # Web router (no React Native deps)
│   ├── main.jsx           # Web entry point
│   ├── screens/           # UI screens
│   ├── services/          # API + auth + state
│   ├── hooks/             # Custom hooks
│   ├── navigation/        # React Navigation (native)
│   └── types/             # TypeScript definitions
├── backend/               # Express server
│   ├── server.js          # Full production server
│   ├── server-minimal.js  # Dev-only minimal server
│   ├── routes/            # API endpoints
│   ├── socket/            # WebSocket handlers
│   └── services/          # Business logic
├── public/                # Static PWA assets
│   ├── manifest.json      # PWA manifest
│   ├── sw.js              # Service worker
│   └── icons/             # App icons
├── supabase/              # Database migrations
└── scripts/               # Build/deploy scripts
```

## Features

- 📍 **Real-time map** — See who's out right now, nearby
- 🔥 **Discovery** — Swipe cards, like, skip
- 💬 **Chat** — Real-time messaging
- 📹 **Video calls** — 1-on-1 video via WebRTC
- 👻 **Ghost mode** — Be invisible to others
- 🌙 **Presence** — Show your status (free, away, etc.)
- 📲 **PWA** — Install on any device
- 🔐 **Privacy-first** — Phone OTP auth, no email

## Deployment

See [DEPLOY.md](./DEPLOY.md) for full production deployment guide.

**TL;DR:**
1. Backend → Railway
2. Frontend → Vercel (auto from GitHub)
3. Database → Supabase
4. Domain → anl.app

## API Routes

```
POST   /api/auth/send-otp              # Send OTP to phone
POST   /api/auth/verify-otp            # Verify code, get token
GET    /api/auth/me                    # Current user (JWT required)
PUT    /api/users/:id                  # Update profile
GET    /api/discovery/nearby            # Get nearby users
POST   /api/matches/like                # Like a user
POST   /api/messages/send               # Send message
GET    /api/messages/:userId            # Get chat history
GET    /api/ice/config                  # TURN credentials for WebRTC
```

## Environment Variables

See `.env.example` for complete list. Key variables:

```
# Backend
PORT=3001
JWT_SECRET=<random string>
DATABASE_URL=postgresql://...
STRIPE_SECRET_KEY=sk_live_...
AWS_ACCESS_KEY_ID=...
S3_BUCKET=anl-media-prod

# Frontend
VITE_API_URL=https://api.anl.app
VITE_MAPBOX_TOKEN=pk.eyJ...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

## Development

### Backend
```bash
cd backend
npm run dev         # Start with in-memory DB
npm run dev:watch  # Auto-reload on file changes
```

### Frontend
```bash
npm run dev        # Start Vite dev server
npm run build      # Build for production
npm run preview    # Preview production build
```

### Database
```bash
supabase start     # Local Postgres (requires Docker)
supabase migration up
```

## Testing

- **Frontend PWA:** DevTools > Application > Service Workers
- **Backend health:** `curl http://localhost:3001/api/health`
- **WebSocket:** Check Network tab for ws://localhost:3001
- **OTP:** Use 123456

## Production Checklist

- [ ] All env vars set (Backend + Frontend + Database)
- [ ] Backend deployed to Railway/Heroku
- [ ] Frontend deployed to Vercel
- [ ] Database migrations run
- [ ] Domain DNS configured
- [ ] HTTPS enabled (auto on Vercel)
- [ ] Stripe webhook configured
- [ ] Error tracking set up (Sentry/Bugsnag)
- [ ] Monitoring enabled (New Relic/DataDog)

## Monitoring

- **Frontend:** Vercel Analytics (built-in)
- **Backend:** Railway logs or Heroku logs
- **Database:** Supabase Postgres dashboard
- **Errors:** Sentry/Bugsnag integration

## Cost

| Service | Cost |
|---------|------|
| Vercel (Frontend) | $20/mo |
| Railway (Backend) | $5–50/mo |
| Supabase (DB) | $25/mo |
| AWS S3 (Storage) | $5–50/mo |
| LiveKit (Video) | $0–100/mo |
| Domain | $1/12 per year |

## Contributing

1. Create feature branch: `git checkout -b feature/thing`
2. Commit: `git commit -am "feat: add thing"`
3. Push: `git push origin feature/thing`
4. PR to `main`
5. After merge, Vercel auto-deploys

## License

Proprietary — cloudygetty-ai/ANL

## Contact

- GitHub: https://github.com/cloudygetty-ai/ANL
- Issues: https://github.com/cloudygetty-ai/ANL/issues

