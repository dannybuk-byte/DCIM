#!/usr/bin/env node
/**
 * Update AI context artifacts (version-controlled) so new Cursor/Claude sessions
 * can recover project state without relying on chat history.
 *
 * Outputs:
 * - PROJECT_STATUS.md
 * - .cursor/rules/current-context.mdc (short; safe to alwaysApply)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function safeSh(cmd) {
  try {
    return sh(cmd);
  } catch {
    return '';
  }
}

const repoRoot = path.resolve(__dirname, '..');
const nowIso = new Date().toISOString();
const branch = safeSh('git branch --show-current') || 'unknown';

const recentCommitsRaw = safeSh('git log --oneline -15 --no-merges');
const recentCommits = recentCommitsRaw ? recentCommitsRaw.split('\n').filter(Boolean) : [];

const stagedFilesRaw = safeSh('git diff --cached --name-only');
const stagedFiles = stagedFilesRaw ? stagedFilesRaw.split('\n').filter(Boolean) : [];

const touchedAreas = Array.from(
  new Set(
    stagedFiles
      .map(f => f.split('/')[0])
      .filter(Boolean)
  )
);

const projectStatus = `# Project Status
> Auto-generated: ${nowIso}
> Branch: \`${branch}\`

## What to read first
- \`AGENT_STATUS.md\` (current focus; updated on commits)
- \`DCIM_MASTER_HANDOFF.md\` (full handoff)
- \`DCIM Compliance App/.cursorrules\` (constraints)

## Recent commits (no merges)
${recentCommits.length ? recentCommits.map(c => `- ${c}`).join('\n') : '- (none found)'}

## Currently staged files
${stagedFiles.length ? stagedFiles.map(f => `- \`${f}\``).join('\n') : '- (none)'}

## Active areas (from staged files)
${touchedAreas.length ? touchedAreas.join(', ') : '(none)'}
`;

const cursorRule = `---
description: Auto-generated current context (updated on commit)
alwaysApply: true
---

## Current context (auto-generated)
- Generated: **${nowIso}**
- Branch: \`${branch}\`

## Where to pick up
- Read \`AGENT_STATUS.md\` first, then \`DCIM_MASTER_HANDOFF.md\`.

## Recent commits
${recentCommits.slice(0, 8).map(c => `- ${c}`).join('\n') || '- (none found)'}

## Staged right now
${stagedFiles.slice(0, 12).map(f => `- \`${f}\``).join('\n') || '- (none)'}
`;

fs.mkdirSync(path.join(repoRoot, '.cursor', 'rules'), { recursive: true });
fs.mkdirSync(path.join(repoRoot, 'scripts'), { recursive: true });

fs.writeFileSync(path.join(repoRoot, 'PROJECT_STATUS.md'), projectStatus, 'utf8');
fs.writeFileSync(path.join(repoRoot, '.cursor', 'rules', 'current-context.mdc'), cursorRule, 'utf8');

process.stdout.write('✅ Updated PROJECT_STATUS.md and .cursor/rules/current-context.mdc\n');


