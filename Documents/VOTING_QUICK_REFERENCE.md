# 📋 VOTING SYSTEM - QUICK REFERENCE GUIDE

## System Overview:

```
User Voting Journey:
├─ Match Page Loaded
│  ├─ Fetch all matches
│  ├─ Fetch user's existing votes for each match
│  └─ Pre-populate vote form with existing votes
│
├─ User Selects Vote (Before Match Starts)
│  ├─ Select Team: [O] Team A  [O] Team B
│  ├─ Select Points: [10] [20] [50]
│  └─ Click Button: [Vote] or [Update]
│
├─ Backend Processing
│  ├─ Check: Is user authenticated? ✓
│  ├─ Check: Has match started? (NO → Continue)
│  ├─ Check: Does user have existing vote? (YES/NO)
│  ├─ If NO: Deduct points, insert vote
│  ├─ If YES: Refund old points, deduct new points
│  └─ Return: Updated balance
│
├─ User Feedback
│  ├─ Alert: "Vote placed/updated! Balance: XXX"
│  ├─ Odds: Update in real-time
│  ├─ Button: Changes from "Vote" to "Update"
│  └─ Form: Keeps selected vote visible
│
└─ After Match Starts
   ├─ Radio buttons: DISABLED
   ├─ Points dropdown: DISABLED
   ├─ Vote button: DISABLED
   └─ Status: "Match Started" (red text)
```

---

## Vote Replacement Example:

```
SCENARIO: User changes mind about vote

INITIAL STATE:
- User balance: 1000
- No votes placed

STEP 1: Place first vote
- Select: Team A
- Points: 20
- Action: Click "Vote"
- Balance after: 1000 - 20 = 980
- Button changes to: "Update"

STEP 2: Change vote (before match starts)
- Select: Team B (different team)
- Points: 50 (different points)
- Action: Click "Update"
- Calculation: 980 + 20 (refund) - 50 (new) = 950
- Balance after: 950
- Message: "Vote updated! Balance: 950"

FINAL STATE:
- Vote: Team B, 50 points
- Balance: 950
- Total change: -50 points (from original)
```

---

## Time Check Logic:

```
Match Start Time Check:

1. Get match scheduled_at: "2025-02-07T05:30"
2. Convert to timestamp: 1738906200 (seconds since epoch)
3. Get current time: Now timestamp
4. Compare: currentTime >= scheduledTime?

BEFORE MATCH:
if (now < scheduledTime) {
  // Voting allowed ✓
  Radio buttons: ENABLED
  Points: ENABLED
  Button: ENABLED
}

AFTER MATCH STARTS:
if (now >= scheduledTime) {
  // Voting blocked ❌
  Radio buttons: DISABLED
  Points: DISABLED
  Button: DISABLED
  Status: "Match Started"
}
```

---

## Database Transaction Flow:

```
PLACING NEW VOTE:
1. BEGIN TRANSACTION
2. GET user balance
3. CHECK: balance >= points? (YES → continue)
4. UPDATE users SET balance = balance - points
5. INSERT INTO votes (...) VALUES (...)
6. GET updated balance
7. RETURN balance & success
8. COMMIT

UPDATING EXISTING VOTE:
1. BEGIN TRANSACTION
2. GET existing vote (team, points)
3. GET match scheduled_at
4. CHECK: match started? (NO → continue)
5. CALCULATE pointsDiff = newPoints - oldPoints
6. GET current balance
7. CHECK: balance - pointsDiff >= 0? (YES → continue)
8. UPDATE users SET balance = balance - pointsDiff
9. UPDATE votes SET team = ?, points = ?
10. GET updated balance
11. RETURN balance & success
12. COMMIT
```

---

## API Endpoints Summary:

### 1. POST /api/matches/:id/vote
**Purpose:** Place or update vote

**Request:**
```json
{
  "team": "Pakistan",
  "points": 20
}
```

**Response (Success):**
```json
{
  "ok": true,
  "balance": 950,
  "message": "Vote placed" | "Vote updated" | "Vote unchanged"
}
```

**Response (Error):**
```json
{
  "error": "Match has already started. Cannot vote now."
}
```

### 2. GET /api/matches/:id/user-vote
**Purpose:** Get user's existing vote for a match

**Response (Has Vote):**
```json
{
  "id": 5,
  "team": "Pakistan",
  "points": 20
}
```

**Response (No Vote):**
```json
null
```

---

## Component State Management:

```javascript
// Matches.jsx state:

const [matches, setMatches] = useState([])
// All matches with odds data

const [votes, setVotes] = useState({})
// Form state for current selections
// Format: { matchId: { team: 'Team A', points: '20' } }

const [userVotes, setUserVotes] = useState({})
// User's actual votes from database
// Format: { matchId: { team: 'Team A', points: 20 } }

const [loading, setLoading] = useState(true)
// Loading state while fetching data
```

---

## UI State Variations:

### State 1: No Vote Yet
```
[O] Team A  [O] Team B  | Points ▼ | [Vote] Button
- Radio buttons: unchecked
- Points: not selected
- Button label: "Vote"
- Button state: enabled if team & points selected
```

### State 2: Vote Exists
```
[O] Team A  [•] Team B  | Points 50 | [Update] Button
- Radio buttons: Team B selected
- Points: 50 selected
- Button label: "Update"
- Button state: enabled if any change made
```

### State 3: Match Started
```
STATUS: Match Started (disabled)
- Radio buttons: disabled (grayed)
- Points: disabled (grayed)
- Button: disabled (grayed)
- Text: "Match Started" in red
- Action column: Shows "Ended"
```

---

## Error Scenarios:

### Error 1: Insufficient Balance for New Vote
```
User action: Try to vote with 50 points (balance: 30)
Response: "Insufficient balance"
Result: Vote not placed
```

### Error 2: Insufficient Balance for Vote Change
```
Current vote: Team A, 20 points (balance: 970)
New vote: Team B, 100 points
Difference: +80 points
Balance after: 970 - 80 = 890 (valid) ✓
Result: Vote updated
```

```
Current vote: Team A, 20 points (balance: 30)
New vote: Team B, 50 points
Difference: +30 points
Balance after: 30 - 30 = 0 (valid) ✓
Result: Vote updated
```

### Error 3: Try to Vote After Match Starts
```
Current time: 2025-02-07 06:00
Match time: 2025-02-07 05:30
Status: Match started
Response: "Match has already started. Cannot vote now."
Result: Vote not placed, button disabled
```

---

## Testing Commands:

```bash
# Test 1: Place vote (before match starts)
curl -X POST http://localhost:4000/api/matches/1/vote \
  -H "x-user: senthil" \
  -H "Content-Type: application/json" \
  -d '{"team":"Pakistan","points":20}'

# Test 2: Get user's vote
curl http://localhost:4000/api/matches/1/user-vote \
  -H "x-user: senthil"

# Test 3: Update vote (before match starts)
curl -X POST http://localhost:4000/api/matches/1/vote \
  -H "x-user: senthil" \
  -H "Content-Type: application/json" \
  -d '{"team":"India","points":50}'
```

---

## Best Practices:

✅ Always check match time before voting
✅ Show existing vote to user on load
✅ Disable voting after match starts
✅ Provide clear error messages
✅ Update balance immediately
✅ Allow unlimited vote changes before match
✅ Keep vote history for auditing
✅ Use radio buttons for single selection
✅ Show odds in real-time
✅ Confirm actions with alerts

---

## Summary Table:

| Feature | Status | Details |
|---------|--------|---------|
| One vote per match | ✅ | Only team selection per match |
| Vote replacement | ✅ | Can change before match starts |
| Auto refund | ✅ | Old points refunded on change |
| Match time lock | ✅ | Voting blocked after match starts |
| Radio buttons | ✅ | Better than dropdowns |
| Pre-population | ✅ | Form auto-filled on load |
| Balance update | ✅ | Real-time after vote |
| Error handling | ✅ | Clear error messages |
| Odds update | ✅ | Real-time odds display |

---

**Ready for production!** 🚀

