#!/bin/bash

echo "🔄 Restarting Cricket Mela with Cloudflare Tunnel..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Kill existing processes
echo "🛑 Stopping existing processes..."
pkill -f "node index.js"
pkill -f "vite"
pkill -f "cloudflared"
sleep 2
echo "✅ Stopped old processes"
echo ""

# Start backend
echo "🚀 Starting Backend..."
cd /Users/senthilponnappan/IdeaProjects/Test/backend
nohup npm start > ../backend.log 2>&1 &
sleep 3
echo "✅ Backend started (port 4000)"
echo ""

# Start frontend
echo "🚀 Starting Frontend (with new Vite config)..."
cd /Users/senthilponnappan/IdeaProjects/Test/frontend
nohup npm run dev > ../frontend.log 2>&1 &
sleep 5
echo "✅ Frontend started (port 5173)"
echo ""

# Check if services are running
echo "🔍 Checking services..."
if curl -s http://localhost:4000/api/health > /dev/null 2>&1; then
    echo "✅ Backend is responding"
else
    echo "⚠️  Backend might not be ready yet (wait a few seconds)"
fi

if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "✅ Frontend is responding"
else
    echo "⚠️  Frontend might not be ready yet (wait a few seconds)"
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
cd /Users/senthilponnappan/IdeaProjects/Test
cloudflared tunnel --url localhost:5173

