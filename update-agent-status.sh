#!/bin/bash
#
# Auto-Update Agent Status
# Runs during pre-commit to keep AGENT_STATUS.md current
#

STATUS_FILE="/Users/danielbuk/Desktop/DCIM/AGENT_STATUS.md"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M %Z")
COMMIT_MSG="$1"

# Update timestamp in the status file
if [ -f "$STATUS_FILE" ]; then
  # Use sed to update the "Last Update" line
  sed -i '' "s/\*\*Last Update:\*\* .*/\*\*Last Update:\*\* $TIMESTAMP/" "$STATUS_FILE"
  
  # If commit message provided, update current issue
  if [ -n "$COMMIT_MSG" ]; then
    # Extract first line of commit message
    FIRST_LINE=$(echo "$COMMIT_MSG" | head -1)
    sed -i '' "s/\*\*Current Issue:\*\* .*/\*\*Current Issue:\*\* $FIRST_LINE/" "$STATUS_FILE"
  fi
  
  echo "✅ Updated AGENT_STATUS.md with timestamp: $TIMESTAMP"
else
  echo "⚠️  AGENT_STATUS.md not found at $STATUS_FILE"
fi

