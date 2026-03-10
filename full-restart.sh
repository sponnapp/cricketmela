#!/bin/bash

# Full restart script for Cricket Mela
#  This script stops all servers, rebuilds frontend, and restarts everything

echo "🛑 Stopping all servers..."
pkill -f "node index.js"
pkill -f "vite"
sleep 2

echo "🧹 Clearing frontend build cache..."
cd frontend
rm -rf dist
rm -rf node_modules/.vite

echo "🔨 Building frontend..."
npm run build

echo "🚀 Starting backend..."
cd ../backend
npm start &
BACKEND_PID=$!

echo "⏳ Waiting for backend to start..."
sleep 3

echo "🚀 Starting frontend..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ All servers started!"
echo ""
echo "📍 Frontend: http://localhost:5173"
echo "📍 Backend: http://localhost:4000"
echo ""
echo "💡 Hard refresh your browser (Cmd+Shift+R) to clear cache"
echo ""
echo "🛑 To stop servers: pkill -f 'node index.js' && pkill -f 'vite'"

