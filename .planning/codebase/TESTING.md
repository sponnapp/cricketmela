# Testing

**Analysis Date:** 2026-04-27

---

## Current State

**There are zero automated tests in this project.**

No test files, no test runner, no test configuration, and no test scripts exist in either the frontend or backend package manifests. The project relies entirely on manual testing in the browser and Fly.io staging.

---

## Test Files Found

None. Searches for `*.test.*` and `*.spec.*` returned no results across the entire repository.

---

## Test Scripts

**Frontend** (`frontend/package.json`):
```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
}
```
No `test` script present.

**Backend** (`backend/package.json`):
```json
"scripts": {
  "start": "node index.js",
  "dev": "nodemon index.js",
  "migrate": "node db.js"
}
```
No `test` script present.

---

## Test Dependencies

**Frontend**: No test packages in `dependencies` or `devDependencies`. Vite is present, which supports Vitest with zero config.

**Backend**: No test packages. Node.js is the runtime; Jest or Mocha would be straightforward additions.

---

## What IS Tested

Nothing is tested automatically. All validation is manual:
- Login and signup flows tested via browser
- Vote submission and balance changes verified via Admin panel
- Backend API spot-checked via browser network tab or Postman

---

## What IS NOT Tested

Every critical path is untested:

| Area | Risk |
|---|---|
| **Balance calculation** | `parseMatchDateTime`, vote distribution, auto-loss logic — bugs here silently corrupt user balances |
| **Voting window logic** | The 30-minute cutoff before match start is calculated in both frontend and backend; drift between them is undetected |
| **Winner payout algorithm** | `totalLoserPoints` distribution and rounding (`Math.round`) never verified programmatically |
| **`parseMatchDateTime`** | Three divergent copies across `backend/index.js`, `Admin.jsx`, `Matches.jsx` — edge cases untested |
| **Auth middleware** | `requireRole` and the `x-user` header lookup could be bypassed without notice |
| **Admin-only endpoints** | No test verifies that `picker`/`superuser` roles receive 403 from admin routes |
| **SQLite migrations** | `initializeDatabase()` and `runStartupMigrations()` run live against the production DB — no dry-run or test DB |
| **Season deletion cascade** | Orphaned `user_seasons` records after deletion are a known bug; no regression test exists |
| **CSV bulk import** | Malformed CSV, duplicate matches, and boundary values never validated automatically |
| **Google OAuth flow** | No integration test; relies entirely on manual browser testing |
| **Email notifications** | `backend/email.js` tested only manually via Admin → Email tab |
| **Frontend components** | No component unit tests, no snapshot tests, no interaction tests |

---

## Recommended Testing Strategy

Given the stack (Vite + React frontend, Express + SQLite backend), the following gives maximum coverage for minimum investment:

### 1. Backend Unit Tests — Jest + in-memory SQLite

**Priority: High** — balance logic and payout algorithm are correctness-critical.

```bash
cd backend
npm install --save-dev jest
```

Target files:
- `parseMatchDateTime` helper — snapshot-test all date format variants
- Winner payout distribution logic — test with known vote inputs and expected balances
- `requireRole` middleware — test 401 and 403 responses
- Auto-loss calculation in `processAutoLossForNewSeasons`

Use an in-memory SQLite DB per test (`:memory:`) to avoid touching the production file.

### 2. Frontend Unit Tests — Vitest + React Testing Library

**Priority: Medium** — Vitest works with the existing Vite config with no extra setup.

```bash
cd frontend
npm install --save-dev vitest @testing-library/react @testing-library/user-event jsdom
```

Add to `frontend/vite.config.js`:
```js
test: { environment: 'jsdom' }
```

Target components:
- `Login.jsx` — form validation, error display, submit flow (mock axios)
- `Matches.jsx` — voting disabled logic, countdown timer state
- `App.jsx` — `readNavState` / `writeNavState` with mocked localStorage

### 3. API Integration Tests — Supertest

**Priority: High for the most dangerous routes.**

```bash
cd backend
npm install --save-dev supertest
```

Test the full request-response cycle for:
- `POST /api/login` — valid credentials, invalid credentials, case-insensitive match
- `POST /api/matches/:id/vote` — within window, outside window, after winner set
- `POST /api/admin/matches/:id/winner` — payout calculation end-to-end
- `DELETE /api/admin/seasons/:id` — verify cascade cleanup of `user_seasons`

### 4. Smoke Tests (optional CI step)

A minimal bash script that hits `/api/health` and `/api/seasons/all` after deploy gives fast deploy verification with zero framework overhead.

---

## Test Commands (once implemented)

```bash
# Backend
cd backend && npm test
cd backend && npm run test:watch

# Frontend
cd frontend && npm test
cd frontend && npm run test:coverage
```

---

## Notes

- The three copies of `parseMatchDateTime` should be unified into a shared utility before writing tests — testing three divergent copies creates false confidence.
- The plain-text password comparison in the login route must be fixed (or at minimum acknowledged) before writing auth tests, as hashing will change expected test inputs.
- SQLite's `:memory:` mode is ideal for test isolation — each test suite gets a fresh schema with no teardown complexity.
