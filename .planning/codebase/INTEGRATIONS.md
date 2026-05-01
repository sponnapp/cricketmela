# External Integrations

**Analysis Date:** 2026-04-27

## Overview

Cricket Mela integrates with five external systems: Google OAuth 2.0 for SSO authentication, Gmail SMTP via Nodemailer for transactional email, CricAPI for IPL squad data, Cricbuzz (via RapidAPI) as the primary cricket data source for series and matches, and Cloudflare KV for squad data caching. All external API credentials are hardcoded directly in source files rather than injected via environment variables — this is a known security concern.

---

## Google OAuth 2.0

- **Purpose:** Single sign-on login for users; supports account linking to existing email-based accounts and new-user self-registration (pending approval)
- **Auth method:** OAuth 2.0 Authorization Code flow via Passport.js
- **Files involved:**
  - `backend/auth/googleStrategy.js` — Passport strategy definition, DB lookup/create logic
  - `backend/index.js` (lines 58–67) — Passport initialization and conditional strategy loading
- **Config:**
  - `GOOGLE_CLIENT_ID` env var
  - `GOOGLE_CLIENT_SECRET` env var
  - `SESSION_SECRET` env var (for `express-session` backing the OAuth flow)
  - Callback URL: `https://cricketmela-api.fly.dev/auth/google/callback` (production) / `http://localhost:4000/auth/google/callback` (dev)
- **Notes:**
  - Strategy only loaded when both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set; missing credentials disables OAuth silently
  - Google-only users (no password set) cannot use password reset — backend guards this explicitly
  - New users created via Google OAuth start with `approved = 0` (pending admin approval)
  - Account linking: if a Google email matches an existing password account, the `google_id` is written to that user row

---

## Gmail SMTP (Nodemailer)

- **Purpose:** Transactional email — admin signup notification (when a new user registers) and user approval notification (when admin approves an account)
- **Auth method:** Gmail app password (16-character, requires 2-Step Verification on the Gmail account)
- **Files involved:**
  - `backend/email.js` — full email sending logic; reads config from DB, creates Nodemailer transporter
  - `backend/index.js` — calls `emailService` on signup and approval endpoints
- **Config:**
  - Stored in the `settings` DB table under key `email_config` as JSON `{ user, password }`
  - Managed via Admin Panel → Email tab (`GET /api/admin/email-settings`, `POST /api/admin/email-settings`)
  - No environment variable override — config lives exclusively in DB
- **Notes:**
  - Gracefully degrades — missing or invalid email config is caught and logged; no hard failure
  - Admin recipients are looked up dynamically from `users` table (role = `admin`, valid email)
  - `xyz@xyz.com` placeholder email is explicitly excluded from recipient lists

---

## CricAPI

- **Purpose:** IPL squad and player data (used for the Match Predictions feature — player selection dropdowns)
- **Auth method:** API key embedded in request query param
- **Files involved:**
  - `backend/index.js` (line ~837) — `CRICAPI_KEY` constant; `https` module calls to `api.cricapi.com`
- **Config:**
  - API key hardcoded as `CRICAPI_KEY` constant in `backend/index.js` — **not in env vars**
  - `seasons.cricapi_series_id` column stores the CricAPI series ID per season
- **Notes:**
  - Used only for squad/player endpoint (`/api/predictions/players-by-season/:seasonId`)
  - Results cached in Cloudflare KV (`SQUAD_CACHE`) for 6 hours to reduce API call frequency
  - ⚠️ API key is hardcoded in source code — should be moved to an environment variable

---

## Cricbuzz via RapidAPI

- **Purpose:** Primary cricket data source — series listings, match schedules, live scores, and match import for admin use
- **Auth method:** RapidAPI key passed via `x-rapidapi-key` and `x-rapidapi-host` request headers
- **Files involved:**
  - `backend/index.js` (lines ~839–841, ~1145+) — `CRICBUZZ_API_KEY`, `CRICBUZZ_API_HOST` constants; multiple `https.get()` calls
- **Config:**
  - `CRICBUZZ_API_KEY` and `CRICBUZZ_API_HOST` (`cricbuzz-cricket.p.rapidapi.com`) hardcoded as constants in `backend/index.js` — **not in env vars**
  - `seasons.cricbuzz_series_id` column stores the Cricbuzz series ID per season
- **Notes:**
  - Used for admin-side auto-import of match schedules from live Cricbuzz data
  - Timestamps from Cricbuzz are ISO format in UTC — handled by `parseMatchDateTime()` in `backend/index.js`
  - ⚠️ API key is hardcoded in source code — should be moved to an environment variable

---

## Cloudflare KV (SQUAD_CACHE)

- **Purpose:** Edge cache for IPL squad data fetched from CricAPI; eliminates redundant API calls and provides sub-100ms responses for player selection UI
- **Auth method:** Cloudflare binding — no explicit auth at runtime; KV accessed via `env.SQUAD_CACHE` context binding in Pages Functions
- **Files involved:**
  - `frontend/functions/api/predictions/players-by-season/[seasonId].js` — cache-read/write logic
  - `frontend/functions/api/predictions/players-by-season/[seasonId]/cache.js` — cache invalidation endpoint
  - `wrangler.toml` — KV namespace binding definition (`SQUAD_CACHE`)
- **Config:**
  - KV namespace ID: `cd86a3f47591439caae84ec5bfe42b8a` (in `wrangler.toml`)
  - Binding name: `SQUAD_CACHE`
  - Cache TTL: 21600 seconds (6 hours)
  - Cache key pattern: `squad:<seasonId>`
- **Notes:**
  - Only full (unfiltered) squad responses are cached; per-team filtered requests bypass the cache to avoid cache pollution
  - Cache miss falls through to Fly.io backend; cache write failures are non-fatal (caught and logged)
  - `X-Cache-Status` and `X-Cache-Source` response headers indicate cache HIT/MISS/BYPASS

---

## Fly.io (Backend Hosting)

- **Purpose:** Production runtime for the Express API; provides persistent volume storage for SQLite DB
- **Auth method:** Fly.io CLI (`flyctl`) authenticated via `FLY_TOKEN` for deployments
- **Files involved:**
  - `backend/fly.toml` — app configuration
  - `deploy-backend.sh` — deployment script
- **Config:**
  - App name: `cricketmela-api`
  - Region: `sjc` (San Jose)
  - Persistent volume: `cricket_data` → `/app/data`
  - Health check endpoint: `GET /api/health`
  - `NODE_ENV=production`, `PORT=4000` set in `[env]` block
- **Notes:**
  - `auto_stop_machines = 'stop'` / `min_machines_running = 0` — machine sleeps between requests; cold starts ~1–3s
  - SQLite DB persists on volume; losing the volume would mean data loss
  - Legacy DB migration: on startup, if `data.db` exists in app dir but not on volume, it is copied to the volume

---

## Cloudflare Pages Functions (API Proxy)

- **Purpose:** Proxy layer that forwards all `/api/*` requests from the frontend to the Fly.io backend; eliminates CORS issues in production and abstracts backend URL from browser clients
- **Auth method:** None — passes all request headers (including `x-user`, `Authorization`) through to backend as-is
- **Files involved:**
  - `frontend/functions/api/[[path]].js` — catch-all proxy handler
  - `frontend/_redirects` — fallback redirect rule (must be in `dist/` for production)
- **Config:**
  - Backend target: `https://cricketmela-api.fly.dev` (hardcoded in `[[path]].js`)
  - Dev equivalent: Vite proxy in `frontend/vite.config.js` (`/api` + `/auth` → `http://localhost:4000`)
- **Notes:**
  - CORS preflight (`OPTIONS`) handled at the proxy layer, not the backend
  - `host` header stripped before forwarding to avoid backend conflicts
  - Backend connection failures return a 502 with JSON error body

---

*Integration audit: 2026-04-27*
