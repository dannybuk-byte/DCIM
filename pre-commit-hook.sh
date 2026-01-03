#!/bin/bash
#
# Pre-Commit Hook - DCIM Project
# 
# Enforces .cursorrules constraints and code quality standards
# Prevents bad commits BEFORE they enter the repository
#
# This is the FIRST LINE OF DEFENSE for antifragility

echo "🛡️  Running pre-commit safety checks..."
echo ""

# Color codes for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# ============================================================================
# CHECK 1: NO localStorage or sessionStorage (.cursorrules violation)
# ============================================================================
echo "📋 [1/6] Checking for localStorage/sessionStorage usage..."

if git diff --cached --diff-filter=ACM --name-only | grep -E '\.(ts|tsx|js|jsx)$' > /dev/null; then
  if git diff --cached --diff-filter=ACM | grep -E '^\+.*\b(localStorage|sessionStorage)\b' > /dev/null; then
    echo -e "${RED}❌ BLOCKED: localStorage/sessionStorage detected${NC}"
    echo "   .cursorrules requires IndexedDB via Dexie.js only"
    echo "   Found in:"
    git diff --cached --diff-filter=ACM | grep -E '^\+.*\b(localStorage|sessionStorage)\b' | head -3
    ERRORS=$((ERRORS + 1))
  else
    echo -e "${GREEN}✅ No localStorage/sessionStorage${NC}"
  fi
fi

# ============================================================================
# CHECK 2: NO dynamic Tailwind classes (.cursorrules violation)
# ============================================================================
echo "📋 [2/6] Checking for dynamic Tailwind classes..."

if git diff --cached --diff-filter=ACM | grep -E '^\+.*className=.*\$\{.*\}' > /dev/null; then
  if git diff --cached --diff-filter=ACM | grep -E '^\+.*className=.*\$\{(color|bg|text|border)' > /dev/null; then
    echo -e "${YELLOW}⚠️  WARNING: Possible dynamic Tailwind classes${NC}"
    echo "   .cursorrules discourages bg-\${color}-500 patterns"
    WARNINGS=$((WARNINGS + 1))
  else
    echo -e "${GREEN}✅ No problematic dynamic classes${NC}"
  fi
else
  echo -e "${GREEN}✅ No dynamic Tailwind classes${NC}"
fi

# ============================================================================
# CHECK 3: NO large files (> 500KB, .cursorrules violation)
# ============================================================================
echo "📋 [3/6] Checking for large files..."

LARGE_FILES=$(git diff --cached --name-only | while read file; do
  if [ -f "$file" ]; then
    SIZE=$(du -k "$file" 2>/dev/null | cut -f1)
    if [ "$SIZE" -gt 500 ]; then
      echo "$file ($SIZE KB)"
    fi
  fi
done)

if [ -n "$LARGE_FILES" ]; then
  echo -e "${RED}❌ BLOCKED: Files larger than 500KB detected${NC}"
  echo "   .cursorrules requires files < 50KB"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ No large files${NC}"
fi

# ============================================================================
# CHECK 4: NO console.log in production code
# ============================================================================
echo "📋 [4/6] Checking for console.log..."

if git diff --cached --diff-filter=ACM | grep -E '^\+.*console\.(log|debug)' > /dev/null; then
  echo -e "${YELLOW}⚠️  WARNING: console.log/debug found${NC}"
  echo "   Use console.warn or console.error for production"
  WARNINGS=$((WARNINGS + 1))
else
  echo -e "${GREEN}✅ No console.log/debug${NC}"
fi

# ============================================================================
# CHECK 5: TODO/FIXME/HACK comments
# ============================================================================
echo "📋 [5/6] Checking for TODO/FIXME/HACK comments..."

TODO_COUNT=$(git diff --cached --diff-filter=ACM | grep -E '^\+.*\b(TODO|FIXME|HACK)\b' | wc -l | tr -d ' ')

if [ "$TODO_COUNT" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  WARNING: Found $TODO_COUNT TODO/FIXME/HACK comment(s)${NC}"
  WARNINGS=$((WARNINGS + 1))
else
  echo -e "${GREEN}✅ No TODO/FIXME/HACK comments${NC}"
fi

# ============================================================================
# CHECK 6: Verify useEffect cleanup
# ============================================================================
echo "📋 [6/6] Checking for useEffect..."

if git diff --cached --diff-filter=ACM | grep -E '^\+.*useEffect\(' > /dev/null; then
  echo -e "${YELLOW}⚠️  INFO: useEffect detected - verify cleanup functions${NC}"
fi

# ============================================================================
# SUMMARY
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}❌ COMMIT BLOCKED: $ERRORS error(s) found${NC}"
  echo ""
  echo "Fix the errors above and try again."
  exit 1
elif [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}⚠️  COMMIT ALLOWED with $WARNINGS warning(s)${NC}"
  echo -e "${GREEN}✅ All critical checks passed${NC}"
  exit 0
else
  echo -e "${GREEN}✅ ALL CHECKS PASSED - Commit approved!${NC}"
  exit 0
fi

