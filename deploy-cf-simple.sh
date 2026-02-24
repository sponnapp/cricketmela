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
npm install
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Error: Build failed - dist directory not created"
    exit 1
fi

echo "✅ Build completed successfully!"

# Step 2: Deploy to Cloudflare Pages
echo ""
echo "☁️  Step 2: Deploying to Cloudflare Pages..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "📥 Wrangler not found. Installing..."
    npm install -g wrangler
fi

# Deploy using wrangler
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

