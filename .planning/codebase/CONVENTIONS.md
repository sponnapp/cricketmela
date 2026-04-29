# Code Conventions

**Analysis Date:** 2026-04-27

## Overview

CricketMela is a React 18 + Express.js application with no TypeScript or linting toolchain configured. Coding style is informal and consistent within files but shows duplication across the frontend and backend. Inline styles dominate the UI layer; the backend uses callback-style SQLite. No formatter (Prettier/ESLint) config files exist.

---

## Frontend Conventions

### Component Structure

- **One default export per file** — each file contains one "page" component (e.g., `frontend/src/Matches.jsx`, `frontend/src/Profile.jsx`).
- **Local helper components defined above the main export** within the same file — e.g., `UserAvatar`, `PodiumCard`, `Avatar`, `IplBadge`, `IntlBadge`, `NextMatchCountdown` are all defined inline before `export default function`.
- **Function declaration style** — components use `function ComponentName()` declarations, not arrow functions.
- **Props are destructured in the function signature**: `function Matches({ seasonId, user, refreshUser, refreshTrigger })`.
- **No prop types or TypeScript** — props are undocumented and unvalidated.

### State Management

- **Only `useState` + `useEffect`** — no Redux, Context API, Zustand, or other state libraries.
- **Loading/saving flags pattern** — every async operation has a `loading` or `saving` state variable:
  ```jsx
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  ```
- **Error + message pair pattern** — forms use separate `error` and `message` state for feedback:
  ```jsx
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  ```
- **Auto-refresh via `refreshTrigger` prop** — a numeric counter passed from `App.jsx`, incremented every 30 seconds. Components re-fetch when this prop changes:
  ```jsx
  useEffect(() => {
    fetchMatches()
  }, [seasonId, user?.username, refreshTrigger])
  ```
- **`useCallback` used for stable callbacks** — `handleAutoRefresh`, `addToast`, `removeToast` in `App.jsx` are wrapped with `useCallback`.
- **`useRef` for imperative/mutable values** — e.g., `dirtyVotes` in `Matches.jsx` uses `useRef(new Set())` to track user-touched matches that auto-refresh must not overwrite.

### API Calls

- **All calls use axios with relative paths** — `/api/...` paths work via Vite proxy in dev and Cloudflare `_redirects` in production.
- **Auth header pattern** — every mutating or user-scoped request includes `{ headers: { 'x-user': user.username } }`:
  ```jsx
  axios.post(`/api/matches/${m.id}/vote`, { team, points }, { headers: { 'x-user': user.username } })
  ```
- **async/await exclusively** — no `.then()` chains except for one-liners in `useEffect`.
- **Error extraction pattern**:
  ```jsx
  setError(err.response?.data?.error || 'Fallback message')
  ```
- **No centralized API client** — every component imports axios and constructs requests inline.
- **`try/catch` wraps every API call** — failures are silently swallowed or shown via `setError`.

### Styling

- **Inline styles are the primary styling mechanism** — almost all layout and visual styling uses JSX `style={{}}` objects.
- **Global stylesheet** — `frontend/src/styles.css` exists but contains only a small set of global resets and layout helpers.
- **Fonts** — `'Poppins'` (headings/numbers) and `'Inter'` (body text) are referenced inline across nearly every component.
- **Color palette** — defined locally per component, no shared design tokens or CSS variables.
- **Responsive layout** — detected via `window.innerWidth` with a `useEffect` resize listener pattern:
  ```jsx
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  ```
- **Hover effects** — applied via `onMouseEnter`/`onMouseLeave` handlers that mutate `e.currentTarget.style` directly rather than using CSS classes.

### File Naming

- **React components**: `PascalCase.jsx` — e.g., `App.jsx`, `Matches.jsx`, `VoteHistory.jsx`
- **Hooks**: `camelCase.js` — e.g., `useVersionCheck.js`
- **Utilities**: `camelCase.js` — e.g., `celebrations.js`, `email.js`
- **All source files in a flat `frontend/src/` directory** — no subdirectory organization.

---

## Backend Conventions

### Route Patterns

- **All routes in a single file**: `backend/index.js` (~1400+ lines).
- **Route naming**: `GET/POST/PUT/DELETE /api/<resource>` — RESTful naming followed loosely.
- **Route grouping via comments**: `// ── Section Name ────────` ASCII dividers separate logical groups.
- **Inline business logic** — no separate controller or service layer; all logic lives in the route handler.
- **`db.serialize()`** used when multiple dependent queries must run in order.

### Error Handling

- **Standard error response**: `res.status(500).json({ error: 'DB error' })` on database errors.
- **Auth errors**: 401 for missing user, 403 for wrong role:
  ```js
  if (!req.user) return res.status(401).json({ error: 'Unauthorized: missing user header' });
  return res.status(403).json({ error: 'Forbidden' });
  ```
- **Validation errors**: `res.status(400).json({ error: 'message' })`.
- **No centralized error handler** — each route handles its own errors inline.
- **DB callback error pattern**:
  ```js
  if (err) { db.close(); return res.status(500).json({ error: 'DB error' }); }
  ```

### DB Access Patterns

- **Callback-based `sqlite3` API** — `db.get`, `db.all`, `db.run` with `(err, rows) =>` callbacks.
- **`openDb()` called per route** — returns a proxy around the singleton `require('./db')` connection; `db.close()` is a no-op via proxy.
- **`db.close()` called in every branch** — legacy pattern; safe because it is a no-op in the current implementation.
- **Parameterized queries throughout** — `?` placeholders used consistently; no string interpolation in SQL.
- **Schema migrations inline at startup** — `initializeDatabase()` and `runStartupMigrations()` IIFEs run on server start using `PRAGMA table_info` + `ALTER TABLE ADD COLUMN` pattern.
- **`db.serialize()`** wraps dependent multi-step operations.

### Auth Pattern

- **Global middleware** (`backend/index.js` line ~545): reads `x-user` header, looks up user in DB, attaches `req.user`.
- **`requireRole(...roles)`** — factory function returning Express middleware; used as route-level guard:
  ```js
  app.post('/api/admin/...', requireRole('admin'), (req, res) => { ... })
  app.post('/api/...', requireRole('admin', 'superuser'), (req, res) => { ... })
  ```
- **Flat array or spread**: `requireRole(['admin','superuser'])` and `requireRole('admin','superuser')` both work via `.flat()`.
- **No session tokens for regular auth** — user session lives in `localStorage` on the client.
- **Google OAuth** uses `express-session` + `passport` (`backend/auth/googleStrategy.js`).

### Response Shapes

- **Success**: returns the resource object or array directly:
  ```json
  { "id": 1, "name": "IPL 2026", ... }
  ```
- **Error**: `{ "error": "Human-readable message" }`
- **Paginated/list**: plain JSON array `[...]`
- **Balance responses**: `{ "balance": 1234 }`
- **Mixed success+data**: e.g., vote response returns `{ season_balance: ... }` alongside updated state.

---

## Shared Patterns

### `parseMatchDateTime` — **Duplicated in three places**
The same date-parsing function appears in:
- `backend/index.js` (authoritative, handles UTC ISO + local `DD-MMM-YY` formats)
- `frontend/src/Admin.jsx` (simplified copy)
- `frontend/src/Matches.jsx` (used for countdown timer logic)

All three are subtly different; the backend version is the most complete.

### `sortMatchesByDateTime` — **Duplicated in frontend**
A helper to sort match arrays by `scheduled_at` exists in both `Admin.jsx` and `Matches.jsx`.

### Avatar/initials component — **Duplicated**
`UserAvatar` (in `App.jsx`) and `Avatar` (in `Standings.jsx`) are nearly identical implementations of the same initials-avatar component with colour hashing.

### `try/catch` + `setLoading(false)` in `finally`
Both frontend async functions and backend route callbacks follow this cleanup pattern.

---

## Anti-patterns Observed

| Anti-pattern | Location | Impact |
|---|---|---|
| **Plain-text passwords** | `backend/index.js` login route | Critical security risk — passwords stored and compared as raw strings |
| **All routes in one file** | `backend/index.js` (1400+ lines) | Hard to navigate; unrelated logic mixed together |
| **`parseMatchDateTime` duplicated** | `backend/index.js`, `Admin.jsx`, `Matches.jsx` | Divergence risk; bugs fixed in one copy won't propagate |
| **Avatar component duplicated** | `App.jsx` (`UserAvatar`), `Standings.jsx` (`Avatar`) | Divergence in visual behaviour |
| **No TypeScript** | Entire codebase | No type checking; prop contract violations are silent |
| **No ESLint/Prettier config** | Entire codebase | Inconsistent formatting; no automated quality gate |
| **Inline styles everywhere** | All frontend components | Theming, dark mode, and responsive overrides are painful |
| **Hover via `onMouseEnter` style mutation** | `Login.jsx`, `Matches.jsx` | Bypasses React rendering; inconsistent with rest of style system |
| **`console.log` / `console.error` in production routes** | `backend/index.js` | Debug output leaks to production logs |
| **Orphaned `user_seasons` records** | `backend/index.js` (season deletion) | Balance totals are wrong if seasons deleted without removing `user_seasons` rows — JOIN required (documented in `copilot-instructions.md`) |
| **No input sanitization on CSV import** | `backend/index.js` admin routes | CSV values are used in parameterized queries but not validated for type/range |
| **Hardcoded session secret fallback** | `backend/index.js` | `'cricket-mela-secret-key-change-in-production'` used if `SESSION_SECRET` env var is absent |
