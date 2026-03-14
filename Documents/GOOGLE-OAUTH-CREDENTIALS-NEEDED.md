# Google Sign-In Not Working - Missing OAuth Credentials

## ✅ Issue Identified: March 2, 2026

### Problem
The "Sign in with Google" button returns 200 instead of redirecting to Google. The root cause is **missing Google OAuth credentials** in the Fly.io backend.

---

## 🔍 Root Cause

I checked the Fly.io secrets and found that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are not set. Without these credentials, the Google OAuth strategy cannot initialize properly, causing the authentication to fail silently.

**What's happening**:
1. User clicks "Sign in with Google"
2. Request reaches backend `/auth/google`
3. Passport tries to authenticate with Google strategy
4. **Google credentials missing** → Strategy fails to redirect
5. Returns 200 instead of 302 redirect ❌

---

## ✅ Solution

### Step 1: Get Google OAuth Credentials

You need to get these from Google Cloud Console:

1. Go to: https://console.cloud.google.com
2. Select your project (or create one)
3. Navigate to: **APIs & Services** → **Credentials**
4. Find your OAuth 2.0 Client ID
5. Copy:
   - **Client ID**: looks like `xxxxx.apps.googleusercontent.com`
   - **Client Secret**: looks like `GOCSPX-xxxxx`

### Step 2: Set Credentials in Fly.io

Run these commands from your terminal:

```bash
cd /Users/senthilponnappan/IdeaProjects/Test/backend

# Set Google Client ID
flyctl secrets set GOOGLE_CLIENT_ID="YOUR_CLIENT_ID_HERE"

# Set Google Client Secret  
flyctl secrets set GOOGLE_CLIENT_SECRET="YOUR_CLIENT_SECRET_HERE"

# Optional: Set a secure session secret
flyctl secrets set SESSION_SECRET="$(openssl rand -base64 32)"
```

Replace `YOUR_CLIENT_ID_HERE` and `YOUR_CLIENT_SECRET_HERE` with your actual credentials.

### Step 3: Verify Credentials Are Set

```bash
flyctl secrets list
```

You should see:
```
NAME                    DIGEST                          CREATED AT
GOOGLE_CLIENT_ID        xxxxxxxxxxxxxxxxxxxxx           XX seconds ago
GOOGLE_CLIENT_SECRET    xxxxxxxxxxxxxxxxxxxxx           XX seconds ago
SESSION_SECRET          xxxxxxxxxxxxxxxxxxxxx           XX seconds ago
```

### Step 4: Restart the App

The app will automatically restart when you set the secrets, but you can manually restart if needed:

```bash
flyctl apps restart cricketmela-api
```

---

## 🔧 Google Cloud Console Configuration

### Important: Set Authorized Redirect URIs

In Google Cloud Console, you must add these authorized redirect URIs:

1. Go to: **APIs & Services** → **Credentials**
2. Click your OAuth 2.0 Client ID
3. Add to **Authorized redirect URIs**:
   ```
   https://cricketmela-api.fly.dev/auth/google/callback
   http://localhost:4000/auth/google/callback
   ```

4. Add to **Authorized JavaScript origins** (if not already):
   ```
   https://cricketmela.pages.dev
   https://cricketmela-api.fly.dev
   http://localhost:5173
   http://localhost:4000
   ```

5. Click **Save**

---

## 🛠️ Additional Fix Applied

I also updated the backend session configuration to support cross-origin cookies:

### File: `backend/index.js` (line 44-55)

**Changed**:
```javascript
cookie: {
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  maxAge: 24 * 60 * 60 * 1000,
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // NEW
  domain: process.env.NODE_ENV === 'production' ? undefined : undefined
}
```

**Why**: This allows session cookies to work across different domains (`cricketmela.pages.dev` → `cricketmela-api.fly.dev`).

---

## ✅ After Setting Credentials

### Expected Behavior:

1. **Click "Sign in with Google"**:
   - Should redirect to Google login page (302 redirect)
   - URL should be `accounts.google.com/...`

2. **After Google login**:
   - Redirects to `https://cricketmela-api.fly.dev/auth/google/callback`
   - Then redirects to `https://cricketmela.pages.dev/?auth=success&user=...`
   - User is logged in ✅

### Testing:

```bash
# Test the OAuth endpoint (should redirect to Google)
curl -I https://cricketmela-api.fly.dev/auth/google

# Expected response:
HTTP/2 302 
location: https://accounts.google.com/o/oauth2/v2/auth?...
```

---

## 📋 Complete Checklist

- [x] Backend session configuration updated (sameSite: 'none')
- [x] Backend deployed to Fly.io
- [ ] Google OAuth credentials obtained from Google Cloud Console
- [ ] GOOGLE_CLIENT_ID set in Fly.io secrets
- [ ] GOOGLE_CLIENT_SECRET set in Fly.io secrets
- [ ] SESSION_SECRET set in Fly.io secrets (optional but recommended)
- [ ] Authorized redirect URIs configured in Google Cloud Console
- [ ] Backend restarted (automatic after setting secrets)
- [ ] Tested: Click "Sign in with Google" → redirects to Google
- [ ] Tested: Complete Google login → logged into app

---

## 🔐 Security Note

**Never commit OAuth credentials to code!** Always use environment variables/secrets:

- ❌ **Don't**: Hard-code credentials in code
- ✅ **Do**: Use `process.env.GOOGLE_CLIENT_ID`
- ✅ **Do**: Set via `flyctl secrets set`

---

## 🚀 Quick Start Commands

```bash
# Navigate to backend
cd /Users/senthilponnappan/IdeaProjects/Test/backend

# Set Google credentials (replace with your actual values)
flyctl secrets set GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
flyctl secrets set GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"

# Set session secret (generates random secure string)
flyctl secrets set SESSION_SECRET="$(openssl rand -base64 32)"

# Verify
flyctl secrets list

# Test (should get 302 redirect)
curl -I https://cricketmela-api.fly.dev/auth/google
```

---

## 📞 Need Help Getting Credentials?

### Creating a Google Cloud Project:

1. Go to: https://console.cloud.google.com
2. Click **Select a project** → **New Project**
3. Name: "Cricket Mela" (or any name)
4. Click **Create**

### Creating OAuth Credentials:

1. Go to: **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Application type: **Web application**
4. Name: "Cricket Mela"
5. Add redirect URIs (see above)
6. Click **Create**
7. Copy Client ID and Client Secret
8. Set them in Fly.io using commands above

---

## 🎯 Status

**Backend Code**: ✅ Fixed and deployed
**Session Config**: ✅ Updated for cross-origin
**OAuth Credentials**: ⏳ Need to be set by you
**Google Cloud Config**: ⏳ Need to configure redirect URIs

Once you set the credentials, Google Sign-in will work immediately!

---

**Fixed by**: GitHub Copilot
**Date**: March 2, 2026
**Next Steps**: Set Google OAuth credentials in Fly.io secrets

