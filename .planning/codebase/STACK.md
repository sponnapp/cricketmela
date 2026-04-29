# Technology Stack

**Analysis Date:** 2026-04-27

## Overview

Cricket Mela is a full-stack IPL T20 betting web application with a React/Vite SPA served via Cloudflare Pages and a Node.js/Express REST API hosted on Fly.io. Data is persisted in a SQLite3 file on a Fly.io persistent volume. Authentication supports both a custom username/password scheme (via `x-user` header) and Google OAuth 2.0 (via Passport.js). External cricket data is fetched from CricAPI (squad data) and Cricbuzz via RapidAPI (series/matches).

---

## Frontend

- **Framework:** React 18.2.0
- **Build Tool:** Vite 4.4.9 (config: `frontend/vite.config.js`)
- **Key Libraries:**
  - `axios` 1.4.0 — HTTP client for all API calls
  - `recharts` ^3.8.0 — charting/statistics UI
  - `canvas-confetti` ^1.9.4 — win celebration animation
  - `@vitejs/plugin-react` 4.0.0 — JSX + Fast Refresh
  - `vite-plugin-pwa` ^1.2.0 — Service Worker / PWA support
- **State Management:** Local React state (`useState` / `useEffect`); user session stored in `localStorage` as a plain JSON object; no Redux or global context
- **Styling:** Plain CSS (no CSS-in-JS framework detected in dependencies)
- **Auto-refresh:** Custom `useVersionCheck.js` hook polls `/version.json` every 30s; `refreshTrigger` prop propagated to all data-fetching components
- **Dev server:** `http://localhost:5173`; Vite proxies `/api/*` and `/auth/*` to `http://localhost:4000`

---

## Backend

- **Runtime:** Node.js (version governed by Fly.io Docker image; `node index.js` as entry point)
- **Framework:** Express ^4.18.2 (`backend/index.js` — 4000+ lines, all routes in one file)
- **Key Libraries:**
  - `cors` ^2.8.5 — CORS middleware with allowlist
  - `express-session` ^1.18.0 — server-side sessions (for OAuth callback flow)
  - `passport` ^0.7.0 + `passport-google-oauth20` ^2.0.0 — Google OAuth 2.0
  - `nodemailer` ^6.9.4 — Gmail SMTP email notifications
  - `sqlite3` ^5.1.6 — SQLite database driver
  - `dotenv` ^16.4.5 — environment variable loading
- **Dev Tool:** `nodemon` ^2.0.22 — hot reload in development
- **Auth:** Dual mechanism:
  1. Custom `x-user: <username>` request header validated against DB (primary flow for most routes)
  2. Google OAuth 2.0 via Passport (for SSO login; sets `express-session` cookie)
- **Session Secret:** `SESSION_SECRET` env var (fallback default present in code — should be set in production)
- **Dev server:** `http://localhost:4000`

---

## Database

- **Engine:** SQLite3 (file: `data.db`)
- **Driver:** `sqlite3` ^5.1.6 — raw SQL callbacks, no ORM
- **Schema management:** Manual migrations using `hasColumn()` helper in `backend/db.js`; startup migrations run in `backend/index.js` via `initializeDatabase()` and `runStartupMigrations()`
- **Persistent path:** Production: `/app/data/data.db` (Fly.io volume); Development: `backend/data.db`
- **Performance PRAGMAs:** WAL journal mode, NORMAL synchronous, 64MB cache, MEMORY temp store
- **Core tables:** `users`, `seasons`, `user_seasons`, `matches`, `votes`, `settings`, `predictions`, `prediction_results`, `password_reset_tokens`

---

## Infrastructure

- **Frontend Hosting:** Cloudflare Pages (`cricketmela.pages.dev`)
  - Config: `wrangler.toml` (app name: `cricketmela`)
  - API proxy via Cloudflare Pages Functions: `frontend/functions/api/[[path]].js` → `https://cricketmela-api.fly.dev`
  - `_redirects` file must be copied to `dist/` before deploy (handled by `deploy-cf-simple.sh`)
- **Backend Hosting:** Fly.io (`cricketmela-api.fly.dev`)
  - Config: `backend/fly.toml` — app: `cricketmela-api`, region: `sjc` (San Jose)
  - Persistent volume: `cricket_data` (1 GB) mounted at `/app/data`
  - Auto-stop enabled (`min_machines_running = 0`) — cold starts expected
  - Concurrency limits: soft 20 / hard 25 connections
  - `NODE_ENV=production`, `PORT=4000` set via `[env]` in `fly.toml`
- **KV Storage:** Cloudflare KV namespace `SQUAD_CACHE` (binding ID in `wrangler.toml`) for squad data caching (6-hour TTL)
- **CI/CD:** Manual shell scripts — `deploy-cf-simple.sh` (frontend → Cloudflare) and `deploy-backend.sh` (backend → Fly.io)

---

## Dev Tools

- **Package Manager:** npm (lockfiles present in `frontend/` and `backend/`)
- **Local Dev:** `restart-all.sh` starts both servers; Vite on `:5173`, Express on `:4000`
- **Environment Config:** `dotenv` in backend reads `.env` file; `NODE_ENV` gates DB path and cookie/OAuth settings
- **Version Tagging:** `versionPlugin()` in `frontend/vite.config.js` writes `public/version.json` with git SHA on every build

---

*Stack analysis: 2026-04-27*
