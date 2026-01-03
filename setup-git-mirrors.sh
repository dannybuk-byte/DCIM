#!/bin/bash
#
# Multiple Git Remotes Setup Script
# 
# Adds backup Git remotes to ensure code is never lost
# Part of Phase 4: Backup & Recovery
#

echo "🔐 Setting up multiple Git remotes for redundancy..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo -e "${RED}❌ Not a git repository${NC}"
  exit 1
fi

# Get current remote
CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null)
echo -e "Current origin: ${GREEN}${CURRENT_REMOTE}${NC}"
echo ""

# Function to add remote if not exists
add_remote() {
  local name=$1
  local url=$2
  
  if git remote | grep -q "^${name}$"; then
    echo -e "${YELLOW}⚠️  Remote '${name}' already exists${NC}"
    git remote set-url ${name} ${url}
    echo -e "${GREEN}✅ Updated ${name}${NC}"
  else
    git remote add ${name} ${url}
    echo -e "${GREEN}✅ Added ${name}${NC}"
  fi
}

# Parse GitHub URL to get username/repo
if [[ $CURRENT_REMOTE =~ github\.com[:/]([^/]+)/([^/\.]+) ]]; then
  GH_USER="${BASH_REMATCH[1]}"
  REPO_NAME="${BASH_REMATCH[2]}"
  
  echo "Detected: User=${GH_USER}, Repo=${REPO_NAME}"
  echo ""
  
  # Add GitHub as 'origin' (should already exist)
  echo "1️⃣  GitHub (origin)"
  add_remote origin "https://github.com/${GH_USER}/${REPO_NAME}.git"
  echo ""
  
  # Add GitLab mirror
  echo "2️⃣  GitLab (backup)"
  echo "To set up GitLab:"
  echo "  1. Go to https://gitlab.com/projects/new"
  echo "  2. Create project: ${REPO_NAME}"
  echo "  3. Run: git remote add gitlab https://gitlab.com/${GH_USER}/${REPO_NAME}.git"
  echo ""
  
  # Add Bitbucket mirror
  echo "3️⃣  Bitbucket (backup2)"
  echo "To set up Bitbucket:"
  echo "  1. Go to https://bitbucket.org/repo/create"
  echo "  2. Create repository: ${REPO_NAME}"
  echo "  3. Run: git remote add bitbucket https://bitbucket.org/${GH_USER}/${REPO_NAME}.git"
  echo ""
  
else
  echo -e "${YELLOW}⚠️  Could not parse GitHub URL${NC}"
  echo "Please manually add remotes:"
  echo "  git remote add gitlab <your-gitlab-url>"
  echo "  git remote add bitbucket <your-bitbucket-url>"
  echo ""
fi

# Show all remotes
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Current remotes:"
git remote -v
echo ""

# Create push script
cat > push-to-all-remotes.sh << 'PUSH_SCRIPT'
#!/bin/bash
#
# Push to All Remotes
# Ensures code is backed up to all configured remotes
#

echo "📤 Pushing to all remotes..."

REMOTES=$(git remote)
BRANCH=$(git rev-parse --abbrev-ref HEAD)

for remote in $REMOTES; do
  echo ""
  echo "Pushing to $remote..."
  if git push $remote $BRANCH; then
    echo "✅ $remote: success"
  else
    echo "❌ $remote: failed (may need authentication)"
  fi
done

echo ""
echo "✅ Push to all remotes complete!"
PUSH_SCRIPT

chmod +x push-to-all-remotes.sh

echo -e "${GREEN}✅ Created push-to-all-remotes.sh${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Next steps:"
echo "1. Set up GitLab and Bitbucket repositories (see instructions above)"
echo "2. Run: ./push-to-all-remotes.sh"
echo "3. Your code will be backed up to 3 locations!"
echo ""
echo "For automatic daily backups, see AUTOMATED_BACKUPS.md"

