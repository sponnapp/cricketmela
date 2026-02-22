# 🎨 ADMIN PANEL - VISUAL GUIDE & NAVIGATION

**Status:** ✅ COMPLETE
**Date:** February 20, 2026

---

## 🎯 Admin Panel Overview

The Admin Panel now has **three main tabs** for organized management:

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                    ⚙️  ADMIN PANEL                    ┃
┃                                                        ┃
┃           🏆 Season  │  👥 Users  │  🎮 Matches       ┃
┃                                                        ┃
┃  (Content changes based on selected tab)              ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## TAB 1: 🏆 SEASON TAB

### When to use:
Create new cricket seasons

### What you see:
```
┌─────────────────────────────────────┐
│  🏆 SEASON TAB (ACTIVE)              │
├─────────────────────────────────────┤
│                                     │
│  Create Season                      │
│  ┌─────────────────────────────┐   │
│  │ Season name:                │   │
│  │ [________________] [Create] │   │
│  └─────────────────────────────┘   │
│                                     │
│  Example: "IPL 2025", "IPL 2026"   │
│                                     │
└─────────────────────────────────────┘
```

### How to use:
1. Click 🏆 Season button (if not already there)
2. Type season name in input field
3. Click "Create" button
4. Season is created and added to system

### Example:
```
Input: IPL 2025
Click: Create
Result: Season "IPL 2025" now available
```

---

## TAB 2: 👥 USERS TAB

### When to use:
Create new users and edit existing users

### What you see:
```
┌────────────────────────────────────────────┐
│  👥 USERS TAB (ACTIVE)                     │
├────────────────────────────────────────────┤
│                                            │
│  Create New User                           │
│  ┌──────────────────────────────────────┐ │
│  │ Username  │  Password  │  Role │ Bal │ │
│  │ [______]  │  [_____]   │[Admin] [500]│ │
│  │           │            │   [Create]   │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  All Users                                 │
│  ┌──────────────────────────────────────┐ │
│  │ Username │ Role  │ Balance │ Action   │ │
│  ├──────────────────────────────────────┤ │
│  │ admin    │ Admin │ 1000    │ [Edit]  │ │
│  │ senthil  │ User  │ 500     │ [Edit]  │ │
│  │ john     │ User  │ 750     │ [Edit]  │ │
│  └──────────────────────────────────────┘ │
│                                            │
└────────────────────────────────────────────┘
```

### How to use:

**Create New User:**
1. Click 👥 Users button (if not already there)
2. Enter username (e.g., "senthil")
3. Enter password
4. Select role (Picker or Admin)
5. Enter starting balance
6. Click "Create User"

**Edit Existing User:**
1. Scroll to "All Users" table
2. Find the user you want to edit
3. Click "Edit" button for that user
4. Edit modal opens:
   ```
   ┌─────────────────────────┐
   │  Edit User              │
   ├─────────────────────────┤
   │ Username: senthil (gray) │
   │ Role: [Picker ▼]        │
   │ Balance: [500_______]   │
   │         [Cancel] [Save] │
   └─────────────────────────┘
   ```
5. Change role or balance as needed
6. Click "Save"
7. Changes applied

### Example:

**Creating User:**
```
Username: senthil
Password: mypassword
Role: Picker
Balance: 500
Click: Create User
Result: senthil account created with 500 points
```

**Editing User:**
```
Find: senthil in Users table
Click: Edit
Change Balance: 500 → 750
Click: Save
Result: senthil now has 750 points
```

---

## TAB 3: 🎮 MATCHES TAB

### When to use:
Upload, manage, and edit cricket matches

### What you see:
```
┌────────────────────────────────────────────┐
│  🎮 MATCHES TAB (ACTIVE)                   │
├────────────────────────────────────────────┤
│                                            │
│  Bulk Upload CSV Matches                   │
│  ┌──────────────────────────────────────┐ │
│  │ Format: Date,Venue,Team1,Team2,Time  │ │
│  │                                      │ │
│  │ [Paste CSV Data Here]                │ │
│  │ [                                  ] │ │
│  │ [                                  ] │ │
│  │           [Upload CSV]               │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  Manage Matches                            │
│  ┌──────────────────────────────────────┐ │
│  │ Season: [Select...▼] [Clear Matches]│ │
│  │                                      │ │
│  │ Match│Venue│Date │Winner│ Actions  │ │
│  ├──────────────────────────────────────┤ │
│  │ India vs   │ Delhi│ 3PM │ TBD │[Actions]│
│  │ Pakistan   │      │     │     │         │ │
│  ├──────────────────────────────────────┤ │
│  │ Australia  │Mumbai│ 8PM │ TBD │[Actions]│ │
│  │ vs NZ      │      │     │     │         │ │
│  └──────────────────────────────────────┘ │
│                                            │
└────────────────────────────────────────────┘
```

### How to use:

**Upload Matches:**
1. Click 🎮 Matches button (if not already there)
2. In "Bulk Upload CSV Matches" section, paste CSV data
3. Format: `Date,Venue,Team 1,Team 2,Time`
4. Click "Upload CSV"
5. Matches appear in table

**Manage Matches:**
1. Select season from dropdown
2. View matches in table
3. Use Action buttons:
   - **Edit:** Change match details
   - **Set Winner:** Declare match winner
   - **Clear Votes:** Clear all votes and refund users

### Example:

**CSV Upload:**
```
Data to paste:
Date,Venue,Team 1,Team 2,Time
2025-02-07,Delhi,India,Pakistan,14:00
2025-02-08,Mumbai,Australia,NZ,19:30

Click: Upload CSV
Result: 2 matches added to system
```

**Set Winner:**
```
Find: India vs Pakistan match
Click: Set Winner
Choose: India
Click: Confirm
Result: Winner declared, voting closed
```

**Clear Votes:**
```
Find: India vs Pakistan match
Click: Clear Votes
Confirm: Are you sure?
Result: All votes deleted, users refunded
```

---

## 🎨 Tab Navigation

### Visual Feedback

**ACTIVE TAB** (Currently viewing)
- Color: Pink (#E91E8C)
- Example: 👥 Users (when Users tab selected)

**INACTIVE TABS** (Not viewing)
- Color: Gray (#666)
- Example: 🏆 Season and 🎮 Matches (when Users tab selected)

### Switching Tabs

```
Current Tab: 🏆 Season (Pink)
           👥 Users (Gray)
           🎮 Matches (Gray)

Click on 👥 Users:
↓
Current Tab: 🏆 Season (Gray)
           👥 Users (Pink) ← Now active
           🎮 Matches (Gray)

Content changes to show Users sections
```

---

## 📋 Quick Reference

### Season Tab
- **Input:** Season name
- **Action:** Create season
- **Result:** New season added

### Users Tab
- **Section 1 (Create):** 
  - Input: Username, Password, Role, Balance
  - Action: Click Create User
  - Result: New user account created
  
- **Section 2 (All Users):**
  - Shows: All users in table
  - Action: Click Edit
  - Result: Can change role and balance

### Matches Tab
- **Section 1 (Upload):**
  - Input: CSV data
  - Action: Click Upload CSV
  - Result: Matches added
  
- **Section 2 (Manage):**
  - Shows: All matches in table
  - Actions: Edit, Set Winner, Clear Votes
  - Results: Match details/winner/votes updated

---

## 🚀 Common Workflows

### Workflow 1: Create New Betting Round
```
1. Click 🏆 Season
2. Create season "IPL 2025"
3. Click 🎮 Matches
4. Upload CSV with match schedule
5. Done! Users can now see and vote on matches
```

### Workflow 2: Add New User
```
1. Click 👥 Users
2. Create user "john" with 500 points
3. Done! john can now login and vote
```

### Workflow 3: Manage Voting
```
1. Click 🎮 Matches
2. Select season
3. For each match:
   - Click Set Winner (when match ends)
   - Click Clear Votes (if issues occur)
4. Done! Match results recorded
```

### Workflow 4: Adjust User Balance
```
1. Click 👥 Users
2. Find user in table
3. Click Edit
4. Change balance
5. Click Save
6. Done! Balance updated
```

---

## 💡 Tips & Tricks

1. **Tab switching is instant** - Click button to see content immediately
2. **Edit users anytime** - Even during active betting
3. **Clear votes if needed** - Refunds users automatically
4. **Set winner closes voting** - Users can't vote after winner set
5. **All changes saved** - No confirmation needed

---

## ✅ Verification Checklist

- [ ] Click 🏆 Season → Create Season shown
- [ ] Click 👥 Users → Create User and All Users shown
- [ ] Click 🎮 Matches → Upload CSV and Manage shown
- [ ] Tab colors change (Pink when active, Gray when inactive)
- [ ] Can create season
- [ ] Can create user
- [ ] Can edit user (role, balance)
- [ ] Can upload CSV
- [ ] Can set winner
- [ ] Can clear votes

---

**Status:** ✅ COMPLETE
**Ready for:** Immediate use
**Date:** February 20, 2026

🎉 **Admin Panel is organized, visual, and ready to use!**

