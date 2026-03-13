#!/bin/bash
# D1 Local Testing Setup
# This script sets up a local development environment with D1 database

set -e

echo "🚀 Setting up D1 Local Testing Environment..."
echo ""

# Check if in correct directory
if [ ! -f "wrangler.toml" ]; then
    echo "❌ Error: Must run from project root"
    exit 1
fi

echo "⚠️  NOTE: wrangler pages dev always uses LOCAL D1."
echo "   Schema will be applied to local database before starting."
echo ""

# Apply D1 schema to local database
echo "📊 Step 1: Initializing local D1 database..."
npx wrangler d1 execute cricketmela-db --file=backend/d1-schema.sql --local
echo "✅ Local D1 schema applied"
echo ""

# Build frontend
echo "📦 Step 2: Building frontend..."
cd frontend
npm run build
echo ""

# Start Pages dev server with D1 binding
echo "🌐 Step 3: Starting Cloudflare Pages dev server..."
echo ""
echo "Mode: Local D1 development"
echo "Database: cricketmela-db (local)"
echo "Binding: DB"
echo ""
echo "📊 Test endpoints:"
echo "  POST http://localhost:8788/api/login"
echo "  GET  http://localhost:8788/api/seasons"
echo ""
echo "🧪 Example test:"
echo '  curl -X POST http://localhost:8788/api/login \'
echo '    -H "Content-Type: application/json" \'
echo '    -d '"'"'{"username":"admin","password":"admin123"}'"'"' \'
echo '    -i | grep "X-Database-Source"'
echo ""
echo "Expected header:"
echo "  X-Database-Source: d1-edge ✅"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npx wrangler pages dev dist --d1=DB=cricketmela-db --kv=SQUAD_CACHE=cd86a3f47591439caae84ec5bfe42b8a --port=8788
