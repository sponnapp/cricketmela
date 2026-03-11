# Cricket Mela — Software Architect Skill Profile

## 🎯 Role: Software Architect

**Project:** Cricket Mela — IPL T20 Cricket Betting Web Application  
**Domain:** Sports Betting / Fantasy Sports / Real-time Wagering Platform  
**Repository:** https://github.com/sponnapp/cricketmela.git

---

## 📐 Architecture Design Skills

### System Architecture
- **Designed a decoupled frontend-backend architecture** with separate hosting providers (Cloudflare Pages + Fly.io) communicating via API proxy
- **Architected a stateless API layer** using Express.js with header-based auth (`x-user`), enabling horizontal scaling and simple deployment
- **Designed a multi-tier deployment topology:**
  - Static assets served via Cloudflare CDN (global edge)
  - API server on Fly.io with persistent SQLite volume
  - API proxy via Cloudflare `_redirects` (zero-latency routing)
- **Implemented SPA routing strategy** with `_middleware.js` fallback and `_redirects` rules to handle both client-side routing and API proxying in a single deployment

### Data Architecture
- **Designed a relational schema** for multi-tenant season-based betting:
  - `users` → `user_seasons` → `seasons` → `matches` → `votes` (normalized relationships)
  - `predictions` for secondary prediction markets (toss, MoM, best bowler)
  - `settings` for dynamic configuration (email, API keys)
  - `password_reset_tokens` for secure password recovery flows
- **Engineered season-scoped balance isolation** — each user has per-season balances (`user_seasons.balance`) preventing cross-season contamination
- **Identified and resolved orphaned data patterns** — enforced JOIN-based balance calculations to prevent phantom balances from deleted seasons
- **Designed cascade deletion strategy** for data integrity: season deletion cascades through `user_seasons` → `matches` → `votes`

### Integration Architecture
- **Integrated CricAPI (cricapi.com)** for real-time cricket data: series discovery, match schedules, squad rosters
- **Designed Gmail SMTP integration** via Nodemailer for transactional emails (signup, approval, password reset)
- **Implemented Google OAuth 2.0** as dual-authentication alongside username/password, with Passport.js strategy and session management
- **Architected auto-refresh mechanism** using version polling (`version.json` every 30s) for near-real-time data synchronization without WebSockets

---

## 🛠️ Technical Skills Demonstrated

### Frontend Engineering (React 18 + Vite 4)
| Skill | Implementation |
|-------|---------------|
| **Component Architecture** | 11 React components with clear separation of concerns (Login, Seasons, Matches, Admin, Predictions, VoteHistory, Standings, Profile, Toast, App, useVersionCheck) |
| **State Management** | localStorage-based session, prop-drilling with `refreshTrigger` for auto-refresh, component-level state with `useState`/`useEffect` |
| **Role-Based UI Rendering** | Conditional rendering based on `admin`, `superuser`, `picker` roles — hiding/showing features per permission |
| **Real-Time UX** | 30-second auto-refresh, toast notifications, optimistic UI updates for voting |
| **Responsive Design** | CSS-in-JS with inline styles, glassmorphism UI pattern, mobile-aware layouts |
| **API Integration** | Axios with interceptors, relative URL routing through Vite dev proxy |
| **Build Optimization** | Vite 4 with React plugin, code splitting, production build pipeline |

### Backend Engineering (Node.js + Express.js)
| Skill | Implementation |
|-------|---------------|
| **RESTful API Design** | 50+ endpoints across auth, voting, admin, predictions, email, and OAuth domains |
| **Middleware Architecture** | `requireRole()` middleware for RBAC, CORS configuration, session management |
| **Database Operations** | Complex SQL with JOINs, aggregations, upserts, and transaction-like patterns |
| **Schema Migration** | Runtime column detection with `hasColumn()` helper for zero-downtime migrations |
| **Email System** | Nodemailer integration with configurable SMTP, HTML email templates |
| **OAuth Flow** | Google OAuth 2.0 with Passport.js, session serialization/deserialization |
| **External API Integration** | CricAPI consumption for series, matches, and squad data |
| **Security Patterns** | Password reset tokens with expiry, input validation, role-based access control |

### Database Design (SQLite3)
| Skill | Implementation |
|-------|---------------|
| **Schema Design** | 8+ tables with proper normalization, foreign key relationships |
| **Migration Strategy** | Additive migrations with column existence checks (`PRAGMA table_info`) |
| **Data Integrity** | Upsert patterns for votes, cascade deletes for seasons, orphan prevention |
| **Production Persistence** | Fly.io persistent volumes (`/app/data`) for SQLite durability |
| **Balance Reconciliation** | JOIN-based balance calculations preventing orphaned record inflation |

### DevOps & Deployment
| Skill | Implementation |
|-------|---------------|
| **CI/CD Scripting** | Shell scripts for build, deploy, verify (`deploy-cf-simple.sh`, `deploy-backend.sh`, `quick-deploy.sh`) |
| **Container Deployment** | Dockerfile for Fly.io with Node.js, persistent volume mounts |
| **CDN Configuration** | Cloudflare Pages with `_redirects` for API proxying and SPA fallback |
| **Environment Management** | `.env` files, `NODE_ENV` switching for DB paths, API keys |
| **Version Detection** | Git SHA-based `version.json` for deployment detection and cache busting |
| **Production Monitoring** | `verify-production.sh` for post-deploy health checks |

---

## 🏗️ Architectural Decisions & Rationale

### 1. SQLite over PostgreSQL/MySQL
**Decision:** Use SQLite3 as the sole database  
**Rationale:**
- Zero infrastructure cost — runs on the same server as the app
- Simplified deployment — single file on Fly.io persistent volume
- Adequate for expected user base (< 100 concurrent users)
- No need for connection pooling or separate DB hosting  
**Trade-off:** No horizontal scaling for writes; acceptable for a fun-betting platform

### 2. Cloudflare Pages + Fly.io Split Architecture
**Decision:** Separate frontend and backend hosting  
**Rationale:**
- Cloudflare Pages provides free global CDN for static assets
- Fly.io offers persistent volumes for SQLite (not available on Cloudflare Workers)
- `_redirects` proxy eliminates CORS issues transparently
- Independent deployment cycles — frontend deploys don't restart backend  
**Trade-off:** API proxy adds latency hop; mitigated by Cloudflare edge proximity

### 3. Header-Based Auth over JWT/Sessions
**Decision:** Use `x-user` header with localStorage-stored user object  
**Rationale:**
- Simplicity — no token refresh, expiry, or session store needed
- Fits the trust model — fun platform among friends, not financial
- Reduces backend complexity — no session middleware or token validation  
**Trade-off:** Not production-grade security; acceptable for the use case. Google OAuth added as a more secure alternative.

### 4. Season-Scoped Balance System
**Decision:** Per-season balances in `user_seasons` instead of a global wallet  
**Rationale:**
- Isolates betting pools per season — users can't use one season's winnings in another
- Simplifies season-specific standings and leaderboards
- Prevents balance confusion when users participate in multiple concurrent seasons  
**Trade-off:** Requires JOIN-based aggregation for overall balance display

### 5. Dual Authentication (Password + Google OAuth)
**Decision:** Support both traditional login and Google Sign-In  
**Rationale:**
- Existing users not impacted — password login remains unchanged
- New users get frictionless onboarding via Google
- Google provides verified emails, reducing fake signups  
**Trade-off:** Added complexity in backend (Passport.js, sessions, callback handling)

### 6. CricAPI Integration for Match Data
**Decision:** Pull match schedules and squad data from CricAPI  
**Rationale:**
- Eliminates manual data entry for admin
- Provides real squad rosters for prediction features (MoM, best bowler)
- Season discovery enables one-click season creation  
**Trade-off:** API rate limits (free tier), data freshness depends on API updates

---

## 📊 Complexity & Scale Metrics

| Metric | Value |
|--------|-------|
| **Total Source Files** | ~20 application files |
| **Backend LOC** | ~3,200+ lines (index.js) |
| **Frontend LOC** | ~5,500+ lines (JSX components) |
| **API Endpoints** | 50+ RESTful endpoints |
| **Database Tables** | 8+ tables |
| **User Roles** | 3 (admin, superuser, picker) |
| **External Integrations** | 3 (CricAPI, Gmail SMTP, Google OAuth) |
| **Deployment Targets** | 2 (Cloudflare Pages, Fly.io) |

---

## 🔐 Security Architecture

### Implemented
- Role-based access control (RBAC) with 3 tiers
- Google OAuth 2.0 for verified identity
- Password reset via time-limited tokens with email verification
- Admin approval workflow for new user registrations
- Case-insensitive login to prevent duplicate accounts
- Input validation on voting windows (30-min lockout before match)
- CORS configuration for cross-origin API access

### Identified Improvements (Documented)
- Migrate from plain-text passwords to bcrypt hashing
- Replace `x-user` header auth with JWT tokens
- Add rate limiting on login and signup endpoints
- Implement CSRF protection for state-changing operations
- Add SQL parameterization audit (currently uses parameterized queries)

---

## 🎮 Domain-Specific Skills

### Sports Betting Domain
- **Odds Calculation:** Real-time proportional odds based on aggregated user bets
- **Payout Distribution:** 1:1 ratio distribution — loser pool split proportionally among winners
- **Voting Window Management:** Time-based lockout (30 min before match) with timezone-aware parsing
- **Auto-Loss Mechanism:** Penalizes non-voters in assigned seasons with minimum bet deduction
- **Multi-Market Predictions:** Toss winner, Man of the Match, Best Bowler — each with independent betting pools
- **Balance Reconciliation:** Winner reversal (clear winner) restores all balances to pre-result state

### Cricket Domain
- IPL T20 match structures, series formats
- Squad management per series
- CricAPI data model mapping (series → matches → squads)
- Match scheduling with IST/GMT timezone handling and local display conversion

---

## 🧩 Key Design Patterns Used

| Pattern | Where Applied |
|---------|--------------|
| **Proxy Pattern** | Cloudflare `_redirects` + Vite dev proxy for unified API routing |
| **Observer Pattern** | `refreshTrigger` prop propagation for auto-refresh across components |
| **Strategy Pattern** | Dual auth strategies (password + Google OAuth via Passport.js) |
| **Middleware Chain** | Express middleware for auth, role checking, request processing |
| **Upsert Pattern** | Vote creation/update in single operation |
| **Migration Pattern** | Runtime schema evolution with `hasColumn()` checks |
| **Facade Pattern** | Admin.jsx as unified interface to all admin operations |
| **Toast Notification Pattern** | Centralized toast system replacing native alerts |

---

## 🚀 Production Operations Skills

- **Zero-downtime deployments** via independent frontend/backend deploy cycles
- **Cache management** strategy with version.json for detecting stale client bundles
- **Data persistence** architecture on Fly.io with mounted volumes
- **Monitoring** via deploy-verification scripts and health-check endpoints
- **Rollback capability** via Git-based deployments (commit ID-based revert)
- **Database backup** scripting (`backup-database.sh`)

---

## 📈 Evolution & Scalability Roadmap

### Short-Term (Current Architecture)
- ✅ Serves < 100 users with SQLite
- ✅ Global static delivery via Cloudflare CDN
- ✅ Auto-refresh keeps data fresh without WebSockets

### Medium-Term (If Growth Demands)
- Migrate SQLite → Cloudflare D1 (serverless SQL, 5M reads/day free)
- Add WebSocket for real-time odds updates
- Implement proper JWT auth with refresh tokens
- Add automated match result fetching from CricAPI

### Long-Term (Scale Architecture)
- Migrate to PostgreSQL on managed hosting
- Add Redis for session store and caching
- Implement event-driven architecture for bet processing
- Add comprehensive API rate limiting and abuse prevention
- Mobile app with React Native sharing component logic

---

*Last Updated: March 2026*

