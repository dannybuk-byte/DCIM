/**
 * R-F13: build identity assert — file ↔ bundle, no timestamp-as-commit.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import {
  assertBuildIdentity,
  formatBuildIdentityMeta,
  shortBuildCommit,
} from './buildIdentity';
import { BUILD_COMMIT } from '../generated/buildIdentity';

describe('R-F13 assertBuildIdentity', () => {
  beforeAll(() => {
    execFileSync('node', ['scripts/generate-build-info.mjs'], {
      cwd: process.cwd(),
      stdio: 'pipe',
    });
  });

  it('returns ok when file hash matches bundle hash', () => {
    const result = assertBuildIdentity(BUILD_COMMIT, BUILD_COMMIT);
    expect(result.status).toBe('ok');
    expect(formatBuildIdentityMeta(result)).toBe(BUILD_COMMIT);
  });

  it('returns mismatch when file ≠ bundle (no silent ok)', () => {
    const result = assertBuildIdentity(
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    );
    expect(result.status).toBe('mismatch');
    expect(formatBuildIdentityMeta(result)).toMatch(/^INVALID:mismatch/);
  });

  it('returns missing when file absent — never invents a timestamp', () => {
    const result = assertBuildIdentity(null, BUILD_COMMIT);
    expect(result.status).toBe('missing');
    const meta = formatBuildIdentityMeta(result);
    expect(meta).toMatch(/^INVALID:missing/);
    expect(meta).not.toMatch(/^\d{10,}$/);
  });

  it('shortBuildCommit truncates to 7 chars', () => {
    expect(shortBuildCommit('e4800c2b0d02e506f1096260015c5a6495fee42f')).toBe('e4800c2');
  });

  it('public/commit-hash.txt matches generated BUILD_COMMIT after generate', () => {
    const marker = readFileSync('public/commit-hash.txt', 'utf8').trim();
    expect(marker).toBe(BUILD_COMMIT);
    const head = execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
    }).trim();
    expect(marker).toBe(head);
  });
});
