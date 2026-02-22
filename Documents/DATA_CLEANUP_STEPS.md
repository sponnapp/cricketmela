# ✅ STEP-BY-STEP FIX GUIDE - Data Cleanup & Re-upload

## Current Problem
Your table shows corrupted data mapping:
- Team 1 column: Shows "Mumbai", "Chennai" (correct team names by coincidence)
- Team 2 column: Shows "7-Feb-26", "8-Feb-26" (WRONG - dates instead of teams)
- Venue column: Shows "N/A" (correct)
- Date column: Shows "India", "New Zealand" (WRONG - team names instead of dates)

## Root Cause
Previous CSV uploads had incorrect field parsing order.

## Solution (5 Minutes)

### Step 1: Clear Old Corrupted Data
Run this command in your browser console OR use curl:

**Option A: Using Curl**
```bash
curl -X POST http://localhost:4000/api/admin/clear-matches \
  -H "x-user: admin" \
  -H "Content-Type: application/json"
```

**Option B: Using JavaScript (paste in browser console)**
```javascript
fetch('http://localhost:4000/api/admin/clear-matches', {
  method: 'POST',
  headers: {
    'x-user': 'admin',
    'Content-Type': 'application/json'
  }
}).then(r => r.json()).then(data => console.log(data))
```

**Option C: Using Admin UI (Recommended)**
Go to Admin panel and you'll see a "Clear All Matches" button will be added.

✅ **Result:** "All matches deleted" message

---

### Step 2: Verify Matches Cleared

1. Go to Admin Panel
2. Select any season
3. Under "Manage Matches" - you should see: "No matches in this season"

✅ **Verified:** No matches shown

---

### Step 3: Upload Correct CSV

1. Go to Admin Panel
2. Go to "Bulk Upload CSV Matches" section
3. **Copy this exact CSV:**

```
Date,Venue,Team 1,Team 2,Time
2025-02-07,Colombo (SSC),Pakistan,Netherlands,05:30
2025-02-07,Mumbai,India,USA,13:30
2025-02-16,Kolkata,Pakistan,India,09:30
```

4. **Paste into the textarea**
5. **Select a season from dropdown** (important!)
6. **Click "Upload CSV"**

✅ **Result:** "Uploaded 3 matches" message

---

### Step 4: Verify Correct Data

1. Go to Admin Panel → Manage Matches
2. Select the same season
3. You should see the table with:
   - **S.No:** 1, 2, 3
   - **Team 1:** Pakistan, India, Pakistan (CORRECT!)
   - **Team 2:** Netherlands, USA, India (CORRECT!)
   - **Venue:** Colombo (SSC), Mumbai, Kolkata (CORRECT!)
   - **Date:** 2025-02-07, 2025-02-07, 2025-02-16 (CORRECT!)
   - **Time:** 05:30, 13:30, 09:30 (CORRECT!)

✅ **Success!** Data is now correct

---

### Step 5: Test Voting

1. Go to Seasons → Select your season → View Matches
2. You should see the table with ALL columns correct:
   - S.No | Team 1 | Team 2 | Venue | Date | Time | Vote | Points | T1 Odds | T2 Odds | [Vote]
3. Test voting:
   - Select team from Vote dropdown (shows: Pakistan, Netherlands)
   - Select points (10, 20, 50)
   - Click Vote
   - Verify balance decreases
   - Verify odds update

✅ **Everything working!**

---

## CSV Format Reference

**CORRECT Format:**
```
Date,Venue,Team 1,Team 2,Time
2025-02-07,Colombo,Pakistan,Netherlands,05:30
```

**Column Order (IMPORTANT!):**
1. **Date** - YYYY-MM-DD format
2. **Venue** - Match location
3. **Team 1** - First team (becomes home_team)
4. **Team 2** - Second team (becomes away_team)
5. **Time** - HH:MM format (24-hour or with AM/PM)

---

## What Gets Stored

| CSV Column | Database Field | Example |
|-----------|---|---|
| Date | scheduled_at (date part) | 2025-02-07 |
| Time | scheduled_at (time part) | 05:30 |
| Venue | venue | Colombo |
| Team 1 | home_team | Pakistan |
| Team 2 | away_team | Netherlands |

---

## Troubleshooting

### "Uploaded 0 matches"
- Check season is selected
- Check CSV has header row: `Date,Venue,Team 1,Team 2,Time`
- Check each row has exactly 5 columns separated by commas
- Check no extra spaces at end of lines

### Teams still showing wrong
- Go back to Step 1 and clear matches again
- Make sure you selected correct season before uploading
- Re-upload the CSV

### Dates still wrong
- Check Date format is YYYY-MM-DD (e.g., 2025-02-07)
- Check Time format is HH:MM (e.g., 05:30)
- Clear and re-upload

---

## Timeline

1. **Clear data:** 30 seconds
2. **Upload CSV:** 30 seconds
3. **Verify:** 1 minute
4. **Test voting:** 2 minutes

**Total: ~5 minutes**

---

## After Fix

✅ Matches display correctly
✅ Teams in right columns
✅ Dates in right column
✅ Venues correct
✅ Voting works
✅ Odds update properly

---

## Support

If you hit any issues:
1. Check the troubleshooting section above
2. Make sure backend is running (`npm start`)
3. Make sure you're logged in as admin
4. Check browser console (F12) for error messages

---

**Ready? Let's fix this! Follow steps 1-5 above and you're done! 🎉**

