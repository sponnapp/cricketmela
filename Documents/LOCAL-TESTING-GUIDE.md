# 🧪 Local Testing Guide - Auto-Loss Feature

## Overview

This guide walks you through testing the auto-loss feature for newly assigned seasons.

---

## Prerequisites

- Backend running on port 4000
- Frontend running on port 5173
- SQLite database initialized
- Admin user available

---

## Test Scenario 1: User Approval with Auto-Loss

### Setup Phase

1. **Start Backend**
   ```bash
   cd /Users/senthilponnappan/IdeaProjects/Test
   npm start --prefix backend
   ```

2. **Login as Admin**
   - Open http://localhost:5173
   - Login with `admin` / `admin123`

3. **Create Test Season**
   - Click Admin panel
   - Go to Seasons tab
   - Create season: "Test Season 1"

4. **Create Matches with CSV**
   - Go to Matches tab
   - Create 3 sample matches with CSV:
     ```
     Date,Venue,Team 1,Team 2,Time
     01-Mar-2026,Mumbai,CSK,MI,2:30 PM
     02-Mar-2026,Delhi,RCB,KKR,3:00 PM
     03-Mar-2026,Bangalore,DC,RR,4:00 PM
     ```

5. **Set Winners**
   - Click Set Winner for each match
   - CSK wins Match 1
   - KKR wins Match 2
   - DC wins Match 3

6. **Create Voters** (Optional but helps see distribution)
   - Create users: "voter1", "voter2", "voter3"
   - Assign all to "Test Season 1"
   - Each votes on winning team with 50 points

   **Result**: 
   - voter1: voted CSK (50pts), KKR (50pts), DC (50pts)
   - voter2: same votes
   - voter3: same votes

### Test Phase

1. **Sign up as New User**
   - Open http://localhost:5173
   - Click "Sign up now"
   - Create account: "testuser1" / "testpass123"
   - Email: "testuser1@test.com"
   - **Expected**: User shows as pending approval

2. **Admin Approves User**
   - Admin panel → Users → Pending Approvals
   - See "testuser1" in list
   - Click approve button
   - Assign "Test Season 1"
   - Set balance: 100
   - Click Approve
   - **Expected**: User approved successfully

3. **Verify Auto-Loss Processing**
   
   **Check balance**:
   ```bash
   sqlite3 /Users/senthilponnappan/IdeaProjects/Test/backend/data.db \
     "SELECT username, balance FROM users WHERE username = 'testuser1';"
   ```
   **Expected**: balance = 70 (100 - 30 for 3 matches)

   **Check votes**:
   ```bash
   sqlite3 /Users/senthilponnappan/IdeaProjects/Test/backend/data.db \
     "SELECT COUNT(*) FROM votes WHERE user_id = (SELECT id FROM users WHERE username = 'testuser1');"
   ```
   **Expected**: 3 votes created (one auto-loss per match)

   **Check vote details**:
   ```bash
   sqlite3 /Users/senthilponnappan/IdeaProjects/Test/backend/data.db \
     "SELECT match_id, team, points FROM votes WHERE user_id = (SELECT id FROM users WHERE username = 'testuser1');"
   ```
   **Expected**: 
   - Match 1: MI (losing team), 10 points
   - Match 2: RCB (losing team), 10 points
   - Match 3: RR (losing team), 10 points

4. **Verify Distribution to Winners**
   
   Check voter1 balance increase:
   ```bash
   sqlite3 /Users/senthilponnappan/IdeaProjects/Test/backend/data.db \
     "SELECT username, balance FROM users WHERE username = 'voter1';"
   ```
   **Expected**: balance increased (got share of 30 points distributed)

---

## Test Scenario 2: Assign User to New Season

### Setup Phase

1. **Create Second Season**
   - Admin panel → Seasons
   - Create: "Test Season 2"

2. **Add Matches to Season 2**
   - Go to Matches tab
   - Create 2 matches and set winners

3. **Create Test User**
   - Admin panel → Users
   - Create user: "testuser2" / "pass123"
   - Display name: "Test User 2"
   - Role: picker
   - Balance: 100
   - Assign to "Test Season 1" only
   - **Result**: user2.balance = 70 (auto-loss for 3 matches in S1)

### Test Phase

1. **Assign to New Season**
   - Admin panel → Users → All Users
   - Find "testuser2"
   - Edit → Assigned Seasons
   - Check "Test Season 2"
   - Save
   - **Expected**: Seasons updated

2. **Verify Auto-Loss for New Season Only**
   
   Check balance:
   ```bash
   sqlite3 /Users/senthilponnappan/IdeaProjects/Test/backend/data.db \
     "SELECT username, balance FROM users WHERE username = 'testuser2';"
   ```
   **Expected**: balance = 50 (70 - 20 for 2 new matches)

   **NOT**: -10 for original 3 matches (already processed)

   **Check total votes**:
   ```bash
   sqlite3 /Users/senthilponnappan/IdeaProjects/Test/backend/data.db \
     "SELECT COUNT(*) FROM votes WHERE user_id = (SELECT id FROM users WHERE username = 'testuser2');"
   ```
   **Expected**: 5 votes (3 from S1 + 2 from S2)

---

## Test Scenario 3: User Already Voted

### Setup Phase

1. **Create Season and Matches**
   - Create "Test Season 3"
   - Add 3 matches with winners set
   - Balance: 100 points

2. **Manually Add Vote**
   - Login as test user
   - Go to Matches
   - Vote for winning team on Match 1
   - **Result**: vote on Match 1 created, 50 points deducted

### Test Phase

1. **Admin Assigns User to Season**
   - User previously voted on Match 1
   - Should NOT get charged again for Match 1
   - Should only be charged for Matches 2 & 3

2. **Verify Correct Processing**
   
   Check votes:
   ```bash
   sqlite3 /Users/senthilponnappan/IdeaProjects/Test/backend/data.db \
     "SELECT COUNT(*) FROM votes WHERE user_id = ? AND team = (SELECT winner FROM matches WHERE id = ?);"
   ```
   **Expected**: 3 votes total (1 original + 2 new auto-loss)

   Check balance:
   ```bash
   sqlite3 /Users/senthilponnappan/IdeaProjects/Test/backend/data.db \
     "SELECT balance FROM users WHERE username = 'testuser3';"
   ```
   **Expected**: 50 (100 - 50 for vote - 20 for 2 unvoted matches) = 30
   **NOT**: -70 (would be if charged all 3)

---

## Test Scenario 4: Multiple Voters Distribution

### Setup Phase

1. **Create Season with Matches**
   - Season: "Distribution Test"
   - Match: CSK vs MI (Winner: CSK)
   - Votes: CSK has 100pts (voter1: 60pts, voter2: 40pts)

2. **Check Initial State**
   ```bash
   # Check voter1 balance
   sqlite3 /Users/senthilponnappan/IdeaProjects/Test/backend/data.db \
     "SELECT balance FROM users WHERE username = 'voter1';"
   # Should include their vote deduction
   ```

### Test Phase

1. **Assign New User**
   - Create "testuser4"
   - Assign to season with above match
   - Balance: 0 (so we can see auto-loss clearly)

2. **Verify Distribution**
   ```bash
   # Check voter1 balance increase
   sqlite3 /Users/senthilponnappan/IdeaProjects/Test/backend/data.db \
     "SELECT balance FROM users WHERE username = 'voter1';"
   ```
   **Expected**: Increased by 6 (10 * (60/100))

   ```bash
   # Check voter2 balance increase
   sqlite3 /Users/senthilponnappan/IdeaProjects/Test/backend/data.db \
     "SELECT balance FROM users WHERE username = 'voter2';"
   ```
   **Expected**: Increased by 4 (10 * (40/100))

---

## Verification Checklist

### Approval Flow
- [ ] User approved successfully
- [ ] Seasons assigned
- [ ] Auto-loss votes created for all unvoted matches
- [ ] User balance decreased correctly (10 × unvoted matches)
- [ ] Winners received proportional distribution
- [ ] Email sent to user

### Season Assignment Flow
- [ ] Existing seasons unchanged
- [ ] New seasons processed for auto-loss
- [ ] Only new seasons get auto-loss votes
- [ ] Balance updated correctly for new seasons
- [ ] Winners received distribution for new seasons

### Edge Cases
- [ ] User already voted: No duplicate auto-loss
- [ ] No completed matches: No votes created
- [ ] No winners voted: No distribution occurs
- [ ] Single winner: Gets all 10 points per match
- [ ] Multiple winners: Distribution proportional

---

## Console Output to Watch For

**Success Messages**:
```
✅ Auto-loss processing completed for user 5 in 2 season(s)
```

**Error Messages** (should not crash):
```
Error: Error deducting auto-loss balance for new season: [error]
Error: Error creating auto-loss vote for new season: [error]
Error: Error distributing winnings to winner: [error]
```

---

## Common Issues & Solutions

### Issue: Balance not changed
- **Check**: Are there completed matches (winner IS NOT NULL)?
- **Check**: User not already voted on those matches
- **Solution**: Verify matches have winners set before assigning user

### Issue: Votes not created
- **Check**: Are votes in database?
  ```bash
  sqlite3 data.db "SELECT * FROM votes WHERE user_id = ?"
  ```
- **Solution**: Check browser console for errors

### Issue: Distribution not correct
- **Check**: Calculate manually
  - Total winner points: sum all votes for winning team
  - Share per voter: (voter_points / total_winner) * 10
  - Round to whole number
- **Solution**: Verify calculation matches formula

### Issue: Email not sent
- **Check**: Is email config valid?
- **Solution**: This doesn't block approval, so feature works without email

---

## Database Queries for Debugging

```bash
# See all users and balances
sqlite3 data.db "SELECT id, username, balance FROM users LIMIT 10;"

# See all auto-loss votes (losing team, 10 points)
sqlite3 data.db "SELECT u.username, v.team, v.points, m.home_team, m.away_team FROM votes v JOIN users u ON u.id = v.user_id JOIN matches m ON m.id = v.match_id WHERE v.points = 10 ORDER BY v.created_at DESC LIMIT 10;"

# See a user's balance history
sqlite3 data.db "SELECT * FROM users WHERE username = 'testuser1';"

# See a user's votes
sqlite3 data.db "SELECT v.*, m.home_team, m.away_team, m.winner FROM votes v JOIN matches m ON m.id = v.match_id WHERE v.user_id = (SELECT id FROM users WHERE username = 'testuser1');"
```

---

## Expected Results Summary

| Scenario | Initial Balance | Completed Matches | Expected Final Balance |
|----------|-----------------|-------------------|----------------------|
| Approve with 3 matches | 100 | 3 | 70 |
| Approve with 5 matches | 500 | 5 | 450 |
| Assign to new 2 matches | 100 | 2 | 80 |
| Already voted 1/3 | 100 | 3 | 80 |

---

## Testing Time Estimate

| Scenario | Time |
|----------|------|
| Setup | 5-10 min |
| Scenario 1 | 5 min |
| Scenario 2 | 5 min |
| Scenario 3 | 5 min |
| Scenario 4 | 5 min |
| Verification | 5 min |
| **Total** | **30 min** |

---

## After Testing

1. **If All Tests Pass**:
   - Feature is ready for production
   - Deploy to Fly.io with: `flyctl deploy --remote-only`

2. **If Issues Found**:
   - Check logs in backend console
   - Review database state with queries above
   - Refer to troubleshooting guide
   - Fix and re-test

3. **Document Results**:
   - Note any issues encountered
   - Document workarounds if any
   - Update feature docs if needed

---

**Last Updated**: March 2, 2026
**Status**: Ready for Testing
**Estimated Duration**: 30 minutes

