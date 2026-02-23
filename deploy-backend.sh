#!/bin/bash
# Deploy Backend to Fly.io

set -e

echo "🚀 Deploying Cricket Mela Backend to Fly.io..."

cd backend

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null; then
    echo "❌ Fly CLI not found. Please install it first:"
    echo "   brew install flyctl"
    echo "   OR"
    echo "   curl -L https://fly.io/install.sh | sh"
    exit 1
fi

# Check if user is logged in
if ! flyctl auth whoami &> /dev/null; then
    echo "📝 Please log in to Fly.io"
    flyctl auth login
fi

# Check if app exists
if ! flyctl status &> /dev/null; then
    echo "📋 App not found. Creating new Fly.io app..."
    flyctl launch --no-deploy

    echo "💾 Creating persistent volume for database..."
    flyctl volumes create cricket_data --size 1

    echo "🔒 Setting environment variables..."
    flyctl secrets set NODE_ENV=production
fi

echo "🏗️  Building and deploying..."
flyctl deploy

echo "✅ Backend deployed successfully!"
echo ""
echo "Your backend is available at:"
flyctl status --json | grep -o '"Hostname":"[^"]*"' | cut -d'"' -f4 | head -1

echo ""
echo "📊 To view logs: flyctl logs"
echo "🔍 To check status: flyctl status"
echo "💻 To SSH into app: flyctl ssh console"

