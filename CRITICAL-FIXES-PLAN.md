# 🚨 CRITICAL SECURITY FIXES - Implementation Plan

**Cricket Mela - Security Remediation**  
**Date:** February 27, 2026  
**Priority:** 🔴 URGENT - MUST BE COMPLETED THIS WEEK  
**Estimated Time:** 8-12 hours total

---

## 📋 Overview

This plan addresses the **2 CRITICAL vulnerabilities** found in the security audit:

1. 🔴 **Plaintext Password Storage** (CVSS 9.8)
2. 🔴 **Weak Authentication Mechanism** (CVSS 8.1)

**Current Risk:** Anyone with database access can read all passwords. Anyone can impersonate any user including admin.

**Target:** Secure password storage with bcrypt + JWT-based authentication

---

## 🎯 Implementation Strategy

### Phase 1: Password Hashing with Bcrypt (4-5 hours)
- Install bcrypt package
- Create password migration script
- Update all password-related endpoints
- Test password hashing
- Deploy to production

### Phase 2: JWT Authentication (4-6 hours)
- Install jsonwebtoken package
- Implement JWT token generation
- Replace x-user header authentication
- Update frontend to use tokens
- Test end-to-end authentication
- Deploy to production

### Phase 3: Testing & Verification (1-2 hours)
- Comprehensive testing
- Security verification
- Production deployment
- Monitoring

---

## 📅 PHASE 1: Password Hashing with Bcrypt

### Estimated Time: 4-5 hours

### Step 1.1: Install Dependencies (5 minutes)

```bash
cd /Users/senthilponnappan/IdeaProjects/Test/backend
npm install bcrypt
npm install --save-dev @types/bcrypt  # TypeScript types
```

**Verification:**
```bash
npm list bcrypt
# Should show: bcrypt@5.x.x
```

---

### Step 1.2: Create Password Migration Script (15 minutes)

**File:** `backend/migrate-passwords.js`

```javascript
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.db');
const SALT_ROUNDS = 10;

async function migratePasswords() {
  const db = new sqlite3.Database(DB_PATH);
  
  console.log('🔒 Starting password migration...\n');
  
  db.all('SELECT id, username, password FROM users', async (err, users) => {
    if (err) {
      console.error('❌ Error fetching users:', err);
      db.close();
      return;
    }

    console.log(`Found ${users.length} users to process\n`);
    
    let processed = 0;
    let skipped = 0;
    let hashed = 0;

    for (const user of users) {
      processed++;
      
      // Skip if already hashed (bcrypt hashes start with $2b$)
      if (user.password && user.password.startsWith('$2b$')) {
        console.log(`⏭️  [${processed}/${users.length}] Skipping ${user.username} - already hashed`);
        skipped++;
        continue;
      }

      // Skip if no password
      if (!user.password) {
        console.log(`⚠️  [${processed}/${users.length}] Skipping ${user.username} - no password set`);
        skipped++;
        continue;
      }

      try {
        // Hash the plaintext password
        const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);
        
        // Update database
        await new Promise((resolve, reject) => {
          db.run('UPDATE users SET password = ? WHERE id = ?', 
            [hashedPassword, user.id], 
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });

        console.log(`✅ [${processed}/${users.length}] Hashed password for ${user.username}`);
        hashed++;
      } catch (error) {
        console.error(`❌ [${processed}/${users.length}] Error hashing ${user.username}:`, error);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`Total users:        ${users.length}`);
    console.log(`Passwords hashed:   ${hashed} ✅`);
    console.log(`Already hashed:     ${skipped - (users.length - hashed - skipped)} ⏭️`);
    console.log(`No password:        ${users.length - hashed - skipped} ⚠️`);
    console.log('='.repeat(60));
    console.log('\n✅ Password migration complete!\n');
    
    db.close();
  });
}

migratePasswords().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
```

**Verification:**
```bash
node migrate-passwords.js
# Should show success message and hash count
```

---

### Step 1.3: Update Login Endpoint (30 minutes)

**File:** `backend/index.js`

**Find this code (around line 858):**
```javascript
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  const db = openDb();
  db.get('SELECT id, username, display_name, role, balance, approved, password FROM users WHERE username = ? COLLATE NOCASE', [username], (err, row) => {
    db.close();
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!row) return res.status(401).json({ error: 'Invalid credentials' });
    const passwordOk = row.password ? password === row.password : password === 'password';
    if (!passwordOk) return res.status(401).json({ error: 'Invalid credentials' });
    if (!row.approved) return res.status(403).json({ error: 'Account pending admin approval' });
    res.json({ id: row.id, username: row.username, display_name: row.display_name, role: row.role, balance: row.balance });
  });
});
```

**Replace with:**
```javascript
const bcrypt = require('bcrypt');

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  
  const db = openDb();
  db.get('SELECT id, username, display_name, role, balance, approved, password FROM users WHERE username = ? COLLATE NOCASE', 
    [username], async (err, row) => {
      db.close();
      if (err) return res.status(500).json({ error: 'DB error' });
      if (!row) return res.status(401).json({ error: 'Invalid credentials' });
      
      // Check if password is hashed or plaintext (for backward compatibility during migration)
      let passwordOk = false;
      if (row.password && row.password.startsWith('$2b$')) {
        // Hashed password - use bcrypt
        passwordOk = await bcrypt.compare(password, row.password);
      } else {
        // Legacy plaintext password (fallback during transition)
        passwordOk = row.password ? password === row.password : password === 'password';
        
        // Auto-upgrade to hashed password on successful login
        if (passwordOk) {
          const hashedPassword = await bcrypt.hash(password, 10);
          const updateDb = openDb();
          updateDb.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, row.id], () => {
            updateDb.close();
          });
        }
      }
      
      if (!passwordOk) return res.status(401).json({ error: 'Invalid credentials' });
      if (!row.approved) return res.status(403).json({ error: 'Account pending admin approval' });
      
      res.json({ 
        id: row.id, 
        username: row.username, 
        display_name: row.display_name, 
        role: row.role, 
        balance: row.balance 
      });
    });
});
```

---

### Step 1.4: Update Signup Endpoint (20 minutes)

**Find this code (around line 841):**
```javascript
app.post('/api/signup', (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  if (!email) return res.status(400).json({ error: 'email required' });
  
  const db = openDb();
  db.run('INSERT INTO users (username, password, email, role, balance, approved) VALUES (?, ?, ?, ?, ?, ?)',
    [username, password, email, 'picker', 100, 0], (err) => {
      db.close();
      if (err) return res.status(500).json({ error: 'User already exists or DB error' });
      res.status(201).json({ ok: true, message: 'Signup submitted for admin approval' });
    });
});
```

**Replace with:**
```javascript
app.post('/api/signup', async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  if (!email) return res.status(400).json({ error: 'email required' });
  
  // Hash password before storing
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const db = openDb();
  db.run('INSERT INTO users (username, password, email, role, balance, approved) VALUES (?, ?, ?, ?, ?, ?)',
    [username, hashedPassword, email, 'picker', 100, 0], (err) => {
      db.close();
      if (err) return res.status(500).json({ error: 'User already exists or DB error' });
      res.status(201).json({ ok: true, message: 'Signup submitted for admin approval' });
    });
});
```

---

### Step 1.5: Update Profile Password Change (45 minutes)

**Find this code (around line 1330):**
```javascript
app.put('/api/users/:id/profile', (req, res) => {
  // ... existing code ...
  if (password) {
    db.get('SELECT password FROM users WHERE id = ?', [id], (err, row) => {
      // ... existing code ...
      const storedPassword = row.password || 'password';
      if (storedPassword !== current_password) {
        // ...
      }
      if (password === storedPassword) {
        // ...
      }
      // ... update code ...
    });
  }
});
```

**Replace with:**
```javascript
app.put('/api/users/:id/profile', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const id = Number(req.params.id);
  if (req.user.id !== id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { display_name, password, current_password } = req.body;
  if (!display_name && !password) {
    return res.status(400).json({ error: 'display_name or password required' });
  }

  if (password && !current_password) {
    return res.status(400).json({ error: 'Current password required to change password' });
  }

  const db = openDb();

  if (password) {
    db.get('SELECT password FROM users WHERE id = ?', [id], async (err, row) => {
      if (err) {
        db.close();
        return res.status(500).json({ error: 'DB error' });
      }
      if (!row) {
        db.close();
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify current password
      const storedPassword = row.password || 'password';
      let currentPasswordOk = false;
      
      if (storedPassword.startsWith('$2b$')) {
        // Hashed password
        currentPasswordOk = await bcrypt.compare(current_password, storedPassword);
      } else {
        // Plaintext password (legacy)
        currentPasswordOk = storedPassword === current_password;
      }
      
      if (!currentPasswordOk) {
        db.close();
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      // Check if new password is different
      let isSamePassword = false;
      if (storedPassword.startsWith('$2b$')) {
        isSamePassword = await bcrypt.compare(password, storedPassword);
      } else {
        isSamePassword = password === storedPassword;
      }
      
      if (isSamePassword) {
        db.close();
        return res.status(400).json({ error: 'New password must be different from current password' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update database
      const updates = [];
      const values = [];
      if (display_name) {
        updates.push('display_name = ?');
        values.push(display_name);
      }
      updates.push('password = ?');
      values.push(hashedPassword);
      values.push(id);

      db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values, function(err) {
        db.close();
        if (err) return res.status(500).json({ error: 'Update failed' });
        res.json({ ok: true, message: 'Profile updated successfully' });
      });
    });
  } else {
    // Only updating display_name
    db.run('UPDATE users SET display_name = ? WHERE id = ?', [display_name, id], function(err) {
      db.close();
      if (err) return res.status(500).json({ error: 'Update failed' });
      res.json({ ok: true, message: 'Profile updated successfully' });
    });
  }
});
```

---

### Step 1.6: Add Admin Password Reset Endpoint (30 minutes)

**Add this NEW endpoint after the profile update endpoint:**

```javascript
// Admin reset user password (no current password required)
app.put('/api/admin/users/:id/reset-password', requireRole('admin'), async (req, res) => {
  const id = Number(req.params.id);
  const { new_password } = req.body;
  
  if (!new_password) {
    return res.status(400).json({ error: 'new_password required' });
  }
  
  if (new_password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }
  
  const hashedPassword = await bcrypt.hash(new_password, 10);
  const db = openDb();
  
  db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id], function(err) {
    db.close();
    if (err) return res.status(500).json({ error: 'Update failed' });
    if (this.changes === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ ok: true, message: 'Password reset successfully' });
  });
});
```

---

### Step 1.7: Test Password Hashing (30 minutes)

#### Test Migration Script
```bash
cd backend

# Backup database first
cp data.db data.db.backup-$(date +%Y%m%d)

# Run migration
node migrate-passwords.js

# Verify passwords are hashed
sqlite3 data.db "SELECT username, substr(password, 1, 10) || '...' as password FROM users"
# Should show: admin|$2b$10$...
```

#### Test Login with Hashed Password
```bash
# Start backend
npm start

# Test login (in another terminal)
curl -X POST http://localhost:4000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Should return user object
```

#### Test Signup with Hashing
```bash
curl -X POST http://localhost:4000/api/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass123","email":"test@test.com"}'

# Check password is hashed
sqlite3 backend/data.db "SELECT username, password FROM users WHERE username='testuser'"
# Should show hashed password starting with $2b$
```

---

## 📅 PHASE 2: JWT Authentication

### Estimated Time: 4-6 hours

### Step 2.1: Install JWT Package (5 minutes)

```bash
cd /Users/senthilponnappan/IdeaProjects/Test/backend
npm install jsonwebtoken
npm install --save-dev @types/jsonwebtoken
```

**Verification:**
```bash
npm list jsonwebtoken
# Should show: jsonwebtoken@9.x.x
```

---

### Step 2.2: Set JWT Secret (10 minutes)

#### For Local Development

**Create/Update:** `backend/.env`
```env
NODE_ENV=development
JWT_SECRET=cricket-mela-super-secret-jwt-key-change-in-production-2026
JWT_EXPIRES_IN=24h
PORT=4000
```

#### For Production (Fly.io)

```bash
# Set JWT secret on Fly.io
fly secrets set JWT_SECRET=cricket-mela-production-secret-$(openssl rand -hex 32)

# Verify
fly secrets list
```

---

### Step 2.3: Update Backend - Add JWT to Login (30 minutes)

**Add at top of `backend/index.js` (after other requires):**

```javascript
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
```

**Update the login endpoint to return JWT token:**

```javascript
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });
  
  const db = openDb();
  db.get('SELECT id, username, display_name, role, balance, approved, password FROM users WHERE username = ? COLLATE NOCASE', 
    [username], async (err, row) => {
      db.close();
      if (err) return res.status(500).json({ error: 'DB error' });
      if (!row) return res.status(401).json({ error: 'Invalid credentials' });
      
      // Password verification (bcrypt code from Phase 1)
      let passwordOk = false;
      if (row.password && row.password.startsWith('$2b$')) {
        passwordOk = await bcrypt.compare(password, row.password);
      } else {
        passwordOk = row.password ? password === row.password : password === 'password';
        if (passwordOk) {
          const hashedPassword = await bcrypt.hash(password, 10);
          const updateDb = openDb();
          updateDb.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, row.id], () => {
            updateDb.close();
          });
        }
      }
      
      if (!passwordOk) return res.status(401).json({ error: 'Invalid credentials' });
      if (!row.approved) return res.status(403).json({ error: 'Account pending admin approval' });
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          id: row.id, 
          username: row.username, 
          role: row.role 
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      
      // Return token + user data
      res.json({ 
        token,
        user: {
          id: row.id, 
          username: row.username, 
          display_name: row.display_name, 
          role: row.role, 
          balance: row.balance
        }
      });
    });
});
```

---

### Step 2.4: Replace Auth Middleware (45 minutes)

**Find the current auth middleware (around line 282):**

```javascript
app.use((req, res, next) => {
  const username = req.header('x-user');
  if (!username) return next();
  const db = openDb();
  db.get('SELECT id, username, display_name, role, balance, approved FROM users WHERE username = ? COLLATE NOCASE', [username], (err, row) => {
    db.close();
    if (err) return next();
    if (row) req.user = { id: row.id, username: row.username, displayName: row.display_name, role: row.role, balance: row.balance, approved: row.approved };
    next();
  });
});
```

**Replace with JWT authentication middleware:**

```javascript
// JWT Authentication Middleware
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  
  // Support legacy x-user header temporarily (for backward compatibility during transition)
  if (!authHeader) {
    const username = req.header('x-user');
    if (username) {
      const db = openDb();
      db.get('SELECT id, username, display_name, role, balance, approved FROM users WHERE username = ? COLLATE NOCASE', 
        [username], (err, row) => {
          db.close();
          if (!err && row) {
            req.user = { 
              id: row.id, 
              username: row.username, 
              displayName: row.display_name, 
              role: row.role, 
              balance: row.balance, 
              approved: row.approved 
            };
          }
          next();
        });
      return;
    }
    return next();
  }
  
  // Extract token from "Bearer TOKEN" format
  const token = authHeader.split(' ')[1];
  
  if (!token) return next();
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Fetch latest user data from DB (balance, role might have changed)
    const db = openDb();
    db.get('SELECT id, username, display_name, role, balance, approved FROM users WHERE id = ?', 
      [decoded.id], (err, row) => {
        db.close();
        if (!err && row) {
          req.user = {
            id: row.id,
            username: row.username,
            displayName: row.display_name,
            role: row.role,
            balance: row.balance,
            approved: row.approved
          };
        }
        next();
      });
  } catch (err) {
    // Invalid or expired token - continue without user
    console.log('JWT verification failed:', err.message);
    next();
  }
});
```

---

### Step 2.5: Update Frontend - Use JWT Tokens (60 minutes)

#### Update App.jsx

**Find this code:**

```javascript
useEffect(() => {
  const stored = localStorage.getItem('user');
  if (stored) setUser(JSON.parse(stored));
  setLoading(false);
}, []);

const handleLogin = (userData) => {
  localStorage.setItem('user', JSON.stringify(userData));
  setUser(userData);
};

const handleLogout = () => {
  localStorage.removeItem('user');
  setUser(null);
};
```

**Replace with:**

```javascript
import axios from 'axios';

useEffect(() => {
  // Check for stored token
  const token = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');
  
  if (token && storedUser) {
    const userData = JSON.parse(storedUser);
    setUser(userData);
    
    // Set default Authorization header for all axios requests
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
  
  setLoading(false);
}, []);

const handleLogin = (data) => {
  // Store token and user data
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  
  // Set Authorization header for all future requests
  axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
  
  setUser(data.user);
};

const handleLogout = () => {
  // Clear token and user data
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  // Remove Authorization header
  delete axios.defaults.headers.common['Authorization'];
  
  setUser(null);
};
```

#### Update Login.jsx

**The login response now contains { token, user } instead of just user object.**

No changes needed - the `onLogin(res.data)` call already passes the entire response.

---

### Step 2.6: Remove x-user Headers (30 minutes)

**Search and replace in all frontend files:**

Find instances of:
```javascript
headers: { 'x-user': user?.username }
```

Replace with:
```javascript
// Remove headers entirely - axios.defaults handles Authorization
```

**Files to check:**
- `frontend/src/Admin.jsx` (multiple instances)
- `frontend/src/Matches.jsx`
- `frontend/src/Profile.jsx`
- `frontend/src/VoteHistory.jsx`

---

### Step 2.7: Test JWT Authentication (45 minutes)

#### Test Token Generation
```bash
# Start backend
cd backend
npm start

# Login and get token
TOKEN=$(curl -s -X POST http://localhost:4000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | jq -r '.token')

echo "Token: $TOKEN"
# Should show: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Test Authenticated Request
```bash
# Use token to access protected endpoint
curl -X GET http://localhost:4000/api/me \
  -H "Authorization: Bearer $TOKEN"

# Should return user info
```

#### Test Invalid Token
```bash
curl -X GET http://localhost:4000/api/me \
  -H "Authorization: Bearer invalid-token-123"

# Should return 401 Unauthorized
```

#### Test Frontend
```bash
# Start frontend
cd frontend
npm run dev

# Open http://localhost:5173
# 1. Login with admin/admin123
# 2. Check DevTools → Application → Local Storage
#    Should see 'token' and 'user' keys
# 3. Check DevTools → Network → Any API request
#    Should have "Authorization: Bearer <token>" header
# 4. Vote on a match - should work with token
# 5. Logout and try to vote - should fail
```

---

## 📅 PHASE 3: Testing & Deployment

### Estimated Time: 1-2 hours

### Step 3.1: Comprehensive Local Testing (45 minutes)

#### Test Checklist

**Password Hashing:**
- [ ] Login with existing user (admin/admin123) - should work
- [ ] Password in database is hashed ($2b$...)
- [ ] Signup creates hashed password
- [ ] Profile password change works
- [ ] Admin password reset works
- [ ] Wrong password fails login

**JWT Authentication:**
- [ ] Login returns token
- [ ] Token stored in localStorage
- [ ] API requests include Authorization header
- [ ] Authenticated requests work (vote, admin actions)
- [ ] Logout clears token
- [ ] Invalid token is rejected
- [ ] Expired token is rejected (wait 24h or change JWT_EXPIRES_IN to 1m for testing)

**Backward Compatibility:**
- [ ] Old users can still login (auto-upgrade to hashed password)
- [ ] x-user header still works (temporary)

---

### Step 3.2: Production Deployment (30-45 minutes)

#### Deploy Backend to Fly.io

```bash
cd /Users/senthilponnappan/IdeaProjects/Test/backend

# Set JWT secret on Fly.io
fly secrets set JWT_SECRET=$(openssl rand -hex 32)

# Deploy backend
fly deploy --remote-only

# Check deployment
fly status

# View logs
fly logs

# Test production API
curl -X POST https://cricketmela-api.fly.dev/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
# Should return token
```

#### Migrate Production Passwords

**Option 1: Via Fly.io SSH**
```bash
# SSH into Fly.io
fly ssh console

# Run migration
cd /app
node migrate-passwords.js

# Verify
sqlite3 /app/data/data.db "SELECT username, substr(password, 1, 10) FROM users LIMIT 3"

# Exit
exit
```

**Option 2: Via Emergency API Endpoint (Temporary)**

Add this TEMPORARY endpoint to backend/index.js (REMOVE after migration):

```javascript
// TEMPORARY: Migrate passwords in production (REMOVE AFTER USE)
app.post('/api/emergency-migrate-passwords', async (req, res) => {
  const { secret } = req.body;
  if (secret !== 'cricket-mela-migration-2026') {
    return res.status(403).json({ error: 'Invalid secret' });
  }
  
  const db = openDb();
  db.all('SELECT id, username, password FROM users', async (err, users) => {
    if (err) {
      db.close();
      return res.status(500).json({ error: 'DB error' });
    }
    
    let migrated = 0;
    for (const user of users) {
      if (user.password && !user.password.startsWith('$2b$')) {
        const hashed = await bcrypt.hash(user.password, 10);
        await new Promise((resolve) => {
          db.run('UPDATE users SET password = ? WHERE id = ?', [hashed, user.id], () => resolve());
        });
        migrated++;
      }
    }
    
    db.close();
    res.json({ ok: true, migrated });
  });
});
```

Then call it:
```bash
curl -X POST https://cricketmela-api.fly.dev/api/emergency-migrate-passwords \
  -H "Content-Type: application/json" \
  -d '{"secret":"cricket-mela-migration-2026"}'
```

**IMPORTANT:** Remove this endpoint after migration!

#### Deploy Frontend to Cloudflare

```bash
cd /Users/senthilponnappan/IdeaProjects/Test

# Deploy frontend
./deploy-cf-simple.sh

# Verify deployment
curl -I https://cricketmela.pages.dev
```

---

### Step 3.3: Production Verification (15 minutes)

#### Verify Production is Secure

```bash
# Test login returns token
curl -X POST https://cricketmela-api.fly.dev/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
# Should return: {"token":"eyJ...", "user":{...}}

# Check database has hashed passwords
fly ssh console -C "sqlite3 /app/data/data.db 'SELECT username, substr(password, 1, 10) FROM users LIMIT 3'"
# Should show: admin|$2b$10$...

# Test authentication with token
TOKEN="<token from login above>"
curl -X GET https://cricketmela-api.fly.dev/api/me \
  -H "Authorization: Bearer $TOKEN"
# Should return user info
```

#### Test Frontend in Production

1. Open https://cricketmela.pages.dev
2. **Hard refresh:** Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
3. Login with admin/admin123
4. Check DevTools → Application → Local Storage (should see token)
5. Check DevTools → Network → Any API call (should have Authorization header)
6. Try voting on a match (should work)
7. Logout and try voting (should fail with 401)

---

### Step 3.4: Monitoring & Rollback Plan (15 minutes)

#### Monitor Production

```bash
# Watch logs for errors
fly logs -a cricketmela-api

# Check app status
fly status

# Check resource usage
fly status --json | jq '.Allocations'
```

#### Rollback Plan (If Something Goes Wrong)

**Backend Rollback:**
```bash
# Get previous deployment
fly releases

# Rollback to previous version
fly releases rollback <version-number>

# Or restore from git
cd backend
git checkout HEAD~1 index.js
fly deploy --remote-only
```

**Database Rollback:**
```bash
# Restore from backup (if you created one)
fly ssh console
cd /app/data
cp data.db.backup data.db
exit
fly restart
```

**Frontend Rollback:**
```bash
cd frontend
git checkout HEAD~1 src/
npm run build
npx wrangler pages deploy dist --project-name=cricketmela
```

---

## ✅ Success Criteria

After completing all phases, verify:

### Password Security ✅
- [ ] All passwords in database start with `$2b$` (bcrypt hash)
- [ ] Login with correct password works
- [ ] Login with wrong password fails
- [ ] Signup creates hashed password
- [ ] Profile password change works
- [ ] Admin password reset works
- [ ] No plaintext passwords anywhere

### JWT Authentication ✅
- [ ] Login returns JWT token
- [ ] Token stored in localStorage
- [ ] All API requests use `Authorization: Bearer <token>` header
- [ ] Authenticated requests work (vote, admin actions, etc.)
- [ ] Unauthenticated requests fail with 401
- [ ] Invalid tokens rejected
- [ ] Logout clears token and prevents future requests
- [ ] No `x-user` headers in production code

### Production Deployment ✅
- [ ] Backend deployed to Fly.io
- [ ] Frontend deployed to Cloudflare Pages
- [ ] Production database passwords migrated
- [ ] JWT_SECRET set on Fly.io
- [ ] All tests passing in production
- [ ] No errors in logs
- [ ] Application fully functional

---

## 📊 Timeline Summary

| Phase | Task | Time | When |
|-------|------|------|------|
| **1** | Password Hashing | 4-5 hours | Day 1 |
| **2** | JWT Authentication | 4-6 hours | Day 2-3 |
| **3** | Testing & Deployment | 1-2 hours | Day 3 |
| **Total** | | **9-13 hours** | **3 days** |

---

## 🎯 Next Steps After Completion

Once these CRITICAL fixes are deployed:

### Week 2: HIGH Priority (5-7 hours)
1. Update dependencies (Express, Axios, Vite)
2. Add CSRF protection
3. Add rate limiting

### Weeks 3-4: MEDIUM Priority (6-7 hours)
4. Add input validation
5. Improve error handling
6. Enforce HTTPS

### Month 2: LOW Priority (7 hours)
7. Add security headers
8. Strengthen password policy
9. Add account lockout
10. Migrate to httpOnly cookies

---

## 📞 Support & Resources

**Documentation:**
- Full audit: `SECURITY-AUDIT-REPORT.md`
- Task checklist: `SECURITY-CHECKLIST.md`
- Quick reference: `QUICK-REFERENCE.txt`

**Testing Commands:**
```bash
# Test bcrypt
node -e "const b=require('bcrypt'); b.hash('test',10).then(h=>console.log(h))"

# Test JWT
node -e "const j=require('jsonwebtoken'); console.log(j.sign({id:1},'secret',{expiresIn:'1h'}))"

# Check password in DB
sqlite3 backend/data.db "SELECT username, password FROM users LIMIT 3"

# View backend logs
fly logs -a cricketmela-api

# Test production API
curl -X POST https://cricketmela-api.fly.dev/api/login -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}'
```

---

## ⚠️ Important Notes

1. **Backup First:** Always backup database before migration
2. **Test Locally:** Complete all local testing before deploying to production
3. **Monitor Logs:** Watch for errors after deployment
4. **Hard Refresh:** Users need to hard refresh browser after frontend deployment
5. **Remove Emergency Endpoints:** Delete temporary migration endpoints after use
6. **JWT Secret:** Keep JWT_SECRET secure and never commit to git

---

## 🎉 Post-Implementation

After successful deployment:

1. **Verify Security:**
   ```bash
   # Run security check
   npm audit
   
   # Check password hashing
   sqlite3 backend/data.db "SELECT COUNT(*) FROM users WHERE password NOT LIKE '\$2b\$%'"
   # Should return: 0
   ```

2. **Update Documentation:**
   - Update README.md with new authentication flow
   - Update .github/copilot-instructions.md
   - Mark CRITICAL fixes as complete in SECURITY-CHECKLIST.md

3. **Celebrate!** 🎉
   - You've eliminated 2 CRITICAL vulnerabilities
   - Your app is now significantly more secure
   - User passwords are protected
   - Authentication is robust

---

**Good luck with the implementation! You've got this!** 💪🔒

**Questions?** Refer to SECURITY-AUDIT-REPORT.md for detailed explanations.

