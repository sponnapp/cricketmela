# ✅ VOTING SYSTEM COMPLETELY REDESIGNED

## Overview:

The voting system has been completely redesigned to allow:
- ✅ **One vote per match per user** - Users can only vote for one team per match
- ✅ **Vote replacement** - Users can change their vote anytime BEFORE the match starts
- ✅ **Automatic refund** - When changing vote, previous bet is refunded and new bet is deducted
- ✅ **Match time check** - Voting disabled after match start time
- ✅ **Radio buttons** - Better UX than dropdowns
- ✅ **Visual feedback** - Shows if match has started or ongoing

---

## Key Features:

### 1. One Vote Per Match
- User can only vote for ONE team per match
- System checks for existing vote before placing new one
- If user already voted, they get "Update" button instead of "Vote"

### 2. Vote Replacement Logic
**If user changes their vote:**
- Old vote points are refunded to user balance
- New vote points are deducted from balance
- Only the difference is calculated for balance change

**Example:**
- User votes Team A with 20 points (balance: 1000 → 980)
- Later changes vote to Team B with 50 points
- System refunds 20 points, deducts 50 points
- Net change: -30 points (balance: 980 + 20 - 50 = 950)

### 3. Match Start Time Check
- System compares current time with match scheduled_at time
- If current time >= scheduled_at: Match has started
- After match starts:
  - Vote radio buttons are disabled
  - Points dropdown is disabled
  - Vote button is disabled
  - Shows "Ended" status
  - Users cannot vote or change their vote

### 4. Radio Button Interface
**Benefits over dropdowns:**
- ✅ Clear, single selection
- ✅ Visual representation of both teams
- ✅ Better mobile experience
- ✅ No accidental submissions

### 5. User Vote Persistence
- On page load, system fetches user's existing votes
- Vote form is pre-populated with previous vote (if any)
- Users can see their current vote immediately
- Changing vote updates the form instantly

---

## Backend Implementation:

### Voting Endpoint: `/api/matches/:id/vote` (POST)

**Request:**
```javascript
{
  team: "Team Name",
  points: 20
}
```

**Flow:**
1. Check if user is authenticated
2. Check if match has started (compare scheduled_at with current time)
3. If match started → Reject vote
4. Check if user has existing vote for this match
5. If no existing vote → Deduct points, insert new vote
6. If existing vote:
   - If same team & points → Return success (unchanged)
   - If different → Calculate difference, update balance & vote
7. Return new balance and message

**Response:**
```javascript
{
  ok: true,
  balance: 950,
  message: "Vote placed" | "Vote updated" | "Vote unchanged"
}
```

**Error Responses:**
- "Match has already started. Cannot vote now."
- "Insufficient balance to change vote"
- "team and points required"
- "Unauthorized"

### User Vote Endpoint: `/api/matches/:id/user-vote` (GET)

**Purpose:** Get user's existing vote for a specific match

**Response:**
```javascript
{
  id: 1,
  team: "Pakistan",
  points: 20
}
// or null if no vote exists
```

---

## Frontend Implementation:

### Matches Component Updates:

**State Management:**
```javascript
const [votes, setVotes] = useState({}) // Current vote form state
const [userVotes, setUserVotes] = useState({}) // Existing votes from DB
```

**Match Start Detection:**
```javascript
function hasMatchStarted(scheduledAt) {
  const matchTime = new Date(scheduledAt)
  const now = new Date()
  return now >= matchTime
}
```

**Radio Button Rendering:**
```javascript
<label>
  <input
    type="radio"
    name={`vote-${m.id}`}
    value={m.home_team}
    checked={votes[m.id]?.team === m.home_team}
    onChange={...}
    disabled={matchStarted}
  />
  <span>{m.home_team}</span>
</label>
```

**Dynamic Button Label:**
```javascript
{userVote ? 'Update' : 'Vote'}
```

---

## User Experience:

### Scenario 1: First Time Voting
```
1. User sees match with radio buttons and points dropdown
2. User selects Team A radio button
3. User selects 20 points
4. User clicks "Vote" button
5. Alert: "Vote placed! New balance: 980"
6. Button changes to "Update" (indicating vote exists)
7. User's balance updated in UI
8. Odds updated in real-time
```

### Scenario 2: Changing Vote Before Match Starts
```
1. User selects Team B radio button (different team)
2. User selects 50 points (different points)
3. User clicks "Update" button
4. Alert: "Vote updated! New balance: 950"
5. Points recalculated: 980 + 20 - 50 = 950
6. Odds updated in real-time
```

### Scenario 3: After Match Starts
```
1. Radio buttons are disabled (grayed out)
2. Points dropdown is disabled
3. Vote/Update button is disabled
4. Status shows "Match Started"
5. Users cannot vote or change vote
6. Shows "Ended" in action column
```

---

## Database Changes:

### Votes Table (Already exists):
```sql
CREATE TABLE votes (
  id INTEGER PRIMARY KEY,
  match_id INTEGER,
  user_id INTEGER,
  team TEXT,
  points INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(match_id) REFERENCES matches(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
)
```

**Unique Constraint Concept:**
- While not explicitly added (to allow vote updates), the voting logic ensures only one active vote per user per match
- When updating, old vote is replaced with new one

---

## Vote History Logic:

**Vote Updates in Database:**
- Old vote record: **DELETE** not used, UPDATE is used
- Same vote record ID updated with new team/points
- created_at timestamp preserved (original vote time)
- This allows tracking when vote was first made

---

## Time Zone Consideration:

**Match Scheduled Time Format:**
- Stored as: `YYYY-MM-DDTHH:MM` (ISO 8601 format)
- Example: `2025-02-07T05:30`
- JavaScript automatically handles timezone conversion
- Both client and server use same timezone logic (current system time)

---

## Points Refund Logic:

**Formula for Vote Change:**
```
newBalance = currentBalance - (newPoints - oldPoints)
           = currentBalance + oldPoints - newPoints
```

**Example:**
```
Original: balance 1000, vote 20 points → 980
New vote: 50 points
Calculation: 980 - (50 - 20) = 980 - 30 = 950
```

---

## Validation Rules:

✅ User must be logged in
✅ Match must not have started (scheduled_at > current time)
✅ User must have sufficient balance for new/changed vote
✅ Both team and points must be selected
✅ User can only vote for one team per match
✅ User can change vote multiple times before match starts
✅ Points change is reflected immediately in balance

---

## Testing Checklist:

- [ ] User can place first vote for a match
- [ ] Button changes from "Vote" to "Update" after first vote
- [ ] User can change team selection
- [ ] User can change points selection
- [ ] Balance updates correctly when changing vote
- [ ] Radio buttons prevent multiple team selection
- [ ] Cannot vote after match starts
- [ ] Cannot change vote after match starts
- [ ] Disabled state is visually clear (grayed out)
- [ ] Vote form pre-populated with existing vote on page load
- [ ] Odds update in real-time after vote
- [ ] Error messages show for insufficient balance
- [ ] Error messages show for match already started

---

## Files Modified:

### Backend: `backend/index.js`
- Updated `/api/matches/:id/vote` endpoint (POST)
  - Added match start time check
  - Added existing vote detection
  - Added vote replacement logic
  - Added automatic point refund
  
- Added `/api/matches/:id/user-vote` endpoint (GET)
  - Returns user's existing vote for a match
  - Used to pre-populate vote form

### Frontend: `frontend/src/Matches.jsx`
- Complete rewrite of voting interface
- Replaced dropdowns with radio buttons
- Added match start time detection
- Added user vote fetching
- Added vote persistence
- Improved styling with rounded buttons
- Dynamic button labels ("Vote" vs "Update")

---

## Status:

✅ Backend: Vote replacement logic implemented
✅ Backend: Match time check implemented
✅ Backend: User vote retrieval endpoint added
✅ Frontend: Radio buttons implemented
✅ Frontend: Vote form pre-population implemented
✅ Frontend: Match start detection implemented
✅ Frontend: Dynamic button labels implemented
✅ Styling: Modern rounded design applied
✅ Testing: Ready for QA

---

**Complete voting system redesign implemented!** 🎉

