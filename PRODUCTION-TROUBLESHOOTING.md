# Production Troubleshooting Guide - Cricket Mela

## Table Sorting Issue Resolution

### Problem
Table sorting works in local environment but not in production (Cloudflare Pages).

### Root Cause
The issue is that production is serving an older version of the JavaScript bundle that doesn't include the sorting functionality.

---

## Troubleshooting Steps

### Step 1: Verify Local Changes
Before deploying, ensure sorting works locally:

```bash
# Start local server
./restart-all.sh

# Test in browser:
# 1. Go to http://localhost:5173
# 2. Login as admin or regular user
# 3. Check these pages:
#    - Admin > Matches > Manage Matches table
#    - Matches & Voting table
#    - Vote History table
# 4. Verify matches are sorted by date/time (earliest first)
```

### Step 2: Deploy Frontend to Cloudflare Pages
```bash
# From project root directory:
./deploy-cf-simple.sh
```

**What this script does:**
1. Cleans old build artifacts (`rm -rf dist`)
2. Installs dependencies (`npm install`)
3. Builds the frontend (`npm run build`)
4. Copies `_redirects` file to `dist/` (critical for API routing)
5. Deploys to Cloudflare Pages using wrangler

### Step 3: Verify Deployment Success
After running the deploy script, you should see:

```
✅ Deployment Complete!

🌐 Your app is live at:
   https://cricketmela.pages.dev

📊 Backend API:
   https://cricketmela-api.fly.dev
```

### Step 4: Clear Browser Cache
**CRITICAL:** Cloudflare may cache old JavaScript files, and your browser may also cache them.

**Option A - Hard Refresh (Recommended)**
- **Mac:** `Cmd + Shift + R`
- **Windows/Linux:** `Ctrl + Shift + R`

**Option B - Clear Cache Completely**
1. Open browser DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

**Option C - Incognito/Private Window**
- Open https://cricketmela.pages.dev in incognito mode

### Step 5: Verify Production is Updated

#### Check JavaScript Bundle Version
1. Open https://cricketmela.pages.dev
2. Open DevTools (F12) → Network tab
3. Refresh page
4. Look for files like `index-XXXXXXXX.js`
5. The hash (XXXXXXXX) should change after deployment
6. If the hash is the same as before deployment, the new version hasn't loaded

#### Check Sorting Functionality
1. Login to production site
2. Navigate to "Matches & Voting"
3. Check if matches are sorted by date/time (earliest at top)
4. Go to "Vote History" (after voting on some matches)
5. Check if votes are sorted by match date/time
6. Login as admin → Admin → Matches
7. Check if "Manage Matches" table is sorted

### Step 6: Troubleshoot Cloudflare Caching

If changes still don't appear after hard refresh:

#### Option A - Purge Cloudflare Cache via Dashboard
1. Go to https://dash.cloudflare.com
2. Select your account
3. Go to Workers & Pages
4. Click on "cricketmela" project
5. Go to Deployments tab
6. Find latest deployment
7. Click "..." → "Manage deployment"
8. Look for cache purge option

#### Option B - Wait for Cache Expiration
- Cloudflare's default cache is usually 2 hours
- Production changes may take up to 2 hours to fully propagate

#### Option C - Add Cache Busting Parameter
Test with: `https://cricketmela.pages.dev/?v=123456`

### Step 7: Verify Backend API (if table data seems wrong)

Check if backend is responding correctly:

```bash
# Test API directly
curl https://cricketmela-api.fly.dev/api/seasons

# Test login endpoint
curl -X POST https://cricketmela-api.fly.dev/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

---

## Common Issues & Solutions

### Issue 1: "_redirects file not working"
**Symptom:** Login returns 404 or 405 errors  
**Solution:** 
```bash
# Verify _redirects is in dist/ after build
ls -la frontend/dist/_redirects

# Re-deploy if missing
./deploy-cf-simple.sh
```

### Issue 2: "Old JavaScript still loading"
**Symptom:** Features work locally but not in production  
**Solution:**
1. Hard refresh browser (Cmd+Shift+R)
2. Try incognito mode
3. Wait 10-15 minutes for CDN propagation
4. Check Network tab for new bundle hash

### Issue 3: "Sorting works but in wrong order"
**Symptom:** Tables are sorted but newest matches appear first  
**Solution:** The code sorts oldest first. This is expected behavior.

### Issue 4: "Some matches show 'TBD' for date"
**Symptom:** Matches uploaded via CSV show 'TBD' instead of dates  
**Solution:** 
- Check CSV format: `01-Mar-26T6:30 AM` (required format)
- Re-upload matches with correct date format
- Sorting will skip invalid dates and put them at the end

### Issue 5: "Production shows blank page"
**Symptom:** https://cricketmela.pages.dev shows white screen  
**Solution:**
1. Check browser console for errors (F12 → Console tab)
2. Look for CORS errors or API connection issues
3. Verify backend is running: https://cricketmela-api.fly.dev/api/seasons
4. Check `_redirects` file is present in deployment

---

## Testing Checklist

After deploying to production, test these scenarios:

- [ ] Login page loads correctly
- [ ] Login with admin credentials works
- [ ] Login with regular user credentials works
- [ ] Admin > Matches shows sorted matches
- [ ] Matches & Voting page shows sorted matches
- [ ] Vote History shows sorted votes (after voting)
- [ ] Voting functionality works
- [ ] Setting winner works (admin)
- [ ] Points calculation is correct
- [ ] User Standings page loads
- [ ] Profile page works
- [ ] Seasons page shows user's assigned seasons only

---

## Quick Reference Commands

```bash
# Deploy frontend only
./deploy-cf-simple.sh

# Deploy backend only
./deploy-backend.sh

# Deploy both
./deploy-cf-simple.sh && ./deploy-backend.sh

# Test locally
./restart-all.sh

# Check local frontend
open http://localhost:5173

# Check local backend
curl http://localhost:4000/api/seasons

# Push code to GitHub
git add .
git commit -m "Fix table sorting in production"
git push origin main
```

---

## Files Changed for Sorting Fix

1. **VoteHistory.jsx** - Added sorting for vote history table
2. **Admin.jsx** - Already has sorting (verified working)
3. **Matches.jsx** - Already has sorting (verified working)

---

## Expected Behavior

### Manage Matches Table (Admin)
- Matches sorted by date/time (oldest first)
- TBD or invalid dates appear at the end

### Matches & Voting Table
- Matches sorted by date/time (oldest first)
- Upcoming matches appear first
- Past matches appear at the end

### Vote History Table
- User votes sorted by match date/time (oldest first)
- Shows chronological voting history

---

## Still Not Working?

If sorting still doesn't work after following all steps:

1. **Check Browser Console:**
   - Open DevTools (F12)
   - Look for JavaScript errors in Console tab
   - Share error messages for debugging

2. **Verify Deployment:**
   ```bash
   # Check Cloudflare deployment logs
   cd frontend
   npx wrangler pages deployment list --project-name=cricketmela
   ```

3. **Test API Directly:**
   - Open https://cricketmela-api.fly.dev/api/seasons
   - Should return JSON array of seasons
   - If 404/500 error, backend issue

4. **Contact Support:**
   - Share browser console errors
   - Share Network tab screenshot
   - Share specific page where sorting fails

---

## Notes

- **Cache Propagation:** Can take 5-15 minutes
- **DNS Propagation:** Already configured, not an issue
- **API Endpoints:** Backend on Fly.io, frontend proxies via `_redirects`
- **Database:** SQLite on Fly.io persistent volume
- **Sessions:** Stored in localStorage (no server sessions)


