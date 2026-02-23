# Deployment Architecture Diagram

## Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INTERNET USERS                               │
│                    (Your Friends & Players)                          │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      │ HTTPS (SSL Encrypted)
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     CLOUDFLARE CDN                                   │
│                   (Global Edge Network)                              │
│  • DDoS Protection     • SSL/TLS        • Caching                   │
│  • CDN Acceleration    • Load Balance   • Analytics                 │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│              CLOUDFLARE PAGES (Frontend)                             │
│              https://cricketmela.pages.dev                           │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  React Application (SPA)                                    │    │
│  │  • Login.jsx      - Authentication UI                       │    │
│  │  • Seasons.jsx    - Season selection                        │    │
│  │  • Matches.jsx    - Voting interface                        │    │
│  │  • Standings.jsx  - Leaderboard                             │    │
│  │  • Admin.jsx      - Admin panel                             │    │
│  │  • VoteHistory.jsx - User vote history                      │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Build: Vite (optimized production build)                           │
│  Deployment: Auto on git push                                       │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      │ API Calls (REST)
                      │ https://your-app.fly.dev/api/*
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FLY.IO (Backend)                                  │
│              https://your-app.fly.dev                                │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Node.js + Express Application                              │    │
│  │                                                              │    │
│  │  API Endpoints:                                              │    │
│  │  • POST /api/login           - User authentication          │    │
│  │  • GET  /api/seasons         - Get all seasons              │    │
│  │  • GET  /api/matches         - Get matches                  │    │
│  │  • POST /api/vote            - Submit votes                 │    │
│  │  • GET  /api/standings       - Get leaderboard              │    │
│  │  • POST /api/admin/*         - Admin operations             │    │
│  │                                                              │    │
│  │  Features:                                                   │    │
│  │  • JWT Authentication                                        │    │
│  │  • Role-based access (admin, superuser, picker)             │    │
│  │  • Vote validation                                           │    │
│  │  • Auto-loss for non-voters                                 │    │
│  │  • Season management                                         │    │
│  │  • User management                                           │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Container: Docker (Node 18 Alpine)                                 │
│  Runtime: Always running (or auto-scale)                            │
│  Health Check: /api/health                                          │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      │ SQLite Queries
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│              PERSISTENT VOLUME (Database)                            │
│                    /app/data/data.db                                 │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  SQLite Database                                            │    │
│  │                                                              │    │
│  │  Tables:                                                     │    │
│  │  • users           - User accounts & balances               │    │
│  │  • seasons         - Cricket seasons (IPL, World Cup)       │    │
│  │  • matches         - Match details & results                │    │
│  │  • votes           - User voting records                    │    │
│  │  • pending_users   - Sign-up requests                       │    │
│  │  • user_seasons    - User-season assignments                │    │
│  │                                                              │    │
│  │  Features:                                                   │    │
│  │  • ACID compliance                                           │    │
│  │  • Auto-incrementing IDs                                     │    │
│  │  • Indexes for performance                                   │    │
│  │  • Foreign key constraints                                   │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Volume: 1GB persistent storage                                     │
│  Backup: Manual via flyctl sftp                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. User Login Flow
```
User Browser
    │
    ├─> [GET] https://cricketmela.pages.dev/
    │         Cloudflare Pages serves index.html
    │
    ├─> User enters username/password
    │
    └─> [POST] https://your-app.fly.dev/api/login
              │
              ├─> Backend validates credentials (case-insensitive)
              │
              ├─> Query SQLite: SELECT * FROM users WHERE LOWER(username) = ?
              │
              ├─> Generate JWT token
              │
              └─> Return: { token, user, role, balance }
```

### 2. Vote Submission Flow
```
User Browser
    │
    ├─> User selects team and points
    │
    └─> [POST] https://your-app.fly.dev/api/vote
        Body: { matchId, team, points }
              │
              ├─> Backend validates JWT token
              │
              ├─> Check voting window (30 mins before match)
              │
              ├─> Check user balance
              │
              ├─> SQLite Transaction:
              │   ├─> INSERT INTO votes (user_id, match_id, voted_team, points)
              │   └─> UPDATE users SET balance = balance - points
              │
              └─> Return: { success, newBalance }
```

### 3. Standings Calculation Flow
```
User Browser
    │
    └─> [GET] https://your-app.fly.dev/api/standings?seasonId=1
              │
              ├─> Query all users in season
              │
              ├─> For each user:
              │   ├─> Calculate total points from votes
              │   ├─> Calculate wins/losses
              │   └─> Calculate net profit
              │
              ├─> Sort by balance DESC
              │
              └─> Return: [ { username, balance, wins, losses, ... } ]
```

### 4. Admin Set Winner Flow
```
Admin Browser
    │
    └─> [POST] https://your-app.fly.dev/api/admin/set-winner
        Body: { matchId, winner }
              │
              ├─> Verify admin/superuser role
              │
              ├─> Get all votes for match
              │
              ├─> SQLite Transaction:
              │   │
              │   ├─> For users who didn't vote:
              │   │   └─> Auto-assign loss with 10 points
              │   │
              │   ├─> For winning votes:
              │   │   └─> UPDATE users SET balance = balance + (points * odds)
              │   │
              │   ├─> For losing votes:
              │   │   └─> Already deducted, no change
              │   │
              │   └─> UPDATE matches SET winner = ?
              │
              └─> Return: { success, results }
```

## Deployment Flow

### Frontend Deployment (Auto)
```
Developer
    │
    ├─> git add .
    ├─> git commit -m "Update"
    └─> git push origin main
              │
              ├─> GitHub webhook triggers Cloudflare Pages
              │
              ├─> Cloudflare Pages:
              │   ├─> git clone repo
              │   ├─> cd frontend
              │   ├─> npm install
              │   ├─> npm run build
              │   └─> Deploy dist/ to CDN
              │
              └─> Live in ~2 minutes! ✅
```

### Backend Deployment (Manual)
```
Developer
    │
    └─> ./deploy-backend.sh
              │
              ├─> Build Docker image
              │
              ├─> Push to Fly.io registry
              │
              ├─> Deploy to Fly.io:
              │   ├─> Stop old container
              │   ├─> Start new container
              │   ├─> Mount persistent volume
              │   ├─> Health check passes
              │   └─> Route traffic to new container
              │
              └─> Live in ~1 minute! ✅
```

## Backup & Recovery

### Database Backup
```
Developer
    │
    └─> ./backup-database.sh
              │
              ├─> flyctl ssh sftp get /app/data/data.db
              │
              ├─> Save to ./backups/backup_YYYYMMDD_HHMMSS.db
              │
              └─> Backup complete! ✅
```

### Recovery from Backup
```
Developer
    │
    └─> flyctl ssh sftp shell
              │
              ├─> put backups/backup.db /app/data/data.db
              │
              ├─> flyctl restart
              │
              └─> Restored! ✅
```

## Monitoring

### Real-time Monitoring
```
Terminal                           Cloudflare Dashboard
    │                                      │
    ├─> flyctl logs -f                    ├─> Analytics
    │   (Backend logs)                    │   (Traffic, requests)
    │                                      │
    ├─> flyctl status                     ├─> Deployment history
    │   (App health)                      │   (Build logs)
    │                                      │
    └─> flyctl metrics                    └─> Real-time visitors
        (CPU, RAM, network)
```

## Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Cloudflare Protection                              │
│  • DDoS protection                                           │
│  • WAF (Web Application Firewall)                            │
│  • Rate limiting                                             │
│  • SSL/TLS encryption                                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│  Layer 2: Application Security                               │
│  • CORS restrictions (specific domains only)                 │
│  • JWT authentication                                        │
│  • Role-based access control                                 │
│  • Input validation                                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│  Layer 3: Database Security                                  │
│  • Parameterized queries (SQL injection prevention)          │
│  • Password hashing (not implemented yet - consider adding)  │
│  • Data validation before storage                            │
└─────────────────────────────────────────────────────────────┘
```

## Performance Optimization

```
Frontend (Cloudflare Pages)
├─> Vite build optimization
│   ├─> Code splitting
│   ├─> Tree shaking
│   ├─> Minification
│   └─> Compression
│
├─> Cloudflare CDN
│   ├─> Global edge caching
│   ├─> Brotli compression
│   └─> HTTP/2 + HTTP/3
│
└─> Result: < 1s load time ✅

Backend (Fly.io)
├─> SQLite optimizations
│   ├─> Indexes on foreign keys
│   ├─> Query optimization
│   └─> Connection pooling
│
├─> Node.js performance
│   ├─> Async/await patterns
│   ├─> Efficient routing
│   └─> Minimal middleware
│
└─> Result: < 100ms API response ✅
```

## Cost Breakdown

```
Cloudflare Pages (Frontend)
├─> Hosting:           FREE (unlimited)
├─> Bandwidth:         FREE (unlimited)
├─> SSL:               FREE
├─> Builds:            FREE (500/month)
└─> Total:             $0/month

Fly.io (Backend)
├─> VM (256MB):        FREE (up to 3)
├─> Storage (1GB):     FREE (up to 3GB)
├─> Bandwidth:         FREE (up to 160GB)
└─> Total:             $0/month

Grand Total:           $0/month ✅
```

## Scaling Strategy

### Current (Free Tier)
```
Users: ~100 concurrent
Traffic: ~10K requests/day
Storage: ~100MB database
Cost: $0/month
```

### If You Grow
```
Users: ~1,000 concurrent
├─> Frontend: Still FREE (Cloudflare scales automatically)
└─> Backend: Scale Fly.io
    ├─> Increase RAM: 256MB → 512MB (~$5/month)
    ├─> Add regions: Deploy to multiple locations
    └─> Cost: ~$10/month
```

---

This architecture provides:
- ✅ High availability
- ✅ Global CDN
- ✅ Automatic SSL
- ✅ Easy deployment
- ✅ Low cost
- ✅ Scalable

**Ready to deploy!** 🚀

