/**
 * Single fail-closed build-identity resolver (R-F13).
 * Order: CF_PAGES_COMMIT_SHA → GITHUB_SHA → git rev-parse HEAD.
 * No silent "development" fallback unless ALLOW_UNKNOWN_BUILD_IDENTITY=1.
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @typedef {{ commit: string, source: 'ci-env' | 'git-head' | 'allow-unknown' }} BuildIdentity
 */

/**
 * @param {string | undefined} raw
 * @returns {string | null}
 */
function normalizeSha(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim().toLowerCase();
  if (!/^[0-9a-f]{7,40}$/.test(trimmed)) return null;
  return trimmed;
}

/**
 * @returns {BuildIdentity}
 */
export function resolveBuildIdentity() {
  const fromCi = normalizeSha(
    process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA,
  );
  if (fromCi) {
    return { commit: fromCi, source: 'ci-env' };
  }

  const gitDir = join(ROOT, '.git');
  if (existsSync(gitDir)) {
    try {
      const out = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const commit = normalizeSha(out);
      if (commit) {
        return { commit, source: 'git-head' };
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (process.env.ALLOW_UNKNOWN_BUILD_IDENTITY === '1') {
        return { commit: 'unknown', source: 'allow-unknown' };
      }
      throw new Error(
        `R-F13: failed to resolve git HEAD for build identity: ${message}`,
      );
    }
  }

  if (process.env.ALLOW_UNKNOWN_BUILD_IDENTITY === '1') {
    return { commit: 'unknown', source: 'allow-unknown' };
  }

  throw new Error(
    'R-F13: cannot resolve build identity (no CF_PAGES_COMMIT_SHA/GITHUB_SHA and no git HEAD). Set ALLOW_UNKNOWN_BUILD_IDENTITY=1 only for explicit sandboxes.',
  );
}
