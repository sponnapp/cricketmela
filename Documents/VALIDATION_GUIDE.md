# IPL T20 Betting Application - Validation Guide

## Overview
This document provides complete instructions to validate all features implemented:
1. CSV bulk upload for admin match scheduling
2. Per-user vote history and balance display
3. Username/password login (replacing x-user header auth)
4. Application is running locally

---

## QUICK START - Run the Application

### Terminal 1: Start Backend
```bash
cd /Users/senthilponnappan/IdeaProjects/Test/backend
npm install  # if not already done
npm run migrate
npm start
# Expected output: Backend listening on http://localhost:4000
```

### Terminal 2: Start Frontend
```bash
cd /Users/senthilponnappan/IdeaProjects/Test/frontend
npm install  # if not already done
npm run dev
# Expected output: Local: http://localhost:5173
```

### Open Browser
Visit: **http://localhost:5173**

---

## VALIDATION CHECKLIST

### 1. USERNAME/PASSWORD LOGIN (NEW)

**Test Steps:**
1. Go to http://localhost:5173 (no login yet)
2. See login form with fields: username, password, and "Login" button
3. Enter credentials:
   - Username: `admin`
   - Password: `password`
4. Click Login
5. **Expected:** Redirected to "Seasons" page, header shows "Hello admin (balance: 1000)"

**Alternative:** Try with `senthil` user
- Username: `senthil`
- Password: `password`
- **Expected:** Header shows "Hello senthil (balance: 500)"

**Invalid Credentials Test:**
- Try username: `admin`, password: `wrong`
- **Expected:** Error message "Invalid credentials"

---

### 2. VOTE HISTORY & BALANCE DISPLAY (NEW)

**Test Steps:**
1. Login as `admin` or `senthil`
2. Click "Vote History" button in top navigation (visible after login)
3. **Expected:** View shows:
   - Current Balance prominently at top
   - Table with columns: Match, Your Vote, Points Voted, Winner, Result
   - Initially shows "No votes yet."

**After Voting Test:**
1. Go to Seasons → Select "IPL 2025" → View Matches
2. Choose 10 points and click "Vote Mumbai Indians"
3. Click "Vote History" again
4. **Expected:** 
   - Balance decreased (e.g., from 500 to 450 for senthil)
   - Table now shows your vote with status "⏳ Pending" (since winner TBD)

---

### 3. ADMIN CSV UPLOAD (NEW)

**Test Steps:**
1. Login as `admin`
2. Click "Admin" button in top navigation
3. Scroll to "Bulk upload CSV matches" section
4. **Expected:** See textarea with placeholder showing CSV format

**Test CSV Upload:**
Copy and paste this CSV data into the textarea:
```
home_team,away_team,scheduled_at
Delhi Capitals,Rajasthan Royals,2025-04-16T19:00:00Z
Sunrisers Hyderabad,Kolkata Knight Riders,2025-04-17T19:00:00Z
Punjab Kings,Lucknow Super Giants,2025-04-18T19:00:00Z
```

Click "Upload CSV"

**Expected:**
- Alert: "Uploaded 3 matches" (or the count you added)
- New matches appear in the "Matches" section below

**Verification in Matches Section:**
1. Select "IPL 2025" season from dropdown in Admin
2. **Expected:** List shows all matches including the newly uploaded ones

---

### 4. FULL VOTING & WINNER FLOW

**Step-by-Step Test:**

**4a. Setup: Add a new match (Admin)**
1. Login as `admin`
2. Click Admin
3. Under "Create match" section:
   - Season: IPL 2025
   - Home: "Test Team A"
   - Away: "Test Team B"
   - Scheduled: 2025-05-01T19:00:00Z
4. Click "Create Match"
5. Match appears in Matches list

**4b. Vote as User**
1. Logout (click Logout button)
2. Login as `senthil`
3. Click Seasons → IPL 2025 → View matches
4. Find "Test Team A vs Test Team B" match
5. Choose 50 points, click "Vote Test Team A"
6. **Expected:** Alert shows new balance (500 - 50 = 450)
7. Check "Vote History" - should show this vote as "⏳ Pending"

**4c. Set Winner & See Distribution**
1. Logout
2. Login as `admin`
3. Click Admin
4. Find "Test Team A vs Test Team B" in Matches
5. Click "Set Winner", enter: `Test Team A`
6. **Expected:** Match updates showing "Winner: Test Team A"

**4d. Check Winner Distribution**
1. Logout
2. Login as `senthil`
3. Click "Vote History"
4. Find your vote on "Test Team A" - should now show "✅ Won"
5. Balance should have INCREASED (senthil got stake back + share of losing votes)
6. **Expected:** Something like 450 + (50 + share) depending on other votes

---

## BACKEND API TESTS (via curl)

### Test Login Endpoint
```bash
curl -X POST http://localhost:4000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# Expected response:
# {"id":1,"username":"admin","role":"admin","balance":1000}
```

### Test Vote History Endpoint
```bash
# For admin (id=1)
curl http://localhost:4000/api/users/1/votes

# Expected: Array of votes with match details
# [{"id":1,"match_id":1,"team":"Mumbai Indians","points":50,"created_at":"...","home_team":"...","away_team":"...","winner":null}]
```

### Test CSV Upload
```bash
curl -X POST http://localhost:4000/api/admin/upload-matches \
  -H "Content-Type: application/json" \
  -H "x-user: admin" \
  -d '{
    "seasonId": 1,
    "csvData": "home_team,away_team,scheduled_at\nTeam X,Team Y,2025-05-01T19:00:00Z"
  }'

# Expected: {"ok":true,"inserted":1}
```

---

## USERS & CREDENTIALS

| Username | Password | Role | Initial Balance |
|----------|----------|------|-----------------|
| admin    | password | admin | 1000            |
| senthil  | password | picker | 500            |

---

## FEATURE SUMMARY

| Requirement | Status | How to Test |
|------------|--------|------------|
| 1. CSV Bulk Upload | ✅ Done | Admin → scroll to "Bulk upload CSV" section |
| 2. Vote History UI | ✅ Done | Login → click "Vote History" nav button |
| 3. Username/Password Login | ✅ Done | Visit http://localhost:5173 (login form shows) |
| 4. Application Running | ✅ Done | Backend: http://localhost:4000, Frontend: http://localhost:5173 |

---

## TROUBLESHOOTING

**Port 4000 already in use?**
```bash
pkill -9 node
cd /Users/senthilponnappan/IdeaProjects/Test/backend && npm start
```

**Port 5173 already in use?**
```bash
pkill -f vite
cd /Users/senthilponnappan/IdeaProjects/Test/frontend && npm run dev
```

**Login not working?**
- Ensure backend is running: `curl http://localhost:4000/api/health`
- Credentials are: username=`admin` or `senthil`, password=`password`

**Vote History shows "No votes yet"?**
- You haven't voted yet. Go to Seasons → matches → vote on a team

**CSV Upload not working?**
- Must be logged in as `admin`
- CSV must have header row: `home_team,away_team,scheduled_at`
- Each team name and date must be separated by commas

---

## NOTES

- All three requirements are fully functional
- Backend: http://localhost:4000
- Frontend: http://localhost:5173
- Database: SQLite (local file `/Users/senthilponnappan/IdeaProjects/Test/backend/data.db`)
- Demo password is simple ('password') - use bcrypt in production

