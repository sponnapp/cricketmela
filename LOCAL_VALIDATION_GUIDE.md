# ✅ Cricket Mela - Local Validation Guide

**Date**: February 23, 2026
**Status**: ✅ RUNNING LOCALLY

---

## 🚀 Application is Running

### Backend Server
- **URL**: `http://localhost:4000`
- **Status**: ✅ Running
- **Health Check**: `http://localhost:4000/api/health`
- **Port**: 4000

### Frontend Server
- **URL**: `http://localhost:5173`
- **Status**: ✅ Running
- **Port**: 5173

---

## 🔍 How to Validate

### 1. Open the Application
Open your browser and navigate to:
```
http://localhost:5173
```

### 2. Test Login
You should see the Cricket Mela login page with the logo.

**Test Users**:
- **Admin User**:
  - Username: `admin`
  - Password: `admin123`
  - Access: Full control (all admin panels)

- **Super User** (if created):
  - Username: `superuser1` or your superuser name
  - Access: Can set winners but no CSV upload

- **Regular User** (if created):
  - Username: `senthil` or your username
  - Access: Can vote on assigned seasons only

### 3. Test Key Features

#### For Admin Users:
1. **Login** as admin
2. Click **"Seasons"** button
3. Click **"Users"** button - Should show all users
4. Click **"Matches"** button - Should show match management
5. Test creating a season
6. Test uploading CSV matches
7. Test setting match winners
8. Test clearing votes

#### For Regular Users:
1. **Login** as regular user
2. Click on season icons to view matches
3. Test voting on matches
4. Check "Vote History" page
5. Check "Standings" page
6. Test "Profile" page

### 4. Test Sign Up
1. Click "Sign up now" link
2. Enter username and password
3. Verify admin receives approval request
4. Admin approves from Users panel

---

## 🧪 API Testing

You can test the backend API directly:

### Health Check
```bash
curl http://localhost:4000/api/health
```
Expected: `{"status":"ok"}`

### Get Seasons
```bash
curl http://localhost:4000/api/seasons
```

### Login Test
```bash
curl -X POST http://localhost:4000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

---

## 📝 What to Check

### Login Page
- [ ] Logo is displayed
- [ ] Title is "Cricket Mela"
- [ ] Username and password fields work
- [ ] "Sign up now" link works
- [ ] Login with correct credentials works
- [ ] Login fails with incorrect credentials

### Seasons Page (Regular User)
- [ ] Only assigned seasons are shown
- [ ] Season icons are displayed
- [ ] Clicking icon shows matches
- [ ] Can vote for matches (before 30 mins of start time)
- [ ] Radio buttons are disabled after voting closes
- [ ] Points selection works (10, 20, 50)
- [ ] Odds update based on all votes

### Matches & Voting Page
- [ ] Matches are sorted by date/time
- [ ] Previous votes are shown
- [ ] Can change vote before deadline
- [ ] Vote button shows "Update" for existing votes
- [ ] Cannot vote after voting closes (30 mins before match)
- [ ] Cannot vote after match starts

### Vote History Page
- [ ] Shows all user votes
- [ ] Shows match details
- [ ] Shows points bet
- [ ] Shows team voted for
- [ ] Shows payout (if match completed)
- [ ] Shows net gain/loss

### Standings Page
- [ ] Shows all users (except admin)
- [ ] Shows current balance
- [ ] Display names are shown
- [ ] Sorted by balance

### Profile Page
- [ ] Can change display name
- [ ] Can change password (with current password)
- [ ] Cannot use same old password as new
- [ ] Username is read-only

### Admin Panel - Seasons
- [ ] Can create new season
- [ ] Can edit season name
- [ ] Can delete season (if no matches)
- [ ] Shows match count per season

### Admin Panel - Users
- [ ] Shows all users
- [ ] Can edit user details
- [ ] Can assign seasons to users
- [ ] Can reset user password
- [ ] Can create new user
- [ ] Can delete user
- [ ] Can view user transactions

### Admin Panel - Matches
- [ ] Can select season
- [ ] Can upload CSV matches
- [ ] Can edit match details
- [ ] Can set winner
- [ ] Can clear match votes
- [ ] Can delete match
- [ ] Matches sorted by date/time

### Super User Access
- [ ] Can see Matches panel
- [ ] Can set winners
- [ ] Cannot see "Bulk Upload CSV"
- [ ] Cannot clear votes
- [ ] Cannot delete matches

---

## 🔧 Troubleshooting

### If Backend is Not Running
```bash
cd /Users/senthilponnappan/IdeaProjects/Test/backend
PORT=4000 node index.js
```

### If Frontend is Not Running
```bash
cd /Users/senthilponnappan/IdeaProjects/Test/frontend
npm run dev
```

### Check Running Processes
```bash
lsof -i :4000  # Check backend port
lsof -i :5173  # Check frontend port
```

### Stop Servers
Press `Ctrl+C` in the terminal where the server is running

### Rebuild Frontend
```bash
cd /Users/senthilponnappan/IdeaProjects/Test/frontend
npm run build
```

---

## 📊 Current State

### Reverted To
- Commit: `a645685` (stable version from yesterday)
- All features working as before
- No issues from today's changes

### Features Available
✅ User authentication with username/password
✅ Case-insensitive login
✅ Sign up with admin approval
✅ Season management
✅ Match management
✅ CSV bulk upload
✅ Voting system with time limits
✅ Odds calculation
✅ Winner selection and payout distribution
✅ Vote history tracking
✅ User standings
✅ Profile management
✅ Admin panel with full control
✅ Super user role with limited admin access
✅ User transaction viewing
✅ Auto-loss for non-voters (at winner selection)

---

## ✨ Known Working Features

1. **Voting closes 30 mins before match start time**
2. **Users can change votes before deadline**
3. **Auto-loss applied to non-voters when admin sets winner**
4. **Points can go negative**
5. **Odds update in real-time**
6. **Admin excluded from voting and standings**
7. **Display names used throughout UI**
8. **Season assignment per user**
9. **Password reset with current password verification**

---

## 🎯 Next Steps After Validation

Once you've validated everything works:

1. **If all good**: You can continue using or deploy
2. **If issues found**: Report specific issues to fix
3. **New features**: Request new features to add

---

**Status**: ✅ READY FOR VALIDATION
**Backend**: http://localhost:4000
**Frontend**: http://localhost:5173

Open your browser and start testing!

