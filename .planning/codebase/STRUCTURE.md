# Project Structure

**Analysis Date:** 2026-04-27

---

## Root Layout

```
CricketMela/
├── backend/                  # Node.js/Express REST API (deployed to Fly.io)
├── frontend/                 # React SPA (deployed to Cloudflare Pages)
├── Documents/                # Reference docs, guides, changelogs
├── node_modules/             # Root-level packages (wrangler, deployment tooling)
├── package.json              # Root — wrangler / deployment scripts only
├── wrangler.toml             # Cloudflare Workers/Pages config
├── README.md                 # Project overview
├── QUICK-REFERENCE.txt       # Local dev cheatsheet
├── KV-QUICK-REF.txt          # Cloudflare KV cheatsheet
├── deploy-backend.sh         # flyctl deploy wrapper
├── deploy-cf-simple.sh       # Build frontend + deploy to Cloudflare Pages
├── restart-all.sh            # Start both servers locally
├── backup-database.sh        # Copy Fly.io SQLite DB to local backup
├── pre-deploy-check.sh       # Pre-flight checks before deploy
├── verify-production.sh      # Smoke-test production endpoints
└── check-servers.sh          # Check if local servers are running
```

---

## Frontend Structure (`frontend/`)

```
frontend/
├── src/                      # All React source code
│   ├── App.jsx               # Root component — user session, page routing, nav bar
│   ├── main.jsx              # ReactDOM.createRoot entry point
│   ├── Login.jsx             # Login + Signup forms + Google OAuth button
│   ├── Seasons.jsx           # Season selection cards
│   ├── Matches.jsx           # Match list + vote UI + points selector
│   ├── Predictions.jsx       # Per-match toss/MoM/bowler prediction form
│   ├── Admin.jsx             # Tabbed admin panel (Season/Matches/Users/Email/Squads)
│   ├── VoteHistory.jsx       # Vote history table (all seasons)
│   ├── Standings.jsx         # Leaderboard, filterable by season
│   ├── Analytics.jsx         # Personal stats dashboard (5 chart sections)
│   ├── Profile.jsx           # Display name, password change, avatar upload
│   ├── NewsTicker.jsx        # Horizontal scrolling news ticker
│   ├── CoinFlip.jsx          # Animated coin-flip component
│   ├── Toast.jsx             # Global toast notification system
│   ├── Skeleton.jsx          # Loading skeleton placeholder component
│   ├── useVersionCheck.js    # Hook: polls /version.json every 30 s for hot-reload
│   ├── celebrations.js       # Confetti / victory animation utilities
│   ├── api.js                # Shared axios API call helpers
│   ├── config.js             # Environment-based configuration constants
│   ├── styles.css            # Global CSS (full app theme)
│   └── CoinFlip.css          # CSS for coin flip animation
├── public/                   # Static assets served as-is
│   ├── version.json          # Build SHA + timestamp (written by vite.config.js)
│   ├── _redirects            # Public-folder redirects (overridden by dist/ copy)
│   ├── _headers              # Cloudflare Pages security / cache headers
│   ├── cricket-mela-logo.svg # App logo
│   ├── cricket-bg.jpg        # Background image
│   ├── apple-touch-icon.png  # PWA icon (512 px, also used for 192 px)
│   ├── pwa-192x192.png       # PWA manifest icon
│   ├── pwa-512x512.png       # PWA manifest icon
│   └── logos/                # Team logo images
├── functions/                # Cloudflare Pages Functions (edge workers)
│   ├── _middleware.js        # SPA routing fallback middleware
│   ├── api/
│   │   └── [[path]].js       # Catch-all: proxies /api/* to Fly.io backend
│   └── auth/                 # Google OAuth callback route on the edge
├── dist/                     # Vite build output (gitignored, deployed to Cloudflare)
├── _redirects                # /* /index.html 200  (SPA fallback, copied to dist/ on deploy)
├── index.html                # Vite HTML template
├── vite.config.js            # Vite config: React, PWA plugin, version.json generator, dev proxy
├── package.json              # Frontend dependencies (react, vite, axios, etc.)
└── gen-icons.js              # Script to generate PWA icon sizes
```

### Key Frontend Files Reference

| File | Purpose |
|------|---------|
| `frontend/src/App.jsx` | Root state machine: user session, page/seasonId state, nav bar, auto-refresh trigger, version-update banner |
| `frontend/src/Matches.jsx` | Renders match cards, voting radio + points dropdown, 30-min cutoff timer, vote lock logic |
| `frontend/src/Admin.jsx` | Full admin panel — season CRUD, match CRUD, user management, CSV upload, CricAPI/Cricbuzz import, email config, squad viewer |
| `frontend/src/useVersionCheck.js` | `setInterval` every 30 s → fetches `/version.json` → calls `onRefresh` callback if build SHA unchanged; sets `updateAvailable` if SHA changed |
| `frontend/functions/api/[[path]].js` | Cloudflare edge proxy: strips `host` header, forwards all methods + body + `x-user` to `https://cricketmela-api.fly.dev` |
| `frontend/vite.config.js` | `versionPlugin` writes `public/version.json` on each build; dev proxy `/api → localhost:4000`; PWA workbox config (NetworkOnly for API) |
| `frontend/_redirects` | Source of truth for `/* /index.html 200` SPA fallback; `deploy-cf-simple.sh` copies to `dist/` |

---

## Backend Structure (`backend/`)

```
backend/
├── index.js                  # All Express routes + middleware + startup migrations (~3900 lines)
├── db.js                     # SQLite3 schema, table creation, seeding, PRAGMA setup (~500 lines)
├── email.js                  # nodemailer SMTP wrapper (approval, signup, password-reset emails)
├── migrations.js             # Standalone migration helpers (supplemental, runs independently)
├── auth/
│   └── googleStrategy.js     # Passport.js Google OAuth 2.0 strategy + user upsert logic
├── cache/
│   └── images/               # Server-side cache for Cricbuzz player images (JPG files, 30-day TTL)
├── data.db                   # SQLite database (local dev only; production uses /app/data/data.db)
├── data.db-shm               # SQLite WAL shared memory file
├── data.db-wal               # SQLite WAL journal file
├── Dockerfile                # Docker image for Fly.io deployment
├── fly.toml                  # Fly.io app config (machine size, volume mount, health check)
├── package.json              # Backend dependencies (express, better-sqlite3, sqlite3, passport, nodemailer)
└── .env.example              # Required environment variables template
```

### Key Backend Files Reference

| File | Purpose |
|------|---------|
| `backend/index.js` | Single-file Express server: all ~60 API routes, CORS config, session setup, Passport init, `requireRole` middleware, `openDb()` proxy, `parseMatchDateTime()`, `processAutoLossForNewSeasons()` |
| `backend/db.js` | Opens SQLite3 at `DB_PATH`, creates 10 tables via `CREATE TABLE IF NOT EXISTS`, seeds admin/senthil users, adds `season_players` indexes |
| `backend/email.js` | Exports `sendApprovalEmail`, `sendSignupEmail`, `sendPasswordResetEmail`, `getEmailSettings`, `createTransporter` — settings loaded from `settings` table |
| `backend/auth/googleStrategy.js` | Passport Google strategy: upserts user by `google_id`, handles account linking when email already exists, sets `approved = 0` for new Google sign-ups |
| `backend/fly.toml` | Fly.io deployment config — service port 4000, persistent volume mounted at `/app/data`, health check on `/api/health` |

---

## Key Files Reference (cross-tier)

| File | Purpose |
|------|---------|
| `backend/index.js` | All Express routes, business logic, migrations |
| `backend/db.js` | SQLite3 schema + seeding + singleton connection |
| `backend/email.js` | Email notifications (signup, approval, password reset) |
| `backend/auth/googleStrategy.js` | Google OAuth 2.0 via Passport |
| `frontend/src/App.jsx` | SPA root: auth state, routing, 30s refresh loop |
| `frontend/src/Admin.jsx` | Full admin panel — all management operations |
| `frontend/src/Matches.jsx` | Core betting UI — vote + points selection |
| `frontend/src/useVersionCheck.js` | 30-second polling for data refresh + deployment detection |
| `frontend/functions/api/[[path]].js` | Cloudflare edge proxy for all `/api/*` traffic |
| `frontend/vite.config.js` | Build config, dev proxy, PWA setup, version.json generation |
| `frontend/_redirects` | SPA routing fallback rule (must be in `dist/` at deploy time) |
| `deploy-cf-simple.sh` | Build + copy `_redirects` to `dist/` + `wrangler pages deploy` |
| `deploy-backend.sh` | `flyctl deploy --remote-only` wrapper |
| `restart-all.sh` | Starts backend (`npm start`) and frontend (`npm run dev`) locally |

---

## Naming Conventions

**React components:** PascalCase filenames matching the exported default function — `Admin.jsx`, `Matches.jsx`, `VoteHistory.jsx`

**Hooks:** camelCase with `use` prefix — `useVersionCheck.js`

**Utility modules:** camelCase — `celebrations.js`, `api.js`, `config.js`

**CSS:** co-located with component when component-specific (`CoinFlip.css`); global styles in `styles.css`

**Backend helpers:** camelCase functions defined inline in `index.js` — `openDb()`, `requireRole()`, `parseMatchDateTime()`, `processAutoLossForNewSeasons()`

**API routes:** REST conventions — plural nouns, `/:id/` for resources, `/admin/` prefix for admin-only routes

**Environment detection:** `process.env.NODE_ENV === 'production'` guards DB path (`/app/data/data.db`) and base URL (`cricketmela.pages.dev` vs `localhost:5173`)

**Backup files:** timestamped suffix — `Admin.jsx.backup-20260223-224251`

---

## Where to Add New Code

**New frontend page:**
- Create `frontend/src/MyPage.jsx`
- Import and render in `frontend/src/App.jsx` under the page switch block
- Add nav icon entry to `NAV_ICONS` constant in `App.jsx`
- Add page key to `VALID_PAGES` Set in `App.jsx`

**New API endpoint:**
- Add route handler in `backend/index.js` following existing patterns
- Use `requireRole('admin')` or `requireRole('picker','superuser','admin')` as appropriate
- Access DB via `const db = openDb()` and call `db.close()` only as a no-op (the Proxy makes it safe)

**New DB table or column:**
- Add `CREATE TABLE IF NOT EXISTS` in `backend/db.js` `db.serialize()` block
- Add `ALTER TABLE ... ADD COLUMN` migration using the `PRAGMA table_info()` pattern (check `hasCol` before altering) — follow the `user_seasons.balance` migration pattern at line ~240 of `backend/index.js`

**New email notification:**
- Add a `send*Email` function in `backend/email.js` following existing pattern
- Load settings via `emailService.getEmailSettings()` before sending

**New admin tab:**
- Add tab button and conditional render section inside `frontend/src/Admin.jsx`
- Pass `adminTab` state via `App.jsx` → `Admin.jsx` props (existing pattern)
