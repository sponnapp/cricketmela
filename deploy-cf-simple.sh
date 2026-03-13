#!/bin/bash

# Simple Cloudflare Pages Deployment Script
# This script deploys the frontend to Cloudflare Pages

set -e  # Exit on any error

echo "🚀 Starting Cloudflare Pages Deployment..."
echo "=========================================="

# Check if we're in the correct directory
if [ ! -d "frontend" ]; then
    echo "❌ Error: frontend directory not found. Please run this script from the project root."
    exit 1
fi

# Step 1: Build the frontend
echo ""
echo "📦 Step 1: Building frontend..."
cd frontend

# Clean dist directory to avoid permission issues
echo "🧹 Cleaning old build..."
rm -rf dist

npm install
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Error: Build failed - dist directory not created"
    exit 1
fi

echo "✅ Build completed successfully!"

# Step 1.5: Ensure _redirects is present in dist for SPA fallback/proxy rules
echo ""
echo "📋 Step 1.5: Ensuring _redirects configuration..."
if [ -f "public/_redirects" ]; then
    cp public/_redirects dist/_redirects
    echo "✅ public/_redirects copied to dist/_redirects"
elif [ -f "_redirects" ]; then
    cp _redirects dist/_redirects
    echo "✅ _redirects copied to dist/_redirects"
else
    echo "⚠️  Warning: No _redirects file found"
fi

# Step 1.6: Copy _headers to dist for cache-control
echo ""
echo "📋 Step 1.6: Copying _headers configuration..."
if [ -f "public/_headers" ]; then
    cp public/_headers dist/
    echo "✅ _headers copied to dist/"
else
    echo "⚠️  Warning: public/_headers file not found"
fi

# Step 1.7: Generate version.json for auto-update detection
echo ""
echo "🔖 Step 1.7: Generating version.json..."
VERSION=$(git rev-parse --short HEAD 2>/dev/null || date +%s)
echo "{\"version\":\"$VERSION\",\"buildTime\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" > dist/version.json
echo "✅ version.json generated (version: $VERSION)"

# Step 2: Deploy to Cloudflare Pages
echo ""
echo "☁️  Step 2: Deploying to Cloudflare Pages..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "📥 Wrangler not found. Installing..."
    npm install -g wrangler
fi

# Deploy using wrangler
# Run from inside frontend/ so wrangler automatically picks up:
#   dist/       → static built assets
#   functions/  → Cloudflare Pages Functions (API + auth proxy + KV caching)
# Both folders must be siblings for Cloudflare Pages Functions to work.
# wrangler.toml in project root provides KV namespace bindings.
echo "🚀 Deploying to Cloudflare Pages..."
npx wrangler pages deploy dist --project-name=cricketmela --commit-dirty=true
cd ..

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo ""
echo "🌐 Your app is live at:"
echo "   https://cricketmela.pages.dev"
echo ""
echo "📊 Backend API:"
echo "   https://cricketmela-api.fly.dev"
echo ""
echo "🎉 All done! Your Cricket Mela app is now updated in production!"
echo "=========================================="
