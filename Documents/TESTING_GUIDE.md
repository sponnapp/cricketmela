# Quick Start - Testing All New Features

## Step 1: Refresh Browser
- Press F5 or Cmd+R
- Visit http://localhost:5173

## Step 2: Login as Admin
```
Username: admin
Password: password
```

## Step 3: Test - Create Season
1. Go to Admin Panel
2. Click "Create Season" section
3. Enter: "IPL 2025 Round 2"
4. Click "Create Season"
5. Should see: "Season created successfully"

## Step 4: Test - Create User
1. In Admin Panel → "Create New User" section
2. Username: `testuser`
3. Role: Select "Picker"
4. Balance: 1000
5. Click "Create User"
6. Should see: "User created successfully"

## Step 5: Test - CSV Upload (New Format)
1. In Admin Panel → "Bulk Upload CSV Matches" section
2. Copy this CSV:
```
Date,Venue,Team 1,Team 2,Time
2025-02-07,Colombo (SSC),Pakistan,Netherlands,05:30
2025-02-07,Mumbai,India,USA,13:30
2025-02-16,Kolkata,Pakistan,India,09:30
```
3. Paste in textarea
4. Click "Upload CSV"
5. Should see: "Uploaded 3 matches"

## Step 6: Test - View Matches in Table
1. Still in Admin Panel
2. Select season from dropdown (should show your newly created seasons)
3. **See all matches in professional table format:**
   - S.No | Team 1 | Team 2 | Venue | Date | Time | Vote | Points | Odds...

## Step 7: Test - Voting with Dropdowns
1. Go to Seasons page (click "Seasons" button)
2. Select a season
3. Click "View matches"
4. **See the matches table**
5. For first match:
   - **Vote column:** Click dropdown → Select "Pakistan"
   - **Points column:** Click dropdown → Select "20"
   - **Odds columns:** Show current total votes
6. Click "Vote" button
7. **Results:**
   - ✓ Success message
   - ✓ Balance decreases by 20
   - ✓ Odds update immediately
   - ✓ Vote and Points dropdowns reset

## Step 8: Test - Odds Update
1. Note the current odds for Team 1 and Team 2
2. Vote on another row
3. **Odds should update in real-time**
4. Total votes shown in Odds columns

## Step 9: Test - Vote Dropdown Shows Correct Teams
1. Look at different rows
2. **Vote dropdown shows the specific teams for that match:**
   - Row 1: Pakistan, Netherlands
   - Row 2: India, USA
   - Row 3: Pakistan, India

## Step 10: Test - New User Login
1. Logout (click Logout button)
2. Login with newly created user:
```
Username: testuser
Password: password
```
3. **Should successfully login**
4. Balance should show: 1000

---

## All Tests Passing? ✅

If all steps worked:
- ✅ CSV format works (Date,Venue,Team 1,Team 2,Time)
- ✅ Season creation works
- ✅ User creation works
- ✅ CSV upload works
- ✅ Matches display in table format
- ✅ Vote dropdown works (shows team names)
- ✅ Points dropdown works (10, 20, 50)
- ✅ Voting works
- ✅ Odds update in real-time
- ✅ New users can login

---

## Troubleshooting

### "Season created successfully" doesn't appear?
- Check browser console (F12) for errors
- Make sure you're logged in as admin
- Try creating season with different name

### CSV Upload fails?
- Make sure exactly 5 columns: Date,Venue,Team 1,Team 2,Time
- No extra spaces or commas
- Make sure season is selected before uploading

### Odds not updating?
- Refresh page to see latest odds
- Check that vote was successfully submitted (balance decreased)
- Odds should automatically update in table

### Points balance not decreasing?
- Check that you selected points in dropdown
- Make sure points match what's in the dropdown
- Balance should decrease by the points value

---

## Data Files

- **CSV Upload Format:** `Date,Venue,Team 1,Team 2,Time`
- **Example CSV:** See Step 5 above
- **Sample Data:**
  ```
  Date,Venue,Team 1,Team 2,Time
  2025-02-07,Colombo (SSC),Pakistan,Netherlands,05:30
  2025-02-07,Mumbai,India,USA,13:30
  2025-02-16,Kolkata,Pakistan,India,09:30
  ```

---

## Success Indicators

✅ Table displays with all columns
✅ Vote dropdown shows team names
✅ Points dropdown shows 10, 20, 50
✅ Odds update after voting
✅ Balance decreases after voting
✅ New users can be created
✅ New seasons can be created
✅ CSV uploads successfully

---

🎉 **All features are ready for testing!**

If you encounter any issues, check the browser console (F12) for error messages.

