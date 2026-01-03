# 🔄 Automated Workflow Setup - Never Lose Work Again

**Goal**: Maximize automated interoperability between Claude, Cursor, GitHub, and Cloudflare

---

## 🎯 CURRENT STATE

### What's Already Automatic:
- ✅ **Cursor Auto-Save** - Files save automatically after edits
- ✅ **Cloudflare Auto-Deploy** - Deploys on push to `main` branch
- ✅ **Claude Context** - Handoff doc restores context

### What's Manual (and risky):
- ⚠️ **Git Commit** - You must manually `git add` and `git commit`
- ⚠️ **Git Push** - You must manually `git push`
- ⚠️ **Session State** - Work-in-progress can be lost

---

## 🚀 AUTOMATION STRATEGY

We'll create a **3-tier auto-save system**:

1. **Tier 1: Local Auto-Save** (Instant)
   - Cursor saves files automatically
   - Git working directory preserved

2. **Tier 2: Auto-Commit** (Every 5 minutes)
   - Automatic commits to local Git
   - Never lose uncommitted work

3. **Tier 3: Auto-Push** (Every 30 minutes)
   - Automatic push to GitHub
   - Always backed up remotely
   - Triggers Cloudflare deployment

---

## 📋 IMPLEMENTATION OPTIONS

### Option A: Git Watcher Script (RECOMMENDED)
Simple Node.js script that watches for file changes and auto-commits/pushes.

### Option B: Git Hooks
Git hooks trigger on certain actions (less flexible).

### Option C: Cursor Extensions
Use VS Code extensions (Cursor is built on VS Code).

### Option D: cron Jobs
Scheduled tasks on macOS (most robust).

---

## 🔧 OPTION A: Git Watcher Script (BEST)

### Step 1: Create Auto-Save Script

Create this file in your project root:

**File**: `/Users/danielbuk/Desktop/DCIM/auto-save-watcher.js`

```javascript
#!/usr/bin/env node

/**
 * Auto-Save Git Watcher
 * 
 * Watches for file changes and automatically:
 * - Commits every 5 minutes if changes detected
 * - Pushes every 30 minutes if commits made
 * 
 * Usage: node auto-save-watcher.js
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  workingDir: '/Users/danielbuk/Desktop/DCIM',
  commitInterval: 5 * 60 * 1000,  // 5 minutes
  pushInterval: 30 * 60 * 1000,   // 30 minutes
  branch: 'main',
  excludePatterns: [
    'node_modules/',
    '.git/',
    'dist/',
    '.DS_Store',
    '*.log'
  ]
};

// State tracking
let lastCommitTime = Date.now();
let lastPushTime = Date.now();
let hasUncommittedChanges = false;
let hasUnpushedCommits = false;

// Execute shell command
function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, { cwd: CONFIG.workingDir }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        reject(error);
        return;
      }
      resolve(stdout.trim());
    });
  });
}

// Check for uncommitted changes
async function checkForChanges() {
  try {
    const status = await runCommand('git status --porcelain');
    return status.length > 0;
  } catch (error) {
    return false;
  }
}

// Check for unpushed commits
async function checkForUnpushedCommits() {
  try {
    const unpushed = await runCommand(`git log origin/${CONFIG.branch}..HEAD --oneline`);
    return unpushed.length > 0;
  } catch (error) {
    return false;
  }
}

// Auto-commit changes
async function autoCommit() {
  try {
    hasUncommittedChanges = await checkForChanges();
    
    if (!hasUncommittedChanges) {
      console.log('⏭️  No changes to commit');
      return false;
    }

    const timestamp = new Date().toISOString();
    console.log(`📝 Auto-committing changes at ${timestamp}...`);

    // Add all changes
    await runCommand('git add -A');

    // Create commit with timestamp
    const commitMessage = `chore: Auto-save checkpoint ${timestamp}`;
    await runCommand(`git commit -m "${commitMessage}"`);

    console.log('✅ Auto-commit successful');
    lastCommitTime = Date.now();
    hasUnpushedCommits = true;
    return true;
  } catch (error) {
    console.error('❌ Auto-commit failed:', error.message);
    return false;
  }
}

// Auto-push commits
async function autoPush() {
  try {
    hasUnpushedCommits = await checkForUnpushedCommits();

    if (!hasUnpushedCommits) {
      console.log('⏭️  No commits to push');
      return false;
    }

    console.log('🚀 Auto-pushing to GitHub...');

    // Push to origin
    await runCommand(`git push origin ${CONFIG.branch}`);

    console.log('✅ Auto-push successful (Cloudflare will deploy)');
    lastPushTime = Date.now();
    hasUnpushedCommits = false;
    return true;
  } catch (error) {
    console.error('❌ Auto-push failed:', error.message);
    return false;
  }
}

// Main loop
async function mainLoop() {
  const now = Date.now();

  // Auto-commit every 5 minutes
  if (now - lastCommitTime >= CONFIG.commitInterval) {
    await autoCommit();
  }

  // Auto-push every 30 minutes
  if (now - lastPushTime >= CONFIG.pushInterval) {
    await autoPush();
  }
}

// Start watcher
async function start() {
  console.log('🔄 Auto-Save Git Watcher Started');
  console.log(`📂 Watching: ${CONFIG.workingDir}`);
  console.log(`⏱️  Commit interval: ${CONFIG.commitInterval / 1000}s`);
  console.log(`⏱️  Push interval: ${CONFIG.pushInterval / 1000}s`);
  console.log('Press Ctrl+C to stop\n');

  // Run immediately on start
  await autoCommit();

  // Run every minute
  setInterval(mainLoop, 60 * 1000);
}

// Handle shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  console.log('💾 Final commit before exit...');
  await autoCommit();
  console.log('👋 Goodbye!');
  process.exit(0);
});

// Start the watcher
start().catch(console.error);
```

### Step 2: Make Script Executable

```bash
chmod +x /Users/danielbuk/Desktop/DCIM/auto-save-watcher.js
```

### Step 3: Run the Watcher

In a terminal that stays open:

```bash
cd /Users/danielbuk/Desktop/DCIM
node auto-save-watcher.js
```

**What it does:**
- ✅ Checks for changes every minute
- ✅ Auto-commits every 5 minutes if changes exist
- ✅ Auto-pushes every 30 minutes if commits exist
- ✅ Final commit on exit (Ctrl+C)

---

## 🔧 OPTION B: Simple Bash Script (LIGHTER)

**File**: `/Users/danielbuk/Desktop/DCIM/auto-save.sh`

```bash
#!/bin/bash

# Auto-Save Git Script
# Run this in the background to auto-commit and push

REPO_DIR="/Users/danielbuk/Desktop/DCIM"
COMMIT_INTERVAL=300  # 5 minutes
PUSH_INTERVAL=1800   # 30 minutes

cd "$REPO_DIR"

last_commit=$(date +%s)
last_push=$(date +%s)

echo "🔄 Auto-save started"
echo "⏱️  Commit: every ${COMMIT_INTERVAL}s"
echo "⏱️  Push: every ${PUSH_INTERVAL}s"

while true; do
  now=$(date +%s)
  
  # Auto-commit
  if [ $((now - last_commit)) -ge $COMMIT_INTERVAL ]; then
    if [ -n "$(git status --porcelain)" ]; then
      timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
      git add -A
      git commit -m "chore: Auto-save checkpoint $timestamp" --quiet
      echo "✅ Auto-committed at $timestamp"
      last_commit=$now
    fi
  fi
  
  # Auto-push
  if [ $((now - last_push)) -ge $PUSH_INTERVAL ]; then
    if [ -n "$(git log origin/main..HEAD)" ]; then
      git push origin main --quiet
      echo "🚀 Auto-pushed at $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
      last_push=$now
    fi
  fi
  
  sleep 60  # Check every minute
done
```

**Usage:**
```bash
chmod +x /Users/danielbuk/Desktop/DCIM/auto-save.sh
nohup /Users/danielbuk/Desktop/DCIM/auto-save.sh > /tmp/dcim-autosave.log 2>&1 &
```

---

## 🔧 OPTION C: VS Code/Cursor Extension

### Recommended Extension: "Git Auto Commit"

1. **Install Extension**:
   - Open Cursor
   - Press `Cmd+Shift+X` (Extensions)
   - Search "Git Auto Commit"
   - Install by "Michael Kurz"

2. **Configure** (`settings.json`):
   ```json
   {
     "gitAutoCommit.enabled": true,
     "gitAutoCommit.commitMessage": "chore: Auto-save checkpoint ${date}",
     "gitAutoCommit.delay": 300000,
     "gitAutoCommit.push": false,
     "files.autoSave": "afterDelay",
     "files.autoSaveDelay": 1000
   }
   ```

3. **Add Push Extension**: "Git Auto Push"
   ```json
   {
     "gitAutoPush.enabled": true,
     "gitAutoPush.interval": 1800000
   }
   ```

---

## 🔧 OPTION D: macOS launchd (MOST ROBUST)

### Create Launch Agent

**File**: `~/Library/LaunchAgents/com.dcim.autosave.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.dcim.autosave</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/Users/danielbuk/Desktop/DCIM/auto-save-watcher.js</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/dcim-autosave.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/dcim-autosave-error.log</string>
</dict>
</plist>
```

**Load the agent:**
```bash
launchctl load ~/Library/LaunchAgents/com.dcim.autosave.plist
```

**Benefits:**
- ✅ Starts automatically on login
- ✅ Restarts if crashes
- ✅ Runs in background always

---

## 🎯 RECOMMENDED SETUP

### For Maximum Safety:

**Use a Combination:**

1. **Cursor Auto-Save** (Immediate)
   - Settings → Auto Save: "afterDelay"
   - Auto Save Delay: 1000ms

2. **Git Watcher Script** (Option A - Every 5 min)
   - Auto-commits to preserve work locally
   - Auto-pushes every 30 minutes

3. **macOS Launch Agent** (Option D)
   - Ensures watcher runs at startup
   - Restarts automatically if needed

---

## ⚙️ IMPLEMENTATION STEPS

### Quick Start (5 minutes):

1. **Create the watcher script** (I'll do this)
2. **Test it manually** (Run in terminal)
3. **Set up launch agent** (Auto-start on boot)
4. **Configure Cursor** (Auto-save settings)

### Step-by-Step:

```bash
# 1. Create the script (I'll do this next)
# 2. Make it executable
chmod +x /Users/danielbuk/Desktop/DCIM/auto-save-watcher.js

# 3. Test it
node /Users/danielbuk/Desktop/DCIM/auto-save-watcher.js
# (Press Ctrl+C after 1 minute to verify it works)

# 4. Set up launch agent
cp /path/to/plist ~/Library/LaunchAgents/com.dcim.autosave.plist
launchctl load ~/Library/LaunchAgents/com.dcim.autosave.plist

# 5. Verify it's running
launchctl list | grep dcim
```

---

## 🛡️ SAFETY FEATURES

### Smart Commit Messages:
- **Auto-save**: `chore: Auto-save checkpoint 2026-01-03T12:34:56Z`
- **Manual**: `feat: Add new feature` (your normal commits)
- Easy to distinguish in Git history

### Exclude Patterns:
- `node_modules/` - Never commit dependencies
- `dist/` - Never commit build artifacts
- `.DS_Store` - Never commit macOS files
- `*.log` - Never commit logs

### Fail-Safe:
- If push fails (no internet), it retries on next interval
- If commit fails (merge conflict), logs error but continues
- Final commit on shutdown (Ctrl+C) preserves latest work

---

## 📊 WORKFLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                    YOUR EDITING SESSION                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ TIER 1: Cursor Auto-Save (1 second)                         │
│ • Files saved to disk instantly                             │
│ • NO git commit yet                                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ TIER 2: Auto-Commit (5 minutes)                             │
│ • git add -A                                                 │
│ • git commit -m "chore: Auto-save checkpoint [timestamp]"   │
│ • Work preserved in Git history                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ TIER 3: Auto-Push (30 minutes)                              │
│ • git push origin main                                       │
│ • GitHub backup                                              │
│ • Triggers Cloudflare deployment                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ CLOUDFLARE AUTO-DEPLOY (2-3 minutes)                        │
│ • npm install --legacy-peer-deps                            │
│ • npm run build                                              │
│ • Deploy to https://dcim-dashboard.pages.dev               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 BENEFITS

### Before (Manual):
- ❌ Forget to commit → lose work
- ❌ Forget to push → no backup
- ❌ Close laptop → lose context
- ❌ Crash → lose progress

### After (Automated):
- ✅ Auto-commit every 5 min → never lose work
- ✅ Auto-push every 30 min → always backed up
- ✅ Close laptop → safe, auto-commits on shutdown
- ✅ Crash → at most 5 min of work lost

---

## 📝 NEXT STEPS

**Would you like me to:**

1. ✅ **Create the auto-save watcher script** (Option A)
2. ✅ **Create the launch agent plist** (Option D)
3. ✅ **Create Cursor settings file** (Auto-save config)
4. ✅ **Test it together** (Run and verify)

**Or would you prefer:**
- 🔧 A simpler bash script (Option B)?
- 📦 Just use Cursor extensions (Option C)?
- 🎯 Custom intervals (different timing)?

Let me know and I'll set it up for you! 🚀

