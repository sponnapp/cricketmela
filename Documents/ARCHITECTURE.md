# Application Architecture & Flow Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER'S BROWSER                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  http://localhost:5173 (React + Vite)                   │  │
│  │                                                          │  │
│  │  ┌─────────────┬───────────────┬──────────────────────┐ │  │
│  │  │   Login     │   Seasons     │   Matches & Voting   │ │  │
│  │  └─────────────┴───────────────┴──────────────────────┘ │  │
│  │                    ↓ (HTTP/JSON)                         │  │
│  │  ┌──────────────────────────────────────────────────────┐ │  │
│  │  │  Vote History | Admin (CSV Upload) | Logout          │ │  │
│  │  └──────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          ↕ API Calls                            │
└──────────────────────────┼──────────────────────────────────────┘
                           │
            ┌──────────────┴──────────────┐
            ↓                             ↓
     ┌─────────────────┐         ┌──────────────────┐
     │  Backend API    │         │  Local SQLite DB │
     │  http://4000    │◄───────→│  data.db         │
     │  (Express.js)   │         │                  │
     └─────────────────┘         └──────────────────┘
```

## Authentication Flow

```
User visits http://localhost:5173
           ↓
    ┌──────────────┐
    │  Login Page  │
    │  (username)  │
    │  (password)  │
    └──────────────┘
           ↓
    POST /api/login
    {username, password}
           ↓
    Backend validates credentials
           ↓
    Returns: {id, username, role, balance}
           ↓
    Frontend stores in localStorage
           ↓
    User logged in → Redirect to Seasons
```

## Feature: CSV Bulk Upload

```
Admin at Seasons page
        ↓
    Click "Admin" button
        ↓
    ┌──────────────────────┐
    │  Admin Panel         │
    │  - Create Season     │
    │  - Create Match      │
    │  - Bulk CSV Upload ◄─┼── PASTE CSV
    │  - Manage Matches    │
    └──────────────────────┘
        ↓
    Select season + Paste CSV
        ↓
    ┌─────────────────────────┐
    │ home_team,away_team,... │
    │ Team A,Team B,2025-05.. │
    │ Team C,Team D,2025-06.. │
    └─────────────────────────┘
        ↓
    Click "Upload CSV"
        ↓
    POST /api/admin/upload-matches
    {seasonId, csvData}
        ↓
    Backend parses CSV
        ↓
    Insert matches into DB
        ↓
    Return: {inserted: 2}
        ↓
    Show success alert + refresh list
```

## Feature: Vote History & Balance

```
User logs in (has id=1)
        ↓
    Click "Vote History" button
        ↓
    GET /api/users/1/votes
        ↓
    Backend queries:
    SELECT v.*, m.home_team, m.away_team, m.winner
    FROM votes v
    JOIN matches m
    WHERE user_id = 1
        ↓
    Returns vote records with match details
        ↓
    Display in React component:
    ┌──────────────────────────────────┐
    │ Current Balance: 450 points       │
    ├──────────────────────────────────┤
    │ Match | Your Vote | Points | Win │
    │-------|-----------|--------|-----|
    │ M vs C│ Mumbai    │ 50     │ ✅  │
    │ D vs R│ Delhi     │ 20     │ ⏳  │
    └──────────────────────────────────┘
```

## Feature: Voting & Winner Distribution

```
User (balance: 500)
        ↓
    SELECT match with 50 points
        ↓
    POST /api/matches/1/vote
    {team: "Mumbai", points: 50}
    Header: x-user: senthil
        ↓
    Backend:
    - Check balance >= 50 ✓
    - Deduct 50 from user
    - Insert vote record
    - Return new balance (450)
        ↓
    Display: "Vote placed! Balance: 450"
    User now has 450 points
        ↓
    [Later] Admin sets winner
        ↓
    POST /api/admin/matches/1/winner
    {winner: "Mumbai"}
        ↓
    Backend calculates:
    - totalLoser = votes on non-winners (e.g., 200)
    - totalWinner = votes on Mumbai (e.g., 50)
    - For each winner vote:
      payout = stake + (stake/totalWinner)*totalLoser
      payout = 50 + (50/50)*200 = 250
        ↓
    Update winning users' balance:
    450 + 250 = 700
        ↓
    User logs back in
        ↓
    Vote History shows: ✅ Won
    New balance: 700 points!
```

## Component Hierarchy

```
App.jsx
├── Login.jsx (if not authenticated)
│
├── Header
│   ├── Navigation buttons
│   └── User info (balance, logout)
│
├── Main content (conditional)
│   ├── Seasons.jsx (list seasons)
│   ├── Matches.jsx (vote on matches)
│   ├── Admin.jsx (admin panel)
│   │   ├── Season Creator
│   │   ├── Match Creator
│   │   └── CSV Uploader ◄── NEW
│   │       └── Textarea + Upload button
│   │
│   └── VoteHistory.jsx ◄── NEW
│       ├── Balance display
│       └── Votes table
│
└── Footer
```

## Data Model

```
users
├── id (PK)
├── username (UNIQUE)
├── role (admin|picker)
└── balance (REAL)

seasons
├── id (PK)
└── name

matches
├── id (PK)
├── season_id (FK)
├── home_team
├── away_team
├── scheduled_at
└── winner

votes
├── id (PK)
├── match_id (FK)
├── user_id (FK)
├── team
├── points
└── created_at
```

## State Management (Frontend)

```
App State
├── user
│   ├── id
│   ├── username
│   ├── role
│   ├── balance
│   └── stored in localStorage
│
├── page (current view)
│   ├── 'seasons'
│   ├── 'matches'
│   ├── 'admin'
│   └── 'history'
│
└── seasonId (for matches view)
```

## API Call Flow

```
Frontend UI Action → Axios call → Express handler → SQLite query → Response

Example: Vote submission
┌────────────────────┐
│  Vote button click  │
└────────────────────┘
        ↓
axios.post('/api/matches/1/vote',
  {team, points},
  {headers: {'x-user': 'senthil'}}
)
        ↓
┌──────────────────────────────────────┐
│  Express handler                     │
│  app.post('/api/matches/:id/vote')   │
│  - Get user from x-user header       │
│  - Check balance                     │
│  - Deduct points                     │
│  - Insert vote                       │
│  - Return new balance                │
└──────────────────────────────────────┘
        ↓
db.run('UPDATE users...')
db.run('INSERT INTO votes...')
        ↓
┌──────────────────────────────┐
│  Return to client            │
│  {ok: true, balance: 450}    │
└──────────────────────────────┘
        ↓
Frontend updates state + shows alert
```

## Error Handling Flow

```
User attempts action
        ↓
    Validation check
        ├─ FAIL → Show error
        │
        ↓ PASS
    Make API request
        ├─ 401 → "Not logged in"
        ├─ 403 → "Forbidden (not admin)"
        ├─ 400 → "Invalid input"
        ├─ 500 → "Server error"
        │
        ↓ 200/201
    Success! Update UI
```

## Deployment Architecture (Future)

```
┌──────────────────────┐     ┌──────────────────────┐
│  Vercel / Netlify    │     │  Heroku / Render     │
│  (Frontend)          │     │  (Backend API)       │
│  React + Vite        │     │  Express.js          │
│  https://...         │────→│  https://api...      │
└──────────────────────┘     └──────────────────────┘
                                      ↓
                              ┌──────────────────────┐
                              │  PostgreSQL          │
                              │  (Production DB)     │
                              │  AWS RDS / Heroku    │
                              └──────────────────────┘
```

---

## Summary

- **Frontend:** React components communicate with backend via HTTP
- **Backend:** Express endpoints validate, process, store in SQLite
- **Auth:** Username/password login via POST endpoint
- **New Features:** CSV upload, Vote history, proper auth
- **Data Flow:** UI → API → Database → UI

