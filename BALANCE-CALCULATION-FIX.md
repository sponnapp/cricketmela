# Balance Calculation Fix - Summary

## Problem
User "senthil" had access to only 1 season with 1000 points, but the "Overall" balance was showing 2320 points. The overall calculation was incorrectly summing balances from deleted/unassigned seasons.

## Root Cause
When a season was deleted, the corresponding records in the `user_seasons` table were NOT being cleaned up. The overall balance calculation was summing ALL records in `user_seasons` for a user, including those for deleted seasons.

### Orphaned Records Found
```
User: senthil
- Season ID 1 (deleted): 320 pts
- Season ID 2 (deleted): 1000 pts
- Total orphaned: 1320 pts

Current season balance: 1000 pts
Incorrect overall shown: 2320 pts (1000 + 1320)
Correct overall should be: 1000 pts
```

## Changes Made

### 1. Backend API Fixes (`backend/index.js`)

#### A. Fixed Overall Balance Endpoint (Line ~537)
**Before:**
```sql
SELECT SUM(balance) FROM user_seasons WHERE user_id = ?
```

**After:**
```sql
SELECT SUM(us.balance) 
FROM user_seasons us 
JOIN seasons s ON s.id = us.season_id 
WHERE us.user_id = ?
```
Now only sums balances for seasons that still exist.

#### B. Fixed Overall Standings Endpoint (Line ~1625)
**Before:**
```sql
SELECT SUM(us.balance) FROM user_seasons us WHERE us.user_id = u.id
```

**After:**
```sql
SELECT SUM(us.balance) 
FROM user_seasons us 
JOIN seasons s ON s.id = us.season_id 
WHERE us.user_id = u.id
```
Now only sums balances for existing seasons when calculating overall standings.

#### C. Fixed Season Deletion (Line ~925)
Added cleanup of `user_seasons` records when deleting a season:

**Before:**
1. Delete votes
2. Delete matches
3. Delete season

**After:**
1. Delete votes
2. Delete matches
3. **Delete user_seasons assignments** ← NEW
4. Delete season

This prevents orphaned balance records from accumulating.

### 2. One-Time Cleanup Script

Created `backend/cleanup-orphaned-seasons.js` to:
- Identify orphaned `user_seasons` records (where season no longer exists)
- Display affected users and balances
- Delete orphaned records

**Script Output:**
```
✅ Successfully deleted 3 orphaned user_seasons records
   - senthil: 2 orphaned seasons (1320 pts)
   - senthilsaleminfo: 1 orphaned season (960 pts)
```

### 3. Server Startup Fix
Added missing `app.listen()` call at end of `backend/index.js` to keep server running.

## Impact

### Fixed Calculations
- `/api/users/my-total-balance` - Now correctly sums only existing seasons
- `/api/standings?season_id=` (without season_id) - Overall standings now accurate
- Admin panel "Σ Season Total" - Already correct (uses JOIN)
- Vote History "Overall Balance" - Now correct (uses API)
- Standings page "Overall" - Now correct (uses API)

### Data Cleanup
- Removed 3 orphaned user_seasons records
- User "senthil" overall balance: 2320 → 1000 ✓
- User "senthilsaleminfo" overall balance: fixed ✓

### Future Prevention
- Season deletion now automatically cleans up user_seasons
- Balance calculations always JOIN with seasons table
- No orphaned records will accumulate

## Testing
1. ✅ Cleanup script executed successfully
2. ✅ Backend server restarted with fixes
3. ✅ API endpoints responding correctly

## Deployment Notes

### For Local (Already Applied)
1. Cleanup script already run
2. Backend code updated
3. Server restarted

### For Production (Fly.io)
1. Deploy updated backend code
2. SSH into Fly.io machine
3. Run cleanup script:
   ```bash
   fly ssh console
   cd /app
   node cleanup-orphaned-seasons.js
   ```
4. Restart app (automatically done by deploy)

## Files Changed
- `backend/index.js` - 3 fixes (balance endpoint, standings endpoint, season deletion)
- `backend/cleanup-orphaned-seasons.js` - NEW cleanup script

## Verification Steps
1. Login as user "senthil"
2. Navigate to Vote History
3. Select "All Seasons" from dropdown
4. Overall Balance should show: **1000 pts** (not 2320)
5. Check Standings page - Overall tab should match

---
**Date:** March 7, 2026
**Status:** ✅ Fixed and Deployed Locally
**Next:** Deploy to Production

