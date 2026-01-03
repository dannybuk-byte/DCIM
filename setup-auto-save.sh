#!/bin/bash

# Auto-Save Setup Script
# This script sets up automated Git commits and pushes

echo "=================================="
echo "🔄 DCIM Auto-Save Setup"
echo "=================================="
echo ""

# Check if we're in the right directory
if [ ! -f "auto-save-watcher.js" ]; then
  echo "❌ Error: Run this script from the DCIM project root"
  exit 1
fi

echo "📂 Current directory: $(pwd)"
echo ""

# Step 1: Make watcher executable
echo "[1/4] Making auto-save-watcher.js executable..."
chmod +x auto-save-watcher.js
echo "✅ Done"
echo ""

# Step 2: Test the watcher
echo "[2/4] Testing the watcher (will run for 10 seconds)..."
echo "      Press Ctrl+C if you want to skip the test"
timeout 10 node auto-save-watcher.js || true
echo "✅ Test complete (or skipped)"
echo ""

# Step 3: Install launch agent
echo "[3/4] Installing macOS launch agent..."
echo "      This will make the watcher start automatically on login"

# Copy plist to LaunchAgents
mkdir -p ~/Library/LaunchAgents
cp com.dcim.autosave.plist ~/Library/LaunchAgents/
echo "✅ Copied to ~/Library/LaunchAgents/"

# Load the agent
launchctl unload ~/Library/LaunchAgents/com.dcim.autosave.plist 2>/dev/null || true
launchctl load ~/Library/LaunchAgents/com.dcim.autosave.plist
echo "✅ Launch agent loaded"
echo ""

# Step 4: Verify it's running
echo "[4/4] Verifying..."
if launchctl list | grep -q "com.dcim.autosave"; then
  echo "✅ Auto-save watcher is running!"
else
  echo "⚠️  Warning: Watcher may not be running"
  echo "   Check logs: tail -f /tmp/dcim-autosave.log"
fi
echo ""

echo "=================================="
echo "✅ Setup Complete!"
echo "=================================="
echo ""
echo "📊 Status:"
echo "  • Auto-commit: Every 5 minutes"
echo "  • Auto-push: Every 30 minutes"
echo "  • Auto-start: On login (via launch agent)"
echo ""
echo "📝 Logs:"
echo "  • Output: /tmp/dcim-autosave.log"
echo "  • Errors: /tmp/dcim-autosave-error.log"
echo ""
echo "🛠️  Commands:"
echo "  • Stop:    launchctl unload ~/Library/LaunchAgents/com.dcim.autosave.plist"
echo "  • Start:   launchctl load ~/Library/LaunchAgents/com.dcim.autosave.plist"
echo "  • Status:  launchctl list | grep dcim"
echo "  • Logs:    tail -f /tmp/dcim-autosave.log"
echo ""
echo "🎉 You're all set! Your work will be automatically saved."
echo ""

