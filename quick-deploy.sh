#!/bin/bash

# Quick Deploy and Verify Script
# Deploys to production and runs verification tests

set -e

echo "🚀 Quick Deploy & Verify - Cricket Mela"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Deploy frontend
echo -e "${YELLOW}Step 1: Deploying frontend to Cloudflare Pages...${NC}"
./deploy-cf-simple.sh

echo ""
echo -e "${GREEN}✓ Frontend deployed successfully!${NC}"
echo ""

# Step 2: Wait for propagation
echo -e "${YELLOW}Step 2: Waiting 10 seconds for CDN propagation...${NC}"
sleep 10
echo -e "${GREEN}✓ Wait complete!${NC}"
echo ""

# Step 3: Run verification tests
echo -e "${YELLOW}Step 3: Running production verification tests...${NC}"
./verify-production.sh

echo ""
echo "=========================================="
echo -e "${GREEN}🎉 Deployment and verification complete!${NC}"
echo ""
echo "⚠️  IMPORTANT: Clear your browser cache before testing:"
echo "   Mac: Cmd + Shift + R"
echo "   Windows/Linux: Ctrl + Shift + R"
echo ""
echo "🌐 Production URL: https://cricketmela.pages.dev"
echo ""

