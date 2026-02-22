# Fix for Corrupted Match Data

## Problem
Your existing matches in the database have incorrect data mapping:
- Dates are stored in home_team field
- Venues are stored in away_team field
- Actual team names are scattered

## Solution: Delete Bad Data and Re-upload

### Step 1: Clear All Matches
I'll add a temporary endpoint to delete all matches so you can start fresh.

### Step 2: Delete the endpoint after use
Once you've re-uploaded, we'll remove the cleanup endpoint.

### What to do:

1. **Clear existing matches:**
   ```
   POST http://localhost:4000/api/admin/clear-matches
   ```
   This will delete ALL matches (keep users and seasons intact)

2. **Verify it's cleared:**
   Go to Admin panel and select a season - you should see no matches

3. **Upload CSV again:**
   - Go to Admin Panel
   - Select season
   - Paste your CSV in the correct format:
     ```
     Date,Venue,Team 1,Team 2,Time
     2025-02-07,Colombo,Pakistan,Netherlands,05:30
     2025-02-08,Mumbai,India,USA,13:30
     ```
   - Click "Upload CSV"

4. **Verify correct data:**
   - Go to Matches
   - Check that Team 1, Team 2, Venue, Date are all correct

5. **Let me know when done**
   - I'll remove the clear-matches endpoint

---

## Why This Happened

The CSV was being parsed with mixed up field order from previous uploads.
The fix ensures correct parsing going forward.

---

## After Fix

New CSV uploads will work correctly:
- Date → scheduled_at
- Venue → venue
- Team 1 → home_team
- Team 2 → away_team
- Time → scheduled_at (combined with date)

