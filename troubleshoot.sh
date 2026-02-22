#!/bin/bash

echo "=== IPL T20 BETTING - LOGIN TROUBLESHOOTING ==="
echo ""
echo "Step 1: Checking if Node.js is installed"
node --version
npm --version

echo ""
echo "Step 2: Kill existing processes on port 4000"
lsof -i :4000 || echo "Port 4000 is free"

echo ""
echo "Step 3: Starting backend..."
cd /Users/senthilponnappan/IdeaProjects/Test/backend
npm start &
BACKEND_PID=$!
sleep 3

echo ""
echo "Step 4: Testing health endpoint"
curl -s http://localhost:4000/api/health

echo ""
echo "Step 5: Testing login with admin credentials"
curl -s -X POST http://localhost:4000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

echo ""
echo "Step 6: Testing login with senthil credentials"
curl -s -X POST http://localhost:4000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"senthil","password":"password"}'

echo ""
echo "=== DONE ==="
echo "Backend PID: $BACKEND_PID"

