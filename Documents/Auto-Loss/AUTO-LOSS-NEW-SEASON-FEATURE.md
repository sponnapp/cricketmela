# Auto-Loss for Newly Assigned Seasons - Feature Documentation

## Overview

When a new user joins a season (or is assigned to a season) that has already completed matches, they are automatically charged **10 points per completed match** they haven't voted on. These points are distributed to the winners of those matches using the **1:1 ratio** payout system.

---

## How It Works

### 1. **Trigger Points**

The auto-loss processing is triggered in two scenarios:

#### Scenario A: User Approval with Season Assignment
- Admin approves a pending user signup and assigns them to one or more seasons
- Endpoint: `POST /api/admin/users/:id/approve`
- After seasons are assigned, auto-loss processing begins automatically

#### Scenario B: Direct Season Assignment
- Admin assigns existing user to new seasons
- Endpoint: `PUT /api/admin/users/:id/seasons`
- Only processes for **newly added** seasons (not previously assigned ones)

### 2. **Processing Logic**

For each newly assigned season:

1. **Identify completed matches**: Find all matches in the season with `winner IS NOT NULL`

2. **Check user votes**: For each completed match, check if the user has already voted

3. **Auto-loss for unvoted matches**:
   - Deduct **10 points** from user's balance (allows negative balance)
   - Create a vote record: `team = losing_team, points = 10`
   - Distribute the 10 points to existing winners proportionally

4. **Distribution calculation**:
   ```
   For each winner voter:
     share = (userPoints / totalWinnerPoints) * 10
     winner.balance += Math.round(share)
   ```

### 3. **Key Characteristics**

✅ **Retroactive**: Applies to matches that finished before user joined
✅ **Automatic**: Happens without user action
✅ **Proportional**: Distributes points fairly based on winner stakes
✅ **Idempotent**: Won't process matches user already voted on
✅ **Non-blocking**: Errors don't fail the approval/assignment process
✅ **Allows negative**: User balance can go negative

---

## Example Scenario

### Setup
- Season: IPL 2025
- User: `john` (being assigned)
- Completed Matches with winners:

| Match ID | Home | Away | Winner | Vote Distribution |
|----------|------|------|--------|-------------------|
| 1 | CSK | MI | CSK | CSK: 50pts, MI: 30pts |
| 2 | RCB | KKR | KKR | RCB: 20pts, KKR: 40pts |
| 3 | DC | RR | DC | DC: 60pts, RR: 25pts |

### Processing for John

#### Match 1 (CSK vs MI, Winner: CSK)
- John hasn't voted → process auto-loss
- Deduct 10 points from john.balance
- Total winner points = 50
- Distribute 10 points:
  - CSK voters: 10 * (50/50) = 10 points each
  - Each CSK voter gets +10

#### Match 2 (RCB vs KKR, Winner: KKR)
- John hasn't voted → process auto-loss
- Deduct 10 points from john.balance
- Total winner points = 40
- Distribute 10 points:
  - KKR voters: 10 * (40/40) = 10 points each
  - Each KKR voter gets +10

#### Match 3 (DC vs RR, Winner: DC)
- John hasn't voted → process auto-loss
- Deduct 10 points from john.balance
- Total winner points = 60
- Distribute 10 points:
  - DC voters: 10 * (60/60) = 10 points each
  - Each DC voter gets +10

### Final Result
- **john.balance**: -30 (initial 0, deducted 30 for 3 matches)
- **Winners receive**: Additional earnings from the distributed 30 points

---

## Implementation Details

### Helper Function: `processAutoLossForNewSeasons()`

**Location**: `backend/index.js` (after initialization, before routes)

**Signature**:
```javascript
function processAutoLossForNewSeasons(userId, newSeasonIds, callback) {
  // userId: number - The user ID
  // newSeasonIds: array - Season IDs to process
  // callback: function(err) - Called when complete
}
```

**Process Flow**:
1. Open database connection
2. Query all completed matches (winner != null) in the seasons
3. For each match:
   - Check if user has existing vote
   - If no vote: deduct 10 points, create auto-loss vote
   - Calculate proportional distribution to winners
   - Update each winner's balance
4. Close database connection
5. Call callback with any errors

### Integration Points

#### 1. Approve User Endpoint
```javascript
// POST /api/admin/users/:id/approve
// After inserting season assignments, before sending email:
processAutoLossForNewSeasons(userId, season_ids, (err) => {
  if (err) console.error('Auto-loss error:', err);
  // Continue with email and response
});
```

#### 2. Update User Seasons Endpoint
```javascript
// PUT /api/admin/users/:id/seasons
// Find newly added seasons
const newSeasonIds = seasonIds.filter(sid => !oldSeasonIds.includes(sid));
// After inserting season assignments:
if (newSeasonIds.length > 0) {
  processAutoLossForNewSeasons(userId, newSeasonIds, (err) => {
    if (err) console.error('Auto-loss error:', err);
    // Send response
  });
}
```

---

## Database Operations

### Queries Executed

For each newly assigned season:

1. **Get completed matches**:
   ```sql
   SELECT m.id, m.season_id, m.home_team, m.away_team, m.winner 
   FROM matches m 
   WHERE m.season_id IN (...)
   AND m.winner IS NOT NULL
   ```

2. **Check user vote**:
   ```sql
   SELECT id FROM votes 
   WHERE match_id = ? AND user_id = ?
   ```

3. **Deduct user balance**:
   ```sql
   UPDATE users 
   SET balance = balance - 10 
   WHERE id = ?
   ```

4. **Create auto-loss vote**:
   ```sql
   INSERT INTO votes (match_id, user_id, team, points) 
   VALUES (?, ?, ?, 10)
   ```

5. **Get winner total points**:
   ```sql
   SELECT SUM(points) as total 
   FROM votes 
   WHERE match_id = ? AND team = ?
   ```

6. **Get all winner voters**:
   ```sql
   SELECT user_id, points 
   FROM votes 
   WHERE match_id = ? AND team = ?
   ```

7. **Distribute to winners**:
   ```sql
   UPDATE users 
   SET balance = balance + ? 
   WHERE id = ?
   ```

---

## Error Handling

- **DB errors during queries**: Logged to console, processing continues
- **Missing matches**: Gracefully handled, processing completes
- **Missing winners**: Skipped, no distribution
- **Invalid vote data**: Logged, processing continues
- **Network/DB disconnections**: Callback returns error, request continues

**Note**: All errors are logged but don't fail the user approval/assignment process. This ensures user onboarding is not blocked.

---

## Testing Checklist

### Test Case 1: Approve User with Completed Matches
- [ ] Create a season with matches
- [ ] Set winner for some matches
- [ ] Sign up new user
- [ ] Approve user and assign to season
- [ ] Verify user balance decreased by (10 × number of completed matches)
- [ ] Verify winners received proportional distribution
- [ ] Check user's vote history includes auto-loss votes

### Test Case 2: Assign Existing User to New Season
- [ ] Create two seasons
- [ ] Assign user to season 1
- [ ] User votes on matches in season 1
- [ ] Create matches in season 2 and set winners
- [ ] Assign user to season 2 (new assignment)
- [ ] Verify balance decreased for season 2 matches only
- [ ] Verify season 1 votes unchanged

### Test Case 3: User Already Voted
- [ ] Create season with completed matches
- [ ] Assign user to season
- [ ] User auto-loses on match 1
- [ ] Manually add user vote on match 2
- [ ] Assign user to different season
- [ ] Verify auto-loss only on match 1, not match 2

### Test Case 4: No Completed Matches
- [ ] Create season with matches (no winners yet)
- [ ] Assign user to season
- [ ] Verify balance unchanged
- [ ] Verify no votes created

### Test Case 5: Negative Balance
- [ ] User with 0 initial balance
- [ ] Assign to season with 5 completed matches
- [ ] Verify balance = -50
- [ ] Can still vote on future matches in other seasons

---

## Impact on User Experience

### Before This Feature
- New users joining mid-season: No disadvantage
- Could vote on all matches: Full control of betting
- No automatic penalties: Fair but not realistic

### After This Feature
- New users joining mid-season: Charged for completed matches they didn't vote on
- No choice: Automatic auto-loss votes created
- Realistic: Mirrors real betting scenarios where you can't change past events

---

## Future Enhancements

1. **Configurable minimum bet**: Currently hardcoded to 10 points
2. **Admin override**: Option to skip auto-loss for specific user/season
3. **Custom distribution**: Allow admin to set custom loss amounts
4. **Batch processing**: Async processing for multiple users
5. **Notifications**: Email users about auto-loss charges
6. **Audit log**: Track all auto-loss processing with timestamps

---

## API References

### POST `/api/admin/users/:id/approve`
**Added**: Auto-loss processing after season assignment

**Request**:
```json
{
  "balance": 500,
  "season_ids": [1, 2, 3]
}
```

**Response**:
```json
{
  "ok": true,
  "message": "User approved and seasons assigned"
}
```

**Process**:
1. Approve user
2. Assign seasons
3. **Run auto-loss for each season** ← NEW
4. Send email
5. Return success

---

### PUT `/api/admin/users/:id/seasons`
**Added**: Auto-loss processing for newly added seasons only

**Request**:
```json
{
  "season_ids": [1, 3, 5]
}
```

**Response**:
```json
{
  "ok": true,
  "message": "Seasons updated"
}
```

**Process**:
1. Fetch old season assignments
2. Identify newly added seasons
3. Delete old assignments
4. Insert new assignments
5. **Run auto-loss only for new seasons** ← NEW
6. Return success

---

## Logging

When auto-loss processing completes successfully:
```
✅ Auto-loss processing completed for user 5 in 2 season(s)
```

When errors occur:
```
Error: Error deducting auto-loss balance for new season: [error details]
Error: Error distributing winnings to winner: [error details]
```

All errors are logged to console but don't block the process.

---

## Performance Considerations

- **Time Complexity**: O(n*m) where n = completed matches, m = winner votes per match
- **DB Calls**: ~6 per completed match per user
- **Impact**: Minimal for typical seasons (<100 matches, <100 winners per match)
- **Async**: All DB calls use callbacks (non-blocking)
- **Connection**: Each function opens/closes own DB connection

---

## Security

- ✅ Only `admin` role can trigger assignment
- ✅ Only processes assigned seasons
- ✅ No direct balance manipulation without vote records
- ✅ All votes are recorded in database
- ✅ Audit trail available in votes table

---

## Troubleshooting

### Issue: Balance not decreased after approval
**Solution**: Check if the season has any completed matches. Use:
```bash
curl http://localhost:4000/api/matches -H "x-user: admin"
```

### Issue: Winners didn't receive distribution
**Solution**: Verify votes were created:
```sql
SELECT * FROM votes WHERE user_id = ? ORDER BY created_at DESC LIMIT 10;
```

### Issue: Null errors in logs
**Solution**: Check database connection. Ensure `db.js` is properly initialized.

---

## Code References

- **Helper Function**: `backend/index.js` lines 460-570
- **Approve Endpoint**: `backend/index.js` lines 868-950 (with auto-loss call)
- **Update Seasons Endpoint**: `backend/index.js` lines 1797-1855 (with auto-loss call)

---

## Summary

This feature automates the penalty for users joining mid-season, ensuring fair play and realistic betting scenarios. The implementation is automatic, non-blocking, and gracefully handles errors without affecting user onboarding.

**Status**: ✅ **IMPLEMENTED AND READY FOR TESTING**

