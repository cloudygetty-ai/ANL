# 🚀 Railway Deployment Checklist

Follow these steps **in order** to deploy AllNightLong backend to Railway.

---

## ✅ Pre-Deployment (Complete These First)

- [ ] **Create Railway Account**
  - Go to https://railway.app
  - Sign up with GitHub

- [ ] **Gather Your Credentials** (have these ready):
  - Supabase project URL & anon key
  - AWS S3 access key, secret, bucket name, region
  - Stripe secret key & webhook secret
  - PostgreSQL connection string (from Supabase)
  - JWT secret (generate random 32+ char string)
  - Mapbox API token
  - CORS domain (your frontend URL)

---

## 🔗 Step 1: Connect GitHub to Railway

1. Go to https://railway.app/dashboard
2. Click **New Project**
3. Select **Deploy from GitHub**
4. Choose your AllNightLong repository
5. Grant railway.app permission to access your repos
6. Railway automatically detects `railway.json` ✅

---

## 🔐 Step 2: Add Environment Variables

**In Railway Dashboard:**

1. Click your **Project**
2. Go to **Variables** tab
3. Add each variable from the list below:

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@host:port/postgres
JWT_SECRET=generate-random-32-chars-minimum
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
AWS_CLOUDFRONT_URL=https://d123456.cloudfront.net
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PREMIUM=price_...
CORS_ORIGIN=https://your-frontend-domain.com
WEBRTC_PORT=4001
MAPBOX_TOKEN=pk.eyJ...
LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
LOG_LEVEL=info
NODE_ENV=production
```

**Click "Save Variables" after each one** (or paste all at once if Railway supports bulk import).

---

## 🚢 Step 3: Deploy

### **Option A: Automatic Deploy (Recommended)**

From your local machine:
```bash
cd c:\Users\cloud\AllNightLong
git add DEPLOYMENT_GUIDE.md backend\.env.example
git commit -m "docs: add Railway deployment guide and backend env template"
git push origin main
```

✅ **What happens next:**
1. GitHub Actions runs tests
2. Tests pass → Railway auto-deploys
3. Health check validates `/health` endpoint
4. Backend is live! 🎉

### **Option B: Manual Deploy in Railway UI**

1. Railway Dashboard → Your Project
2. Click **Deployments** tab
3. Click **Trigger Deploy**
4. Railway builds and starts your backend

---

## ✅ Step 4: Verify Deployment

Open a terminal and run:

```bash
curl https://your-railway-domain/health
```

**Expected response:**
```json
{ "status": "ok", "ts": 1712884523000 }
```

**Your Railway domain is:** 
- Railway Dashboard → Project → Deployments → View endpoint URL

---

## 📊 Monitoring

### **In Railway Dashboard:**
- **Deployments** tab = build status & history
- **Logs** tab = real-time server output
- **Health** indicator = `/health` endpoint status

### **Check server status:**
```bash
curl -v https://your-railway-domain/health
```

---

## 🔙 If Something Goes Wrong

### **Build Failed:**
1. Check **Logs** for the error
2. Common issues:
   - Missing environment variable → add it in Variables tab
   - Dependency issue → run `npm ci` locally to verify
   - Node version mismatch → Railway uses Node 18+ by default

### **Health Check Failed (502/503):**
1. Backend crashed → check **Logs**
2. Still starting → wait 30 seconds & retry
3. Can't read config → verify all env vars are set

### **Rollback to Previous Version:**
1. Railway Dashboard → **Deployments**
2. Find the last working deployment
3. Click **Redeploy**

---

## 📝 Reference

| Task | Where |
|------|-------|
| Add env variables | Railway Dashboard → Variables |
| View logs | Railway Dashboard → Logs |
| Check deployment status | Railway Dashboard → Deployments |
| Get Railway domain | Railway Dashboard → Endpoints |
| Configure build command | `railway.json` (already configured) |
| Configure start command | `railway.json` (already configured) |

---

## 🔒 Security Notes

- ✅ `.env` is in `.gitignore` — **never commit secrets**
- ✅ `backend\.env.example` shows what to configure
- ✅ Railway encrypts environment variables at rest
- ✅ Use separate keys for dev/staging/production
- ✅ Rotate Stripe webhook secret if exposed

---

## 🎯 Next Steps

After backend is deployed:

1. **Update Frontend API URL**
   - In `frontend/.env` set:
   ```
   EXPO_PUBLIC_API_URL=https://your-railway-domain
   ```

2. **Update Stripe Webhook** (if using)
   - Stripe Dashboard → Webhooks
   - Add Railway endpoint: `https://your-railway-domain/stripe/webhook`

3. **Test Backend Endpoints**
   ```bash
   # Health check
   curl https://your-railway-domain/health

   # Create a user (requires auth in production)
   curl -X POST https://your-railway-domain/api/users \
     -H "Content-Type: application/json"
   ```

4. **Deploy Frontend** (once backend API URL is updated)
   - EAS Build for mobile
   - Vercel for web

---

## ❓ FAQ

**Q: How do I update my backend code?**
A: Push to main branch → GitHub Actions tests → Railway auto-deploys

**Q: Can I deploy without GitHub?**
A: Yes, use Railway CLI: `railway up` from the `backend/` directory

**Q: How much does Railway cost?**
A: Free tier includes 512 MB RAM + $5/month credit. Most small apps fit in free tier.

**Q: Where should I set database URL?**
A: Railway → Variables (or use Railway's PostgreSQL template for auto-config)

**Q: Can I use my own PostgreSQL server?**
A: Yes, set `DATABASE_URL` to your server's connection string

---

**Need help?** 
- Railway docs: https://docs.railway.app
- Backend architecture: See `CLAUDE.md`
- Full deployment guide: See `DEPLOYMENT_GUIDE.md`

