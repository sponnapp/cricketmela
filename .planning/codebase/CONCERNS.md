# Codebase Concerns

**Analysis Date:** 2026-04-27

## Overview

Cricket Mela is a working, feature-rich IPL betting app, but it carries significant unresolved security debt that creates real risk for a production system handling real user accounts. The two most critical gaps — plaintext password storage and spoofable header-based authentication — were identified in an internal security audit (see `Documents/SECURITY-AUDIT-REPORT.md`) but remain unfixed as of this analysis. The backend is a single 4,923-line file with no database transactions, deeply nested callbacks, and hardcoded third-party API keys committed to source. These concerns do not break day-to-day usage but would be exploitable and are hard to maintain long-term.

---

## Critical Issues

### Plaintext Password Storage
- **Severity:** CRITICAL
- **Location:** `backend/db.js:100`, `backend/index.js:1957`
- **Description:** All passwords are stored as plain text strings in the `users.password` column. Login comparison is `password === row.password`. Admin password reset (`PUT /api/admin/users/:id/password`) also writes the new password in plaintext.
- **Impact:** A single database file leak exposes every user's credentials. Violates OWASP A02 (Cryptographic Failures). The default seed credentials (`admin123`, `senthil123`) are stored verbatim and committed to source code in `backend/db.js:100-101`.
- **Fix:** Replace with `bcrypt.hash()` on write, `bcrypt.compare()` on login. Migrate existing passwords on first login (prompt user to reset).

### Spoofable `x-user` Header Authentication
- **Severity:** CRITICAL
- **Location:** `backend/index.js:539-547` (auth middleware), `backend/index.js:553-560` (`requireRole`)
- **Description:** Every authenticated request identifies the caller solely via the `x-user: <username>` HTTP header. Any client can set this header to any value — including `admin` — and the middleware will look that user up and grant their role. There is no token, signature, or session validation.
- **Impact:** Any user can impersonate any other user or escalate to admin by changing the `x-user` header. This includes voting on behalf of others, setting match winners, deleting users, and reading all data.
- **Fix:** Issue a signed JWT or opaque session token at login; verify it server-side on every request. The express-session infrastructure is already present (`backend/index.js:44-58`) but unused for API authentication.

### No Database Transactions on Multi-Step Operations
- **Severity:** CRITICAL
- **Location:** `backend/index.js:3155-3320` (winner distribution), `backend/index.js:434-546` (auto-loss for new seasons)
- **Description:** Winner distribution and auto-loss processing execute 10–30+ sequential `db.run()` calls with no `BEGIN / COMMIT / ROLLBACK`. SQLite3 callback API does not auto-wrap in a transaction.
- **Impact:** A server crash, OOM, or unhandled error mid-distribution leaves balances in a partially-updated state. Some users get credited, others do not; the match winner may be set but balances are inconsistent. Data cannot be reliably recovered without a backup.
- **Fix:** Wrap all multi-step balance/vote operations in `db.run('BEGIN IMMEDIATE')` / `COMMIT` / `ROLLBACK` blocks. Consider migrating to `better-sqlite3` which supports synchronous transactions natively.

### Hardcoded API Keys in Source Code
- **Severity:** CRITICAL
- **Location:** `backend/index.js:837`, `backend/index.js:840`
- **Description:** CricAPI key (`491b7c88-...`) and Cricbuzz RapidAPI key (`3c2eeb1734msh...`) are hardcoded as JavaScript constants and committed to the repository.
- **Impact:** Keys are exposed to anyone with repository access. Rotated keys require a code change and redeploy. If the repository becomes public, keys are immediately compromised.
- **Fix:** Move to environment variables: `process.env.CRICAPI_KEY`, `process.env.CRICBUZZ_API_KEY`. Add these to Fly.io secrets and local `.env`.

---

## Security Concerns

### CORS Allows All `*.pages.dev` Origins
- **Severity:** HIGH
- **Location:** `backend/index.js:28-29`
- **Description:** The CORS policy allows any origin matching `*.pages.dev` or `*.trycloudflare.com`, which means any Cloudflare Pages project — including an attacker-controlled one — can make credentialed cross-origin requests to the API.
- **Impact:** An attacker can host a malicious page at `attacker.pages.dev` and make authenticated requests on behalf of a logged-in user.
- **Fix:** Restrict to the specific production domain: `cricketmela.pages.dev`. Remove the wildcard subdomain allowance.

### No Rate Limiting on Login or Any Endpoint
- **Severity:** HIGH
- **Location:** `backend/index.js:1948` (login endpoint)
- **Description:** The `/api/login` endpoint and all other endpoints have no rate limiting. Brute-force password cracking is unrestricted.
- **Impact:** An attacker can enumerate all user passwords by scripted login attempts. With plaintext storage already an issue, this doubles the risk.
- **Fix:** Add `express-rate-limit` with a 5-attempts-per-15-minutes window on `/api/login`. Add a 100 req/min global limiter on `/api/`.

### Missing CSRF Protection
- **Severity:** HIGH
- **Location:** All state-changing POST/PUT/DELETE routes in `backend/index.js`
- **Description:** No CSRF tokens on any endpoint. All state-changing operations can be triggered cross-site.
- **Impact:** A malicious web page can cause a logged-in user to vote, change password, or trigger admin actions without consent.
- **Fix:** Implement `csurf` middleware or use `SameSite=Strict` cookies consistently. For the current `x-user` + localStorage approach, CORS enforcement is the primary protection — see CORS concern above.

### Hardcoded Default Session Secret
- **Severity:** HIGH
- **Location:** `backend/index.js:46`
- **Description:** Session secret falls back to the string `'cricket-mela-secret-key-change-in-production'` if `SESSION_SECRET` env var is not set.
- **Impact:** In production without the env var set, all sessions share a predictable secret. An attacker who knows the secret can forge session cookies.
- **Fix:** Require `SESSION_SECRET` to be set in production; crash on startup if it is not set (`if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') throw new Error(...)`).

### User Session Stored in `localStorage`
- **Severity:** MEDIUM
- **Location:** `frontend/src/App.jsx:69-72`
- **Description:** The entire user object (including `role`) is stored in `localStorage`. localStorage is accessible to any JavaScript on the page — including injected scripts from XSS.
- **Impact:** An XSS vulnerability anywhere on the frontend can steal the session and user role.
- **Fix:** Store minimal state in a `httpOnly` cookie (set by the server at login). The session infrastructure is already present.

### No Input Length Limits
- **Severity:** MEDIUM
- **Location:** `backend/index.js:1870-1905` (signup), `backend/index.js:1560` (admin user creation)
- **Description:** `username`, `password`, `display_name`, and `email` fields have no maximum length validation. SQLite will accept arbitrarily long strings.
- **Impact:** Large payloads can increase DB size unexpectedly; extremely long values may cause UI rendering issues.
- **Fix:** Add server-side max-length checks (e.g., username ≤ 50 chars, password ≤ 128 chars).

### Avatar Stored as Base64 in SQLite Column
- **Severity:** MEDIUM
- **Location:** `backend/index.js:3632-3660`
- **Description:** Profile avatars (up to 200KB each as base64) are stored in the `users.avatar` column. Every query that selects users — including `GET /api/admin/users` which returns all users — transfers this blob.
- **Impact:** Admin user list endpoint returns all avatars for all users in one payload. As user count grows, this becomes a significant bandwidth and memory concern.
- **Fix:** Store avatars on a separate storage service (e.g., Cloudflare R2) or at minimum as a file on the persistent volume and store only the path in the DB. Exclude the `avatar` column from bulk user-list queries.

---

## Technical Debt

### 4,923-Line Monolithic Backend File
- **Severity:** HIGH
- **Location:** `backend/index.js`
- **Description:** The entire Express application — routes, middleware, business logic, date parsing, external API calls, DB migrations, cron jobs — is in one file. It has grown from the original ~1,400 lines noted in docs to nearly 5,000 lines.
- **Effort to fix:** High — requires careful module extraction over multiple PRs.

### Schema Defined in Two Places
- **Severity:** HIGH
- **Location:** `backend/db.js` (primary) and `backend/index.js:192-430` (`initializeDatabase()`)
- **Description:** Table creation DDL appears in both `db.js` and in `initializeDatabase()` in `index.js`. Column migrations are also scattered across both files. It is unclear which is authoritative.
- **Effort to fix:** Medium — consolidate all schema and migration logic into `db.js` or a dedicated migrations module.

### No Database Transactions (General)
- **Severity:** HIGH
- **Location:** All multi-step DB operations throughout `backend/index.js`
- **Description:** No use of `BEGIN / COMMIT / ROLLBACK` anywhere in the codebase. Consistent data integrity relies on SQLite's implicit per-statement autocommit.
- **Effort to fix:** High — requires auditing and wrapping every multi-step operation.

### Callback Pyramid / Callback Hell
- **Severity:** MEDIUM
- **Location:** `backend/index.js` throughout (e.g., lines 3155–3320, 434–546)
- **Description:** The sqlite3 library uses a Node.js callback API. Functions are 10–15 levels of indentation deep. Error handling is inconsistently applied at each nested level.
- **Effort to fix:** High — requires either migrating to `better-sqlite3` (synchronous) or promisifying the sqlite3 client and adopting async/await.

### Duplicate Startup Migration Logic
- **Severity:** MEDIUM
- **Location:** `backend/index.js:99-133` (startup IIFE) and `backend/index.js:192-430` (`initializeDatabase()`) and `backend/db.js`
- **Description:** Three separate code blocks add columns and create tables on startup. The order is nondeterministic across async callbacks, and some migrations may silently fail when columns already exist.
- **Effort to fix:** Medium — consolidate into a single ordered migration runner.

### `db.close()` is a Silent No-op
- **Severity:** MEDIUM
- **Location:** `backend/index.js:91-97` (`openDb()` Proxy)
- **Description:** `openDb()` wraps the shared singleton in a Proxy that makes `db.close()` a no-op. All existing call sites call `db.close()` believing they are releasing resources. This pattern hides whether real cleanup is happening and makes refactoring dangerous.
- **Effort to fix:** Low — document the pattern clearly; remove the no-op when migrating to `better-sqlite3`.

### Orphaned `user_seasons` Records (Historically)
- **Severity:** LOW (fixed, but risk remains)
- **Location:** `backend/index.js` season deletion handler, `Documents/BALANCE-CALCULATION-FIX.md`
- **Description:** A historical bug left orphaned `user_seasons` records after season deletion, causing inflated overall balances. Fixed on 2026-03-07 by adding cleanup on deletion and JOINing balance queries against the `seasons` table.
- **Effort to fix:** Already fixed. Risk: any new code path that modifies seasons must remember to clean up `user_seasons`.

---

## Performance Concerns

### Avatar Base64 in Bulk User Queries
- **Location:** `backend/index.js:3632`
- **Problem:** `GET /api/admin/users` selects all user rows including the `avatar` TEXT column. With 200KB avatars per user, a 50-user list = up to 10MB per request.
- **Improvement path:** Exclude `avatar` from user list queries; return a separate avatar URL endpoint instead.

### Player Image Cache Bound to Single Instance
- **Location:** `backend/index.js:1131-1160` (image proxy/cache), `/app/data/images/`
- **Problem:** Cricbuzz player images are cached on the Fly.io VM's persistent volume filesystem. If Fly.io ever runs a second machine (e.g., HA enabled), caches diverge.
- **Improvement path:** Use Cloudflare R2 or CDN for image caching, or add a `Cache-Control` header and let Cloudflare cache the proxy response.

---

## Scalability Concerns

### SQLite Single-Writer Constraint
- **Location:** `backend/db.js:21`
- **Problem:** SQLite with WAL mode supports concurrent readers but only one writer. All balance updates, votes, and winner distribution funnel through the same write lock. Under high concurrency (many simultaneous votes), writes queue up.
- **Current mitigation:** Fly.io runs a single machine (`--ha=false`), which avoids multi-process contention but also removes redundancy.
- **Scaling path:** Migrate to PostgreSQL (Fly.io Postgres is affordable) for genuine multi-writer concurrency and HA. This is referenced in `Documents/SECURITY-AUDIT-REPORT.md` as a future recommendation.

### No Caching for Standings / Leaderboard
- **Location:** `backend/index.js` standings routes
- **Problem:** Every standings page load re-aggregates all vote and balance data from scratch. With 30-second polling enabled in the frontend, this generates constant DB load.
- **Scaling path:** Add a short (30-second) in-memory cache for the standings response, keyed by season.

---

## Missing Features / Gaps

### Password Hashing Never Implemented
- The internal security audit (`Documents/SECURITY-AUDIT-REPORT.md`, issued 2026-02-27) flagged plaintext password storage as CRITICAL. As of 2026-04-27 it remains unimplemented. There is no tracking issue or milestone phase for this fix.

### No Audit Log
- No record of when a winner was set, by whom, or when a vote was placed/changed. If a dispute arises about a result, there is no authoritative log to consult.

### No Input Sanitization for Match Teams / Season Names
- `home_team`, `away_team`, and `seasonName` from CSV import or API import are written to the DB without sanitization. While parameterized queries prevent SQL injection, unsanitized HTML in team names could cause XSS if values are ever rendered as `innerHTML`.

### Missing `predictions` Points Distribution
- The `predictions` feature (toss winner, MoM, best bowler) has a full schema (`toss_points`, `mom_points`, `bowler_points`) but no evidence of a winner-distribution endpoint that processes these. The feature appears partially implemented.

---

## Positive Observations

- **Parameterized SQL throughout:** All DB queries use `?` placeholders consistently — SQL injection risk is well-controlled.
- **Balance calculation JOIN fix applied:** The critical orphaned-balance bug was identified and fixed; the correct `JOIN seasons` pattern is now in place.
- **N+1 query eliminated:** `/api/seasons/:id/matches` uses a single LEFT JOIN query with in-code folding rather than per-match vote queries.
- **Voting cutoff window enforced:** The 30-minute pre-match voting ban is correctly computed server-side, not trusted from the client.
- **Google OAuth integrated:** Optional Google Sign-In is properly gated behind env var checks and does not break if credentials are absent.
- **WAL mode enabled:** SQLite WAL mode and cache size tuning (`backend/db.js:21-25`) provide meaningful concurrency and performance improvements.
- **Avatar size capped server-side:** The `/api/users/:id/avatar` endpoint validates MIME type and enforces a 200KB limit before writing to the DB.
- **`seriesType` path-traversal prevention:** Cricbuzz series-type parameter is validated against an allowlist before being interpolated into the API path (`backend/index.js:1195`).

---

*Concerns audit: 2026-04-27*
