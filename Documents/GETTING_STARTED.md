# 🚀 Getting Started - IPL T20 Betting App

## 5-Minute Quick Start

### What You Have
✅ Full IPL T20 Betting application with:
- Username/password login (no more x-user headers)
- CSV bulk upload for match schedules
- Vote history showing wins/losses and current balance
- Admin and user roles
- Local SQLite database
- React frontend + Express backend

---

## Start the Application

### Open Terminal 1: Backend
```bash
cd /Users/senthilponnappan/IdeaProjects/Test/backend
npm start
```

**You should see:**
```
> ipl-betting-backend@0.1.0 start
> node index.js

Backend listening on http://localhost:4000
```

✅ Keep this terminal open

---

### Open Terminal 2: Frontend
```bash
cd /Users/senthilponnappan/IdeaProjects/Test/frontend
npm run dev
```

**You should see:**
```
  VITE v4.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

✅ Keep this terminal open

---

### Open Your Browser
Visit: **http://localhost:5173**

You'll see the login page:
```
┌─────────────────────────────┐
│    IPL T20 Betting          │
│                             │
│   [Username input field]    │
│   [Password input field]    │
│   [Login button]            │
└─────────────────────────────┘
```

---

## Login with Demo Credentials

**Option 1: Admin User**
```
Username: admin
Password: password
```
→ Click Login → See balance: 1000 points

**Option 2: Regular User**
```
Username: senthil
Password: password
```
→ Click Login → See balance: 500 points

---

## What Can You Do?

### If Logged in as `admin`:
1. **Admin Button** (top nav) → Create seasons and matches
2. **CSV Upload** → Paste match list:
   ```
   home_team,away_team,scheduled_at
   Delhi,Rajasthan,2025-05-01T19:00:00Z
   ```
3. **Set Winners** → Choose match winner (triggers point distribution)
4. **Vote History** → See your voting record
5. **Logout** → Click logout button

### If Logged in as `senthil`:
1. **Seasons** → Browse cricket seasons
2. **View Matches** → See all matches in season
3. **Vote** → Click vote button (10, 20, or 50 points)
4. **Vote History** → See all your votes and balance
5. **Logout** → Click logout button

---

## Testing Checklist

Use this to verify everything works:

### ✅ Test 1: Login (30 seconds)
- [ ] Visit http://localhost:5173
- [ ] See login form
- [ ] Enter: admin / password
- [ ] See "Hello admin (balance: 1000)" in header

### ✅ Test 2: CSV Upload (1 minute)
- [ ] Logged in as admin
- [ ] Click "Admin" button
- [ ] Scroll to "Bulk upload CSV matches"
- [ ] Paste this CSV:
  ```
  home_team,away_team,scheduled_at
  Test Team A,Test Team B,2025-05-15T19:00:00Z
  ```
- [ ] Click "Upload CSV"
- [ ] See alert: "Uploaded 1 matches"

### ✅ Test 3: Vote (1 minute)
- [ ] Logout
- [ ] Login as: senthil / password
- [ ] Click "Seasons" → "IPL 2025" → "View matches"
- [ ] Find a match
- [ ] Select 50 points
- [ ] Click "Vote [Team Name]"
- [ ] See alert: "Vote placed! New balance: 450"

### ✅ Test 4: Vote History (1 minute)
- [ ] Logged in as senthil
- [ ] Click "Vote History" button (top nav)
- [ ] See table showing:
  - Your match
  - Your vote (team name)
  - Points spent (50)
  - Winner (TBD or team name)
  - Status (⏳ Pending or ✅ Won or ❌ Lost)
- [ ] Current balance shown: 450

### ✅ Test 5: Winner Distribution (1 minute)
- [ ] Logout → Login as admin
- [ ] Click "Admin"
- [ ] Find match you voted on
- [ ] Click "Set Winner"
- [ ] Enter the team name
- [ ] Match updates with winner
- [ ] Logout → Login as senthil
- [ ] Click "Vote History"
- [ ] Vote shows "✅ Won"
- [ ] Balance increased!

---

## Key Credentials Reference

```
┌──────────┬──────────┬─────────┬──────────────────┐
│ Username │ Password │ Role    │ Initial Balance  │
├──────────┼──────────┼─────────┼──────────────────┤
│ admin    │ password │ admin   │ 1000 points      │
│ senthil  │ password │ picker  │ 500 points       │
└──────────┴──────────┴─────────┴──────────────────┘
```

---

## Troubleshooting

### Problem: Backend won't start
**Error:** `EADDRINUSE: address already in use :::4000`

**Solution:** Port 4000 is in use, kill the process:
```bash
pkill -9 node
cd /Users/senthilponnappan/IdeaProjects/Test/backend
npm start
```

---

### Problem: Frontend won't start
**Error:** `Port 5173 is in use`

**Solution:** Port 5173 is in use, kill the process:
```bash
pkill -f vite
cd /Users/senthilponnappan/IdeaProjects/Test/frontend
npm run dev
```

---

### Problem: Login not working
**Error:** "Invalid credentials" or "Login failed"

**Solution:** 
1. Check backend is running: `curl http://localhost:4000/api/health`
2. Use correct credentials: `admin`/`password` or `senthil`/`password`
3. Check browser console for errors (F12)

---

### Problem: CSV Upload not appearing
**Error:** Upload button doesn't show or doesn't work

**Solution:**
1. Must be logged in as `admin` (not senthil)
2. CSV must have header row: `home_team,away_team,scheduled_at`
3. Each line must be: `Team A,Team B,2025-05-01T19:00:00Z`
4. Click correct button: "Upload CSV" (not "Create Match")

---

## File Locations

| What | Location |
|------|----------|
| Backend code | `/Users/senthilponnappan/IdeaProjects/Test/backend/` |
| Frontend code | `/Users/senthilponnappan/IdeaProjects/Test/frontend/` |
| Database | `/Users/senthilponnappan/IdeaProjects/Test/backend/data.db` |
| Documentation | `/Users/senthilponnappan/IdeaProjects/Test/*.md` |

---

## Backend Endpoints (For Reference)

### Public
- `GET /api/health` - Health check
- `POST /api/login` - Login with username/password

### User (after login)
- `GET /api/users/:id/votes` - Get your vote history
- `POST /api/matches/:id/vote` - Place a vote
- `GET /api/seasons` - List seasons
- `GET /api/seasons/:id/matches` - List matches

### Admin Only
- `POST /api/admin/seasons` - Create season
- `POST /api/admin/matches` - Create match
- `POST /api/admin/upload-matches` - Bulk upload CSV
- `POST /api/admin/matches/:id/winner` - Set winner & distribute points

---

## Documentation Files

- **QUICK_REFERENCE.md** ← Start here (2-minute overview)
- **VALIDATION_GUIDE.md** ← Detailed testing steps
- **IMPLEMENTATION_SUMMARY.md** ← Technical details
- **ARCHITECTURE.md** ← System design & diagrams
- **This file** ← Getting started guide

---

## FAQ

**Q: Why am I getting "Backend listening on http://localhost:4000" but can't access it?**
A: The message prints correctly, but wait 2-3 seconds for the server to fully start. Then try again.

**Q: Where's my vote data stored?**
A: In SQLite database at `/Users/senthilponnappan/IdeaProjects/Test/backend/data.db`

**Q: Can I change the password?**
A: Currently hardcoded to "password" for demo. In production, use bcrypt for hashing.

**Q: What happens when a winner is set?**
A: 
1. Admin sets winner
2. System calculates points from losing votes
3. Winners get their stake back + share of loser points
4. User balances updated in database
5. Vote history shows "✅ Won"

**Q: Can multiple users vote on same match?**
A: Yes! Each user can vote independently.

**Q: What if I accidentally log out?**
A: Just log back in with same credentials. Your votes and balance are saved.

---

## Next Steps

1. ✅ Start backend (Terminal 1)
2. ✅ Start frontend (Terminal 2)
3. ✅ Open http://localhost:5173
4. ✅ Run the testing checklist above
5. ✅ Read VALIDATION_GUIDE.md for complete feature testing

**You're all set! 🎉**

Questions? Check the QUICK_REFERENCE.md or VALIDATION_GUIDE.md

