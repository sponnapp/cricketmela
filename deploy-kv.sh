#!/bin/bash
# Quick deployment script for Cloudflare KV squad caching feature

set -e

echo "🚀 Deploying Cloudflare KV Squad Caching..."
echo ""

# Check if in correct directory
if [ ! -f "wrangler.toml" ]; then
    echo "❌ Error: Must run from project root"
    exit 1
fi

# Deploy frontend with KV functions
echo "📦 Building frontend..."
cd frontend
npm run build

echo ""
echo "☁️ Deploying to Cloudflare Pages..."
cd ..
npx wrangler pages deploy frontend/dist --project-name=cricketmela --commit-dirty=true

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Testing instructions:"
echo "1. Open: https://cricketmela.pages.dev"
echo "2. Navigate to Predictions page"
echo "3. Open DevTools → Network tab"
echo "4. Look for 'players-by-season' requests"
echo "5. Check Response Headers:"
echo "   - First load: X-Cache-Status: MISS"
echo "   - Second load: X-Cache-Status: HIT (<100ms)"
echo ""
echo "🔄 To refresh squad cache:"
echo "1. Go to Admin Panel → Import Matches tab"
echo "2. Click 'Refresh Squad' for any season"
echo "3. Cache will be cleared and fresh data loaded"
echo ""
echo "📈 Expected performance:"
echo "   Before: 4-5 seconds"
echo "   After: <100ms (40-50x faster!)"
