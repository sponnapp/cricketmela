# IPL T20 Betting - Quick Reference

## 🚀 START HERE

### Step 1: Open 2 Terminal Windows

**Terminal 1 - Backend:**
```bash
cd /Users/senthilponnappan/IdeaProjects/Test/backend
npm start
```
Wait for: `Backend listening on http://localhost:4000`

**Terminal 2 - Frontend:**
```bash
cd /Users/senthilponnappan/IdeaProjects/Test/frontend
npm run dev
```
Wait for: `Local: http://localhost:5173`

### Step 2: Open Browser
Visit: **http://localhost:5173**

---

## 🔐 LOGIN CREDENTIALS

| Username | Password  |
|----------|-----------|
| admin    | password  |
| senthil  | password  |

---

## ✨ NEW FEATURES (What You Asked For)

### 1️⃣ CSV BULK UPLOAD ✅
1. Login as **admin**
2. Click **Admin** button
3. Scroll to "Bulk upload CSV matches"
4. Paste CSV:
```
home_team,away_team,scheduled_at
Team A,Team B,2025-05-01T19:00:00Z
Team C,Team D,2025-05-02T19:00:00Z
```
5. Click **Upload CSV**
6. See: "Uploaded 2 matches" alert

### 2️⃣ VOTE HISTORY ✅
1. Login as **admin** or **senthil**
2. Click **Vote History** button (top nav)
3. See:
   - Current balance
   - Table of all your votes
   - Win/loss status for each vote

### 3️⃣ USERNAME/PASSWORD LOGIN ✅
1. Go to http://localhost:5173
2. See login form (no longer uses x-user header)
3. Enter username & password
4. Click Login
5. Redirected to Seasons page

### 4️⃣ APPLICATION RUNNING ✅
- Backend: http://localhost:4000/api/health ✓
- Frontend: http://localhost:5173 ✓

---

## 📋 QUICK TEST SCENARIO

**5 minutes to validate everything:**

1. **Start apps** (both terminals) ⏱️ 1 min

2. **Test Login as Admin** ⏱️ 30 sec
   - Username: admin
   - Password: password
   - See: "Hello admin (balance: 1000)"

3. **Test CSV Upload** ⏱️ 1 min
   - Click Admin
   - Paste sample CSV
   - Click Upload
   - See success message

4. **Test Vote as User** ⏱️ 1 min
   - Logout & login as senthil
   - Go to Seasons → IPL 2025
   - Vote 50 points on "Mumbai Indians"
   - Balance: 500 → 450

5. **Test Vote History** ⏱️ 1 min
   - Click Vote History
   - See your vote in table
   - Status: "⏳ Pending"

6. **Test Winner Distribution** ⏱️ 1 min
   - Login as admin
   - Click Admin → Find match
   - Click "Set Winner" → "Mumbai Indians"
   - Login as senthil
   - Vote History shows "✅ Won"
   - Balance increased!

---

## 🔧 TROUBLESHOOTING

**Backend won't start (port 4000 in use)?**
```bash
pkill -9 node
cd /Users/senthilponnappan/IdeaProjects/Test/backend && npm start
```

**Frontend won't start (port 5173 in use)?**
```bash
pkill -f vite
cd /Users/senthilponnappan/IdeaProjects/Test/frontend && npm run dev
```

**Login failing?**
- Ensure backend is running: `curl http://localhost:4000/api/health`
- Correct credentials: `admin` / `password` or `senthil` / `password`

**CSV upload not showing?**
- Must be logged in as `admin`
- CSV format must be: `home_team,away_team,scheduled_at`
- Each row separated by newline

---

## 📚 DOCUMENTATION

- **Full Guide:** `VALIDATION_GUIDE.md` (detailed testing steps)
- **Implementation Details:** `IMPLEMENTATION_SUMMARY.md` (technical overview)
- **This File:** Quick reference for fast validation

---

## ✅ FEATURES CHECKLIST

- [x] CSV Bulk Upload for Admin Match Scheduling
- [x] Per-User Vote History & Balance Display  
- [x] Username/Password Login (No x-user Header)
- [x] Application Running Locally

---

## 📞 SUPPORT

All code is in `/Users/senthilponnappan/IdeaProjects/Test/`

**Backend:** `/backend/index.js` (lines 228-296 for new endpoints)
**Frontend:** `/frontend/src/VoteHistory.jsx` (new), Admin/Matches/Login.jsx (updated)

Everything is ready to test! 🎉

