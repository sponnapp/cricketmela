# 🔧 LOGIN FAILED - TROUBLESHOOTING GUIDE

## Common Causes & Solutions

### ❌ Problem 1: Backend Not Running

**Error Signs:**
- "Failed to fetch" in browser
- "Cannot connect to localhost:4000"
- "ERR_CONNECTION_REFUSED"

**Solution:**
```bash
# Open a new terminal and run:
cd /Users/senthilponnappan/IdeaProjects/Test/backend
npm start

# You should see:
# Backend listening on http://localhost:4000
```

**If port 4000 is already in use:**
```bash
# Kill existing processes
pkill -9 node

# Then start backend again
cd /Users/senthilponnappan/IdeaProjects/Test/backend
npm start
```

---

### ❌ Problem 2: Wrong Credentials

**Error Signs:**
- "Invalid credentials" message
- Login form rejects username/password

**Solution:**
Use these exact credentials:
```
Username: admin        OR    Username: senthil
Password: password           Password: password
```

**Make sure:**
- Credentials are spelled exactly as shown (case-sensitive)
- No extra spaces before/after
- Password field has: `password` (not "Password" or blank)

---

### ❌ Problem 3: Frontend Not Running

**Error Signs:**
- Cannot access http://localhost:5173
- "Port already in use" error

**Solution:**
```bash
# Open a new terminal and run:
cd /Users/senthilponnappan/IdeaProjects/Test/frontend
npm run dev

# You should see:
# Local: http://localhost:5173
```

**If port 5173 is already in use:**
```bash
# Kill existing processes
pkill -f vite

# Then start frontend again
cd /Users/senthilponnappan/IdeaProjects/Test/frontend
npm run dev
```

---

### ❌ Problem 4: Database Not Initialized

**Error Signs:**
- "DB error" in console
- Login endpoint returns 500 error

**Solution:**
```bash
# Reinitialize database
cd /Users/senthilponnappan/IdeaProjects/Test/backend
npm run migrate

# Then start backend
npm start
```

---

### ❌ Problem 5: Browser Cache Issues

**Error Signs:**
- Login fails but backend/frontend are running fine
- Same error happens every time

**Solution:**
1. **Clear Browser Cache:**
   - Chrome/Edge: Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
   - Firefox: Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
   - Safari: Menu → Develop → Empty Web Storage

2. **Or use Incognito/Private Mode:**
   - Chrome: `Ctrl+Shift+N` or `Cmd+Shift+N`
   - Firefox: `Ctrl+Shift+P` or `Cmd+Shift+P`
   - Safari: `Cmd+Shift+N`

3. **Then try logging in again**

---

### ❌ Problem 6: CORS or API Configuration Issues

**Error Signs:**
- Login returns "error" message
- Network tab shows request failed

**Solution:**
Verify backend is properly configured:
```bash
# Check if backend is listening
curl http://localhost:4000/api/health

# You should get:
# {"status":"ok"}
```

---

## 🧪 Diagnostic Steps

### Step 1: Verify Backend is Running
```bash
# Check if node process exists
ps aux | grep node

# OR test directly
curl http://localhost:4000/api/health

# Expected response:
# {"status":"ok"}
```

### Step 2: Test Login Endpoint Directly
```bash
# Test login as admin
curl -X POST http://localhost:4000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# Expected response:
# {"id":1,"username":"admin","role":"admin","balance":1000}
```

### Step 3: Check Browser Console
1. Open browser
2. Press `F12` (or `Cmd+Option+I` on Mac)
3. Go to **Console** tab
4. Look for error messages
5. Screenshot and check what errors appear

### Step 4: Check Network Tab
1. Open browser DevTools (`F12`)
2. Go to **Network** tab
3. Try to login
4. Look for the `login` request
5. Click it to see:
   - Request body (should have username/password)
   - Response status (should be 200 for success)
   - Response body (should show user data)

---

## ✅ Full Reset - Start Fresh

If nothing works, do a complete reset:

```bash
# 1. Kill all node processes
pkill -9 node

# 2. Delete node_modules and reinstall backend
cd /Users/senthilponnappan/IdeaProjects/Test/backend
rm -rf node_modules
npm install

# 3. Initialize database
npm run migrate

# 4. Start backend in one terminal
npm start

# Expected: Backend listening on http://localhost:4000

# 5. In another terminal, reinstall and start frontend
cd /Users/senthilponnappan/IdeaProjects/Test/frontend
rm -rf node_modules
npm install
npm run dev

# Expected: Local: http://localhost:5173
```

---

## 📊 Troubleshooting Checklist

Check each item:

- [ ] Backend running (`npm start` in /backend)
- [ ] Frontend running (`npm run dev` in /frontend)
- [ ] Can access http://localhost:5173 in browser
- [ ] Backend health endpoint works (`/api/health`)
- [ ] Using correct credentials (`admin`/`password` or `senthil`/`password`)
- [ ] No CORS errors in browser console
- [ ] Port 4000 is free (not already in use)
- [ ] Port 5173 is free (not already in use)
- [ ] Node.js and npm are installed (`node --version` & `npm --version`)
- [ ] Database exists (`data.db` file present in /backend)

---

## 🎯 Quick Fix Checklist

Try these in order:

1. **Refresh Page:**
   - Press `F5` or `Cmd+R`

2. **Clear Cache & Try Again:**
   - `Ctrl+Shift+Delete` (Clear cache)
   - Refresh page

3. **Restart Frontend:**
   - Press `Ctrl+C` in frontend terminal
   - Run `npm run dev` again

4. **Restart Backend:**
   - Press `Ctrl+C` in backend terminal
   - Run `npm start` again

5. **Kill All Processes & Start Fresh:**
   ```bash
   pkill -9 node
   # Then start backend first
   # Then start frontend second
   ```

6. **Full Reset:**
   - Follow the "Full Reset - Start Fresh" section above

---

## 📞 Need More Help?

**Check these files:**
- `GETTING_STARTED.md` - Basic setup guide
- `QUICK_REFERENCE.md` - Quick reference
- `VALIDATION_GUIDE.md` - Detailed testing steps

**Information to gather if asking for help:**
1. Exact error message (screenshot)
2. Console errors (F12 → Console)
3. Network request/response (F12 → Network)
4. Which terminals are running (backend? frontend?)
5. Output of: `node --version` and `npm --version`
6. Output of: `ps aux | grep node`

---

## 🚀 Expected Behavior When Working

### Backend Starting
```
> ipl-betting-backend@0.1.0 start
> node index.js

Backend listening on http://localhost:4000
```

### Frontend Starting
```
  VITE v4.5.14  ready in 456 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

### Successful Login
- Backend returns: `{"id":1,"username":"admin","role":"admin","balance":1000}`
- Frontend shows: "Hello admin (balance: 1000)" in header
- You're redirected to Seasons page

---

**Still having issues? Follow the diagnostic steps above and share the output!**

