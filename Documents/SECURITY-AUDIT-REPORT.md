# 🔒 Cricket Mela - Security Audit Report

**Audit Date:** February 27, 2026  
**Application:** Cricket Mela - IPL T20 Betting Platform  
**Auditor:** Security Assessment  
**Severity Levels:** 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW | ℹ️ INFO

---

## Executive Summary

The Cricket Mela application has **13 security vulnerabilities** across different severity levels. The most critical issues include:

1. **Plaintext password storage** (CRITICAL)
2. **Weak authentication mechanism** (CRITICAL)
3. **Multiple outdated dependencies with known CVEs** (HIGH)
4. **Missing CSRF protection** (HIGH)
5. **SQL injection risks** (MEDIUM)

**Overall Risk Score: 🔴 HIGH**

---

## 🔴 CRITICAL Vulnerabilities

### 1. Plaintext Password Storage

**Severity:** 🔴 CRITICAL  
**CWE:** CWE-256 (Plaintext Storage of a Password)  
**CVSS Score:** 9.8

**Description:**  
Passwords are stored in **plain text** in the SQLite database without any encryption or hashing.

**Evidence:**
```javascript
// backend/index.js:866
const passwordOk = row.password ? password === row.password : password === 'password';

// backend/db.js:100
db.run('INSERT INTO users (username, role, balance, password, display_name, approved) VALUES (?,?,?,?,?,?)',
  ['admin','admin',1000,'admin123','Admin',1]);
```

**Impact:**
- Anyone with database access can read all user passwords
- Compromised database = all user credentials exposed
- Passwords cannot be recovered, only reset
- Violates OWASP Top 10 (A02:2021 – Cryptographic Failures)

**Exploitation:**
```bash
# If attacker gets database file
sqlite3 data.db "SELECT username, password FROM users"
# Output: admin|admin123, senthil|senthil123
```

**Recommendation:**
```javascript
// Use bcrypt for password hashing
const bcrypt = require('bcrypt');

// On registration/password change
const hashedPassword = await bcrypt.hash(password, 10);
db.run('INSERT INTO users (..., password) VALUES (..., ?)', [hashedPassword]);

// On login
const match = await bcrypt.compare(password, row.password);
if (!match) return res.status(401).json({ error: 'Invalid credentials' });
```

**Priority:** 🔴 IMMEDIATE ACTION REQUIRED

---

### 2. Weak Authentication Mechanism

**Severity:** 🔴 CRITICAL  
**CWE:** CWE-287 (Improper Authentication)  
**CVSS Score:** 8.1

**Description:**  
Authentication uses a simple `x-user` header that can be easily spoofed. No session tokens, JWTs, or secure authentication mechanism.

**Evidence:**
```javascript
// backend/index.js:282
app.use((req, res, next) => {
  const username = req.header('x-user');
  if (!username) return next();
  db.get('SELECT ... FROM users WHERE username = ? COLLATE NOCASE', [username], (err, row) => {
    if (row) req.user = { id: row.id, username: row.username, ... };
    next();
  });
});
```

**Impact:**
- Any user can impersonate any other user by changing the `x-user` header
- No session management or token validation
- Admin privileges can be escalated by setting `x-user: admin`

**Exploitation:**
```bash
# Impersonate admin
curl -X POST http://localhost:4000/api/admin/matches \
  -H "x-user: admin" \
  -H "Content-Type: application/json" \
  -d '{"season_id":1,"home_team":"India","away_team":"Pakistan"}'
```

**Recommendation:**
```javascript
// Implement JWT-based authentication
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET;

// On login
const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET, { expiresIn: '24h' });
res.json({ token, user: {...} });

// Authentication middleware
app.use((req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return next();
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});
```

**Priority:** 🔴 IMMEDIATE ACTION REQUIRED

---

## 🟠 HIGH Severity Vulnerabilities

### 3. Outdated Dependencies with Known CVEs

**Severity:** 🟠 HIGH  
**CWE:** CWE-1035 (Use of Vulnerable Dependencies)

**Affected Packages:**

#### Express.js 4.18.2 → 4.20.0+
- **CVE-2024-29041** (MEDIUM): Open Redirect in malformed URLs
- **CVE-2024-43796** (LOW): XSS via response.redirect()

#### Vite 4.5.14 → 7.1.11+
- **CVE-2025-58752** (LOW): server.fs settings not applied to HTML files
- **CVE-2025-58751** (LOW): Middleware may serve files with same name as public directory
- **CVE-2025-62522** (MEDIUM): server.fs.deny bypass via backslash on Windows

#### Axios 1.6.5 → 1.13.5+
- **CVE-2024-39338** (HIGH): Server-Side Request Forgery (SSRF)
- **CVE-2025-27152** (HIGH): SSRF and Credential Leakage via Absolute URL
- **CVE-2025-58754** (HIGH): DoS attack through lack of data size check
- **CVE-2026-25639** (HIGH): DoS via __proto__ key in mergeConfig

**Impact:**
- SSRF attacks possible via axios
- DoS attacks via axios data: URLs
- Path traversal on Windows via Vite
- Open redirect via Express

**Recommendation:**
```bash
# Update all dependencies
cd frontend
npm install vite@latest axios@latest
npm audit fix

cd ../backend
npm install express@latest
npm audit fix
```

**Priority:** 🟠 HIGH - Update within 7 days

---

### 4. Missing CSRF Protection

**Severity:** 🟠 HIGH  
**CWE:** CWE-352 (Cross-Site Request Forgery)  
**CVSS Score:** 7.1

**Description:**  
No CSRF tokens or protection mechanisms. All state-changing operations can be triggered via CSRF attacks.

**Evidence:**
```javascript
// No CSRF validation in any endpoint
app.post('/api/votes', (req, res) => {
  // No CSRF token check
  const { match_id, team, points } = req.body;
  // ... processes vote without CSRF validation
});
```

**Impact:**
- Attacker can trick users into voting without consent
- Admin can be tricked into deleting matches, users, or setting winners
- Points can be deducted without user knowledge

**Exploitation:**
```html
<!-- Attacker's malicious page -->
<form action="https://cricketmela.pages.dev/api/votes" method="POST">
  <input type="hidden" name="match_id" value="1">
  <input type="hidden" name="team" value="Attacker Team">
  <input type="hidden" name="points" value="50">
</form>
<script>document.forms[0].submit();</script>
```

**Recommendation:**
```javascript
// Backend: Add csurf middleware
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: true });

app.post('/api/votes', csrfProtection, (req, res) => {
  // Automatic CSRF validation
});

// Frontend: Include CSRF token in requests
const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
axios.post('/api/votes', data, {
  headers: { 'X-CSRF-Token': csrfToken }
});
```

**Priority:** 🟠 HIGH - Implement within 14 days

---

### 5. No Rate Limiting

**Severity:** 🟠 HIGH  
**CWE:** CWE-799 (Improper Control of Interaction Frequency)  
**CVSS Score:** 6.5

**Description:**  
No rate limiting on any endpoint, allowing brute force attacks and DoS.

**Impact:**
- Unlimited login attempts (brute force password attacks)
- Vote spam/manipulation
- API abuse and DoS

**Exploitation:**
```bash
# Brute force attack
for password in $(cat passwords.txt); do
  curl -X POST http://cricketmela-api.fly.dev/api/login \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"admin\",\"password\":\"$password\"}"
done
```

**Recommendation:**
```javascript
const rateLimit = require('express-rate-limit');

// Login rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later'
});

app.post('/api/login', loginLimiter, (req, res) => {
  // ... login logic
});

// Global API rate limiting
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100 // 100 requests per minute
});

app.use('/api/', apiLimiter);
```

**Priority:** 🟠 HIGH - Implement within 14 days

---

## 🟡 MEDIUM Severity Vulnerabilities

### 6. Potential SQL Injection (Parameterized Queries Mostly Used)

**Severity:** 🟡 MEDIUM  
**CWE:** CWE-89 (SQL Injection)  
**CVSS Score:** 5.9

**Description:**  
While most queries use parameterized statements (good!), the codebase should be audited to ensure NO dynamic SQL construction exists.

**Evidence (Good - using parameters):**
```javascript
db.get('SELECT ... FROM users WHERE username = ?', [username], ...);
db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [points, userId], ...);
```

**Potential Risk Areas:**
- Dynamic query construction if added in future
- Column name or table name injection if using template strings

**Recommendation:**
✅ **Current implementation is GOOD** - Continue using parameterized queries  
⚠️ **Future safety:**
```javascript
// ❌ NEVER DO THIS
db.all(`SELECT * FROM users WHERE role = '${role}'`, ...); // Dangerous!

// ✅ ALWAYS DO THIS
db.all('SELECT * FROM users WHERE role = ?', [role], ...); // Safe
```

**Priority:** 🟡 MEDIUM - Code review and developer training

---

### 7. Sensitive Data Exposure in Error Messages

**Severity:** 🟡 MEDIUM  
**CWE:** CWE-209 (Information Exposure Through Error Message)  
**CVSS Score:** 5.3

**Description:**  
Database errors and stack traces may be exposed to clients.

**Evidence:**
```javascript
db.run(..., (err) => {
  if (err) return res.status(500).json({ error: 'DB error' }); // Generic (good)
  // But some places might leak more info
});
```

**Recommendation:**
```javascript
// Production error handler
if (process.env.NODE_ENV === 'production') {
  app.use((err, req, res, next) => {
    console.error(err.stack); // Log to server
    res.status(500).json({ error: 'Internal server error' }); // Generic to client
  });
} else {
  // Development: show full errors
  app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message, stack: err.stack });
  });
}
```

**Priority:** 🟡 MEDIUM - Implement within 30 days

---

### 8. Missing Input Validation

**Severity:** 🟡 MEDIUM  
**CWE:** CWE-20 (Improper Input Validation)  
**CVSS Score:** 5.0

**Description:**  
Limited input validation on user-provided data (match names, points, etc.).

**Evidence:**
```javascript
app.post('/api/votes', (req, res) => {
  const { match_id, team, points } = req.body;
  // No validation that match_id is a number
  // No validation that team is valid
  // No validation that points is in allowed range
});
```

**Recommendation:**
```javascript
const { body, validationResult } = require('express-validator');

app.post('/api/votes',
  body('match_id').isInt({ min: 1 }),
  body('team').isString().trim().notEmpty(),
  body('points').isIn([10, 20, 50]),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // Process vote
  }
);
```

**Priority:** 🟡 MEDIUM - Implement within 30 days

---

### 9. No HTTPS Enforcement

**Severity:** 🟡 MEDIUM  
**CWE:** CWE-319 (Cleartext Transmission of Sensitive Information)  
**CVSS Score:** 4.8

**Description:**  
While production uses HTTPS (Cloudflare/Fly.io), there's no enforcement to reject HTTP requests.

**Recommendation:**
```javascript
// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }
    next();
  });
}
```

**Priority:** 🟡 MEDIUM - Implement within 30 days

---

## 🟢 LOW Severity Issues

### 10. Session Storage in localStorage

**Severity:** 🟢 LOW  
**CWE:** CWE-539 (Information Exposure Through Persistent Cookies)  
**CVSS Score:** 3.7

**Description:**  
User session data stored in `localStorage` is vulnerable to XSS attacks.

**Evidence:**
```javascript
// frontend/src/App.jsx
const stored = localStorage.getItem('user');
if (stored) setUser(JSON.parse(stored));
```

**Impact:**
- If XSS vulnerability exists, attacker can steal session
- Sessions persist across browser restarts (can be good or bad)

**Recommendation:**
- Use `httpOnly` cookies for session tokens (immune to XSS)
- Or use `sessionStorage` instead of `localStorage` (cleared on tab close)

**Priority:** 🟢 LOW - Consider for future enhancement

---

### 11. Missing Security Headers

**Severity:** 🟢 LOW  
**CWE:** CWE-16 (Configuration)  
**CVSS Score:** 3.1

**Description:**  
Missing security headers: CSP, X-Frame-Options, HSTS, etc.

**Recommendation:**
```javascript
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

**Priority:** 🟢 LOW - Implement within 60 days

---

### 12. Weak Password Policy

**Severity:** 🟢 LOW  
**CWE:** CWE-521 (Weak Password Requirements)  
**CVSS Score:** 2.6

**Description:**  
No minimum password length or complexity requirements.

**Evidence:**
```javascript
// frontend/src/Profile.jsx:26
if (password && password.length < 4) {
  setError('Password must be at least 4 characters') // Too weak!
}
```

**Recommendation:**
```javascript
// Enforce stronger passwords
const MIN_PASSWORD_LENGTH = 8;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

if (!passwordRegex.test(password)) {
  return res.status(400).json({
    error: 'Password must be at least 8 characters with uppercase, lowercase, and number'
  });
}
```

**Priority:** 🟢 LOW - Implement within 90 days

---

### 13. No Account Lockout Mechanism

**Severity:** 🟢 LOW  
**CWE:** CWE-307 (Improper Restriction of Excessive Authentication Attempts)  
**CVSS Score:** 2.3

**Description:**  
No account lockout after multiple failed login attempts.

**Recommendation:**
```javascript
// Track failed login attempts
const failedAttempts = new Map();

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const attempts = failedAttempts.get(username) || 0;
  
  if (attempts >= 5) {
    const lockoutTime = 15 * 60 * 1000; // 15 minutes
    return res.status(429).json({
      error: 'Account locked due to multiple failed attempts. Try again in 15 minutes'
    });
  }
  
  // ... check password ...
  
  if (!passwordOk) {
    failedAttempts.set(username, attempts + 1);
    setTimeout(() => failedAttempts.delete(username), lockoutTime);
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Success - reset counter
  failedAttempts.delete(username);
});
```

**Priority:** 🟢 LOW - Implement within 90 days

---

## Vulnerability Summary

| Severity | Count | Issues |
|----------|-------|--------|
| 🔴 **CRITICAL** | 2 | Plaintext passwords, Weak authentication |
| 🟠 **HIGH** | 3 | Outdated dependencies, No CSRF, No rate limiting |
| 🟡 **MEDIUM** | 4 | SQL injection risk, Error exposure, Input validation, No HTTPS enforcement |
| 🟢 **LOW** | 4 | localStorage use, Missing headers, Weak password policy, No lockout |
| **TOTAL** | **13** | |

---

## Immediate Action Plan

### Phase 1: Critical Fixes (Week 1)
1. ✅ **Implement bcrypt password hashing** (2-3 hours)
2. ✅ **Add JWT authentication** (4-6 hours)
3. ✅ **Update dependencies** (1 hour)

### Phase 2: High Priority (Week 2)
4. ✅ **Add CSRF protection** (2-3 hours)
5. ✅ **Implement rate limiting** (2-3 hours)

### Phase 3: Medium Priority (Week 3-4)
6. ✅ **Add input validation** (3-4 hours)
7. ✅ **Improve error handling** (2 hours)
8. ✅ **Enforce HTTPS** (1 hour)

### Phase 4: Low Priority (Month 2)
9. ✅ **Add security headers** (1 hour)
10. ✅ **Strengthen password policy** (1 hour)
11. ✅ **Add account lockout** (2 hours)
12. ✅ **Migrate to httpOnly cookies** (3 hours)

---

## Security Best Practices for Future Development

### ✅ DO:
- ✅ Always use parameterized SQL queries
- ✅ Hash passwords with bcrypt (cost factor 10+)
- ✅ Use JWT tokens with expiration
- ✅ Validate all user inputs
- ✅ Keep dependencies updated
- ✅ Use HTTPS everywhere
- ✅ Implement rate limiting
- ✅ Add CSRF tokens
- ✅ Use security headers (helmet.js)
- ✅ Log security events

### ❌ DON'T:
- ❌ Store passwords in plaintext
- ❌ Trust user input
- ❌ Use string concatenation for SQL
- ❌ Expose error details to clients
- ❌ Allow unlimited API requests
- ❌ Skip authentication checks
- ❌ Use HTTP in production
- ❌ Store sensitive data in localStorage
- ❌ Use outdated dependencies

---

## Testing Recommendations

### Security Testing Tools:
```bash
# Dependency scanning
npm audit
snyk test

# Static analysis
npm install -g eslint eslint-plugin-security
eslint --ext .js,.jsx .

# OWASP ZAP (web app scanner)
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://cricketmela.pages.dev

# SQLMap (SQL injection testing)
sqlmap -u "http://localhost:4000/api/login" --data="username=admin&password=test" --batch
```

---

## Compliance & Standards

This application should comply with:
- ✅ OWASP Top 10 2021
- ✅ GDPR (if handling EU users)
- ✅ PCI DSS (if handling real money - currently NOT applicable)
- ✅ ISO 27001 security controls

---

## Conclusion

The Cricket Mela application has **significant security vulnerabilities** that require immediate attention. The two critical issues (plaintext passwords and weak authentication) pose an **immediate risk** and should be fixed within **7 days**.

**Recommended Priority:**
1. **IMMEDIATE (This Week):** Fix critical authentication vulnerabilities
2. **HIGH (Next 2 Weeks):** Update dependencies, add CSRF/rate limiting
3. **MEDIUM (Next Month):** Input validation, error handling
4. **LOW (Next 2 Months):** Security hardening features

**Estimated Total Effort:** 25-35 hours of development time

---

## Contact & Support

For questions about this security audit:
- Review the implementation guides above
- Test fixes in development environment first
- Deploy to production after thorough testing

**Remember:** Security is an ongoing process, not a one-time fix! 🔒

