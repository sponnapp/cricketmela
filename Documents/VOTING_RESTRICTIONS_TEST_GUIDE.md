# ✅ VOTING RESTRICTIONS TESTING GUIDE

## Overview
This guide explains how to test the new voting restriction feature where users cannot vote or edit votes after an admin sets the match winner.

---

## How to Validate

### Automatic Testing:

The backend has been updated with the new check. The implementation is complete and ready to test.

### Manual Testing Steps:

#### Step 1: Login to Application
```
1. Go to http://localhost:5173 (or your frontend port)
2. Login with any user (e.g., "senthil" password: "password")
3. You should see Seasons page
```

#### Step 2: Select a Season with Matches
```
1. Click on a season
2. You should see the Matches & Voting table
3. Look for matches that DON'T have a winner set yet (Winner column shows "TBD")
```

#### Step 3: Test Normal Voting (Before Winner Set)
```
For a match WITHOUT a winner:
1. Select a team using the radio button
2. Select points from dropdown (10, 20, or 50)
3. Click "Vote" button
4. You should see: "Vote placed! New balance: [amount]"
5. Verify your balance decreased
6. Verify odds updated for that team
```

#### Step 4: Test Vote Update (Before Winner Set)
```
For the SAME match where you already voted:
1. Change your team selection to the other team
2. Change points if you want
3. Click "Update" button
4. You should see: "Vote updated! New balance: [amount]"
5. Verify:
   - Previous team odds removed (should be 0)
   - New team odds added (should show your new points)
   - Balance updated correctly
```

#### Step 5: Admin Sets Winner
```
1. Login as admin (or open admin panel in another tab)
2. Go to Admin Panel → Manage Matches
3. Select the season with your test match
4. Click "Set Winner" on the match you voted for
5. Select the winning team (any team)
6. Click "Confirm"
7. You should see: "Winner set successfully"
```

#### Step 6: TEST VOTING RESTRICTION (After Winner Set)
```
1. Go back to regular user view (Matches & Voting page)
2. Refresh the page
3. Look for the match where winner was just set
4. Observe:
   ✅ Winner column now shows the team name in green (not "TBD")
   ✅ Vote column shows "Winner Declared" in red
   ✅ Radio buttons are DISABLED (cannot click)
   ✅ Points dropdown is DISABLED
   ✅ Action button shows "Voting Closed" (grayed out)

5. Try to click on a radio button → Should NOT work
6. Try to click the dropdown → Should NOT work
7. Try to click "Vote" button → Should NOT work (button is disabled)

8. Try to vote via the API:
   curl -X POST http://localhost:4000/api/matches/{matchId}/vote \
     -H "Content-Type: application/json" \
     -H "x-user: senthil" \
     -d '{"team":"India","points":50}'

   You should get error:
   {
     "error": "Match winner has been set. Voting is now closed."
   }
```

#### Step 7: Verify You Can't Update Existing Vote Either
```
1. If you had a vote on that match before the winner was set
2. Try to change it:
   curl -X POST http://localhost:4000/api/matches/{matchId}/vote \
     -H "Content-Type: application/json" \
     -H "x-user: senthil" \
     -d '{"team":"Australia","points":20}'

3. Same error should appear:
   {
     "error": "Match winner has been set. Voting is now closed."
   }
```

---

## What Should Work (✓) and What Shouldn't (✗)

### User Actions:

| Action | Before Winner Set | After Winner Set |
|--------|------------------|------------------|
| View matches | ✓ Works | ✓ Works |
| Place new vote | ✓ Works | ✗ Blocked |
| Update existing vote | ✓ Works | ✗ Blocked |
| Change points | ✓ Works | ✗ Blocked |
| See odds | ✓ Shows | ✓ Shows |
| See winner | Shows TBD | Shows Team ✓ |

### Admin Actions:

| Action | Works |
|--------|-------|
| Set winner | ✓ Always works |
| Edit match | ✓ Always works |
| Distribute points | ✓ Always works |
| Create matches | ✓ Always works |

---

## Test Results Checklist

### Test 1: Voting Works Before Winner
- [ ] Can select team
- [ ] Can select points
- [ ] Vote button works
- [ ] Balance updates
- [ ] Odds update
- [ ] Can update vote later

### Test 2: Voting Blocked After Winner
- [ ] Vote column shows "Winner Declared"
- [ ] Radio buttons disabled
- [ ] Points dropdown disabled
- [ ] Action button disabled
- [ ] Winner column shows team
- [ ] API returns error when trying to vote

### Test 3: Error Message Correct
- [ ] Error message: "Match winner has been set. Voting is now closed."
- [ ] Alert shown to user on attempt to vote
- [ ] No partial vote is recorded

### Test 4: Match Started Still Works
- [ ] Voting blocked when match time passed (even without winner)
- [ ] Shows "Match Started" not "Winner Declared"
- [ ] Both restrictions work together properly

### Test 5: Multiple Users
- [ ] Block works for all users
- [ ] Existing votes remain (not deleted)
- [ ] Admin can still distribute points to vote holders

---

## API Test Commands

### Test: Normal Vote (Should Work Before Winner)
```bash
curl -X POST http://localhost:4000/api/matches/1/vote \
  -H "Content-Type: application/json" \
  -H "x-user: senthil" \
  -d '{"team":"India","points":50}'
```

**Expected Response:**
```json
{
  "ok": true,
  "balance": 450,
  "message": "Vote placed"
}
```

### Test: Vote After Winner (Should Fail)
```bash
curl -X POST http://localhost:4000/api/matches/1/vote \
  -H "Content-Type: application/json" \
  -H "x-user: senthil" \
  -d '{"team":"Pakistan","points":20}'
```

**Expected Response:**
```json
{
  "error": "Match winner has been set. Voting is now closed."
}
```

### Test: Set Winner as Admin
```bash
curl -X POST http://localhost:4000/api/admin/matches/1/winner \
  -H "Content-Type: application/json" \
  -H "x-user: admin" \
  -d '{"winner":"India"}'
```

**Expected Response:**
```json
{
  "ok": true,
  "distributed": 50
}
```

### Test: Get Match Details
```bash
curl http://localhost:4000/api/seasons/1/matches
```

**Expected Response (shows winner field):**
```json
[
  {
    "id": 1,
    "home_team": "India",
    "away_team": "Pakistan",
    "winner": "India",
    "scheduled_at": "2025-02-07T14:30",
    "vote_totals": {
      "India": 50,
      "Pakistan": 0
    }
  }
]
```

---

## Success Criteria

✅ All tests pass → Feature is WORKING
✅ Users cannot vote after winner is set
✅ Error message is clear and helpful
✅ Frontend shows correct disabled states
✅ Existing votes are preserved
✅ Admin can still set winners and distribute points

---

## Troubleshooting

### Issue: Voting still allowed after winner set

**Check:**
1. Did you refresh the frontend page?
2. Is the backend running with latest code?
3. Did admin actually set the winner?

**Fix:**
```bash
# Kill old backend
killall -9 node

# Restart with fresh code
cd /Users/senthilponnappan/IdeaProjects/Test/backend
npm start
```

### Issue: Button not disabled on frontend

**Check:**
1. Did you refresh the browser (F5 or Cmd+R)?
2. Are you logged in as the right user?

**Fix:**
1. Clear browser cache
2. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
3. Log out and log back in

### Issue: Frontend shows no Winner column

**Check:**
1. Did you update Matches.jsx?
2. Did you refresh the page?

**Fix:**
1. Check that Matches.jsx has the Winner header
2. Clear browser cache and refresh

---

## Quick Summary

**Before Fix:**
- Users could vote even after admin set winner ❌

**After Fix:**
- Users CANNOT vote after admin set winner ✅
- Clear error message shown ✅
- Frontend disables all voting controls ✅
- Existing votes preserved ✅
- Admin functions unaffected ✅

---

## Next Steps

1. **Test the feature** using steps above
2. **Report any issues** you find
3. **Celebrate!** 🎉 Feature is complete

---

**Implementation Status:** ✅ COMPLETE
**Testing Status:** Ready for manual testing
**Backend:** Updated with winner check
**Frontend:** Updated with UI restrictions


