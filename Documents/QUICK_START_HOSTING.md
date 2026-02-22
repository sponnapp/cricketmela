# Quick Start: Host Cricket Mela for Friends - 5 Minutes 🚀

## Step-by-Step Setup with Ngrok

### Prerequisites:
- Your laptop with Cricket Mela running
- Internet connection
- 4 Terminal windows (or terminal tabs)

---

## Step 1: Install Ngrok (2 minutes)

```bash
# Using Homebrew (easiest)
brew install ngrok

# Verify installation
ngrok version
```

If you don't have Homebrew, download from: https://ngrok.com/download

---

## Step 2: Create Free Ngrok Account (1 minute)

1. Go to: https://ngrok.com/signup
2. Sign up with email
3. Check email for verification link
4. Copy your **Auth Token** from dashboard

---

## Step 3: Configure Ngrok (1 minute)

```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
```

Replace `YOUR_AUTH_TOKEN_HERE` with the token you copied.

---

## Step 4: Start All Services (1 minute)

Open 4 terminal windows/tabs:

### Terminal 1: Start Backend
```bash
cd /Users/senthilponnappan/IdeaProjects/Test/backend
npm start
```

Expected output:
```
> ipl-betting-backend@0.1.0 start
> node index.js

Backend listening on http://localhost:4000
```

---

### Terminal 2: Start Frontend
```bash
cd /Users/senthilponnappan/IdeaProjects/Test/frontend
npm run dev
```

Expected output:
```
➜  Local:   http://localhost:5173/
```

---

### Terminal 3: Expose Frontend with Ngrok
```bash
ngrok http 5173
```

**IMPORTANT:** Copy the URL that looks like:
```
Forwarding    https://abc123def456.ngrok.io -> http://localhost:5173
```

This is your **PUBLIC URL** for friends! ✅

---

### Terminal 4: Expose Backend with Ngrok (Optional)
```bash
ngrok http 4000
```

You'll get another URL, but usually not needed if frontend is public.

---

## Step 5: Share with Friends! 🎉

Send your friends this message:

```
Hey! Join me in Cricket Mela Betting!

🎯 Click here to play: https://abc123def456.ngrok.io

📝 Use this to login:
   Username: [give them one]
   Password: [give them password]

Have fun! 🏏
```

---

## Test Before Sharing

**Test the link yourself first:**

1. Open in incognito/private window (to avoid browser cache)
2. Go to: `https://abc123def456.ngrok.io`
3. Try to login with test account
4. Check if you can:
   - ✅ Select seasons
   - ✅ View matches
   - ✅ Place votes
   - ✅ See standings
5. If all works, share with friends!

---

## Keep It Running

**Important:** Keep these 4 terminals open while friends are using it:
- Terminal 1: Backend (must stay on)
- Terminal 2: Frontend (must stay on)
- Terminal 3: Ngrok frontend (must stay on)
- Terminal 4: Ngrok backend (good to keep on)

If you close any terminal, the service stops! 🛑

---

## Stopping Everything

When done for the day:

```bash
# In each terminal, press:
Ctrl + C

# Or close terminal windows
```

---

## Your Laptop Must Stay On

⚠️ **Important Requirements:**
- Laptop must be ON while friends play
- WiFi/Internet must be stable and connected
- Don't put laptop to sleep
- Don't lock screen (on some systems)

---

## Ngrok URL Changes When You Restart

**Problem:** If you close ngrok and restart, you get a NEW URL

**Solution Options:**

**Option 1: Upgrade Ngrok** ($5/month)
- Get a permanent URL
- Can restart without changing URL

**Option 2: Use Different Service**
- Try Cloudflare Tunnel (see main guide)
- URL stays the same forever (free)

**Option 3: Tell friends new URL**
- Simple, free option
- Just resend new link each time

---

## Quick Reference: Commands

```bash
# Check if services are running
lsof -i :4000     # Backend
lsof -i :5173     # Frontend

# Kill specific process (if stuck)
kill -9 <PID>

# Start backend
cd ~/IdeaProjects/Test/backend && npm start

# Start frontend
cd ~/IdeaProjects/Test/frontend && npm run dev

# Start ngrok
ngrok http 5173
```

---

## Troubleshooting Quick Fixes

### "Connection refused" error
→ Make sure backend is running in Terminal 1

### Friends see blank page
→ Check console in developer tools (F12)
→ Make sure frontend is running in Terminal 2

### "Port already in use"
```bash
# Kill process using port
lsof -i :5173 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### Friends can't access ngrok URL
→ Check if ngrok shows "Your ngrok session has ended"
→ Restart ngrok in Terminal 3

### API calls fail
→ Verify both backend and frontend ngrok URLs are correct
→ Check browser console (F12) for error messages

---

## Alternative: Use Cloudflare Tunnel (More Permanent)

If Ngrok keeps expiring URLs, switch to Cloudflare:

```bash
# Install
brew install cloudflare/cloudflare/cloudflared

# Login
cloudflared login

# Run tunnel (URL stays same!)
cloudflared tunnel --url localhost:5173
```

See main HOSTING_GUIDE.md for full details.

---

## Security Reminders 🔒

Before sharing with friends:

- ✅ Use strong password
- ✅ Verify login works
- ✅ Check HTTPS is used (should show 🔒 lock)
- ✅ Don't share publicly on social media
- ✅ Only share with trusted friends

Your database is secure because:
- SQLite is local only
- No external database access
- All data stays on your laptop

---

## Example: Full Setup (Copy-Paste Commands)

**Terminal 1:**
```bash
cd /Users/senthilponnappan/IdeaProjects/Test/backend && npm start
```

**Terminal 2:**
```bash
cd /Users/senthilponnappan/IdeaProjects/Test/frontend && npm run dev
```

**Terminal 3:**
```bash
ngrok http 5173
# Copy the URL starting with https://
```

**Terminal 4:**
```bash
ngrok http 4000
```

Then share the frontend URL (from Terminal 3) with friends! 🎉

---

## Next Steps

After testing with friends:

1. **For longer use:** Switch to Cloudflare Tunnel (permanent URL)
2. **For serious project:** Get a VPS ($4-5/month)
3. **For production:** Set up custom domain and SSL

See HOSTING_GUIDE.md for full details on all options.

---

**You're all set! Start ngrok and share the URL! 🚀**

Questions? Check HOSTING_GUIDE.md or ask for help!

