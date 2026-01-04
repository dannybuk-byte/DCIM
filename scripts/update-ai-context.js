#!/usr/bin/env node
/**
 * Auto-Generate AI Context Files
 * 
 * Runs on pre-commit to maintain persistent context for Cursor AI.
 * Generates PROJECT_STATUS.md and updates .cursor/rules/current-context.mdc
 */

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const PROJECT_ROOT = '/Users/danielbuk/Desktop/DCIM';

function getRecentChanges() {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const output = execSync(
      `git log --since="${since}" --oneline --no-merges`,
      { cwd: PROJECT_ROOT, encoding: 'utf8' }
    ).trim();
    return output.split('\n').slice(0, 15).filter(Boolean);
  } catch (error) {
    return [];
  }
}

function getStagedFiles() {
  try {
    const output = execSync(
      'git diff --cached --name-only',
      { cwd: PROJECT_ROOT, encoding: 'utf8' }
    ).trim();
    return output.split('\n').filter(Boolean);
  } catch (error) {
    return [];
  }
}

function getBranch() {
  try {
    return execSync('git branch --show-current', {
      cwd: PROJECT_ROOT,
      encoding: 'utf8'
    }).trim();
  } catch (error) {
    return 'unknown';
  }
}

function getActiveAreas(stagedFiles) {
  const areas = new Set();
  stagedFiles.forEach(file => {
    const parts = file.split('/');
    if (parts.length > 1) {
      areas.add(parts[0]);
    }
  });
  return Array.from(areas);
}

// Generate PROJECT_STATUS.md
const timestamp = new Date().toISOString();
const branch = getBranch();
const recentChanges = getRecentChanges();
const stagedFiles = getStagedFiles();
const activeAreas = getActiveAreas(stagedFiles);

const projectStatus = `# Project Status
> Auto-generated: ${timestamp}
> Branch: \`${branch}\`

## Recent Commits (7 Days)
${recentChanges.length > 0 
  ? recentChanges.map(c => `- ${c}`).join('\n')
  : '- No commits in last 7 days'}

## Currently Staged Files
${stagedFiles.length > 0
  ? stagedFiles.map(f => `- \`${f}\``).join('\n')
  : '- No staged files'}

## Active Development Areas
${activeAreas.length > 0
  ? activeAreas.join(', ')
  : 'None detected'}

## Quick Links
- **Agent Status:** [AGENT_STATUS.md](./AGENT_STATUS.md)
- **Master Handoff:** [DCIM_MASTER_HANDOFF.md](./DCIM_MASTER_HANDOFF.md)
- **Session Starter:** [PASTE_INTO_NEW_CLAUDE_CHATS.md](./PASTE_INTO_NEW_CLAUDE_CHATS.md)
`;

// Generate current-context.mdc for Cursor rules
const currentContext = `---
description: Current development context (auto-generated)
alwaysApply: false
---

# Current Development Context

> Auto-generated: ${timestamp}
> Branch: \`${branch}\`

## Active Work

${stagedFiles.length > 0
  ? `Working on:\n${stagedFiles.map(f => `- \`${f}\``).join('\n')}`
  : 'No staged changes'}

## Recent Activity

${recentChanges.length > 0
  ? `Last 5 commits:\n${recentChanges.slice(0, 5).map(c => `- ${c}`).join('\n')}`
  : 'No recent commits'}

## Development Areas

${activeAreas.length > 0
  ? activeAreas.map(area => `- ${area}`).join('\n')
  : 'None detected'}

---

**Note:** This file is auto-generated. For detailed context, see AGENT_STATUS.md
`;

// Write files
fs.writeFileSync(
  path.join(PROJECT_ROOT, 'PROJECT_STATUS.md'),
  projectStatus
);

fs.writeFileSync(
  path.join(PROJECT_ROOT, '.cursor/rules/current-context.mdc'),
  currentContext
);

console.log('✅ Updated PROJECT_STATUS.md');
console.log('✅ Updated .cursor/rules/current-context.mdc');
