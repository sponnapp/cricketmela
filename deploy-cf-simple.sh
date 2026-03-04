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

# Step 1.5: Copy _redirects to dist for API routing
echo ""
echo "📋 Step 1.5: Copying _redirects configuration..."
if [ -f "_redirects" ]; then
    cp _redirects dist/
    echo "✅ _redirects copied to dist/"
else
    echo "⚠️  Warning: _redirects file not found"
fi

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
#   functions/  → Cloudflare Pages Functions (API + auth proxy)
# Both folders must be siblings for Cloudflare Pages Functions to work.
echo "🚀 Deploying to Cloudflare Pages..."
npx wrangler pages deploy dist --project-name=cricketmela

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

cd ..


