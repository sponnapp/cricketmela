#!/bin/bash

echo "🔍 Checking Cricket Mela servers..."
echo ""

# Check backend
BACKEND_PID=$(lsof -ti:4000 2>/dev/null)
if [ -n "$BACKEND_PID" ]; then
  echo "✅ Backend is running (PID: $BACKEND_PID, Port: 4000)"
  echo "   Testing backend API..."
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/seasons)
  if [ "$RESPONSE" = "200" ]; then
    echo "   ✅ Backend API responding correctly"
  else
    echo "   ❌ Backend API returned status: $RESPONSE"
  fi
else
  echo "❌ Backend is NOT running"
  echo "   To start: cd backend && npm start"
fi

echo ""

# Check frontend
FRONTEND_PID=$(lsof -ti:5173 2>/dev/null)
if [ -n "$FRONTEND_PID" ]; then
  echo "✅ Frontend is running (PID: $FRONTEND_PID, Port: 5173)"
  echo "   URL: http://localhost:5173"
else
  echo "❌ Frontend is NOT running"
  echo "   To start: cd frontend && npm run dev"
fi

echo ""
echo "To start both servers: ./restart-all.sh"

