/**
 * R-F13 build identity — bundle constant + runtime file↔bundle assert.
 * BUILD_COMMIT is emitted by scripts/generate-build-info.mjs into src/generated/.
 */

import { BUILD_COMMIT, BUILD_IDENTITY_SOURCE } from '../generated/buildIdentity';

export type BuildIdentityStatus = 'ok' | 'mismatch' | 'missing';

export interface BuildIdentityAssertResult {
  status: BuildIdentityStatus;
  fileHash: string | null;
  bundleHash: string;
}

export { BUILD_COMMIT, BUILD_IDENTITY_SOURCE };

export function shortBuildCommit(commit: string = BUILD_COMMIT): string {
  if (!commit || commit === 'unknown' || commit === 'UNGENERATED') {
    return commit || 'unknown';
  }
  return commit.slice(0, 7);
}

/**
 * Compare the deployed /commit-hash.txt value to the bake-time bundle constant.
 * Never treats a wall-clock timestamp as a commit identity.
 */
export function assertBuildIdentity(
  fileHash: string | null | undefined,
  bundleHash: string = BUILD_COMMIT,
): BuildIdentityAssertResult {
  const file = (fileHash ?? '').trim();
  const bundle = bundleHash.trim();
  if (!file) {
    return { status: 'missing', fileHash: null, bundleHash: bundle };
  }
  if (file !== bundle) {
    return { status: 'mismatch', fileHash: file, bundleHash: bundle };
  }
  return { status: 'ok', fileHash: file, bundleHash: bundle };
}

export function formatBuildIdentityMeta(result: BuildIdentityAssertResult): string {
  if (result.status === 'ok' && result.fileHash) {
    return result.fileHash;
  }
  if (result.status === 'mismatch') {
    return `INVALID:mismatch:file=${result.fileHash};bundle=${result.bundleHash}`;
  }
  return `INVALID:missing;bundle=${result.bundleHash}`;
}
