#!/bin/bash

echo "🚀 Starting Cricket Mela with LocalTunnel..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if LocalTunnel is installed
if ! command -v lt &> /dev/null; then
    echo -e "${YELLOW}LocalTunnel not found. Installing...${NC}"
    npm install -g localtunnel
fi

echo -e "${GREEN}✓${NC} LocalTunnel is ready"
echo ""

# Start LocalTunnel for frontend
echo -e "${BLUE}Starting LocalTunnel for frontend...${NC}"
lt --port 5173 &
LT_PID=$!

# Wait for URL
sleep 3

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ LocalTunnel is running!${NC}"
echo ""
echo -e "${YELLOW}Your public URL will be shown above${NC}"
echo ""
echo -e "${BLUE}📝 Important:${NC}"
echo -e "  1. When you first open the URL in a browser"
echo -e "  2. You'll see a 'Tunnel Password' page"
echo -e "  3. Click 'Submit' or 'Continue' to proceed"
echo -e "  4. After that, your app will load normally"
echo ""
echo -e "${BLUE}🔗 Share this URL with your friends!${NC}"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Press Ctrl+C to stop..."

# Wait for process
wait $LT_PID

