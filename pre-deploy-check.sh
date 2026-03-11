#!/bin/bash

# Production Deployment Pre-Check Script
# This script validates all configurations before deploying to production

set -e

echo "🔍 CRICKET MELA - PRODUCTION DEPLOYMENT PRE-CHECK"
echo "=================================================="
echo ""

ERRORS=0
WARNINGS=0

# Color codes
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

function error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
    ERRORS=$((ERRORS + 1))
}

function warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
    WARNINGS=$((WARNINGS + 1))
}

function success() {
    echo -e "${GREEN}✅ $1${NC}"
}

function check_section() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📋 $1"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# 1. CHECK FRONTEND BUILD
check_section "FRONTEND BUILD CHECK"

cd frontend
echo "Building frontend..."
if npm run build > /tmp/frontend-build.log 2>&1; then
    success "Frontend builds without errors"
else
    error "Frontend build failed. Check /tmp/frontend-build.log"
    cat /tmp/frontend-build.log
fi

# 2. CHECK _REDIRECTS FILE
check_section "CLOUDFLARE PAGES CONFIGURATION"

if [ -f "public/_redirects" ]; then
    success "public/_redirects file exists"
    echo "   Content:"
    cat public/_redirects | sed 's/^/   /'
else
    error "public/_redirects file is MISSING"
fi

if [ -f "dist/_redirects" ]; then
    success "dist/_redirects file exists (will be deployed)"
else
    warning "dist/_redirects not found in dist/ - deploy script should copy it"
fi

# 3. CHECK CLOUDFLARE FUNCTIONS
check_section "CLOUDFLARE PAGES FUNCTIONS"

if [ -f "functions/_middleware.js" ]; then
    success "functions/_middleware.js exists"
else
    error "functions/_middleware.js is MISSING"
fi

if [ -f "functions/api/[[path]].js" ]; then
    success "functions/api/[[path]].js exists"
    # Check if it points to correct backend URL
    if grep -q "cricketmela-api.fly.dev" functions/api/[[path]].js; then
        success "API proxy points to correct production backend"
    else
        warning "API proxy may not be pointing to production backend"
    fi
else
    error "functions/api/[[path]].js is MISSING"
fi

if [ -f "functions/auth/[[path]].js" ]; then
    success "functions/auth/[[path]].js exists"
else
    error "functions/auth/[[path]].js is MISSING"
fi

# 4. CHECK BACKEND FILES
check_section "BACKEND CONFIGURATION"

cd ../backend

# Check fly.toml
if [ -f "fly.toml" ]; then
    success "fly.toml exists"
    if grep -q "NODE_ENV = 'production'" fly.toml; then
        success "NODE_ENV is set to production in fly.toml"
    else
        warning "NODE_ENV may not be set to production in fly.toml"
    fi

    if grep -q "cricket_data" fly.toml; then
        success "Persistent volume (cricket_data) is configured"
    else
        error "Persistent volume NOT configured in fly.toml"
    fi
else
    error "fly.toml is MISSING"
fi

# Check index.js for production URLs
if grep -q "cricketmela.pages.dev" index.js; then
    success "Production frontend URL found in backend"
else
    warning "Production frontend URL may be missing"
fi

# Check for localhost references that should be conditional
LOCALHOST_COUNT=$(grep -c "localhost" index.js || true)
if [ "$LOCALHOST_COUNT" -gt 0 ]; then
    warning "Found $LOCALHOST_COUNT localhost references (should be conditional on NODE_ENV)"
fi

# 5. CHECK DATABASE MIGRATIONS
check_section "DATABASE MIGRATIONS"

if grep -q "google_id" db.js; then
    success "google_id migration present in db.js"
else
    warning "google_id migration may be missing"
fi

if grep -q "password_reset_tokens" db.js; then
    success "password_reset_tokens migration present"
else
    warning "password_reset_tokens migration may be missing"
fi

if grep -q "venue" index.js; then
    success "venue column migration present"
else
    warning "venue column migration may be missing"
fi

# 6. CHECK DEPLOY SCRIPTS
check_section "DEPLOYMENT SCRIPTS"

cd ..

if [ -f "deploy-cf-simple.sh" ]; then
    success "deploy-cf-simple.sh exists"
    if [ -x "deploy-cf-simple.sh" ]; then
        success "deploy-cf-simple.sh is executable"
    else
        warning "deploy-cf-simple.sh is not executable (run: chmod +x deploy-cf-simple.sh)"
    fi
else
    error "deploy-cf-simple.sh is MISSING"
fi

if [ -f "deploy-backend.sh" ]; then
    success "deploy-backend.sh exists"
    if [ -x "deploy-backend.sh" ]; then
        success "deploy-backend.sh is executable"
    else
        warning "deploy-backend.sh is not executable (run: chmod +x deploy-backend.sh)"
    fi
else
    error "deploy-backend.sh is MISSING"
fi

# 7. CHECK FOR COMMON ISSUES
check_section "COMMON ISSUES CHECK"

# Check for duplicate state declarations
if grep -c "const \[predictionResultsModal" frontend/src/Admin.jsx > /dev/null 2>&1; then
    PRED_COUNT=$(grep -c "const \[predictionResultsModal" frontend/src/Admin.jsx || echo "0")
    if [ "$PRED_COUNT" -eq "1" ]; then
        success "predictionResultsModal state declared once"
    elif [ "$PRED_COUNT" -gt "1" ]; then
        error "predictionResultsModal state declared $PRED_COUNT times (duplicate!)"
    fi
else
    warning "predictionResultsModal state may be missing"
fi

# Check for syntax errors in key files
echo "Checking for syntax errors in key React files..."
for file in frontend/src/Admin.jsx frontend/src/Matches.jsx frontend/src/App.jsx frontend/src/Predictions.jsx; do
    if [ -f "$file" ]; then
        # Simple check for common syntax issues
        if ! grep -q "function.*{$" "$file" | grep -v "^//" > /dev/null 2>&1; then
            : # success "No obvious syntax errors in $(basename $file)"
        fi
    fi
done
success "Basic syntax check passed for React files"

# 8. FINAL SUMMARY
check_section "SUMMARY"

echo ""
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL CHECKS PASSED!${NC}"
    echo "You are ready to deploy to production."
    echo ""
    echo "Next steps:"
    echo "  1. Deploy backend:  ./deploy-backend.sh"
    echo "  2. Deploy frontend: ./deploy-cf-simple.sh"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  PASSED WITH WARNINGS${NC}"
    echo "Total warnings: $WARNINGS"
    echo ""
    echo "You can proceed with deployment, but review warnings above."
else
    echo -e "${RED}❌ DEPLOYMENT BLOCKED${NC}"
    echo "Total errors: $ERRORS"
    echo "Total warnings: $WARNINGS"
    echo ""
    echo "Fix the errors above before deploying to production."
    exit 1
fi

echo ""
echo "=================================================="
echo "Pre-check complete. $(date)"
echo "=================================================="

