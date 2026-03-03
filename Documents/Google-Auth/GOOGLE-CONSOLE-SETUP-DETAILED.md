# 📋 Google Cloud Console Setup - Detailed Steps

## Complete Step-by-Step Guide

### Prerequisites
- Google account (Gmail)
- Admin access to your Google Account
- Access to application domain/localhost

---

## Part 1: Create Google Cloud Project

### Step 1: Navigate to Google Cloud Console
1. Open browser: https://console.cloud.google.com
2. Sign in with your Google account
3. Accept terms if prompted

### Step 2: Create New Project
1. Click on the project selector dropdown (top left, next to "Google Cloud")
2. Click **"NEW PROJECT"**
3. Fill in project details:
   - **Project name**: `Cricket Mela` or `Cricket Mela Dev`
   - **Organization**: Leave blank (unless you have Workspace)
   - **Location**: Your choice
4. Click **"CREATE"**
5. Wait 2-3 minutes for project to be created

### Step 3: Enable Google+ API
1. In search bar, type: `Google+ API`
2. Click on result
3. Click **"ENABLE"**

---

## Part 2: Configure OAuth Consent Screen

### Step 1: Access OAuth Consent Screen
1. Left sidebar → **APIs & Services**
2. Click **"OAuth consent screen"**

### Step 2: Choose User Type
1. **User Type**: Select **"External"** (unless you have Google Workspace)
2. Click **"CREATE"**

### Step 3: Fill App Information
1. **App name**: `Cricket Mela`
2. **User support email**: your-email@gmail.com
3. Keep other fields as default
4. Click **"SAVE AND CONTINUE"**

### Step 4: Scopes
1. Click **"ADD OR REMOVE SCOPES"**
2. In search, type: `profile`
3. Select: `.../auth/userinfo.profile`
4. In search, type: `email`
5. Select: `.../auth/userinfo.email`
6. Click **"UPDATE"**
7. Click **"SAVE AND CONTINUE"**

### Step 5: Test Users (Optional for production)
1. Click **"ADD USERS"**
2. Add your email address
3. Click **"SAVE AND CONTINUE"**

---

## Part 3: Create OAuth Credentials

### Step 1: Create Credentials
1. Left sidebar → **Credentials**
2. Click **"+ CREATE CREDENTIALS"** (top button)
3. Select **"OAuth client ID"**

### Step 2: Configure Web Application
1. **Application type**: Select **"Web application"**
2. **Name**: `Cricket Mela Web Client`
3. Click **"CREATE"**

### Step 3: Add Authorized URLs

**Add JavaScript Origins:**
1. Click in "Authorized JavaScript origins" field
2. For each URL below, click **"ADD URI"** and paste:
   - `http://localhost:5173` (frontend dev)
   - `http://localhost:4000` (backend dev)
   - `http://localhost` (fallback)

**For Production, add:**
   - `https://yourdomain.com`
   - `https://www.yourdomain.com`

**Add Authorized Redirect URIs:**
1. Click in "Authorized redirect URIs" field
2. For each URL below, click **"ADD URI"** and paste:
   - `http://localhost:5173/auth/google/callback`
   - `http://localhost:4000/auth/google/callback`
   - `http://localhost:4000/api/auth/google/callback`

**For Production, add:**
   - `https://yourdomain.com/auth/google/callback`
   - `https://yourdomain-api.com/auth/google/callback`

3. Click **"SAVE"**

### Step 4: View & Copy Credentials
1. You'll see a dialog with:
   - **Client ID**: Looks like `123456789-abc...apps.googleusercontent.com`
   - **Client Secret**: Looks like `GOCSPX-abc...`
2. Copy both values
3. Keep them secure - don't share!
4. Click **"DONE"**

---

## Part 4: Store Credentials in Backend

### Step 1: Create .env File
In backend directory, create file: `.env`

### Step 2: Add Environment Variables
```
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_secret_here
GOOGLE_CALLBACK_URL=http://localhost:4000/auth/google/callback
```

### Step 3: Keep .env Secure
1. Add `.env` to `.gitignore` (already done)
2. Never commit this file
3. Never share credentials

---

## Part 5: Verify Setup

### Check 1: Google Cloud Console
1. Go to Credentials page
2. See your `Cricket Mela Web Client` listed
3. Click it to verify URLs are correct

### Check 2: Backend Environment
1. Terminal in backend directory
2. Run: `echo $GOOGLE_CLIENT_ID`
3. Should show your client ID (if set correctly)

### Check 3: Backend Running
```bash
cd backend
npm start
```

Expected: `Server running on port 4000`

### Check 4: Test OAuth
1. Frontend: http://localhost:5173
2. Click "Sign in with Google"
3. Should redirect to Google login

---

## Troubleshooting

### Issue: "Redirect URI mismatch"
**Causes:**
- URL doesn't match exactly
- Extra spaces or characters
- Missing http:// or https://
- Typo in domain

**Solution:**
1. Go to Google Cloud Console
2. Credentials → Your OAuth client
3. Check "Authorized redirect URIs" exactly match your URLs
4. Copy-paste exact URLs from your app
5. Click Save
6. Restart backend

### Issue: "Invalid Client ID"
**Causes:**
- Wrong ID copied
- Copied Client Secret instead
- Extra spaces in .env file

**Solution:**
1. Go to Google Cloud Console
2. Credentials → Click your OAuth client
3. Copy Client ID (not Secret)
4. Update .env file
5. Save file (no extra spaces)
6. Restart backend

### Issue: "Client Secret is not valid"
**Causes:**
- Wrong Secret copied
- Secret expired or regenerated

**Solution:**
1. Go to Google Cloud Console
2. Credentials → Click your OAuth client
3. Copy Client Secret again
4. Update .env file
5. Restart backend

### Issue: "Credential is not valid for use with this service"
**Causes:**
- API not enabled (Google+ API)
- Wrong type of credential created

**Solution:**
1. Go to Google Cloud Console
2. APIs & Services → Library
3. Search: `Google+ API`
4. Click **"ENABLE"**
5. Verify OAuth Client ID is created

---

## Important Files

After setup, you should have:
1. `.env` file in backend directory (with credentials)
2. `backend/auth/googleStrategy.js` (OAuth config)
3. `backend/index.js` (OAuth routes)
4. `frontend/src/Login.jsx` (Login button)

---

## Security Checklist

- ✅ Credentials stored in .env file
- ✅ .env file in .gitignore
- ✅ Never commit .env to git
- ✅ Credentials not in code
- ✅ Only authorize needed scopes
- ✅ Restrict redirect URIs to your domains

---

## Next Steps

1. ✅ Complete all steps above
2. ✅ Verify backend can access environment variables
3. ✅ Test Google OAuth flow
4. ✅ Create test user account
5. ✅ Admin approves new user
6. ✅ Ready for development!

---

**Your Google OAuth setup is complete!** 🚀

