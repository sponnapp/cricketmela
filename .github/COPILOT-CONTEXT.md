# Copilot Context Memory – Production Deployment & Architecture

**Last Updated:** March 3, 2026  
**Purpose:** Comprehensive checklist for all code changes to ensure consistency across dev/prod

---

## 🎯 Critical Context – READ BEFORE ANY CHANGE

### Database Schema & Migrations
- **Location:** `backend/migrations.js`
- **Pattern:** Runs on every backend startup; checks columns exist before adding
- **Reason:** Ensures dev/prod parity; recovers from corrupted/reset databases
- **Status:** ✅ Keep permanently – this is NOT a temporary fix
- **Columns Managed:**
  - `users.google_id` (for Google OAuth)
  - `users.email` (for email notifications)

### Environment Detection
```javascript
// Always use this pattern in backend files:
const DB_DIR = process.env.NODE_ENV === 'production' ? '/app/data' : __dirname;
```
- **Local dev:** `__dirname` → `backend/data.db`
- **Fly.io prod:** `/app/data` → persistent volume mount

---

## 🚀 Deployment Architecture

### Tech Stack
| Layer | Service | URL |
|-------|---------|-----|
| Frontend | Cloudflare Pages | https://cricketmela.pages.dev |
| Backend | Fly.io | https://cricketmela-api.fly.dev |
| Database | SQLite on Fly.io volume | `/app/data/data.db` |

### Data Flow (Production)
```
Browser Request
  ↓
https://cricketmela.pages.dev/api/login
  ↓
Cloudflare _redirects rule
  ↓
https://cricketmela-api.fly.dev/api/login
  ↓
Backend Express route handler
```

---

## 📋 Pre-Change Checklist

**Before editing ANY file, ask:**

- [ ] Is this a frontend change? → Will it break the API proxy in `_redirects`?
- [ ] Is this a backend route change? → Does the CORS middleware allow it?
- [ ] Is this a database change? → Does `migrations.js` handle schema parity?
- [ ] Am I adding a new column? → Add migration to `migrations.js` **first**
- [ ] Am I changing an environment variable? → Is it set in `fly.toml` **and** `flyctl secrets`?
- [ ] Am I changing the API response format? → Will it break localStorage/user state in frontend?

---

## 🔧 Cloudflare Pages Setup – CRITICAL

### `frontend/_redirects` (Must Exist)
```
/api/* https://cricketmela-api.fly.dev/api/:splat 200
/* /index.html 200
```

### Deployment Script (`deploy-cf-simple.sh`)
**Must include this line before deployment:**
```bash
cp frontend/_redirects dist/
```

**Verification after deploy:**
```bash
curl -I https://cricketmela.pages.dev/_redirects
# Must return 200, not 404
```

### Common Failure: API 404s
- **Cause:** `_redirects` not in `dist/` folder
- **Fix:** Run `npm run build`, verify `dist/_redirects` exists, then deploy

---

## 🗄️ Fly.io Backend Setup – CRITICAL

### `fly.toml` Must Include
```toml
[env]
  NODE_ENV = "production"

[mounts]
  source = "data_volume"
  destination = "/app/data"

[[volumes]]
  name = "data_volume"
  size = 1
```

### Environment Secrets (Check with `flyctl secrets list`)
```bash
NODE_ENV=production
GOOGLE_CLIENT_ID=<your-id>
GOOGLE_CLIENT_SECRET=<your-secret>
GOOGLE_CALLBACK_URL=https://cricketmela-api.fly.dev/auth/google/callback
```

### Database Persistence Verification
```bash
flyctl volumes list
# Should show: data_volume | Attached | /app/data
```

**If volume is NOT attached:** Database resets on every restart → schema corruption

---

## 🔌 Backend Route Patterns

### All Routes Must Have CORS Headers
**Location:** `backend/index.js` (top-level middleware)
```javascript
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, x-user');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
```

### Authentication Pattern
```javascript
// Middleware that checks x-user header
function requireRole(...roles) {
  return (req, res, next) => {
    const username = req.headers['x-user'];
    // Lookup user, verify role
  }
}

// Usage:
app.post('/api/admin/matches/:id/set-winner', requireRole('admin', 'superuser'), (req, res) => {
  // ...
});
```

### New Routes Checklist
- [ ] Add CORS middleware at top of file
- [ ] Use `requireRole()` for admin endpoints
- [ ] Pass `x-user` header from frontend
- [ ] Log errors to console (for `flyctl logs`)
- [ ] Test locally first with `curl -H "x-user: admin"`
- [ ] Deploy backend, check logs: `flyctl logs --follow`
- [ ] Deploy frontend after backend confirms working

---

## 🎨 Frontend Patterns

### API Calls (Always Use Relative Paths)
```javascript
// ✅ Correct – proxied by Cloudflare
axios.get('/api/seasons')
axios.post('/api/votes', data, { headers: { 'x-user': user.username } })

// ❌ Wrong – hardcoded URL breaks on prod
axios.get('http://localhost:4000/api/seasons')
```

### User State (Stored in localStorage)
```javascript
const user = {
  id: 1,
  username: 'admin',
  role: 'admin',
  balance: 1000,
  display_name: 'Admin User',
  email: 'admin@example.com',
  google_id: null // null for traditional auth users
}
```

### Admin Guards Pattern
```javascript
const isAdmin = user?.role === 'admin';
const isSuperuser = user?.role === 'superuser';

// Hide bulk upload from superuser
{!isSuperuser && <BulkUploadSection />}

// Show set winner to both admin and superuser
{(isAdmin || isSuperuser) && <SetWinnerButton />}

// Exclude admin from standings
standings.filter(s => s.role !== 'admin')
```

---

## 📊 Database Schema

### Core Tables
```sql
users (id, username, role, password, display_name, email, google_id, approved, balance)
seasons (id, name)
user_seasons (user_id, season_id)
matches (id, season_id, home_team, away_team, scheduled_at, venue, winner)
votes (id, match_id, user_id, team, points, created_at)
settings (key, value)  -- email config, etc.
```

### Key Constraints
- One vote per user per match (UPDATE existing if changed)
- `scheduled_at` format: `DD-MMM-YYTH:MM AM/PM` (e.g., `01-Mar-26T6:30 AM`)
- Admin role excluded from voting/standings
- Email column defaults to `'xyz@xyz.com'`
- Google_id column nullable (only for Google OAuth users)

---

## 🔐 Authentication

### Traditional Login
```javascript
POST /api/login
Body: { username, password }
Response: { id, username, role, balance, display_name, email }
```

### Google OAuth Login
```javascript
GET /auth/google
// Redirects to Google consent screen
// Then redirects to /auth/google/callback
// On success, redirects to frontend with user in session
```

### Username Case-Insensitivity
- Backend **must** lowercase username before comparison:
  ```javascript
  const stored = db.get('SELECT * FROM users WHERE username = ?', [username.toLowerCase()]);
  ```

---

## 🐛 Known Issues & Solutions

| Issue | Root Cause | Prevention |
|-------|-----------|-----------|
| `SQLITE_ERROR: no such column` | Schema out of sync between dev/prod | Keep `migrations.js` running on every startup |
| API 404 errors | `_redirects` not in dist/ | Always run `cp frontend/_redirects dist/` before deploy |
| Data disappears on restart | Volume not mounted in fly.toml | Verify `[mounts]` + `[[volumes]]` in fly.toml |
| CORS errors in browser | Missing `Access-Control-Allow-*` headers | Check backend CORS middleware exists |
| Google OAuth 500 error | `google_id` column missing | Ensure `migrations.js` runs (check logs) |
| Votes disappearing | Frontend not calling `/api/matches/:id/user-vote` on mount | Add fetch in `useEffect` hook |
| Admin sees blank tables | Missing sort on `fetchAllMatches()` | Always call `sortMatchesByDateTime()` after fetch |

---

## ✅ Deployment Checklist (Before Every Release)

### Local Validation
- [ ] Run `npm run build` in `frontend/` – no errors
- [ ] Verify `dist/_redirects` exists
- [ ] Run `npm start` in `backend/` – no errors
- [ ] Test login locally: `http://localhost:5173`
- [ ] Test admin panel locally
- [ ] Check `backend/migrations.js` output in console

### Backend Deployment
```bash
cd backend
flyctl secrets list  # Verify all env vars set
flyctl deploy --remote-only
flyctl logs --follow  # Wait for "[MIGRATION] All migrations complete!"
```

### Frontend Deployment
```bash
cd frontend
npm run build
cp _redirects dist/  # Critical!
./deploy-cf-simple.sh  # or manual wrangler deploy
```

### Post-Deployment Verification
```bash
# Test backend API
curl https://cricketmela-api.fly.dev/api/seasons

# Test frontend _redirects
curl -I https://cricketmela.pages.dev/_redirects

# Check logs for errors
flyctl logs --lines 50

# Full health check
curl -s https://cricketmela-api.fly.dev/api/seasons | jq .
```

---

## 🎓 Rules for Future Changes

### Rule 1: Database Schema Changes
```javascript
// Step 1: Add migration to backend/migrations.js
console.log('[MIGRATION] Checking for my_new_column...');
db.all(`PRAGMA table_info(my_table)`, (err, columns) => {
  const hasColumn = columns?.some(c => c.name === 'my_new_column');
  if (!hasColumn) {
    db.run(`ALTER TABLE my_table ADD COLUMN my_new_column TEXT`, ...);
  }
});

// Step 2: Update backend code to use column
// Step 3: Update frontend to handle new data
// Step 4: Deploy backend first, verify logs
// Step 5: Deploy frontend
```

### Rule 2: New Backend Routes
```javascript
// Always include:
app.post('/api/admin/my-endpoint', requireRole('admin'), (req, res) => {
  const username = req.headers['x-user'];
  // Your code
});

// Then frontend calls:
axios.post('/api/admin/my-endpoint', data, { 
  headers: { 'x-user': user.username } 
});
```

### Rule 3: API Response Format Changes
- **Before changing:** Check if frontend localStorage/state relies on old format
- **If breaking:** Add migration period (support both old + new)
- **After deploy:** Hard refresh browsers (`Cmd+Shift+R` on Mac)

### Rule 4: Environment Variables
```javascript
// In backend:
const email = process.env.GMAIL_USER || 'fallback@example.com';

// ALWAYS set in:
// 1. fly.toml [env] section
// 2. flyctl secrets set MY_VAR=value
// 3. Verify: flyctl secrets list
```

---

## 📞 When Things Break in Production

### Step 1: Check Logs
```bash
flyctl logs --follow
# Look for [MIGRATION] errors or app crashes
```

### Step 2: Verify Volume
```bash
flyctl volumes list
# If data_volume is NOT attached → that's your problem
```

### Step 3: Check API Connectivity
```bash
curl https://cricketmela-api.fly.dev/api/seasons
# If 500, check logs above
# If timeout, backend crashed
```

### Step 4: Verify Cloudflare Proxy
```bash
curl -I https://cricketmela.pages.dev/_redirects
# Must be 200, not 404
```

### Step 5: Check Frontend Build
```bash
# Go to https://cricketmela.pages.dev
# Open DevTools Console
# Check for errors in Network tab
```

---

## 📝 Summary

**Before any change:**
1. ✅ Check this file – understand the impact
2. ✅ Run local tests
3. ✅ Deploy backend first (if schema change)
4. ✅ Deploy frontend second
5. ✅ Verify logs in production
6. ✅ Test end-to-end in production

**Keep this file updated** as you add new features, so future changes don't miss critical context.

