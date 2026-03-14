# Cloudflare KV Squad Caching - Setup Guide

## Overview
This implements Cloudflare KV caching for squad data to achieve <100ms response times. Squad data is cached for 1 hour, well within the free tier limit of 100,000 reads/day.

## Performance Impact
- **Before**: 4-5 seconds (backend API call to Cricbuzz)
- **After**: <100ms (instant from Cloudflare KV edge cache)
- **Improvement**: 40-50x faster

## Step 1: Create KV Namespace

Run this command in the project root:

```bash
cd /Users/senthilponnappan/IdeaProjects/Test
npx wrangler kv:namespace create SQUAD_CACHE --preview false
```

You'll get output like:
```
🌀 Creating namespace with title "cricketmela-SQUAD_CACHE"
✨ Success!
Add the following to your wrangler.toml:
{ binding = "SQUAD_CACHE", id = "abc123def456..." }
```

## Step 2: Update wrangler.toml

Replace the placeholder ID in `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "SQUAD_CACHE"
id = "abc123def456..."  # Use the ID from Step 1
```

## Step 3: Bind KV to Pages Project

```bash
cd /Users/senthilponnappan/IdeaProjects/Test
npx wrangler pages deployment create --project-name=cricketmela
```

Or use the existing deployment script (it will pick up the KV binding automatically):

```bash
./deploy-cf-simple.sh
```

## Step 4: Verify KV Binding (Optional)

After deployment, check the Cloudflare Dashboard:
1. Go to Workers & Pages → cricketmela
2. Click Settings → Functions
3. Verify "KV namespace bindings" shows SQUAD_CACHE

## How It Works

### 1. Squad Data Request Flow (with KV)
```
User → Predictions.jsx
  ↓
GET /api/predictions/players-by-season/123
  ↓
Pages Function (KV-cached)
  ↓
Check KV cache (squad:123)
  ├─ HIT → Return instantly (<100ms) ✅
  └─ MISS → Fetch from backend → Store in KV → Return
```

### 2. Cache Refresh Flow
```
Admin → Refresh Squad Button
  ↓
1. DELETE /api/predictions/players-by-season/123/cache
   └─ Clears KV cache
  ↓
2. POST /api/admin/seasons/123/refresh-squad
   └─ Fetches fresh data from Cricbuzz
   └─ Backend updates in-memory cache
  ↓
Next squad fetch → KV MISS → Fresh data cached
```

### 3. Files Modified
- `wrangler.toml` - KV namespace binding configuration
- `frontend/functions/api/predictions/players-by-season/[seasonId].js` - KV-cached GET endpoint
- `frontend/functions/api/predictions/players-by-season/[seasonId]/cache.js` - KV cache clear endpoint
- `frontend/src/Admin.jsx` - Clear KV cache before refresh

## Cache Settings

- **TTL**: 1 hour (3600 seconds)
- **Cache Key Pattern**: `squad:{seasonId}`
- **Storage Size**: ~50KB per season (well within limits)
- **Daily Reads**: ~1,000-5,000 (well within 100k free limit)

## Free Tier Limits

| Resource | Limit | Expected Usage | Status |
|----------|-------|----------------|--------|
| Reads/day | 100,000 | ~5,000 | ✅ 5% |
| Writes/day | 1,000 | ~24 | ✅ 2.4% |
| Storage | 1 GB | <5 MB | ✅ 0.5% |

## Testing

### 1. Test KV Cache Hit
```bash
# First request (cache MISS)
curl -i https://cricketmela.pages.dev/api/predictions/players-by-season/1

# Check response headers:
# X-Cache-Status: MISS
# X-Cache-Source: backend-then-kv

# Second request (cache HIT)
curl -i https://cricketmela.pages.dev/api/predictions/players-by-season/1

# Check response headers:
# X-Cache-Status: HIT
# X-Cache-Source: cloudflare-kv
```

### 2. Test Cache Clear
```bash
# Clear cache (admin only)
curl -X DELETE https://cricketmela.pages.dev/api/predictions/players-by-season/1/cache \
  -H "x-user: admin"

# Verify next request is cache MISS
curl -i https://cricketmela.pages.dev/api/predictions/players-by-season/1
# X-Cache-Status: MISS
```

### 3. Test in Browser
1. Open browser DevTools → Network tab
2. Navigate to Predictions page
3. Look for `/api/predictions/players-by-season/*` requests
4. Check Response Headers for `X-Cache-Status: HIT` or `MISS`
5. Refresh page → Should see `HIT` on second load

## Monitoring

### View KV Usage
```bash
npx wrangler kv:key list --binding=SQUAD_CACHE
```

### Check Cache Contents
```bash
# List all cached squads
npx wrangler kv:key list --namespace-id=<your-namespace-id>

# View specific squad
npx wrangler kv:key get "squad:1" --namespace-id=<your-namespace-id>
```

### Clear All Cache (Emergency)
```bash
# Get all keys
npx wrangler kv:key list --namespace-id=<your-namespace-id> --prefix="squad:"

# Delete specific key
npx wrangler kv:key delete "squad:1" --namespace-id=<your-namespace-id>
```

## Troubleshooting

### Issue: "KV namespace not found"
**Solution**: Verify namespace ID in wrangler.toml matches the created namespace

### Issue: Cache always shows MISS
**Solution**: 
- Check Cloudflare dashboard → Pages → Settings → Functions → KV bindings
- Verify binding name is exactly "SQUAD_CACHE"
- Re-deploy: `./deploy-cf-simple.sh`

### Issue: Can't delete cache
**Solution**: Ensure x-user header is set with admin username

## Deployment

```bash
cd /Users/senthilponnappan/IdeaProjects/Test

# Deploy frontend with KV functions
./deploy-cf-simple.sh

# No backend changes needed - backend continues to work as before
```

## Expected Results

After deployment:
1. ✅ First squad load per season: 1-2 seconds (backend fetch)
2. ✅ Subsequent loads: <100ms (KV cache)
3. ✅ Cache refreshes every hour automatically
4. ✅ Admin can force refresh anytime
5. ✅ Response headers show cache status

## Next Steps (Optional)

To further optimize:
1. **Phase 2**: Migrate to Cloudflare D1 for edge database (10x faster queries globally)
2. **Phase 3**: Add KV caching for upcoming matches list
3. **Phase 4**: Use Cloudflare Images for player photos (automatic optimization)

## Rollback Plan

If issues occur, simply remove the KV-specific function files:
```bash
rm frontend/functions/api/predictions/players-by-season/[seasonId].js
rm -rf frontend/functions/api/predictions/players-by-season/[seasonId]
./deploy-cf-simple.sh
```

The generic proxy will handle requests again (slower but functional).
