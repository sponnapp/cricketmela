#!/bin/bash

# Production Deployment Verification Script
# Run this after deploying to verify everything is working

echo "🔍 Cricket Mela - Production Verification"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Function to test endpoint
test_endpoint() {
    local url=$1
    local expected_code=$2
    local description=$3

    echo -n "Testing: $description... "

    response_code=$(curl -s -o /dev/null -w "%{http_code}" "$url")

    if [ "$response_code" -eq "$expected_code" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $response_code)"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC} (Expected HTTP $expected_code, got HTTP $response_code)"
        ((FAILED++))
    fi
}

# Function to test POST endpoint
test_post_endpoint() {
    local url=$1
    local data=$2
    local expected_code=$3
    local description=$4

    echo -n "Testing: $description... "

    response_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "$data" "$url")

    if [ "$response_code" -eq "$expected_code" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $response_code)"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC} (Expected HTTP $expected_code, got HTTP $response_code)"
        ((FAILED++))
    fi
}

echo "1️⃣  Testing Frontend (Cloudflare Pages)"
echo "----------------------------------------"
test_endpoint "https://cricketmela.pages.dev" 200 "Frontend homepage"
test_endpoint "https://cricketmela.pages.dev/index.html" 200 "Frontend index.html"
echo ""

echo "2️⃣  Testing Backend API (Fly.io)"
echo "----------------------------------------"
test_endpoint "https://cricketmela-api.fly.dev/api/seasons" 200 "API: Get seasons"
test_post_endpoint "https://cricketmela-api.fly.dev/api/login" '{"username":"admin","password":"admin123"}' 200 "API: Admin login"
test_post_endpoint "https://cricketmela-api.fly.dev/api/login" '{"username":"wronguser","password":"wrongpass"}' 401 "API: Invalid login (should fail)"
echo ""

echo "3️⃣  Testing API Routing via Frontend"
echo "----------------------------------------"
test_endpoint "https://cricketmela.pages.dev/api/seasons" 200 "Frontend API proxy: /api/seasons"
echo ""

echo "4️⃣  Summary"
echo "----------------------------------------"
echo -e "Tests Passed: ${GREEN}$PASSED${NC}"
echo -e "Tests Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Production is working correctly.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Open https://cricketmela.pages.dev in your browser"
    echo "2. Hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)"
    echo "3. Login and verify table sorting works"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Please check the errors above.${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "1. Verify _redirects file is in frontend/dist/"
    echo "2. Check Cloudflare Pages deployment logs"
    echo "3. Check Fly.io backend logs: fly logs -a cricketmela-api"
    echo "4. See PRODUCTION-TROUBLESHOOTING.md for detailed help"
    exit 1
fi

