import fsp from 'node:fs/promises';
import path from 'node:path';
import {
  ControlPlaneError,
  assertRelativeRepoPath,
  canonicalJson,
  sha256Bytes,
  sha256File,
} from './base.mjs';
import { runProcess } from './process.mjs';

export async function git(repoRoot, args, options = {}) {
  const result = await runProcess(['git', ...args], {
    cwd: repoRoot,
    timeoutMs: options.timeoutMs ?? 120_000,
    env: options.env,
    label: `git ${args[0] ?? ''}`,
  });
  if (!options.allowFailure && result.exit_code !== 0) {
    throw new ControlPlaneError('GIT_COMMAND_FAILED', `git ${args.join(' ')} failed`, {
      exit_code: result.exit_code,
      stderr: result.stderr,
    });
  }
  return result;
}

export async function resolveRepoRoot(cwd = process.cwd()) {
  const result = await runProcess(['git', 'rev-parse', '--show-toplevel'], {
    cwd,
    label: 'git rev-parse --show-toplevel',
  });
  if (result.exit_code !== 0) {
    throw new ControlPlaneError('NOT_A_GIT_REPOSITORY', 'Current directory is not inside a Git repository');
  }
  return result.stdout.trim();
}


export function substituteArgs(argv, values) {
  return argv.map((arg) =>
    arg.replace(/(?<!\$)\{([A-Za-z0-9_]+)\}/g, (_match, key) => {
      if (!(key in values)) {
        throw new ControlPlaneError('PLACEHOLDER_UNRESOLVED', `Unknown command placeholder: {${key}}`);
      }
      return String(values[key]);
    }),
  );
}

export async function resolveBaseCommit(repoRoot, manifest) {
  const result = await git(repoRoot, ['rev-parse', '--verify', `${manifest.repository.base_ref}^{commit}`]);
  const commit = result.stdout.trim();
  if (manifest.repository.expected_commit && commit !== manifest.repository.expected_commit) {
    throw new ControlPlaneError('BASE_COMMIT_MISMATCH', 'Resolved base commit differs from manifest', {
      expected: manifest.repository.expected_commit,
      observed: commit,
    });
  }
  return commit;
}

export async function verifyInputs(repoRoot, manifest) {
  const results = [];
  for (const input of manifest.inputs ?? []) {
    const filePath = path.join(repoRoot, assertRelativeRepoPath(input.path));
    const observed = await sha256File(filePath).catch((error) => {
      throw new ControlPlaneError('INPUT_MISSING_OR_UNREADABLE', `Required input unavailable: ${input.path}`, {
        cause: error.message,
      });
    });
    if (observed !== input.sha256.toLowerCase()) {
      throw new ControlPlaneError('INPUT_HASH_MISMATCH', `Required input hash mismatch: ${input.path}`, {
        expected: input.sha256.toLowerCase(),
        observed,
      });
    }
    results.push({ path: input.path, sha256: observed, result: 'PASS' });
  }
  return results;
}

export async function changedPaths(worktree) {
  const tracked = await git(worktree, ['diff', '--name-only', '-z', '--no-renames', 'HEAD']);
  const untracked = await git(worktree, ['ls-files', '--others', '--exclude-standard', '-z']);
  return [...new Set(`${tracked.stdout}${untracked.stdout}`.split('\u0000').filter(Boolean))].sort();
}

export function enforcePathBoundary(changed, manifest) {
  const allowed = new Set(manifest.write_allowlist);
  const protectedSet = new Set(manifest.protected_paths);
  const protectedTouched = changed.filter((item) => protectedSet.has(item));
  const unauthorized = changed.filter((item) => !allowed.has(item));
  if (protectedTouched.length) {
    throw new ControlPlaneError('PROTECTED_PATH_MUTATION', 'Protected paths were modified', {
      paths: protectedTouched,
    });
  }
  if (unauthorized.length) {
    throw new ControlPlaneError('WRITE_BOUNDARY_VIOLATION', 'Files outside write_allowlist were modified', {
      paths: unauthorized,
    });
  }
  return { result: 'PASS', changed_paths: changed };
}

export async function snapshotChangedFileHashes(worktree, changed) {
  const hashes = {};
  for (const rel of changed) {
    const absolute = path.join(worktree, rel);
    try {
      const stat = await fsp.lstat(absolute);
      if (stat.isSymbolicLink()) {
        throw new ControlPlaneError('SYMLINK_FORBIDDEN', `Changed path may not be a symlink: ${rel}`);
      }
      if (!stat.isFile()) {
        throw new ControlPlaneError('SPECIAL_FILE_FORBIDDEN', `Changed path must be a regular file: ${rel}`);
      }
      hashes[rel] = await sha256File(absolute);
    } catch (error) {
      if (error.code === 'ENOENT') hashes[rel] = 'DELETED';
      else throw error;
    }
  }
  return hashes;
}

export async function snapshotRepositoryInvariants(repoRoot, protectedPaths = []) {
  const [head, branch, refs, status, diff, untracked] = await Promise.all([
    git(repoRoot, ['rev-parse', 'HEAD']),
    git(repoRoot, ['symbolic-ref', '-q', '--short', 'HEAD'], { allowFailure: true }),
    git(repoRoot, ['for-each-ref', '--sort=refname', '--format=%(refname)%00%(objectname)']),
    git(repoRoot, ['status', '--porcelain=v1', '-z', '--untracked-files=all']),
    git(repoRoot, ['diff', '--binary', '--full-index', '--no-ext-diff', '--no-renames', 'HEAD']),
    git(repoRoot, ['ls-files', '--others', '--exclude-standard', '-z']),
  ]);
  const untrackedPaths = untracked.stdout.split('\u0000').filter(Boolean).sort();
  const untrackedHashes = await snapshotChangedFileHashes(repoRoot, untrackedPaths);
  const protectedHashes = await snapshotChangedFileHashes(repoRoot, protectedPaths);
  return {
    head: head.stdout.trim(),
    branch: branch.exit_code === 0 ? branch.stdout.trim() : null,
    refs_sha256: sha256Bytes(refs.stdout),
    status_sha256: sha256Bytes(status.stdout),
    tracked_diff_sha256: sha256Bytes(diff.stdout),
    untracked_hashes: untrackedHashes,
    protected_hashes: protectedHashes,
  };
}

export function assertRepositoryInvariants(before, after, phase) {
  if (canonicalJson(before) !== canonicalJson(after)) {
    throw new ControlPlaneError(
      'CANONICAL_REPOSITORY_MUTATION',
      `Canonical repository invariants changed during ${phase}`,
      { before, after },
    );
  }
}

export async function assertWorktreeBaseUnchanged(worktree, baseCommit, phase) {
  const head = (await git(worktree, ['rev-parse', 'HEAD'])).stdout.trim();
  const branch = await git(worktree, ['symbolic-ref', '-q', '--short', 'HEAD'], {
    allowFailure: true,
  });
  if (head !== baseCommit || branch.exit_code === 0) {
    throw new ControlPlaneError(
      'UNAUTHORIZED_GIT_MUTATION',
      `Writer/verifier Git state changed during ${phase}`,
      {
        expected_head: baseCommit,
        observed_head: head,
        expected_detached: true,
        observed_branch: branch.exit_code === 0 ? branch.stdout.trim() : null,
      },
    );
  }
}

export async function createPatch(worktree, baseCommit, changed) {
  const untrackedResult = await git(worktree, ['ls-files', '--others', '--exclude-standard', '-z']);
  const untracked = untrackedResult.stdout.split('\u0000').filter(Boolean);
  if (untracked.length) {
    await git(worktree, ['add', '-N', '--', ...untracked]);
  }
  const result = await git(worktree, [
    'diff',
    '--binary',
    '--full-index',
    '--no-ext-diff',
    '--no-renames',
    baseCommit,
    '--',
    ...changed,
  ]);
  return result.stdout;
}

export async function addWorktree(repoRoot, worktreePath, baseCommit, { branch } = {}) {
  await fsp.mkdir(path.dirname(worktreePath), { recursive: true });
  try {
    await fsp.access(worktreePath);
    throw new ControlPlaneError('WORKTREE_ALREADY_EXISTS', `Worktree path already exists: ${worktreePath}`);
  } catch (error) {
    if (error instanceof ControlPlaneError) throw error;
    if (error.code !== 'ENOENT') throw error;
  }
  const args = branch
    ? ['worktree', 'add', '-b', branch, worktreePath, baseCommit]
    : ['worktree', 'add', '--detach', worktreePath, baseCommit];
  await git(repoRoot, args);
}

export async function removeWorktree(repoRoot, worktreePath) {
  await git(repoRoot, ['worktree', 'remove', '--force', worktreePath], { allowFailure: true });
  await fsp.rm(worktreePath, { recursive: true, force: true });
}

export async function runGates(gates, worktree, context, phase) {
  const results = [];
  for (const gate of gates) {
    const argv = substituteArgs(gate.command, context);
    const result = await runProcess(argv, {
      cwd: worktree,
      timeoutMs: gate.timeout_ms ?? 120_000,
      env: {
        DCIM_TASK_ID: context.task_id,
        DCIM_RUN_ID: context.run_id,
        DCIM_PHASE: phase,
      },
      label: `${phase}:${gate.id}`,
    });
    const expected = gate.expected_exit_code ?? 0;
    results.push({
      id: gate.id,
      phase,
      argv,
      expected_exit_code: expected,
      ...result,
      result: result.exit_code === expected && !result.timed_out ? 'PASS' : 'FAIL',
    });
    if (results.at(-1).result === 'FAIL') break;
  }
  return results;
}
