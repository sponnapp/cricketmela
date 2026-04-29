# System Architecture

**Analysis Date:** 2026-04-27

## Overview

Cricket Mela is a two-tier web application: a React 18 SPA deployed to Cloudflare Pages and a Node.js/Express REST API deployed to Fly.io, backed by SQLite3 on a persistent volume. Users are assigned to cricket seasons, bet points on match outcomes by voting for a team, and balances are settled when an admin or superuser declares the winner. All `/api/*` traffic from the browser is proxied through a Cloudflare Pages Function to the Fly.io backend. There is no session token—identity is passed via a plain `x-user` HTTP header; Google OAuth is also supported and uses server-side Passport sessions for the OAuth callback flow only.

---

## System Diagram

```text
┌──────────────────────────────────────────────────────────────────┐
│                  Browser (React SPA / PWA)                       │
│  frontend/src/App.jsx  (state machine, nav, user session)        │
│  Pages: Login · Seasons · Matches · Predictions · Admin          │
│         Standings · VoteHistory · Analytics · Profile            │
└───────────────────────┬──────────────────────────────────────────┘
                        │  /api/*  (all HTTPS)
                        ▼
┌──────────────────────────────────────────────────────────────────┐
│          Cloudflare Pages (static host + Functions)              │
│  frontend/functions/api/[[path]].js  →  proxy to Fly.io          │
│  frontend/functions/auth/            →  Google OAuth callback    │
│  frontend/_redirects  (SPA fallback: /* → /index.html)           │
└───────────────────────┬──────────────────────────────────────────┘
                        │  HTTPS forward
                        ▼
┌──────────────────────────────────────────────────────────────────┐
│        Fly.io — Node.js / Express  (backend/index.js)            │
│                                                                  │
│  Middleware stack:                                               │
│    cors → express.json → session → passport → x-user resolver   │
│                                                                  │
│  Route groups:                                                   │
│    /api/login, /api/signup, /api/forgot-password                 │
│    /api/me, /api/seasons, /api/seasons/:id/matches               │
│    /api/matches/:id/vote, /api/standings                         │
│    /api/users/:id/...  (profile, avatar, analytics)             │
│    /api/admin/...      (users, seasons, matches, winner)         │
│    /api/admin/cricapi/... + /api/admin/cricbuzz/...              │
│    /auth/google, /auth/google/callback, /auth/logout             │
│                                                                  │
│  Services:                                                       │
│    backend/email.js       (nodemailer SMTP)                      │
│    backend/auth/googleStrategy.js  (Passport Google OAuth)       │
│    backend/cache/images/  (Cricbuzz player image cache)          │
└───────────────────────┬──────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────────┐
│   SQLite3  (backend/db.js)   — /app/data/data.db on Fly volume   │
│                                                                  │
│   users · seasons · user_seasons · matches · votes               │
│   predictions · prediction_results · season_players             │
│   settings · password_reset_tokens                               │
└──────────────────────────────────────────────────────────────────┘
                        │  HTTPS (external)
         ┌──────────────┴───────────────┐
         ▼                              ▼
  CricAPI  (squad data)        Cricbuzz RapidAPI
  api.cricapi.com              cricbuzz-cricket.p.rapidapi.com
```

---

## Component Breakdown

### Frontend SPA (`frontend/src/`)

**Role:** Single-page application. Manages user session in `localStorage`, renders all views, polls for data updates, shows toast notifications, and supports PWA install.

**Key files:**
- `frontend/src/App.jsx` — root component; holds `user`, `page`, `seasonId`, `refreshTrigger` state; renders nav and active page
- `frontend/src/Login.jsx` — username/password login form + signup form + Google OAuth button
- `frontend/src/Seasons.jsx` — season cards for the logged-in user
- `frontend/src/Matches.jsx` — match list, vote radio buttons, points selector
- `frontend/src/Predictions.jsx` — toss winner / MoM / best bowler predictions per match
- `frontend/src/Admin.jsx` — tabbed admin panel (Season / Matches / Users / Email / Squads)
- `frontend/src/VoteHistory.jsx` — table of all user votes across seasons
- `frontend/src/Standings.jsx` — leaderboard, filterable by season
- `frontend/src/Analytics.jsx` — personal stats (overview, teams, timeline, streaks, patterns)
- `frontend/src/Profile.jsx` — display name, password change, avatar upload
- `frontend/src/useVersionCheck.js` — polls `/version.json` every 30 s; triggers `refreshTrigger` and shows update banner
- `frontend/src/Toast.jsx` — global toast system with a module-level `setToastHandler` singleton
- `frontend/src/NewsTicker.jsx` — scrolling news bar
- `frontend/src/CoinFlip.jsx` — animated coin flip UI
- `frontend/src/celebrations.js` — confetti/victory animation
- `frontend/src/api.js` — shared axios helpers
- `frontend/src/config.js` — environment-based config constants

**Interfaces consumed:**
- All `/api/*` endpoints on the backend

---

### Cloudflare Pages Proxy (`frontend/functions/`)

**Role:** Thin edge layer. Forwards all `/api/*` requests to the Fly.io backend, handles CORS preflight, and provides the SPA routing fallback.

**Key files:**
- `frontend/functions/api/[[path]].js` — catch-all handler; strips `host` header, forwards full request (including `x-user`, `Authorization`, body) to `https://cricketmela-api.fly.dev`
- `frontend/functions/auth/` — Google OAuth callback route on the Cloudflare edge
- `frontend/functions/_middleware.js` — SPA trailing-slash / routing fallback
- `frontend/_redirects` — `/* /index.html 200` SPA catch-all (static file fallback outside Functions)

**Interfaces:**
- Receives browser requests; proxies to `https://cricketmela-api.fly.dev/api/...`

---

### Express Backend (`backend/index.js`)

**Role:** All business logic, data access, and external API integration. ~3900+ lines, single file.

**Key files:**
- `backend/index.js` — Express app; all routes, middleware, startup migrations, helper functions
- `backend/db.js` — opens the SQLite3 connection, creates all tables, runs seeded migrations, exports the `db` singleton
- `backend/email.js` — nodemailer SMTP wrapper; `sendApprovalEmail`, `sendPasswordResetEmail`, `getEmailSettings`, `createTransporter`
- `backend/auth/googleStrategy.js` — Passport.js Google OAuth 2.0 strategy; links Google profile to local `users` row
- `backend/migrations.js` — standalone migration helpers (used during early development)
- `backend/cache/images/` — local filesystem cache for Cricbuzz player images (30-day TTL)

**Interfaces exposed:**

| Group | Example endpoints |
|-------|------------------|
| Auth | `POST /api/login`, `POST /api/signup`, `POST /api/forgot-password`, `POST /api/reset-password/:token` |
| Google OAuth | `GET /auth/google`, `GET /auth/google/callback`, `POST /auth/logout` |
| Seasons | `GET /api/seasons`, `GET /api/seasons/:id/matches`, `GET /api/seasons/:id/my-votes` |
| Voting | `POST /api/matches/:id/vote`, `GET /api/matches/:id/user-vote` |
| Standings | `GET /api/standings` |
| Analytics | `GET /api/analytics/overview/:userId`, `/teams`, `/timeline`, `/streaks`, `/patterns` |
| Admin | `POST /api/admin/seasons`, `PUT /api/admin/matches/:id`, `POST /api/admin/matches/:id/winner` |
| Cricket APIs | `GET /api/admin/cricapi/series`, `GET /api/admin/cricbuzz/series/:id/matches`, `POST /api/admin/cricbuzz/import-season` |
| Images | `GET /api/player-image/:imageId` |

---

### Database (`backend/db.js`)

**Role:** SQLite3 schema owner. Creates all tables on startup, runs PRAGMA optimisations (WAL mode, 64 MB cache), seeds default admin and test users.

---

## Data Flow

### User Login

1. User submits username + password on `frontend/src/Login.jsx`
2. `POST /api/login` → backend looks up `users` by username (`COLLATE NOCASE`), compares plain-text password
3. If `approved = 0`, returns 403; frontend shows "pending approval"
4. On success, returns `{id, username, display_name, role, balance, avatar}`
5. Frontend stores object in `localStorage` as `'user'`; `App.jsx` sets `user` state
6. All subsequent requests include header `x-user: <username>` which the backend auth middleware resolves to `req.user`

### Google OAuth Login

1. User clicks "Sign in with Google" → `GET /auth/google` → Passport redirects to Google consent screen
2. Google redirects back to `/auth/google/callback` → Passport verifies, `googleStrategy.js` upserts user row
3. If approved, backend redirects to `https://cricketmela.pages.dev/?auth=success&user=<encoded>`
4. `App.jsx` reads `?auth=success` query param on mount, parses `user`, stores in `localStorage`

### Voting on a Match

1. User selects team + points in `frontend/src/Matches.jsx`, submits
2. `POST /api/matches/:id/vote` with body `{team, points}` and header `x-user`
3. Backend checks: winner not yet set → 30-minute voting window open → user assigned to season → points ≤ season balance
4. If user has an existing vote: delete old, insert new (no balance change at vote time)
5. Response includes `{ok, season_balance, message}`; Matches component updates UI optimistically

### Admin Setting Winner

1. Admin/superuser calls `POST /api/admin/matches/:id/winner` with `{winner: "TeamName"}`
2. Backend (`backend/index.js` ~line 3156) in a `db.serialize()` block:
   a. Locks the `winner` column on the match
   b. Collects all votes; separates winners from losers
   c. `totalLoserPoints` = sum of all points bet on the losing team
   d. For each winner voter: `share = round((userPoints / totalWinnerPoints) * totalLoserPoints)`; `user_seasons.balance += share`
   e. For each unvoted user in the season: charges 10 points auto-loss (`is_auto_loss = 1`)
   f. Prediction results evaluated (toss/MoM/bowler points added)
3. Response returns updated balances and vote breakdown

---

## Auth Architecture

Two parallel auth paths share the same `users` table:

**Username/Password:**
- Passwords stored as plain text in `users.password` (no hashing)
- Login: `POST /api/login` → compare plain text → return user JSON
- Frontend stores user in `localStorage`; passes `x-user: <username>` on every request
- Middleware at top of `backend/index.js` resolves `x-user` → `req.user` via DB lookup on every request

**Google OAuth (Passport.js):**
- `backend/auth/googleStrategy.js` uses `passport-google-oauth20`
- On first Google login: inserts new row with `google_id`, `approved = 0` (pending admin approval)
- On subsequent logins: updates `google_id` / `avatar` on existing row
- Uses `express-session` (24-hour cookie) + `passport.serializeUser/deserializeUser` for the OAuth callback redirect only
- After callback: session is used to redirect with user data in URL query param; frontend then uses localStorage thereafter
- Google-only users cannot use password reset

**Role enforcement:**
- `requireRole(...roles)` middleware checks `req.user.role` against an allowlist
- Admin routes require `x-user` header pointing to an `admin` role user
- Superuser can set winners and view matches; cannot manage users or seasons

---

## Database Architecture

**Engine:** SQLite3 with WAL journal mode, 64 MB cache, NORMAL synchronous — `backend/db.js`
**Location:** `/app/data/data.db` (Fly.io persistent volume) in production; `backend/data.db` in development
**Connection model:** Singleton `db` object exported from `backend/db.js`; `openDb()` in `backend/index.js` returns a Proxy that makes `db.close()` a no-op (prevents accidental connection closure)

**Tables and relationships:**

```
users
  id PK, username UNIQUE, password, display_name, email,
  role (admin|superuser|picker), balance (legacy global),
  approved (0=pending, 1=active), google_id, avatar

seasons
  id PK, name, cricapi_series_id, cricbuzz_series_id

user_seasons                              ← PRIMARY balance store
  user_id FK → users, season_id FK → seasons
  balance (starting 1000 pts per season)
  UNIQUE(user_id, season_id)

matches
  id PK, season_id FK → seasons
  home_team, away_team, venue, scheduled_at (TEXT), winner (NULL until declared)

votes
  id PK, match_id FK → matches, user_id FK → users
  team, points, created_at, is_auto_loss (0|1)
  ⚠ one active vote per (match_id, user_id) — enforced in application logic

predictions
  id PK, match_id FK → matches, user_id FK → users
  toss_winner, man_of_match, best_bowler
  toss_points, mom_points, bowler_points
  UNIQUE(match_id, user_id)

prediction_results
  id PK, match_id FK → matches UNIQUE
  toss_winner, man_of_match, best_bowler

season_players
  id PK, season_id FK → seasons, team_name, player_id, player_name
  role, image_id, batting_style, bowling_style, is_captain
  INDEX on (season_id), INDEX on (season_id, team_name)

settings
  key PK, value   — stores email_config JSON blob

password_reset_tokens
  id PK, user_id FK → users, token UNIQUE, expires_at, used (0|1)
```

**Critical constraint — balance calculation:**
Always JOIN `user_seasons` with `seasons` when summing balances to exclude orphaned records from deleted seasons:
```sql
SELECT SUM(us.balance)
FROM user_seasons us
JOIN seasons s ON s.id = us.season_id
WHERE us.user_id = ?
```

**Date format:** `scheduled_at` is stored as `DD-MMM-YYThh:mm AM/PM` (from CSV upload) or ISO 8601 UTC (from Cricbuzz API). `parseMatchDateTime()` in `backend/index.js` handles both.
