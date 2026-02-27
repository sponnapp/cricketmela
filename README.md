# 🏏 Cricket Mela - IPL T20 Betting App

A real-time IPL T20 cricket betting application where users can vote on match winners and earn/lose points based on outcomes.

---

## 🌐 Production URLs

| Service | URL |
|---------|-----|
| **Frontend** | https://cricketmela.pages.dev |
| **Backend API** | https://cricketmela-api.fly.dev |
| **GitHub Repo** | https://github.com/sponnapp/cricketmela.git |

---

## 🏗️ Architecture

```
Frontend (React + Vite)          Backend (Node.js + Express)
Cloudflare Pages              →  Fly.io + SQLite
_redirects → /api/*              /api/* endpoints
```

- **Frontend**: React, Vite, Axios — deployed on Cloudflare Pages
- **Backend**: Express.js, SQLite3 — deployed on Fly.io
- **API Proxy**: Cloudflare Pages `_redirects` proxies `/api/*` to Fly.io

---

## 👥 User Roles

| Role | Access |
|------|--------|
| `admin` | Full control: seasons, matches, users, set winner, upload CSV |
| `superuser` | Set match winners only |
| `picker` | Vote on matches within assigned seasons |

**Default credentials:**
- Admin: `admin` / `admin123`
- User: `senthil` / `senthil123`

---

## ✨ Features

### User Features
- Login / Sign-up (with admin approval)
- Browse assigned seasons & matches
- Vote for winning team (radio buttons, 1 vote per match)
- Select betting points (10, 20, 50)
- Voting locked 30 mins before match start & after winner is set
- View vote history with match Date/Time, result, payout, net
- User standings (leaderboard)
- Profile page (update display name, change password)

### Admin Features
- Create / edit / delete seasons
- Bulk upload matches via CSV (`Date,Venue,Team 1,Team 2,Time`)
- Edit / delete individual matches
- Set match winner → auto-distributes points to winners (1:1 ratio)
- Clear match winner (reverts point distribution)
- Clear all votes for a specific match
- Create / edit / delete users (assign role, balance, seasons)
- Reset user password
- Approve sign-up requests (assign role, seasons, starting balance)
- View all user transactions

---

## 📁 Project Structure

```
cricketmela/
├── frontend/               # React + Vite app
│   ├── src/
│   │   ├── App.jsx         # Root app, routing, auth state
│   │   ├── Login.jsx       # Login & sign-up page
│   │   ├── Seasons.jsx     # Season selection page
│   │   ├── Matches.jsx     # Matches & voting page
│   │   ├── Admin.jsx       # Admin panel (all admin features)
│   │   ├── VoteHistory.jsx # User vote history
│   │   ├── Standings.jsx   # User leaderboard
│   │   └── Profile.jsx     # User profile page
│   ├── functions/
│   │   ├── _middleware.js  # SPA routing fallback
│   │   └── api/[[path]].js # API proxy to Fly.io
│   ├── _redirects          # Cloudflare Pages API routing
│   └── vite.config.js
├── backend/                # Express.js API
│   ├── index.js            # All API routes
│   ├── db.js               # SQLite schema + initialization
│   ├── data.db             # SQLite database (local only)
│   ├── Dockerfile          # For Fly.io deployment
│   └── fly.toml            # Fly.io config
├── deploy-cf-simple.sh     # Deploy frontend to Cloudflare
├── deploy-backend.sh       # Deploy backend to Fly.io
├── restart-all.sh          # Start both servers locally
└── .github/
    └── copilot-instructions.md  # Copilot AI context
```

---

## 🚀 Local Development

### Prerequisites
- Node.js 18+
- npm

### Start Both Servers
```bash
./restart-all.sh
```
Or manually:
```bash
# Terminal 1 - Backend
cd backend && npm install && node index.js

# Terminal 2 - Frontend
cd frontend && npm install && npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:4000

---

## 📦 Deployment

### Deploy Frontend to Cloudflare Pages
```bash
./deploy-cf-simple.sh
```

### Deploy Backend to Fly.io
```bash
cd backend && flyctl deploy --remote-only
```
Or use the script:
```bash
./deploy-backend.sh
```

### Quick Deploy & Verify (Recommended)
Deploy frontend and automatically verify production:
```bash
./quick-deploy.sh
```

### Verify Production Only
Test production without deploying:
```bash
./verify-production.sh
```

---

## 🔍 Troubleshooting

### Production Issues

If features work locally but not in production:

1. **Hard refresh your browser** (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
2. **Try incognito/private mode** to bypass cache
3. **Wait 5-10 minutes** for Cloudflare CDN propagation
4. **Check JavaScript bundle hash** changed in browser DevTools → Network tab

### Common Issues

| Issue | Solution |
|-------|----------|
| Login returns 404/405 | `_redirects` file missing → re-run `./deploy-cf-simple.sh` |
| Old features still showing | Browser cache → hard refresh (Cmd+Shift+R) |
| Tables not sorted | CDN cache → wait 10 mins or try incognito mode |
| Blank page in production | Check browser console for errors, verify API is up |

### Detailed Troubleshooting Guide

See [PRODUCTION-TROUBLESHOOTING.md](./PRODUCTION-TROUBLESHOOTING.md) for comprehensive troubleshooting steps.

---

## 📊 Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/login` | Login |
| POST | `/api/signup` | Sign-up request |
| GET | `/api/seasons` | List seasons |
| GET | `/api/seasons/:id/matches` | Matches in a season |
| POST | `/api/votes` | Cast/update vote |
| GET | `/api/users/:id/votes` | User vote history |
| GET | `/api/standings` | Leaderboard |
| POST | `/api/admin/seasons` | Create season |
| POST | `/api/admin/matches` | Create match |
| PUT | `/api/admin/matches/:id` | Update match |
| POST | `/api/admin/matches/:id/winner` | Set winner |
| POST | `/api/admin/matches/:id/clear-winner` | Clear winner |
| POST | `/api/admin/upload-matches` | Bulk CSV upload |
| GET | `/api/admin/users` | List all users |
| POST | `/api/admin/users` | Create user |
| PUT | `/api/admin/users/:id` | Update user |
| DELETE | `/api/admin/users/:id` | Delete user |

---

## 🗃️ CSV Upload Format

```
Date,Venue,Team 1,Team 2,Time
01-Mar-2026,Delhi,India,Pakistan,2:30 PM
01-Mar-2026,Mumbai,Australia,England,6:30 PM
```

---

## 💡 Betting Logic

1. User selects a team + points (10/20/50) before match starts
2. Voting closes 30 mins before match start time
3. Admin sets the winner after the match
4. Points from losers are distributed proportionally to winners (1:1 ratio)
5. Unvoted users in assigned seasons are auto-assigned as losers with minimum points (10)
6. Admin accounts are excluded from all betting/standings
