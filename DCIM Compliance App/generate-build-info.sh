#!/bin/bash
#
# Generate commit hash file for deployment tracking
# This runs during the build process
#

echo "🔍 Generating commit hash..."

# Get current git commit hash
COMMIT_HASH=$(git rev-parse HEAD 2>/dev/null || echo "development")

# Write to public directory so it's accessible at runtime
echo "$COMMIT_HASH" > "public/commit-hash.txt"

echo "✅ Commit hash: ${COMMIT_HASH:0:7}"

