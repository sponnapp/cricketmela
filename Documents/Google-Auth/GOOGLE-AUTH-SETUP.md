# 🔐 Google OAuth Authentication Setup Guide

## Overview

Cricket Mela supports dual authentication:
- **Google OAuth** - Login with Google account
- **Traditional** - Username/password login
- **Dual-Auth** - Support for both methods

---

## Quick Start

### Step 1: Create Google Cloud Project
1. Go to https://console.cloud.google.com
2. Create new project: `Cricket Mela`
3. Go to **OAuth consent screen**
4. Set App name: `Cricket Mela`
5. Add your email as support email
6. Click **Save and Continue**

### Step 2: Create OAuth Credentials
1. Go to **Credentials** page
2. Click **+ CREATE CREDENTIALS**
3. Select **OAuth client ID**
4. Choose **Web application**
5. Set Name: `Cricket Mela Web Client`

### Step 3: Configure URLs

**For Local Development:**
```
Authorized JavaScript origins:
- http://localhost:5173
- http://localhost:4000

Authorized redirect URIs:
- http://localhost:5173/auth/google/callback
- http://localhost:4000/auth/google/callback
```

**For Production:**
```
Authorized JavaScript origins:
- https://yourdomain.com

Authorized redirect URIs:
- https://yourdomain.com/auth/google/callback
- https://yourdomain-api.com/auth/google/callback
```

### Step 4: Copy Credentials
1. Copy **Client ID** and **Client Secret**
2. Save them securely

### Step 5: Configure Backend

Create `.env` file in backend:
```
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:4000/auth/google/callback
```

### Step 6: Start Backend
```bash
cd backend
npm install
npm start
```

### Step 7: Start Frontend
```bash
cd frontend
npm run dev
```

### Step 8: Test OAuth
1. Go to http://localhost:5173
2. Click "Sign in with Google"
3. Authenticate with Google
4. Admin approves the new user
5. User can now login!

---

## Database Schema

Users table now includes:
```sql
google_id TEXT UNIQUE  -- Stores Google OAuth ID
password TEXT          -- NULL for Google-only users
```

### User Types

**Google-Only:** google_id set, password NULL
**Traditional:** google_id NULL, password set
**Dual-Auth:** Both google_id and password set

---

## Profile & Password Management

### Google-Only Users:
- ❌ Cannot set passwords (Profile hides password fields)
- ❌ Admin cannot reset password (button hidden in edit modal)
- ✅ Can only authenticate via Google

### Dual-Auth Users:
- ✅ Can change password in Profile page
- ✅ Admin can reset password
- ✅ Can login with Google OR password

### Traditional Users:
- ✅ Can change password
- ✅ Admin can reset password
- ✅ Login with username/password only

---

## API Endpoints

```
GET /auth/google
- Start OAuth flow

GET /auth/google/callback
- Handle Google callback

POST /auth/logout
- Clear session

GET /api/users/:id/auth-method
- Get user's auth method
- Response: {hasGoogleId, hasPassword, authMethod, canChangePassword}
```

---

## Troubleshooting

### "Redirect URI mismatch"
- Check URL exactly matches in Google Console
- No trailing slashes
- Include http:// or https://

### "Invalid Client ID"
- Verify you copied it correctly
- Check for extra spaces
- Restart backend

### "Cannot login after signup"
- User needs admin approval first
- Check the Pending Approvals section

### "Password fields showing for Google user"
- Clear browser cache
- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+F5 (Windows)

---

## Security Notes

✅ Client Secret is server-side only (never exposed)
✅ OAuth handled server-side with Passport
✅ Sessions managed with express-session
✅ Credentials stored in environment variables

### Best Practices:
1. Never commit credentials to git
2. Use environment variables for all secrets
3. Restrict redirect URIs to your domains
4. Use HTTPS in production
5. Monitor login attempts

---

## Files Involved

- `backend/auth/googleStrategy.js` - OAuth configuration
- `backend/index.js` - OAuth routes
- `frontend/src/Login.jsx` - Login UI
- `frontend/src/Profile.jsx` - Password management
- `frontend/src/Admin.jsx` - User management

---

## Next Steps

1. ✅ Complete Google Cloud Console setup
2. ✅ Set environment variables
3. ✅ Restart servers
4. ✅ Test Google OAuth flow
5. ✅ Approve test users as admin
6. ✅ Deploy to production with updated URLs

For detailed instructions, see related documentation files in the project.

**Google OAuth is fully integrated and ready to use!** 🚀

