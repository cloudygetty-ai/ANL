# ANL — Full Stack Deployment Guide

## Quick Start (Local Dev)

### 1. Backend (3001)
```bash
cd backend
npm install
npm run dev
```

Test: `curl http://localhost:3001/api/health`

### 2. Frontend (5173)
```bash
npm install
npm run dev
```

Opens: http://localhost:5173

### 3. Test Flow
1. Enter phone: +1 234 567 8900
2. OTP code: `123456` or `000000`
3. See Discovery screen

---

## Production Deployment

**Frontend:** Vercel (auto-deploys from main)
**Backend:** Railway or Heroku  
**Database:** Supabase (PostgreSQL)
**Video:** LiveKit

### Phase 1: Backend on Railway

1. https://railway.app → New Project
2. Select GitHub repo (ANL)
3. Add env vars (see Env Checklist below)
4. Railway provides `DATABASE_URL`
5. Get domain: `api-{slug}.railway.app`

### Phase 2: Frontend on Vercel

Already connected. Just:
1. Set `VITE_API_URL=https://api-{slug}.railway.app`
2. Buy domain `anl.app`
3. Connect in Vercel Settings

### Phase 3: Database (Supabase)

1. https://supabase.com → New Project
2. Run migrations in `supabase/migrations/`
3. Get `DATABASE_URL` → add to backend env

---

## Env Vars

### Backend
PORT, NODE_ENV, JWT_SECRET, DATABASE_URL, AWS keys, Stripe keys, etc.
See `.env.example` for complete list.

### Frontend
VITE_API_URL, VITE_MAPBOX_TOKEN, VITE_STRIPE_PUBLISHABLE_KEY

---

## Cost (Monthly)
- Vercel: $20
- Railway: $5–50
- Supabase: $25
- LiveKit: $0–100
- S3: $5–50
- Domain: $1/12
- **Total: $56–250**

