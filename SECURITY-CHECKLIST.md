# 🔒 Cricket Mela - Security Fix Checklist

Use this checklist to track your security improvements.

---

## 🔴 CRITICAL FIXES (Week 1 - URGENT!)

### Password Security
- [ ] Install bcrypt package (`npm install bcrypt`)
- [ ] Create password migration script
- [ ] Run migration to hash existing passwords
- [ ] Update login endpoint to use bcrypt.compare()
- [ ] Update signup endpoint to hash passwords
- [ ] Update profile password change to use bcrypt
- [ ] Update admin password reset to use bcrypt
- [ ] Test login with hashed passwords
- [ ] Verify all DB passwords start with `$2b$`
- [ ] Deploy to production

**Est. Time:** 2-3 hours

### JWT Authentication
- [ ] Install jsonwebtoken package (`npm install jsonwebtoken`)
- [ ] Set JWT_SECRET environment variable
- [ ] Update login to return JWT token
- [ ] Replace x-user middleware with JWT verification
- [ ] Update frontend to store token in localStorage
- [ ] Update frontend to send Authorization header
- [ ] Remove all x-user header references
- [ ] Test JWT authentication end-to-end
- [ ] Deploy to production
- [ ] Set JWT_SECRET on Fly.io (`fly secrets set`)

**Est. Time:** 4-6 hours

---

## 🟠 HIGH PRIORITY FIXES (Week 2)

### Dependency Updates
- [ ] Run `npm audit` in backend
- [ ] Run `npm audit` in frontend
- [ ] Update Express to 4.20.0+
- [ ] Update Axios to 1.13.5+
- [ ] Update Vite to 7.1.11+
- [ ] Test application after updates
- [ ] Run `npm audit` again (should show 0 vulnerabilities)
- [ ] Deploy to production

**Est. Time:** 1 hour

### CSRF Protection
- [ ] Install csurf package (`npm install csurf`)
- [ ] Add CSRF middleware to Express
- [ ] Generate CSRF tokens on page load
- [ ] Add CSRF token to all POST/PUT/DELETE requests
- [ ] Test CSRF protection (requests without token should fail)
- [ ] Deploy to production

**Est. Time:** 2-3 hours

### Rate Limiting
- [ ] Install express-rate-limit (`npm install express-rate-limit`)
- [ ] Add login rate limiter (5 attempts per 15 min)
- [ ] Add global API rate limiter (100 req/min)
- [ ] Add vote endpoint rate limiter
- [ ] Test rate limiting (should get 429 after limit)
- [ ] Deploy to production

**Est. Time:** 2-3 hours

---

## 🟡 MEDIUM PRIORITY FIXES (Weeks 3-4)

### Input Validation
- [ ] Install express-validator (`npm install express-validator`)
- [ ] Add validation to vote endpoint (match_id, team, points)
- [ ] Add validation to user creation
- [ ] Add validation to match creation
- [ ] Add validation to season creation
- [ ] Test validation (invalid inputs should return 400)
- [ ] Deploy to production

**Est. Time:** 3-4 hours

### Error Handling
- [ ] Add production error handler (generic messages only)
- [ ] Add development error handler (detailed messages)
- [ ] Log errors server-side only
- [ ] Test error handling (no stack traces to client)
- [ ] Deploy to production

**Est. Time:** 2 hours

### HTTPS Enforcement
- [ ] Add HTTPS redirect middleware
- [ ] Test redirect (HTTP → HTTPS)
- [ ] Deploy to production

**Est. Time:** 1 hour

---

## 🟢 LOW PRIORITY FIXES (Month 2)

### Security Headers
- [ ] Install helmet (`npm install helmet`)
- [ ] Configure helmet middleware
- [ ] Add CSP (Content Security Policy)
- [ ] Add HSTS (HTTP Strict Transport Security)
- [ ] Add X-Frame-Options
- [ ] Test headers (use securityheaders.com)
- [ ] Deploy to production

**Est. Time:** 1 hour

### Password Policy
- [ ] Increase minimum length to 8 characters
- [ ] Add password complexity check (uppercase, lowercase, number)
- [ ] Add password strength indicator in UI
- [ ] Update password validation
- [ ] Test password policy
- [ ] Deploy to production

**Est. Time:** 1 hour

### Account Lockout
- [ ] Create failed attempts tracking
- [ ] Add lockout logic (5 attempts = 15 min lockout)
- [ ] Add unlock mechanism
- [ ] Test account lockout
- [ ] Deploy to production

**Est. Time:** 2 hours

### HttpOnly Cookies
- [ ] Install cookie-parser (`npm install cookie-parser`)
- [ ] Move JWT to httpOnly cookie
- [ ] Update frontend (automatic with httpOnly)
- [ ] Test cookie-based auth
- [ ] Deploy to production

**Est. Time:** 3 hours

---

## 📊 Progress Tracker

```
Overall Progress: [ ] 0% → [ ] 25% → [ ] 50% → [ ] 75% → [ ] 100%

Critical:  [__________] 0/10 tasks
High:      [__________] 0/17 tasks
Medium:    [__________] 0/13 tasks
Low:       [__________] 0/16 tasks

Total:     [__________] 0/56 tasks completed
```

---

## ✅ Verification Steps

After each fix, verify:

### Password Hashing
```bash
sqlite3 backend/data.db "SELECT username, password FROM users LIMIT 3"
# Should show: admin|$2b$10$...
```

### JWT Authentication
```bash
curl -X POST http://localhost:4000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
# Should return: {"token":"eyJhbG...", "user":{...}}
```

### Rate Limiting
```bash
for i in {1..10}; do
  curl -X POST http://localhost:4000/api/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"wrong"}'
done
# After 5 attempts, should return 429 Too Many Requests
```

### CSRF Protection
```bash
curl -X POST http://localhost:4000/api/votes \
  -H "Content-Type: application/json" \
  -d '{"match_id":1,"team":"India","points":10}'
# Should return 403 Forbidden (no CSRF token)
```

### Security Headers
```bash
curl -I https://cricketmela.pages.dev
# Should include:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Strict-Transport-Security: max-age=...
```

---

## 📅 Timeline

| Week | Focus | Tasks | Hours |
|------|-------|-------|-------|
| 1 | 🔴 Critical | Password hashing + JWT | 6-9h |
| 2 | 🟠 High | Dependencies + CSRF + Rate limit | 5-7h |
| 3 | 🟡 Medium | Input validation + Errors | 5-6h |
| 4 | 🟡 Medium | HTTPS enforcement | 1h |
| 5-8 | 🟢 Low | Security headers + Policy + Lockout + Cookies | 7h |

**Total: 24-30 hours over 8 weeks**

---

## 🎯 Success Criteria

Application is considered secure when:

- ✅ All passwords hashed with bcrypt
- ✅ JWT authentication implemented
- ✅ All dependencies up to date (0 npm audit vulnerabilities)
- ✅ CSRF protection active
- ✅ Rate limiting enforced
- ✅ All inputs validated
- ✅ Security headers present
- ✅ No plaintext sensitive data
- ✅ HTTPS enforced
- ✅ Strong password policy

**Target Security Grade: A- (92/100)**

---

## 📝 Notes

### Before Each Deployment
- [ ] Test in local environment
- [ ] Run all verification steps
- [ ] Check npm audit (0 vulnerabilities)
- [ ] Review code changes
- [ ] Backup database

### After Each Deployment
- [ ] Verify production works
- [ ] Check error logs
- [ ] Test authentication
- [ ] Monitor for issues
- [ ] Update this checklist

---

## 🚀 Quick Commands

```bash
# Install all security packages at once
npm install bcrypt jsonwebtoken csurf express-rate-limit \
  express-validator helmet cookie-parser

# Run security audit
npm audit

# Fix vulnerabilities automatically
npm audit fix

# Deploy to production
cd backend && flyctl deploy --remote-only
cd frontend && npm run build && npx wrangler pages deploy dist

# Check database
sqlite3 backend/data.db "SELECT username, password FROM users"

# View logs
fly logs -a cricketmela-api
```

---

**Start Date:** _______________  
**Target Completion:** _______________ (8 weeks)  
**Actual Completion:** _______________

**Security is a journey, not a destination!** 🔒

