# 🔧 Google OAuth Implementation Details

## Architecture Overview

Cricket Mela implements Google OAuth using:
- **Passport.js** - Authentication middleware
- **Express-session** - Session management
- **SQLite** - User data storage
- **Google OAuth 2.0** - Google authentication service

---

## Backend Architecture

### 1. Passport Google Strategy
**File:** `backend/auth/googleStrategy.js`

```javascript
// Initializes Passport with Google OAuth
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, (accessToken, refreshToken, profile, done) => {
  // Handle user profile from Google
  // Create or update user in database
}))

// Serialize user to session
passport.serializeUser((user, done) => {
  done(null, user.id)
})

// Deserialize user from session
passport.deserializeUser((id, done) => {
  // Load user from database by ID
})
```

### 2. OAuth Routes
**File:** `backend/index.js`

```javascript
// Initiate OAuth flow
app.get('/auth/google', passport.authenticate('google', {scope: ['profile', 'email']}))

// Handle OAuth callback
app.get('/auth/google/callback', 
  passport.authenticate('google', {failureRedirect: '/'}),
  (req, res) => {
    // Redirect to dashboard or login
  }
)

// Logout endpoint
app.post('/auth/logout', (req, res) => {
  req.logout()
  res.json({ok: true})
})

// Check auth status
app.get('/api/auth/status', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({authenticated: true, user: req.user})
  } else {
    res.json({authenticated: false})
  }
})
```

---

## Frontend Architecture

### 1. Login Page
**File:** `frontend/src/Login.jsx`

```javascript
// Google Sign-In Button
<button onClick={() => {
  window.location.href = '/api/auth/google'
}}>
  Sign in with Google
</button>
```

### 2. Session Management
```javascript
// Check if user is authenticated
const [user, setUser] = useState(null)

useEffect(() => {
  axios.get('/api/auth/status').then(res => {
    if (res.data.authenticated) {
      setUser(res.data.user)
    }
  })
}, [])
```

### 3. Profile & Password
**File:** `frontend/src/Profile.jsx`

```javascript
// Fetch user's auth method
const [authMethod, setAuthMethod] = useState(null)

useEffect(() => {
  axios.get(`/api/users/${user.id}/auth-method`)
    .then(res => setAuthMethod(res.data))
}, [user.id])

// Show/hide password fields based on auth method
{authMethod?.canChangePassword && (
  <>
    {/* Password form fields */}
  </>
)}
```

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT,                    -- NULL for Google-only
  email TEXT,
  display_name TEXT,
  role TEXT DEFAULT 'picker',
  balance INTEGER DEFAULT 0,
  approved INTEGER DEFAULT 0,
  google_id TEXT UNIQUE,            -- Google OAuth ID
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### User Type Detection Logic
```javascript
// In backend: /api/users/:id/auth-method endpoint
const hasGoogleId = user.google_id !== null
const hasPassword = user.password !== null

let authMethod = 'password'
if (hasGoogleId && !hasPassword) {
  authMethod = 'google'      // Google-only
} else if (hasGoogleId && hasPassword) {
  authMethod = 'both'         // Dual-auth
}

const canChangePassword = hasPassword || authMethod !== 'google'
```

---

## OAuth Flow Diagram

```
User clicks "Sign in with Google"
        ↓
Frontend redirects to /auth/google
        ↓
Backend redirects to Google Login
        ↓
User authenticates with Google
        ↓
Google redirects to /auth/google/callback
        ↓
Backend receives OAuth code from Google
        ↓
Backend exchanges code for access token
        ↓
Backend fetches user profile from Google
        ↓
Backend checks if user exists in database
        ├─ If exists: Load user
        └─ If new: Create user with google_id
        ↓
Backend creates session for user
        ↓
Backend redirects to dashboard
        ↓
Frontend loads with authenticated user
```

---

## Session Management

### How Sessions Work

1. **User Authenticates:**
   - Passport validates with Google
   - Creates session with user ID
   - Sets session cookie in browser

2. **Session Persists:**
   - Browser sends cookie on every request
   - Server deserializes user from session
   - `req.user` available in all routes

3. **Session Ends:**
   - User logs out
   - Session destroyed
   - Cookie cleared

---

## Password Management Logic

### Google-Only Users (google_id set, password NULL)

**Profile Page:**
```javascript
// Hide password fields
if (authMethod.canChangePassword === false) {
  // Show banner: "Google Authentication - Password management is not available"
  // Hide password input fields
}
```

**Backend Validation:**
```javascript
if (user.google_id && !user.password) {
  // Reject password change
  return res.status(400).json({
    error: 'Cannot set password for Google OAuth users'
  })
}
```

### Dual-Auth Users (both google_id and password set)

**Profile Page:**
```javascript
// Show password fields
if (authMethod.canChangePassword === true) {
  // Show banner: "Dual Authentication - Can login with Google or password"
  // Show password input fields
}
```

**Backend Allows:**
```javascript
if (user.password && user.google_id) {
  // Allow password change
  // User can login with either method
}
```

---

## API Endpoints

### Authentication Endpoints

```
GET /auth/google
  - Initiates OAuth with Google
  - Parameters: scope (profile, email)
  - Redirect: Google OAuth consent screen

GET /auth/google/callback
  - OAuth callback from Google
  - Parameters: code, state
  - Returns: Session cookie, redirects to /

POST /auth/logout
  - Ends session
  - Clears session cookie
  - Returns: {ok: true}

GET /api/auth/status
  - Check if user authenticated
  - Returns: {authenticated: true/false, user: {...}}
```

### User Management Endpoints

```
GET /api/users/:id/auth-method
  - Get user's authentication method
  - Returns: {
      hasGoogleId: boolean,
      hasPassword: boolean,
      authMethod: 'google' | 'password' | 'both',
      canChangePassword: boolean
    }

PUT /api/users/:id/profile
  - Update user profile
  - Validates: Google-only users can't set passwords
  - Returns: {ok: true}

PUT /api/admin/users/:id/password
  - Admin reset user password
  - Validates: Can't reset password for Google-only users
  - Returns: {ok: true}
```

---

## Error Handling

### Common Errors

**OAuth Errors:**
```javascript
// Redirect URI mismatch
Error: redirect_uri_mismatch
// Solution: Update authorized URIs in Google Console

// Invalid client ID
Error: invalid_client
// Solution: Verify credentials in .env file

// Access denied
Error: access_denied
// Solution: User denied permissions or email not in test list
```

**Password Errors:**
```javascript
// Trying to set password for Google user
{error: 'Cannot set password for Google OAuth users'}

// Trying to reset password for Google user (admin)
{error: 'Cannot set password for Google OAuth users. They authenticate via Google.'}
```

---

## Security Implementation

### 1. Credential Protection
- Client ID stored in code (safe - public)
- Client Secret stored in .env (protected)
- .env in .gitignore (never committed)

### 2. Session Security
- Sessions stored in memory (can use Redis for scaling)
- Session cookie has `HttpOnly` flag (JavaScript can't access)
- Session ID not exposed to frontend

### 3. OAuth Flow Security
- Authorization code exchanged server-side (not in browser)
- Access tokens never sent to frontend
- CSRF protection via session state

### 4. Password Security
- Passwords hashed with bcrypt (if used)
- Never stored in plain text
- Only accessible to authenticated users

---

## Deployment Considerations

### Environment Variables
```
Production .env:
GOOGLE_CLIENT_ID=prod_client_id
GOOGLE_CLIENT_SECRET=prod_client_secret
GOOGLE_CALLBACK_URL=https://yourdomain.com/auth/google/callback
```

### Database Backups
```sql
-- Backup users table
SELECT * FROM users WHERE google_id IS NOT NULL;

-- Monitor dual-auth users
SELECT * FROM users WHERE google_id IS NOT NULL AND password IS NOT NULL;
```

### Monitoring
- Check OAuth endpoint logs
- Monitor failed login attempts
- Track new user signups
- Monitor admin approvals

---

## Testing Checklist

- ✅ Local OAuth flow works
- ✅ User created in database
- ✅ Admin can approve user
- ✅ User can login with Google
- ✅ Profile page shows auth method
- ✅ Password fields hidden for Google-only
- ✅ Session persists across pages
- ✅ Logout clears session
- ✅ Production URLs configured in Google Console
- ✅ Environment variables set in production

---

## Maintenance

### Regular Tasks
- Monitor failed login attempts
- Review approved users list
- Check session storage usage
- Update Google Cloud Console URLs as needed

### When Things Break
1. Check .env file has correct credentials
2. Verify Google Console URLs match deployment
3. Check backend logs for OAuth errors
4. Clear browser cache and cookies
5. Restart backend server

---

**Implementation complete and ready for production!** 🚀

