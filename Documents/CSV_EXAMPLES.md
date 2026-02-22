# CSV Upload Examples - Ready to Copy & Paste

## Format
```
Date,Venue,Team 1,Team 2,Time
```

## Example 1: Basic Format (Copy & Paste Ready)
```
Date,Venue,Team 1,Team 2,Time
2025-02-07,Colombo (SSC),Pakistan,Netherlands,05:30
2025-02-07,Mumbai,India,USA,13:30
2025-02-16,Kolkata,Pakistan,India,09:30
```

## Example 2: IPL Style Matches
```
Date,Venue,Team 1,Team 2,Time
2025-04-01,Mumbai,Mumbai Indians,Chennai Super Kings,07:30 PM
2025-04-02,Delhi,Delhi Capitals,Rajasthan Royals,08:00 PM
2025-04-03,Bangalore,Royal Challengers,Sunrisers Hyderabad,07:00 PM
2025-04-04,Kolkata,Kolkata Knight Riders,Punjab Kings,08:00 PM
```

## Example 3: International Matches
```
Date,Venue,Team 1,Team 2,Time
2025-02-07,Colombo,Pakistan,Netherlands,05:30
2025-02-08,Mumbai,India,USA,13:30
2025-02-16,Kolkata,Pakistan,India,09:30
2025-03-20,Sydney,Australia,South Africa,02:30 PM
2025-03-21,London,England,West Indies,03:00 PM
```

## Example 4: Big Matches
```
Date,Venue,Team 1,Team 2,Time
2025-06-01,Lord's,England,Australia,03:00 PM
2025-06-02,Old Trafford,Pakistan,India,02:30 PM
2025-06-10,The Oval,South Africa,New Zealand,02:00 PM
```

## Upload Instructions

1. **Admin Panel** → "Bulk Upload CSV Matches"
2. Copy one of the examples above
3. Select a season from dropdown
4. Paste CSV in textarea
5. Click "Upload CSV"
6. Should see: "Uploaded X matches" message

## Important Notes

✅ **Header row is required:** `Date,Venue,Team 1,Team 2,Time`
✅ **5 columns exactly:** Date | Venue | Team1 | Team2 | Time
✅ **Date format:** YYYY-MM-DD (2025-02-07)
✅ **Time format:** HH:MM or with AM/PM
✅ **No extra commas:** Each row should have exactly 4 commas
✅ **No extra spaces:** Spaces around values are trimmed

---

## Common Mistakes ❌

❌ **Wrong:** Missing header → Upload will fail
```
Pakistan,Netherlands,05:30  ← No header!
```

❌ **Wrong:** Wrong number of columns
```
Date,Venue,Team 1,Team 2  ← Missing Time!
```

❌ **Wrong:** Extra commas
```
Date,Venue,Team 1,Team 2,Time,Extra  ← Too many columns!
```

✅ **Correct:**
```
Date,Venue,Team 1,Team 2,Time
2025-02-07,Colombo,Pakistan,Netherlands,05:30
```

---

## Testing CSV Upload

1. Copy CSV from above
2. Go to Admin Panel
3. Paste in "Bulk Upload CSV Matches" section
4. Select a season
5. Click "Upload CSV"
6. Check message: "Uploaded X matches"
7. Scroll down to "Manage Matches"
8. Select season to verify matches appear

---

## Result After Upload

Matches will appear in table format:

```
S.No │ Team 1    │ Team 2       │ Venue   │ Date       │ Time    │ Vote  │ Points │ Odds...
─────┼───────────┼──────────────┼─────────┼────────────┼─────────┼───────┼────────┼────────
  1  │ Pakistan  │ Netherlands  │ Colombo │ 2025-02-07 │ 05:30   │ [▼]   │ [▼]    │
  2  │ India     │ USA          │ Mumbai  │ 2025-02-07 │ 13:30   │ [▼]   │ [▼]    │
```

---

## Ready to Test?

1. Pick an example above
2. Paste into Admin Panel
3. Click Upload CSV
4. Check matches appear in table
5. Try voting with dropdowns
6. Watch odds update!

🎉 **Easy CSV Upload!**

