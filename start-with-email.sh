#!/bin/bash

# Cricket Mela - Start Application with Email Integration

echo "🏏 Cricket Mela - Starting Application..."
echo ""

# Check if backend is already running
if lsof -i:4000 > /dev/null 2>&1; then
  echo "Backend already running on port 4000"
  echo "Stopping existing backend..."
  lsof -t -i:4000 | xargs kill -9 2>/dev/null
  sleep 1
fi

# Start backend
echo "Starting backend..."
cd /Users/senthilponnappan/IdeaProjects/Test/backend
npm start > ../backend.log 2>&1 &
cd ..

# Wait for backend to start
sleep 3

echo "✅ Cricket Mela backend is starting!"
echo ""
echo "📱 Access the application:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:4000"
echo ""
echo "📧 Email Integration Setup:"
echo "   1. Login as admin (username: admin, password: admin123)"
echo "   2. Click the 📧 Email tab in Admin Panel"
echo "   3. Configure Gmail settings with App Password"
echo "   4. Enable notifications and save"
echo ""
echo "📝 Documentation: EMAIL_INTEGRATION_COMPLETE.md"
echo ""
