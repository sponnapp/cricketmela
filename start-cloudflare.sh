#!/bin/bash

echo "🚀 Starting Cricket Mela with Cloudflare Tunnel..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if Cloudflare is installed
if ! command -v cloudflared &> /dev/null; then
    echo "📦 Installing Cloudflare Tunnel..."
    brew install cloudflare/cloudflare/cloudflared
    echo "✅ Installed!"
    echo ""
fi

# Check if frontend is running
echo "🔍 Checking if frontend is running on port 5173..."
if curl -s http://localhost:5173 > /dev/null; then
    echo "✅ Frontend is running!"
else
    echo "⚠️  Frontend not detected. Make sure it's running:"
    echo "   cd /Users/senthilponnappan/IdeaProjects/Test/frontend"
    echo "   npm run dev"
    echo ""
    read -p "Press Enter when frontend is running, or Ctrl+C to exit..."
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Starting Cloudflare Tunnel..."
echo ""
echo "   Your public URL will appear below:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start Cloudflare Tunnel
cloudflared tunnel --url localhost:5173

# This line only runs if tunnel is stopped
echo ""
echo "Tunnel stopped."

