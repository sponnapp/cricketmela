# Cloudflare D1 Migration - Quick Reference

## ✅ What's Done

### D1 Database Setup
- **Database ID:** `dc9d493e-5a8b-43d6-9877-ab0745ff9c38`
- **Database Name:** `cricketmela-db`
- **Binding:** `DB`
- **Schema:** Applied to local and remote ✅

### Files Created
1. ✅ `backend/d1-schema.sql` - Complete database schema
2. ✅ `wrangler.toml` - D1 binding configuration
3. ✅ `frontend/functions/api/login.js` - D1-powered login
4. ✅ `frontend/functions/api/seasons.js` - D1-powered seasons list
5. ✅ `backend/test-d1.js` - SQL query testing script
6. ✅ `test-d1-local.sh` - Local dev server with D1
7. ✅ `D1-MIGRATION-GUIDE.md` - Complete migration guide

### Feature Branch
- ✅ Branch: `feature/d1-migration`
- ✅ All changes uncommitted (ready for testing)

---

## 🧪 Testing Locally

### Option 1: Quick SQL Test
```bash
node backend/test-d1.js
```

### Option 2: Full App Test with D1
```bash
./test-d1-local.sh
```
Then visit: http://localhost:8788
Login should use D1 (check Network tab for `X-Database-Source: d1-edge`)

### Option 3: Manual Test
```bash
cd frontend
npm run build
npx wrangler pages dev dist --d1=DB=cricketmela-db --kv=SQUAD_CACHE=cd86a3f47591439caae84ec5bfe42b8a --port=8788
```

---

## 🎯 Test Checklist

Before merging to main:

- [ ] **Login Test**
  ```bash
  curl -X POST http://localhost:8788/api/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}'
  ```
  - Should return user object
  - Should have header `X-Database-Source: d1-edge`

- [ ] **Seasons Test**
  ```bash
  curl http://localhost:8788/api/seasons \
    -H "x-user: admin"
  ```
  - Should return seasons array
  - Should have header `X-Database-Source: d1-edge`

- [ ] **Frontend Test**
  - Open http://localhost:8788
  - Login as admin/admin123
  - Should see seasons list
  - Check DevTools → Network → Headers for D1 confirmation

- [ ] **Data Migration** (if needed)
  - Export data from Fly.io SQLite
  - Import to D1 remote database
  - Verify data integrity

- [ ] **Performance Test**
  - Measure login time (should be <100ms)
  - Measure seasons list time (should be <50ms)
  - Compare with Fly.io backend

---

## 🚀 Deployment (After Testing)

If all tests pass:

```bash
# Commit local changes
git add .
git commit -m "feat: Migrate to Cloudflare D1 edge database (10x faster globally)"

# Push to remote
git push origin feature/d1-migration

# Merge to main
git checkout main
git merge feature/d1-migration
git push origin main

# Deploy
./deploy-cf-simple.sh
```

---

## 📊 Expected Performance

| Endpoint | Before (Fly.io) | After (D1) | Improvement |
|----------|-----------------|------------|-------------|
| Login | 200-500ms | 10-50ms | **10x faster** |
| Seasons | 100-300ms | 10-40ms | **8x faster** |
| Matches | 300-800ms | 20-80ms | **10x faster** |

---

## 🔄 Rollback (If Issues)

```bash
# Delete D1-specific functions
rm frontend/functions/api/login.js
rm frontend/functions/api/seasons.js

# Checkout main branch
git checkout main

# Redeploy
./deploy-cf-simple.sh
```

App will fall back to Fly.io backend via generic proxy.

---

## 📁 Architecture

**Current (Hybrid):**
```
Frontend → D1 (login, seasons) → Cloudflare Edge ⚡
        ↘ Fly.io (rest) → SQLite
```

**Future (Full D1):**
```
Frontend → D1 (all endpoints) → Cloudflare Edge ⚡
```

---

## 🆓 Free Tier Status

| Resource | Limit | Expected | Status |
|----------|-------|----------|--------|
| Reads/day | 5M | 100K | ✅ 2% |
| Writes/day | 100K | 10K | ✅ 10% |
| Storage | 5 GB | <100 MB | ✅ 2% |

Plenty of headroom! ✅

---

## 📝 Notes

- D1 endpoints have automatic fallback to Fly.io if D1 unavailable
- All data must be migrated to D1 before full cutover
- Backend (Fly.io) can remain as backup/admin tool
- Phase 1 complete: Ready for local testing
- Phase 2: Deploy to production after successful tests
- Phase 3: Migrate remaining endpoints (votes, predictions, admin)

---

**Current Status:** ✅ Phase 1 Complete - Ready for Local Testing
**Next Step:** Run `./test-d1-local.sh` and verify endpoints
