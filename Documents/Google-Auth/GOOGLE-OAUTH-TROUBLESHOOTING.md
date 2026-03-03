# 🔍 Google OAuth Troubleshooting Guide

## Quick Diagnosis

### Symptom: "Redirect URI mismatch" Error

**What it means:** Your app's callback URL doesn't match what Google has on file

**How to fix:**
1. Go to Google Cloud Console
2. Credentials → Your OAuth Client
3. Check "Authorized redirect URIs"
4. Make sure your current URL is listed exactly:
   - Example: `http://localhost:4000/auth/google/callback`
   - Check for: http:// vs https://, no trailing slash, exact domain
5. If missing, click "ADD URI" and add it
6. Save changes
7. Restart backend
8. Try again

---

### Symptom: "Invalid Client ID" Error

**What it means:** Backend can't read your Google credentials

**How to fix:**
1. Check backend is running: `curl http://localhost:4000/api/health`
2. Check .env file exists in backend directory:
   ```bash
   ls -la backend/.env
   ```
3. Verify contents are correct (no extra spaces):
   ```
   GOOGLE_CLIENT_ID=your_id_here
   GOOGLE_CLIENT_SECRET=your_secret_here
   GOOGLE_CALLBACK_URL=http://localhost:4000/auth/google/callback
   ```
4. Restart backend:
   ```bash
   cd backend
   npm start
   ```

---

### Symptom: "User not found" After OAuth Login

**What it means:** User was created but can't be found in database

**How to fix:**
1. Check database has user:
   ```sql
   SELECT * FROM users WHERE google_id IS NOT NULL;
   ```
2. If no results, OAuth didn't create user - check backend logs
3. If user exists, check `approved` field:
   ```sql
   SELECT id, username, approved FROM users WHERE google_id IS NOT NULL;
   ```
4. If `approved` = 0, user is pending approval
5. Admin must approve first: Admin > Users > Pending Approvals

---

### Symptom: "403 Forbidden" After Login

**What it means:** User exists but is not approved

**How to fix:**
1. Login as admin
2. Go to Admin > Users
3. Find new user under "Pending Approvals"
4. Click "Approve"
5. Set balance (e.g., 1000)
6. Select seasons to assign
7. Click "Save"
8. New user can now login

---

### Symptom: "Cannot authenticate" When Using Password Login

**What it means:** User authenticated via Google, doesn't have password set

**How to fix:**
1. This is expected - Google users don't have passwords
2. User should use "Sign in with Google" button
3. If user needs password:
   - Admin can set one: Admin > Users > Edit > Reset Password
   - This converts user to dual-authentication
   - User can then login with Google OR password

---

## Advanced Troubleshooting

### Check 1: Is Backend Running?

```bash
curl http://localhost:4000/api/health
```

**Expected response:**
```json
{"status":"ok"}
```

**If no response:** Backend not running
- Stop: `pkill -f "node index.js"`
- Start: `cd backend && npm start`

---

### Check 2: Can Backend Access Google Credentials?

```bash
# Check if environment variables loaded
curl http://localhost:4000/auth/google -v 2>&1 | grep -i "client"
```

**Should show:** Redirect to Google OAuth login page
**If error:** Credentials not loaded

**Fix:**
1. Verify .env file in backend directory
2. Check syntax: `KEY=VALUE` (no quotes)
3. Restart backend
4. Try again

---

### Check 3: Are Credentials Correct?

In Google Cloud Console:
1. Credentials → Your OAuth Client
2. Check **Client ID** matches your .env
3. Check **Client Secret** matches your .env
4. Verify they're not swapped

---

### Check 4: Do URLs Match Exactly?

Google Console vs Your App:

**Local Development:**
- Google Console: `http://localhost:4000/auth/google/callback`
- Your App: Must be `http://localhost:4000/auth/google/callback`
- ❌ NOT `http://localhost/auth/google/callback` (different port)
- ❌ NOT `http://localhost:4000/api/auth/google/callback` (wrong path)

**Production:**
- Google Console: `https://yourdomain-api.com/auth/google/callback`
- Your App: Must be `https://yourdomain-api.com/auth/google/callback`
- ❌ NOT `https://www.yourdomain.com/auth/google/callback` (different domain)

---

### Check 5: Is User Database Working?

```bash
cd backend
sqlite3 data.db
```

```sql
-- Check if users table exists
.tables

-- Check for Google users
SELECT id, username, google_id, approved FROM users WHERE google_id IS NOT NULL;

-- Check all users
SELECT id, username, approved FROM users;

-- Exit SQLite
.quit
```

---

### Check 6: Browser Console Errors

Press F12 in browser:
1. Go to **Console** tab
2. Check for red error messages
3. Common errors:
   - `Cannot GET /auth/google` → Backend not running or wrong URL
   - `Network error` → Backend not accessible
   - `Session not found` → Session cookie issue

---

## Step-by-Step Login Flow Debug

### Step 1: Click "Sign in with Google"
Check browser console for JavaScript errors

### Step 2: Redirected to Google Login?
- ✅ Good: You see Google login page
- ❌ Bad: Error message like "Redirect URI mismatch"
  - Fix: Check URLs in Google Console

### Step 3: Login with Google
- ✅ Good: Google asks for permissions
- ❌ Bad: "This app hasn't been verified" or permission denied
  - Fix: Email must be in test users list (or app approved)

### Step 4: Redirected Back to Your App
- ✅ Good: Redirected to dashboard or login page
- ❌ Bad: Shows error or 404 page
  - Fix: Check backend logs: `tail -f backend.log`

### Step 5: Check User Created
1. Login as admin
2. Admin > Users
3. Check "Pending Approvals" section
4. Your email should be listed

### Step 6: Admin Approves
1. Click "Approve"
2. Set balance
3. Assign seasons
4. Save

### Step 7: Login as New User
1. Logout
2. Click "Sign in with Google"
3. Login with same Google account
4. Should be logged in!

---

## Backend Log Analysis

Check backend logs for issues:

```bash
# View backend logs
tail -f backend.log

# Common log messages:
# ✅ "passport.authenticate called" → OAuth flow started
# ✅ "User created with google_id" → New user created
# ❌ "Cannot find Google strategy" → Passport not initialized
# ❌ "Invalid Client ID" → Credentials problem
```

---

## Database Inspection

### Find OAuth Problems

```sql
-- Find users with incomplete data
SELECT id, username, google_id, password, approved 
FROM users 
WHERE google_id IS NOT NULL;

-- Find unapproved users
SELECT id, username, email, approved 
FROM users 
WHERE approved = 0;

-- Count by authentication type
SELECT 
  CASE 
    WHEN google_id IS NOT NULL AND password IS NOT NULL THEN 'Dual-Auth'
    WHEN google_id IS NOT NULL THEN 'Google-Only'
    ELSE 'Password-Only'
  END as auth_type,
  COUNT(*) as count
FROM users
GROUP BY auth_type;
```

---

## Common Issues & Quick Fixes

| Issue | Cause | Quick Fix |
|-------|-------|-----------|
| Redirect URI mismatch | URL doesn't match | Update Google Console URLs |
| Invalid Client ID | Credentials wrong/missing | Check .env file, restart backend |
| Cannot login after signup | User not approved | Admin approve user first |
| Password won't save | Google-only user | Use "Reset Password" button |
| Session lost | Cookie cleared | Clear browser cookies, refresh |
| 404 on callback | Wrong route | Check URL ends with `/auth/google/callback` |
| Blank page after login | Redirect issue | Check browser console for errors |

---

## Getting Help

If you're still stuck:

### Check These Files
1. `backend/.env` - Credentials correct?
2. `backend/auth/googleStrategy.js` - Config initialized?
3. `backend/index.js` - OAuth routes defined?
4. `frontend/src/Login.jsx` - Login button correct?

### Check Backend Logs
```bash
cd backend
npm start
# Watch for error messages
```

### Check Browser Logs
Press F12 → Console tab → Look for red errors

### Check Google Cloud Console
1. Verify credentials exist
2. Verify URLs are correct
3. Verify API is enabled
4. Check test users list

---

## Quick Restart Script

When everything feels broken:

```bash
# Kill all Node processes
pkill -f "node"

# Kill all npm processes
pkill -f "npm"

# Wait
sleep 2

# Restart both servers
cd /path/to/Cricket\ Mela/backend && npm start &
cd /path/to/Cricket\ Mela/frontend && npm run dev &

# Check they're running
curl http://localhost:4000/api/health
curl http://localhost:5173 2>/dev/null | head -5
```

---

## Success Indicators

✅ Successful OAuth setup shows:
- Backend: `Server running on port 4000`
- Frontend: No console errors
- Google login works
- User created in database
- Admin can approve users
- User can login with Google
- Profile page shows auth method

---

**Still stuck? Check the logs and try restarting both servers!** 🔧

