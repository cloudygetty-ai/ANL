# AllNightLong — Deployment Guide (Railway + GitHub)

## Overview

This guide automates deployment of AllNightLong backend to **Railway** using **GitHub Actions**.

**What happens:**
1. Push to `main` branch (or `develop`)
2. GitHub Actions runs tests + linting
3. If tests pass, Railway auto-deploys the backend
4. Health check validates the deployment

---

## Prerequisites

You must have:
- ✅ GitHub account with repo access
- ✅ Railway account (https://railway.app)
- ✅ Backend environment variables configured

---

## Setup Instructions

### **1. Connect GitHub to Railway**

1. Go to https://railway.app and sign in
2. **New Project** → **Deploy from GitHub**
3. Select your GitHub repo (`AllNightLong`)
4. Give Railway permission to your repo
5. **Create a Project** → name it `anl-backend`

---

### **2. Configure Environment Variables in Railway**

In your **Railway Project Settings**, add these variables:

```
# Database & Auth
DATABASE_URL=postgresql://user:password@host:port/dbname
JWT_SECRET=your-jwt-secret-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-key

# AWS S3 (media uploads)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=anl-media-prod

# Stripe (payments)
STRIPE_SECRET_KEY=sk_live_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret

# WebRTC & CORS
CORS_ORIGIN=https://your-frontend-domain.com
WEBRTC_PORT=4001

# Redis (optional, for production Socket.IO)
REDIS_URL=redis://username:password@host:port
```

**How to add variables in Railway:**
1. Project → **Variables**
2. Add each key-value pair
3. Click **Deploy**

---

### **3. Verify railway.json**

The config is already in your repo:

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd backend && npm install"
  },
  "deploy": {
    "startCommand": "cd backend && node server.js",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

✅ No changes needed — Railway will use this automatically.

---

### **4. Deploy**

**Option A: Automatic (Recommended)**
```bash
git push origin main
```

GitHub Actions will:
1. ✅ Run tests
2. ✅ Run linting
3. ✅ Push to Railway (if all pass)
4. ✅ Health check validates `/health` endpoint

**Option B: Manual in Railway UI**
1. Go to Railway Project
2. **Deployments** → **Trigger Deploy**
3. Wait for build to complete

---

## Monitoring Deployment

### **In Railway Dashboard:**
1. Click your **Project**
2. **Deployments** tab shows build status
3. **Logs** shows real-time output
4. **Health** shows `/health` endpoint status

### **Check Backend is Live:**
```bash
curl https://your-railway-domain/health
# Expected: { "status": "ok", "ts": 1712774400000 }
```

---

## Rollback (If Needed)

1. Go to Railway **Deployments**
2. Find the previous successful deployment
3. Click **Redeploy**
4. Railway will restart the old version

---

## Environment Variables Reference

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | ✅ | Supabase PostgreSQL URL |
| `JWT_SECRET` | ✅ | Min 32 chars, keep secret |
| `SUPABASE_URL` | ✅ | Your Supabase project URL |
| `SUPABASE_KEY` | ✅ | Supabase anon key |
| `AWS_ACCESS_KEY_ID` | ✅ | AWS IAM credentials |
| `AWS_SECRET_ACCESS_KEY` | ✅ | AWS IAM credentials |
| `AWS_REGION` | ✅ | e.g., `us-east-1` |
| `AWS_S3_BUCKET` | ✅ | S3 bucket name |
| `STRIPE_SECRET_KEY` | ✅ | Stripe secret key (live) |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Stripe webhook secret |
| `CORS_ORIGIN` | ⚠️ | Restrict in production |
| `REDIS_URL` | ❌ | Optional, for scaling |

---

## Troubleshooting

### **Build Fails**
Check **Logs** tab in Railway:
- ❌ "node not found" → Node version mismatch
- ❌ "npm ERR!" → Dependency issue, run `npm ci` locally
- ❌ "ENOENT" → Missing `.env` variables

**Fix:** Add missing variables to Railway → **Redeploy**

### **Health Check Fails**
```bash
curl -v https://your-railway-domain/health
```
- ❌ 502 Bad Gateway → Backend crashed, check **Logs**
- ❌ Connection timeout → Railway restarting, wait 2 min
- ✅ 200 OK → Deployment successful

### **Logs Show No Output**
1. Railway **Variables** → check all are set
2. Click **Redeploy**
3. Tail logs in real-time

---

## Next Steps

- **Frontend:** Deploy React Native app to Expo EAS or Vercel
- **Database:** Set up Supabase RLS policies
- **Monitoring:** Add Sentry error tracking (optional)
- **CI/CD:** GitHub Actions already configured to run tests before deploy

---

## Support

For Railway issues: https://docs.railway.app
For ANL backend issues: See `CLAUDE.md` architecture guide

