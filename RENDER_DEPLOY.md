# ANL Deployment on Render.com

## 3-Step Deployment (20 minutes)

### PHASE 1: Create PostgreSQL Database (5 min)

1. Go: https://dashboard.render.com
2. **New +** → **PostgreSQL**
3. Configure:
   ```
   Name:           anl-db
   Database Name:  anl
   User:           anl_user
   Region:         Oregon (or closest to you)
   Plan:           Standard ($15/month)
   ```
4. Create Database
5. **Wait 2-3 minutes** for database to start
6. Copy the **Internal Database URL** (postgres://...)
   - Save this — you'll need it for the web service

### PHASE 2: Deploy Backend API (5 min)

1. **New +** → **Web Service**
2. Configure Repository:
   ```
   Repository:     cloudygetty-ai/ANL
   Branch:         main
   Root Directory: (leave blank)
   Build Command:  npm install
   Start Command:  npm start
   Environment:    Node
   Plan:           Standard ($7/month)
   ```
3. **Environment Variables** — add these:
   ```
   NODE_ENV=production
   PORT=3001
   JWT_SECRET=<generate random 32+ char string>
   DATABASE_URL=<paste from database Internal URL>
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   AWS_ACCESS_KEY_ID=<your IAM>
   AWS_SECRET_ACCESS_KEY=<your IAM>
   AWS_REGION=us-east-1
   S3_BUCKET=anl-media-prod
   CORS_ORIGIN=https://anl.app,https://www.anl.app
   TURN_SECRET=<generate random>
   TURN_HOST=turn.anl.app
   ```
4. **Create Web Service**
5. Render auto-deploys from GitHub
6. **Copy your web service URL** → `https://anl-api-xxxx.onrender.com`

### PHASE 3: Set Up Frontend (Vercel) (10 min)

1. Go: https://vercel.com/dashboard
2. ANL project → **Settings** → **Environment Variables**
3. Add:
   ```
   VITE_API_URL=https://anl-api-xxxx.onrender.com
   VITE_MAPBOX_TOKEN=pk.eyJ1IjoiY2xvdWR5LW1lYXQi...
   VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
   ```
4. Buy domain:
   - Go: https://vercel.com/domains
   - Search: **anl.app**
   - Buy ($10/year or $1/month)
5. Connect domain:
   - Settings → **Domains**
   - Add **anl.app**
   - Vercel shows nameservers (if bought elsewhere, update DNS)
6. **Wait 5-10 min** for DNS propagation

---

## Verify Deployment (5 min)

```bash
# Test backend health
curl https://anl-api-xxxx.onrender.com/api/health

# Should respond:
# {"status":"ok","timestamp":...,"uptime":...}
```

Then:
- Open https://anl.app in browser
- Test OTP: +1 234 567 8900 → code: 123456
- Check DevTools > Application > Service Workers (should see sw.js)
- Test chat, discovery, everything works

---

## Post-Launch Monitoring

**Backend (Render):**
- Dashboard > Logs tab
- Watch for errors in real-time

**Frontend (Vercel):**
- Dashboard > Analytics
- Monitor Core Web Vitals

**Database (Render):**
- Dashboard > Postgres > Insights
- Check connection count, query performance

---

## Important: Run Database Migrations

After database is created, you need to run migrations:

```bash
# If using Render's PostgreSQL:
psql <DATABASE_URL from Render>

# Then run migrations from supabase/migrations/
# OR Render dashboard > Database > Query > paste SQL from migrations
```

---

## Costs (Monthly)

```
Vercel (Frontend):     $0-20 (free tier + $20 pro)
Render Web Service:    $7 (Standard)
Render PostgreSQL:     $15 (Standard)
AWS S3:                $5-50 (storage)
Domain (anl.app):      $1 (annual, ~$0.08/month)
LiveKit (video):       $0-100 (optional)
─────────────────────
TOTAL:                 $28-185/month
```

---

## Troubleshooting

**Frontend can't connect to backend:**
- Check VITE_API_URL in Vercel env
- Check CORS_ORIGIN in Render env
- Test: curl https://anl-api-xxxx.onrender.com/api/health

**Database connection fails:**
- Check DATABASE_URL is correct (postgres://...)
- Check database is AVAILABLE (not starting/restarting)
- Test connection: psql <DATABASE_URL>

**OTP not working:**
- Check backend is running: curl /api/auth/send-otp
- Check logs in Render dashboard

**Service worker not installing:**
- Check public/manifest.json exists
- Check public/sw.js exists
- DevTools > Application > Service Workers > check for errors

---

## URLs After Deployment

```
Frontend:   https://anl.app
Backend:    https://anl-api-xxxx.onrender.com
Health:     https://anl-api-xxxx.onrender.com/api/health
Database:   PostgreSQL on Render (via Render dashboard)
```

---

## GitHub Workflow (After Deployment)

Everything auto-deploys:

```bash
# Make changes locally
git checkout -b feature/thing
git commit -am "feat: add thing"
git push origin feature/thing

# Make PR → merge to main
# Render + Vercel auto-deploy
# Check: Render logs + Vercel Analytics
```

---

**Ready? Start with PHASE 1 above. Any issues, check troubleshooting.**
