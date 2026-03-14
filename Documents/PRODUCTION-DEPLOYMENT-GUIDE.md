# 🚀 PRODUCTION DEPLOYMENT GUIDE - Cricket Mela

**Date:** March 9, 2026  
**Status:** ✅ READY FOR DEPLOYMENT

---

## ✅ PRE-DEPLOYMENT VERIFICATION COMPLETED

All critical checks passed:
- ✅ Frontend builds without errors
- ✅ Cloudflare Pages configuration correct
- ✅ All proxy functions in place
- ✅ Backend configuration verified
- ✅ Database migrations ready
- ✅ Deploy scripts ready
- ✅ No duplicate state declarations
- ✅ All localhost references are conditional (NODE_ENV)

**Warning:** 8 localhost references found, but all are properly conditional with `NODE_ENV === 'production'` checks.

---

## 📋 DEPLOYMENT STEPS

### Step 1: Test Locally (Already Done ✅)

You've already built and verified locally. Frontend build completed successfully.

### Step 2: Deploy Backend to Fly.io

```bash
cd /Users/senthilponnappan/IdeaProjects/Test
./deploy-backend.sh
```

**What this does:**
- Builds backend Docker container
- Deploys to `cricketmela-api.fly.dev`
- Uses persistent volume at `/app/data` for SQLite database
- Sets `NODE_ENV=production` automatically
- Runs all database migrations on startup

**Expected output:**
```
✅ Backend deployed successfully!
Your backend is available at: cricketmela-api.fly.dev
```

**Verify backend deployment:**
```bash
curl https://cricketmela-api.fly.dev/api/health
# Should return: {"status":"ok"}
```

### Step 3: Deploy Frontend to Cloudflare Pages

```bash
cd /Users/senthilponnappan/IdeaProjects/Test
./deploy-cf-simple.sh
```

**What this does:**
1. Cleans and rebuilds frontend (`npm run build`)
2. Copies `public/_redirects` to `dist/_redirects` ✅
3. Copies `public/_headers` to `dist/`
4. Generates `version.json` for auto-refresh
5. Deploys to Cloudflare Pages using Wrangler
6. Includes `/functions` directory for API/auth proxying

**Expected output:**
```
✅ Deployment Complete!
🌐 Your app is live at: https://cricketmela.pages.dev
```

### Step 4: Post-Deployment Verification

#### 4.1 Browser Tests

1. **Clear browser cache** (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)

2. **Test Login:**
   - Visit: https://cricketmela.pages.dev
   - Login with: `admin` / `admin123`
   - Should work without any errors

3. **Test Navigation:**
   - Click through all pages: Seasons, Matches, Predictions, Vote History, Standings, Profile, Admin
   - Check browser console for errors (F12 → Console tab)
   - Verify no `404` or `405` errors in Network tab

4. **Test API Proxy:**
   - Open Network tab (F12 → Network)
   - Navigate to any page
   - All `/api/*` calls should return `200` status codes
   - Verify calls are going through Cloudflare (not directly to Fly.io)

5. **Test Google OAuth:**
   - Click "Sign in with Google"
   - Should redirect to Google login
   - After login, should redirect back to app
   - Check for OAuth callback errors

6. **Test Deep Links:**
   - Try: `https://cricketmela.pages.dev/?page=admin&adminTab=users`
   - Should open directly to admin users page (not home page)
   - This tests SPA routing with query parameters

#### 4.2 API Health Checks

```bash
# Backend health
curl https://cricketmela-api.fly.dev/api/health

# Login endpoint (via Cloudflare proxy)
curl -X POST https://cricketmela.pages.dev/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Should return user object with token
```

#### 4.3 Check Fly.io Status

```bash
flyctl status -a cricketmela-api
# Should show: STATE = started, CHECKS = passing

flyctl logs -a cricketmela-api
# Should show clean startup, no errors
```

#### 4.4 Check Database Persistence

```bash
flyctl ssh console -a cricketmela-api
ls -la /app/data/
# Should show: data.db

# Exit SSH
exit
```

---

## 🔧 CRITICAL CONFIGURATIONS VERIFIED

### Frontend Configuration

1. **Cloudflare Pages Functions** (API Proxy)
   - Location: `/frontend/functions/`
   - `_middleware.js` - SPA routing fallback ✅
   - `api/[[path]].js` - Proxies `/api/*` to Fly.io backend ✅
   - `auth/[[path]].js` - Proxies `/auth/*` for OAuth ✅

2. **_redirects File**
   - Location: `/frontend/public/_redirects`
   - Copied to `dist/` by deploy script ✅
   - Handles SPA routing: `/* /index.html 200` ✅

3. **Production URLs**
   - All API calls use relative paths (`/api/*`) ✅
   - Cloudflare Functions proxy to `https://cricketmela-api.fly.dev` ✅

### Backend Configuration

1. **fly.toml**
   - `NODE_ENV=production` ✅
   - Persistent volume: `cricket_data` → `/app/data` ✅
   - Health check endpoint: `/api/health` ✅

2. **Environment-Specific URLs**
   - All localhost references use `NODE_ENV === 'production'` checks ✅
   - Production frontend URL: `https://cricketmela.pages.dev` ✅
   - Production backend URL: `https://cricketmela-api.fly.dev` ✅

3. **Google OAuth Callback**
   - Production: `https://cricketmela-api.fly.dev/auth/google/callback` ✅
   - Configured in `backend/auth/googleStrategy.js` ✅

4. **Database Migrations**
   - `google_id` column migration ✅
   - `password_reset_tokens` table ✅
   - `venue` column migration ✅
   - `user_seasons.balance` column ✅
   - Prediction points columns ✅

---

## 🛡️ KNOWN SAFE WARNINGS

These are **NOT errors** and deployment can proceed:

1. **8 localhost references in backend** - All are properly conditional:
   ```javascript
   const url = process.env.NODE_ENV === 'production'
     ? 'https://cricketmela.pages.dev'
     : 'http://localhost:5173'
   ```

2. **CORS allowed origins includes localhost** - This is intentional for local development:
   ```javascript
   const allowedOrigins = [
     'http://localhost:5173',  // For local dev
     'https://cricketmela.pages.dev'  // Production
   ]
   ```

---

## 🚨 ROLLBACK PLAN

If deployment fails or issues arise:

### Rollback Frontend
```bash
# Cloudflare Pages keeps deployment history
# Go to: https://dash.cloudflare.com/
# Navigate to: Pages → cricketmela → Deployments
# Click "Rollback" on previous working deployment
```

### Rollback Backend
```bash
# Check deployment history
flyctl releases -a cricketmela-api

# Rollback to previous version
flyctl releases rollback -a cricketmela-api <version_number>
```

### Emergency Database Backup
```bash
# SSH into Fly.io machine
flyctl ssh console -a cricketmela-api

# Backup database
cp /app/data/data.db /app/data/data.db.backup-$(date +%Y%m%d-%H%M%S)

# Download backup to local
exit
flyctl ssh sftp get /app/data/data.db ./data.db.backup
```

---

## ✅ FINAL GO/NO-GO CHECKLIST

Before running deploy commands:

- [x] Frontend builds without errors
- [x] All React components have no syntax errors
- [x] `_redirects` file exists in `public/`
- [x] Cloudflare Functions exist in `functions/`
- [x] Backend `fly.toml` configured correctly
- [x] All migrations present in `db.js`
- [x] Deploy scripts are executable
- [x] No duplicate state declarations
- [x] All environment-specific URLs use NODE_ENV checks
- [ ] Google OAuth credentials set in Fly.io secrets (if using Google login)
- [ ] Email SMTP credentials set in Fly.io secrets (if using email features)

**Optional secrets setup:**
```bash
flyctl secrets set -a cricketmela-api \
  SESSION_SECRET="<your-strong-random-secret>" \
  GOOGLE_CLIENT_ID="<your-google-client-id>" \
  GOOGLE_CLIENT_SECRET="<your-google-client-secret>"
```

---

## 🎯 DEPLOY NOW

If all checks pass, run these commands:

```bash
# 1. Deploy backend first
./deploy-backend.sh

# 2. Wait for backend to be healthy (1-2 minutes)
flyctl status -a cricketmela-api

# 3. Deploy frontend
./deploy-cf-simple.sh

# 4. Hard refresh browser (Cmd+Shift+R)
# 5. Test login and navigation
```

---

## 📞 TROUBLESHOOTING

### Issue: Login returns 405 or 404

**Cause:** `_redirects` not deployed or Functions not working

**Fix:**
1. Check `dist/_redirects` exists after build
2. Verify Functions deployed: `ls -la frontend/functions/`
3. Re-run: `./deploy-cf-simple.sh`

### Issue: API calls fail with CORS errors

**Cause:** Backend not allowing Cloudflare origin

**Fix:**
1. Check backend logs: `flyctl logs -a cricketmela-api`
2. Verify CORS config includes `https://cricketmela.pages.dev`
3. Redeploy backend: `./deploy-backend.sh`

### Issue: Google OAuth fails

**Cause:** Callback URL mismatch or missing secrets

**Fix:**
1. Verify Google Console has callback: `https://cricketmela-api.fly.dev/auth/google/callback`
2. Check secrets: `flyctl secrets list -a cricketmela-api`
3. Set secrets if missing (see checklist above)

### Issue: Data not persisting after restart

**Cause:** Volume not mounted

**Fix:**
1. Check volume: `flyctl volumes list -a cricketmela-api`
2. Verify mount in `fly.toml`: `destination = '/app/data'`
3. SSH and check: `ls -la /app/data/data.db`

### Issue: Deep links show 404

**Cause:** SPA routing not working

**Fix:**
1. Check `_middleware.js` exists in `functions/`
2. Verify it returns `index.html` for non-asset routes
3. Redeploy: `./deploy-cf-simple.sh`

---

## 📊 MONITORING

After deployment, monitor these:

1. **Cloudflare Analytics:**
   - https://dash.cloudflare.com/ → cricketmela → Analytics

2. **Fly.io Monitoring:**
   ```bash
   flyctl dashboard -a cricketmela-api
   flyctl logs -a cricketmela-api --tail
   ```

3. **Browser Console:**
   - Check for JavaScript errors
   - Monitor Network tab for failed requests

---

## ✨ POST-DEPLOYMENT

Once deployed successfully:

1. **Notify users** to hard refresh: `Cmd+Shift+R` or `Ctrl+Shift+R`
2. **Test all features** as different user roles (admin, picker, superuser)
3. **Monitor logs** for first 30 minutes
4. **Check email notifications** work (signup, approval, password reset)
5. **Verify auto-refresh** triggers every 30 seconds
6. **Test predictions feature** with upcoming matches

---

**Generated:** March 9, 2026  
**Pre-deployment verification:** ✅ PASSED  
**Ready to deploy:** ✅ YES

