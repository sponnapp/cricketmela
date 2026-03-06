# Cricket Mela - GitHub Copilot Instructions

## Project Overview
**Cricket Mela** is an IPL T20 cricket betting web application. Users are assigned to seasons, vote on match winners with betting points, and earn/lose points based on actual match results.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 4, Axios |
| Backend | Node.js, Express.js |
| Database | SQLite3 (via `better-sqlite3` + `sqlite3` packages) |
| Frontend Hosting | Cloudflare Pages |
| Backend Hosting | Fly.io |
| API Proxy | Cloudflare Pages `_redirects` file |
| Auth | Simple username/password (plain text, stored in SQLite) |

---

## Repository Structure

```
/
├── frontend/src/
│   ├── App.jsx           – Root: auth state, navigation, user session
│   ├── Login.jsx         – Login form + sign-up form
│   ├── Seasons.jsx       – Season cards (only user-assigned seasons)
│   ├── Matches.jsx       – Match list + vote radio + points dropdown
│   ├── Admin.jsx         – Full admin panel (tabs: Season/Matches/Users)
│   ├── VoteHistory.jsx   – User vote history table
│   ├── Standings.jsx     – Leaderboard (excludes admin)
│   └── Profile.jsx       – User profile (display name, password)
├── frontend/functions/
│   ├── _middleware.js    – SPA routing fallback
│   └── api/[[path]].js   – Proxy all /api/* to Fly.io backend
├── frontend/_redirects   – Cloudflare Pages API proxy rule
├── frontend/vite.config.js – Dev proxy: /api → localhost:4000
├── backend/
│   ├── index.js          – All Express routes (1400+ lines)
│   └── db.js             – SQLite schema + seed data + migrations
├── deploy-cf-simple.sh   – Build + deploy frontend to Cloudflare
├── deploy-backend.sh     – Deploy backend to Fly.io
└── restart-all.sh        – Start both servers locally
```

---

## Database Schema

```sql
users (id, username, role, password, display_name, email, approved, balance)
seasons (id, name)
user_seasons (user_id, season_id)          -- which seasons a user can access
matches (id, season_id, home_team, away_team, scheduled_at, venue, winner)
votes (id, match_id, user_id, team, points, created_at)
settings (key, value)                      -- e.g., gmail config
```

**Key constraints:**
- One vote per user per match (UPDATE existing vote if changed)
- `admin` role excluded from votes/standings
- `scheduled_at` stored as `DD-MMM-YYTH:MM AM/PM` (e.g., `01-Mar-26T6:30 AM`)

---

## User Roles & Permissions

| Role | Login | Vote | Set Winner | Manage Matches | Manage Users | Manage Seasons |
|------|-------|------|------------|----------------|--------------|----------------|
| `picker` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `superuser` | ✅ | ❌ | ✅ | View only | ❌ | ❌ |
| `admin` | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ |

---

## Authentication

- No JWT / session tokens — user object stored in `localStorage`
- Login: `POST /api/login` → returns `{id, username, role, balance, display_name, approved}`
- All admin endpoints use `requireRole('admin')` middleware checking `x-user` header
- Frontend passes `x-user: <username>` header on admin/vote requests
- **Username login is case-insensitive** (lowercased before comparison)

---

## Betting / Voting Logic

### Voting Rules
1. User can vote once per match (radio button selection)
2. Vote can be changed **up to 30 minutes before match start**
3. Voting is disabled once:
   - Match starts (within 30 min window)
   - Admin sets a winner
4. When changing vote, old points are refunded and new points deducted

### Points Distribution (when admin sets winner)
```
totalLoserPoints = sum of all points bet on losing team
for each winner voter:
  share = (userPoints / totalWinnerPoints) * totalLoserPoints
  payout = userPoints + share
  user.balance += share  (rounded to whole number)

for each loser voter:
  user.balance -= points  (already deducted when vote was placed)
```

### Auto-loss (unvoted users)
- Triggered when admin sets winner
- Users assigned to a season but who didn't vote are charged minimum 10 points
- Balance can go negative

---

## Key Frontend Patterns

### User Session
```javascript
// Stored in localStorage
const user = { id, username, role, balance, display_name }
// Retrieved in App.jsx on load
const stored = localStorage.getItem('user')
```

### API Calls
```javascript
// All API calls use relative paths (proxied by Cloudflare _redirects locally by vite.config.js)
axios.get('/api/seasons')
axios.post('/api/votes', { match_id, team, points }, { headers: { 'x-user': user.username } })
```

### Role Guards in Admin.jsx
```javascript
const isAdmin = user?.role === 'admin'
const isSuperuser = user?.role === 'superuser'
// Hide bulk CSV upload and clear matches from superuser
{!isSuperuser && <BulkUploadSection />}
// Show set winner to both admin and superuser
{(isAdmin || isSuperuser) && <SetWinnerButton />}
```

### Date Parsing
- `scheduled_at` stored as `01-Mar-26T6:30 AM` (from CSV upload)
- Parsed in `parseMatchDateTime()` in both `Admin.jsx` and `Matches.jsx`
- Formatted for display as `01-Mar-2026 | 6:30 AM` in `VoteHistory.jsx`

### Auto-Refresh Feature
- **Polling Interval**: 30 seconds
- **Implementation**: `useVersionCheck.js` hook polls `/version.json` every 30s
- **Behavior**: 
  - Triggers `refreshTrigger` state update in `App.jsx` every 30s
  - All components (Seasons, Matches, Admin, VoteHistory, Standings) receive `refreshTrigger` prop
  - Components re-fetch data when `refreshTrigger` changes
  - Version check detects new deployments and shows banner to refresh
- **User Impact**: Data auto-updates without manual refresh, stays current with live changes
- **Production**: Ensures users see latest match results, odds, and standings automatically

---

## Key Backend Patterns

### DB Access
```javascript
// backend/db.js opens a shared DB
// backend/index.js calls openDb() per request (returns same instance)
function openDb() {
  return require('./db');
}
```

### Role Middleware
```javascript
function requireRole(...roles) {
  return (req, res, next) => {
    const username = req.headers['x-user']
    // lookup user, check role
  }
}
```

### Vote Endpoint Logic
```javascript
// POST /api/votes
// 1. Check voting window (30 min before match start)
// 2. Check winner not yet set
// 3. Refund old vote if exists
// 4. Deduct new points from balance
// 5. UPSERT vote record
```

---

## Deployment

### Frontend → Cloudflare Pages
```bash
./deploy-cf-simple.sh
# Builds frontend, copies _redirects to dist/, deploys with wrangler
```

**Critical:** The `_redirects` file must be in `dist/` for API routing to work:
```
/api/* https://cricketmela-api.fly.dev/api/:splat 200
/* /index.html 200
```

### Backend → Fly.io
```bash
cd backend && flyctl deploy --remote-only
# or: ./deploy-backend.sh
```

- SQLite DB persists on `/app/data/data.db` (Fly.io persistent volume)
- `NODE_ENV=production` → uses `/app/data` path; otherwise uses `__dirname`

---

## Known Issues & Gotchas

| Issue | Cause | Fix |
|-------|-------|-----|
| Login 405 in production | `_redirects` not in `dist/` | `deploy-cf-simple.sh` copies it |
| Tables not sorted | `fetchAllMatches()` missing sort call | Use `sortMatchesByDateTime()` after every fetch |
| Date shows "TBD" | `scheduled_at` format not parsed | `parseMatchDateTime()` handles `DD-MMM-YYT...` format |
| Blank admin page on season change | `userRole` undefined in Matches render | Always pass `user?.role` not a local variable |
| Data disappears in production | Fly.io machine restart without volume | Data is on persistent volume `/app/data` |
| Vote not showing pre-selected | `user-vote` API not called on load | `GET /api/matches/:id/user-vote` on component mount |

---

## Local Development URLs

| Service | URL |
|---------|-----|
| Frontend (Vite dev) | http://localhost:5173 |
| Backend (Express) | http://localhost:4000 |

Vite proxies `/api/*` to `http://localhost:4000` in dev (see `vite.config.js`).

---

## Production URLs

| Service | URL |
|---------|-----|
| Frontend | https://cricketmela.pages.dev |
| Backend | https://cricketmela-api.fly.dev |
| GitHub | https://github.com/sponnapp/cricketmela.git |

---


## Email Integration

### Overview
The application now supports email notifications via Gmail SMTP:
- **Signup Notification**: Admin receives email when user signs up
- **Approval Notification**: User receives email when account is approved

### Configuration
- Email settings configured in Admin Panel → Email tab
- Requires Gmail account with 2-Step Verification enabled
- Uses 16-character app password (from myaccount.google.com/apppasswords)
- Settings stored in database `settings` table with key `email_config`

### Implementation Details
- **Module**: `backend/email.js` - Handles email sending logic
- **Backend**: `backend/index.js` - Integrated with signup and approval endpoints
- **Frontend**: `frontend/src/Admin.jsx` - Email settings configuration UI
- **Dependency**: `nodemailer@^6.9.4` for SMTP functionality

### Email Endpoints
```
GET  /api/admin/email-settings  – Get current configuration
POST /api/admin/email-settings  – Save and test configuration
```

### Email Events
1. User signup → Admin receives notification email
2. User approval → User receives approval confirmation email

### Testing
1. Configure email in Admin Panel → Email tab
2. Click "Save & Test Configuration"
3. Sign up as new user
4. Admin should receive notification email
5. Approve user - user should receive approval email

### Documentation
- `/EMAIL-INTEGRATION-GUIDE.md` - Detailed setup guide
- `/EMAIL-IMPLEMENTATION-SUMMARY.md` - Technical implementation details

---

## Test Credentials

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | admin |
| `senthil` | `senthil123` | picker |

---

## When Making Changes

1. **Backend changes** → edit `backend/index.js` or `backend/db.js`, then run `flyctl deploy`
2. **Frontend changes** → edit files in `frontend/src/`, then run `./deploy-cf-simple.sh`
3. **DB schema changes** → add migration in `db.js` using `hasColumn()` helper pattern
4. **New API route** → add to `backend/index.js`, update this file's API table, update README
5. **Always test locally** before deploying to production
6. **After deploying** → hard refresh browser (`Cmd+Shift+R`) to clear cached JS
7. **Email feature** → configure in Admin Panel after deploying backend/email.js

