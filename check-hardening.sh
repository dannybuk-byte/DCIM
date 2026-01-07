#!/bin/bash
# DCIM Compliance App - Hardening Diagnostic Script
# Run from project root: bash check-hardening.sh

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         DCIM COMPLIANCE APP - HARDENING DIAGNOSTIC           ║"
echo "║                     January 4, 2026                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}ERROR: Run this script from the DCIM project root directory${NC}"
    exit 1
fi

echo "📁 Project: $(basename $(pwd))"
echo "📅 Date: $(date)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. ERROR BOUNDARIES
echo "1️⃣  ERROR BOUNDARY ANALYSIS"
echo "   ─────────────────────────"

BOUNDARY_IMPORTS=$(grep -r "import.*ErrorBoundary" src/components/*.tsx 2>/dev/null | wc -l | tr -d ' ')
BOUNDARY_USAGES=$(grep -r "<ErrorBoundary" src/components/*.tsx 2>/dev/null | wc -l | tr -d ' ')

echo "   📦 Components importing ErrorBoundary: $BOUNDARY_IMPORTS"
echo "   🔲 ErrorBoundary JSX usages: $BOUNDARY_USAGES"

if [ "$BOUNDARY_USAGES" -lt 24 ]; then
    echo -e "   ${YELLOW}⚠️  WARNING: You have 24+ tabs but only $BOUNDARY_USAGES ErrorBoundary wrappers${NC}"
    echo "   💡 Recommendation: Wrap each tab in ErrorBoundary"
else
    echo -e "   ${GREEN}✅ Good ErrorBoundary coverage${NC}"
fi
echo ""

# 2. CIRCUIT BREAKERS
echo "2️⃣  CIRCUIT BREAKER ANALYSIS"
echo "   ─────────────────────────"

if [ -d "src/integrations" ]; then
    CB_COUNT=$(grep -r "circuitBreaker(" src/integrations/*.ts 2>/dev/null | wc -l | tr -d ' ')
    INTEGRATION_COUNT=$(ls -1 src/integrations/*.ts 2>/dev/null | wc -l | tr -d ' ')
    
    echo "   📡 Integration files: $INTEGRATION_COUNT"
    echo "   🔌 Circuit breaker wrappers: $CB_COUNT"
    
    # List integrations without circuit breakers
    echo "   📋 Integration status:"
    for file in src/integrations/*.ts; do
        filename=$(basename "$file")
        if grep -q "circuitBreaker(" "$file" 2>/dev/null; then
            echo -e "      ${GREEN}✅ $filename${NC}"
        else
            echo -e "      ${YELLOW}⚠️  $filename (no circuit breaker found)${NC}"
        fi
    done
else
    echo -e "   ${YELLOW}⚠️  No src/integrations directory found${NC}"
fi
echo ""

# 3. LOADING STATES
echo "3️⃣  LOADING STATE ANALYSIS"
echo "   ─────────────────────────"

LOADING_STATES=$(grep -rE "useState.*loading|isLoading|setLoading" src/components/*.tsx 2>/dev/null | wc -l | tr -d ' ')
USEEFFECT_COUNT=$(grep -r "useEffect" src/components/*.tsx 2>/dev/null | wc -l | tr -d ' ')

echo "   ⏳ Loading state patterns: $LOADING_STATES"
echo "   🔄 useEffect hooks: $USEEFFECT_COUNT"

if [ "$LOADING_STATES" -lt "$((USEEFFECT_COUNT / 3))" ]; then
    echo -e "   ${YELLOW}⚠️  Many useEffects but few loading states - check for white screen risks${NC}"
else
    echo -e "   ${GREEN}✅ Good loading state coverage${NC}"
fi
echo ""

# 4. TRY-CATCH COVERAGE
echo "4️⃣  ERROR HANDLING ANALYSIS"
echo "   ─────────────────────────"

TRYCATCH=$(grep -rE "try\s*\{" src/ 2>/dev/null | wc -l | tr -d ' ')
AWAIT_COUNT=$(grep -r "await " src/ 2>/dev/null | wc -l | tr -d ' ')
CATCH_COUNT=$(grep -rE "\.catch\(|catch\s*\(" src/ 2>/dev/null | wc -l | tr -d ' ')

echo "   🎯 try-catch blocks: $TRYCATCH"
echo "   ⏳ await statements: $AWAIT_COUNT"
echo "   🪤 .catch() handlers: $CATCH_COUNT"
echo ""

# 5. WEBSOCKET RESILIENCE
echo "5️⃣  WEBSOCKET ANALYSIS"
echo "   ─────────────────────────"

if [ -d "src/services" ]; then
    WS_FILES=$(grep -l "WebSocket" src/services/*.ts 2>/dev/null | wc -l | tr -d ' ')
    ONERROR=$(grep -r "\.onerror" src/services/*.ts 2>/dev/null | wc -l | tr -d ' ')
    ONCLOSE=$(grep -r "\.onclose" src/services/*.ts 2>/dev/null | wc -l | tr -d ' ')
    RECONNECT=$(grep -ri "reconnect" src/services/*.ts 2>/dev/null | wc -l | tr -d ' ')
    
    echo "   🔌 Files using WebSocket: $WS_FILES"
    echo "   ❌ onerror handlers: $ONERROR"
    echo "   🚪 onclose handlers: $ONCLOSE"
    echo "   🔄 Reconnection logic: $RECONNECT references"
    
    if [ "$RECONNECT" -eq 0 ] && [ "$WS_FILES" -gt 0 ]; then
        echo -e "   ${YELLOW}⚠️  WebSocket files found but no reconnection logic${NC}"
        echo "   💡 Add exponential backoff reconnection"
    else
        echo -e "   ${GREEN}✅ WebSocket reconnection logic present${NC}"
    fi
else
    echo -e "   ${YELLOW}⚠️  No src/services directory found${NC}"
fi
echo ""

# 6. POTENTIAL CRASH PATTERNS
echo "6️⃣  POTENTIAL CRASH PATTERNS"
echo "   ─────────────────────────"

# Check for .map on potentially undefined
MAP_ISSUES=$(grep -rE "\w+\.map\(" src/components/*.tsx 2>/dev/null | grep -v "||" | grep -v "?" | head -5)
if [ -n "$MAP_ISSUES" ]; then
    echo -e "   ${YELLOW}⚠️  Potential undefined.map() risks found${NC}"
    echo "   💡 Use optional chaining: data?.map() or (data || []).map()"
fi

# Check for localStorage in artifacts
LOCALSTORAGE=$(grep -r "localStorage" src/components/*.tsx 2>/dev/null | wc -l | tr -d ' ')
if [ "$LOCALSTORAGE" -gt 0 ]; then
    echo "   📦 localStorage usage in components: $LOCALSTORAGE"
    echo "   💡 Note: localStorage may not work in all artifact environments"
fi

# Check for sessionStorage
SESSIONSTORAGE=$(grep -r "sessionStorage" src/ 2>/dev/null | wc -l | tr -d ' ')
if [ "$SESSIONSTORAGE" -gt 0 ]; then
    echo "   📦 sessionStorage usage: $SESSIONSTORAGE"
fi
echo ""

# 7. FILE SIZE CHECK
echo "7️⃣  FILE SIZE ANALYSIS"
echo "   ─────────────────────────"

echo "   📊 Largest component files:"
if [ -d "src/components" ]; then
    ls -lhS src/components/*.tsx 2>/dev/null | head -5 | while read line; do
        size=$(echo "$line" | awk '{print $5}')
        name=$(echo "$line" | awk '{print $NF}')
        echo "      $size  $(basename $name)"
    done
fi
echo ""

# 8. DEPENDENCY CHECK
echo "8️⃣  KEY DEPENDENCY CHECK"
echo "   ─────────────────────────"

check_dep() {
    if grep -q "\"$1\"" package.json 2>/dev/null; then
        echo -e "   ${GREEN}✅ $1${NC}"
    else
        echo -e "   ${RED}❌ $1 (missing)${NC}"
    fi
}

check_dep "react-window"
check_dep "@tanstack/react-virtual"
check_dep "@tensorflow/tfjs"
check_dep "dexie"
check_dep "flexsearch"
check_dep "simple-statistics"
echo ""

# SUMMARY
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 SUMMARY & RECOMMENDATIONS"
echo "   ─────────────────────────"
echo ""
echo "   Critical (Do Before Demo):"
echo "   ☑ Wrap all 24 tabs in ErrorBoundary"
echo "   ☑ Add loading states to async operations"
echo "   □ Test all 4 interface shells"
echo ""
echo "   High Priority (This Week):"
echo "   ☑ Enable virtual scrolling for 11,992 facilities"
echo "   ☑ Add WebSocket reconnection with backoff"
echo "   ☑ Add search input debounce (300ms)"
echo ""
echo "   Medium Priority (Nice to Have):"
echo "   ☑ Add offline indicator"
echo "   □ Add circuit breaker user feedback"
echo "   □ Add empty state for filtered results"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Diagnostic complete! Copy this output for your hardening work."

