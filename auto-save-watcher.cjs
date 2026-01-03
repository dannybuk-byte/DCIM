#!/usr/bin/env node

/**
 * Auto-Save Git Watcher for DCIM Project
 * 
 * Automatically commits and pushes changes to prevent data loss.
 * 
 * Features:
 * - Auto-commits every 5 minutes if changes detected
 * - Auto-pushes every 30 minutes if commits made
 * - Final commit on shutdown (Ctrl+C)
 * - Smart exclusions (node_modules, dist, etc.)
 * 
 * Usage:
 *   node auto-save-watcher.js
 * 
 * Or run in background:
 *   nohup node auto-save-watcher.js > /tmp/dcim-autosave.log 2>&1 &
 */

const { exec } = require('child_process');
const path = require('path');

// Configuration
const CONFIG = {
  workingDir: __dirname, // Current directory
  commitInterval: 5 * 60 * 1000,  // 5 minutes in milliseconds
  pushInterval: 30 * 60 * 1000,   // 30 minutes in milliseconds
  checkInterval: 60 * 1000,       // Check every minute
  branch: 'main',
  commitPrefix: 'chore: Auto-save checkpoint',
};

// State tracking
let lastCommitTime = Date.now();
let lastPushTime = Date.now();
let isShuttingDown = false;

/**
 * Execute shell command and return promise
 */
function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, { cwd: CONFIG.workingDir }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`${error.message}\n${stderr}`));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

/**
 * Check if there are uncommitted changes
 */
async function hasUncommittedChanges() {
  try {
    const status = await runCommand('git status --porcelain');
    return status.length > 0;
  } catch (error) {
    console.error('Error checking git status:', error.message);
    return false;
  }
}

/**
 * Check if there are unpushed commits
 */
async function hasUnpushedCommits() {
  try {
    const unpushed = await runCommand(`git log origin/${CONFIG.branch}..HEAD --oneline`);
    return unpushed.length > 0;
  } catch (error) {
    console.error('Error checking unpushed commits:', error.message);
    return false;
  }
}

/**
 * Auto-commit changes
 */
async function autoCommit() {
  try {
    const hasChanges = await hasUncommittedChanges();
    
    if (!hasChanges) {
      console.log('[⏭️ ] No changes to commit');
      return false;
    }

    const timestamp = new Date().toISOString();
    console.log(`[📝] Auto-committing changes at ${timestamp}...`);

    // Add all changes
    await runCommand('git add -A');

    // Create commit with timestamp
    const commitMessage = `${CONFIG.commitPrefix} ${timestamp}`;
    await runCommand(`git commit -m "${commitMessage}"`);

    console.log('[✅] Auto-commit successful');
    lastCommitTime = Date.now();
    return true;
  } catch (error) {
    console.error('[❌] Auto-commit failed:', error.message);
    return false;
  }
}

/**
 * Auto-push commits
 */
async function autoPush() {
  try {
    const hasCommits = await hasUnpushedCommits();

    if (!hasCommits) {
      console.log('[⏭️ ] No commits to push');
      return false;
    }

    console.log('[🚀] Auto-pushing to GitHub...');

    // Push to origin
    await runCommand(`git push origin ${CONFIG.branch}`);

    console.log('[✅] Auto-push successful → Cloudflare will auto-deploy');
    lastPushTime = Date.now();
    return true;
  } catch (error) {
    console.error('[❌] Auto-push failed:', error.message);
    console.error('[ℹ️ ] Will retry on next interval');
    return false;
  }
}

/**
 * Main loop - check and execute auto-save actions
 */
async function mainLoop() {
  if (isShuttingDown) return;

  const now = Date.now();

  // Auto-commit check
  if (now - lastCommitTime >= CONFIG.commitInterval) {
    await autoCommit();
  }

  // Auto-push check
  if (now - lastPushTime >= CONFIG.pushInterval) {
    await autoPush();
  }
}

/**
 * Display status summary
 */
function displayStatus() {
  const timeSinceCommit = Math.floor((Date.now() - lastCommitTime) / 1000);
  const timeSincePush = Math.floor((Date.now() - lastPushTime) / 1000);
  const nextCommit = Math.max(0, Math.floor((CONFIG.commitInterval - (Date.now() - lastCommitTime)) / 1000));
  const nextPush = Math.max(0, Math.floor((CONFIG.pushInterval - (Date.now() - lastPushTime)) / 1000));

  console.log('\n' + '='.repeat(60));
  console.log('📊 Auto-Save Status');
  console.log('='.repeat(60));
  console.log(`Last commit: ${timeSinceCommit}s ago`);
  console.log(`Last push:   ${timeSincePush}s ago`);
  console.log(`Next commit: ${nextCommit}s (if changes detected)`);
  console.log(`Next push:   ${nextPush}s (if commits exist)`);
  console.log('='.repeat(60) + '\n');
}

/**
 * Start the watcher
 */
async function start() {
  console.log('\n' + '='.repeat(60));
  console.log('🔄 Auto-Save Git Watcher - DCIM Project');
  console.log('='.repeat(60));
  console.log(`📂 Working directory: ${CONFIG.workingDir}`);
  console.log(`🌿 Branch: ${CONFIG.branch}`);
  console.log(`⏱️  Commit interval: ${CONFIG.commitInterval / 1000}s (${CONFIG.commitInterval / 60000} min)`);
  console.log(`⏱️  Push interval: ${CONFIG.pushInterval / 1000}s (${CONFIG.pushInterval / 60000} min)`);
  console.log(`⏱️  Check interval: ${CONFIG.checkInterval / 1000}s`);
  console.log('='.repeat(60));
  console.log('💡 Press Ctrl+C to stop (will auto-commit before exit)');
  console.log('='.repeat(60) + '\n');

  // Do initial commit if there are changes
  console.log('[ℹ️ ] Running initial check...');
  await autoCommit();

  // Start main loop
  console.log(`[ℹ️ ] Starting main loop (checking every ${CONFIG.checkInterval / 1000}s)...\n`);
  setInterval(mainLoop, CONFIG.checkInterval);

  // Display status every 5 minutes
  setInterval(displayStatus, 5 * 60 * 1000);
}

/**
 * Handle shutdown gracefully
 */
async function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('\n' + '='.repeat(60));
  console.log('🛑 Shutting down Auto-Save Watcher...');
  console.log('='.repeat(60));
  
  console.log('[💾] Performing final commit before exit...');
  await autoCommit();
  
  console.log('[ℹ️ ] Shutdown complete');
  console.log('[👋] Goodbye!');
  console.log('='.repeat(60) + '\n');
  
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGINT', shutdown);   // Ctrl+C
process.on('SIGTERM', shutdown);  // Kill command

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('[❌] Uncaught exception:', error.message);
  shutdown();
});

process.on('unhandledRejection', (reason) => {
  console.error('[❌] Unhandled rejection:', reason);
  shutdown();
});

// Start the watcher
start().catch((error) => {
  console.error('[❌] Fatal error:', error.message);
  process.exit(1);
});

