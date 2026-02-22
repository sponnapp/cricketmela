# 🧪 QUICK TEST GUIDE - VOTING WINNER RESTRICTIONS

## ⚡ 5-Minute Test

### Test Setup
```bash
# Verify backend is running
curl http://localhost:4000/api/health

# Expected: {"status":"ok"}
```

### Test Step 1: Create Test Match
```bash
# Login as admin
curl -X POST http://localhost:4000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# Note the response: {"id":1,"username":"admin","role":"admin","balance":100}
```

### Test Step 2: Place a Vote (Before Winner)
```bash
# Vote as regular user
curl -X POST http://localhost:4000/api/matches/1/vote \
  -H "Content-Type: application/json" \
  -H "x-user: senthil" \
  -d '{"team":"India","points":50}'

# Expected: {"ok":true,"balance":450,"message":"Vote placed"}
```

### Test Step 3: Set Winner (As Admin)
```bash
# Set winner for the match
curl -X POST http://localhost:4000/api/admin/matches/1/winner \
  -H "Content-Type: application/json" \
  -H "x-user: admin" \
  -d '{"winner":"India"}'

# Expected: {"ok":true,"distributed":0}
```

### Test Step 4: Try to Vote Again (Should Fail!)
```bash
# Try to vote after winner is set
curl -X POST http://localhost:4000/api/matches/1/vote \
  -H "Content-Type: application/json" \
  -H "x-user: senthil" \
  -d '{"team":"Pakistan","points":100}'

# Expected: {"error":"Match winner has been set. Voting is now closed."}
```

**✅ If you got the error message, voting restrictions are WORKING!**

---

## 🎨 Frontend Visual Test

### Before Winner Set
```
Vote Column:
  ☑ India
  ☑ Pakistan

Points Column:
  [Dropdown: Select ▼]

Action Button:
  [Vote]
```

### After Winner Set
```
Vote Column:
  "Winner Declared" (red text)
  (no radio buttons)

Points Column:
  "-" (disabled)

Winner Column:
  "India" (green background)

Action Button:
  "Voting Closed" (grayed out)
```

---

## 📋 Complete Test Checklist

### Backend Tests
- [ ] `curl http://localhost:4000/api/health` returns `{"status":"ok"}`
- [ ] Login works: Returns user object with balance
- [ ] Vote placed: Returns balance update
- [ ] Set winner: Returns distributed points
- [ ] Vote after winner: Returns error message ✅ KEY TEST

### Frontend Tests
- [ ] Match table loads with all columns
- [ ] Winner column shows "TBD" before winner set
- [ ] Winner column shows team name (green) after winner set
- [ ] Vote column shows radio buttons before winner set
- [ ] Vote column shows "Winner Declared" (red) after winner set
- [ ] Points dropdown enabled before winner set
- [ ] Points dropdown disabled after winner set
- [ ] Action button shows "Vote" when no vote yet
- [ ] Action button shows "Update" after vote placed
- [ ] Action button shows "Voting Closed" after winner set
- [ ] Cannot click disabled radio buttons ❌
- [ ] Cannot click disabled dropdown ❌
- [ ] Cannot click disabled button ❌

### User Experience Tests
- [ ] Error message appears when trying to vote after winner set
- [ ] Balance doesn't change when voting is blocked
- [ ] Previous votes are preserved (not deleted)
- [ ] Existing vote points shown in odds before winner set

---

## 🔍 Manual Validation

### Step 1: Open Browser
```
http://localhost:5173
```

### Step 2: Login
```
Username: senthil
Password: password
```

### Step 3: Select Season with Matches
```
Click on any season with matches
```

### Step 4: Look for Match Without Winner
```
Find a row where Winner column shows "TBD"
```

### Step 5: Place a Vote
```
1. Click India radio button
2. Select 50 from Points dropdown
3. Click "Vote" button
4. See alert: "Vote placed! New balance: 450"
```

### Step 6: Open Admin Panel
```
(In new tab or different browser window)
http://localhost:5173 (login as admin)
OR use curl to set winner
```

### Step 7: Set Winner
```
1. Go to Admin Panel
2. Select same season
3. Find same match
4. Click "Set Winner"
5. Select "India"
6. Click "Confirm"
7. See: "Winner set successfully"
```

### Step 8: Back to Regular User
```
1. Go back to Matches page
2. Press F5 to refresh
3. Find the match you voted on
```

### Step 9: Verify Restrictions
```
✅ Winner column shows "India" (green)
✅ Vote column shows "Winner Declared" (red)
✅ Radio buttons are disabled
✅ Points dropdown is disabled
✅ Action button shows "Voting Closed" (grayed)
✅ Cannot click any controls
```

### Step 10: Try to Vote via API
```bash
curl -X POST http://localhost:4000/api/matches/1/vote \
  -H "Content-Type: application/json" \
  -H "x-user: senthil" \
  -d '{"team":"Pakistan","points":100}'

# Should get error:
# {"error":"Match winner has been set. Voting is now closed."}
```

---

## ✅ Success Criteria

**Feature is WORKING if:**

1. ✅ Can vote BEFORE winner set
2. ✅ Can change vote BEFORE winner set  
3. ✅ CANNOT vote AFTER winner set
4. ✅ CANNOT change vote AFTER winner set
5. ✅ Error message displayed
6. ✅ UI controls disabled
7. ✅ Winner shown in table
8. ✅ Existing votes preserved

---

## ⚠️ Troubleshooting

### Backend not responding
```bash
# Check if running
lsof -i :4000

# If not running, start it
cd /Users/senthilponnappan/IdeaProjects/Test/backend
npm start
```

### Frontend not showing winner column
```bash
# Clear browser cache and refresh
Cmd+Shift+R (Mac)
Ctrl+Shift+R (Windows)
```

### Still allowing votes after winner
```bash
# Backend might be using old code
# Restart backend:
# 1. Kill current process: Ctrl+C
# 2. Run: npm start
# 3. Refresh browser
```

### Voting not disabled on frontend
```bash
# Frontend might be using old code
# Hard refresh:
Cmd+Option+R (Mac)
Ctrl+F5 (Windows)

# Or clear cache in DevTools
```

---

## 📊 Test Report Template

Copy and fill this out:

```
TEST DATE: ___________
TESTER: ___________
RESULT: ✅ PASS / ❌ FAIL

Backend Tests:
- Health check: ✅ / ❌
- Vote before winner: ✅ / ❌
- Set winner: ✅ / ❌
- Vote after winner (should fail): ✅ / ❌

Frontend Tests:
- Winner column shows: ✅ / ❌
- Vote column disabled: ✅ / ❌
- Points dropdown disabled: ✅ / ❌
- Action button disabled: ✅ / ❌
- Error message shown: ✅ / ❌

Notes:
_________________________________
_________________________________
```

---

## 🎯 Expected Results

### ✅ CORRECT Behavior:
```
1. Place vote → Works ✅
2. Admin sets winner → Works ✅
3. Try to vote again → ERROR ✅
   "Match winner has been set. Voting is now closed."
4. UI disabled → All controls gray ✅
5. Winner shown → Green background ✅
```

### ❌ INCORRECT Behavior (Should NOT see):
```
1. Still able to vote after winner set ❌
2. Dropdown/buttons still clickable ❌
3. No error message ❌
4. Balance changed after voting blocked ❌
```

---

## 📝 Pass Criteria

✅ **Test PASSES if:**
- User cannot vote after admin sets winner
- Error message is shown
- All UI controls are disabled
- Winner is displayed in table
- Existing votes are preserved

---

## 🚀 Ready to Test!

**Backend:** ✅ Running (PID: 10403)
**Frontend:** ✅ Ready at localhost:5173
**Documentation:** ✅ Complete

**Start testing now!**

---

## 📞 Issues?

Check these files for more info:
- `VOTING_WINNER_RESTRICTIONS.md` - Detailed guide
- `VOTING_RESTRICTIONS_TEST_GUIDE.md` - Full test guide
- `IMPLEMENTATION_COMPLETE.md` - Technical details

