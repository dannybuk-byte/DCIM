#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import {
  ControlPlaneError,
  canonicalJson,
  doctor,
  evaluateDrift,
  executeTask,
  loadJson,
  manifestDigest,
  promoteRun,
  recordTransport,
  reduceState,
  regenerateCanonicalState,
  resolveRepoRoot,
  validateManifest,
  verifyRun,
  readJsonl,
  controlPaths,
} from './core.mjs';

function parseOptions(args) {
  const options = { _: [] };
  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (!token.startsWith('--')) {
      options._.push(token);
      continue;
    }
    const key = token.slice(2).replace(/-/g, '_');
    const next = args[i + 1];
    if (next === undefined || next.startsWith('--')) options[key] = true;
    else {
      options[key] = next;
      i += 1;
    }
  }
  return options;
}

function usage() {
  return `DCIM Build Control System v0.1\n\n` +
    `Commands:\n` +
    `  validate <manifest.json>\n` +
    `  doctor [manifest.json]\n` +
    `  run <manifest.json>\n` +
    `  verify <run_id>\n` +
    `  promote <run_id> --principal NAME --accept TASK_ID:RUN_ID [--email EMAIL]\n` +
    `  status [--canonical]\n` +
    `  rebuild-state\n` +
    `  drift-check <task_id>\n` +
    `  transport <task_id> <requested|present|hash-verified|consumed> <sha256>\n`;
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (!command || command === 'help' || command === '--help') {
    process.stdout.write(usage());
    return;
  }
  const repoRoot = await resolveRepoRoot();
  const options = parseOptions(rest);
  switch (command) {
    case 'validate': {
      const file = options._[0];
      if (!file) throw new ControlPlaneError('ARGUMENT_REQUIRED', 'Manifest path is required');
      const manifest = validateManifest(await loadJson(path.resolve(file)));
      process.stdout.write(canonicalJson({ result: 'PASS', task_id: manifest.task_id, manifest_sha256: manifestDigest(manifest) }));
      break;
    }
    case 'doctor': {
      const file = options._[0] ? path.resolve(options._[0]) : null;
      const result = await doctor(repoRoot, file);
      process.stdout.write(canonicalJson(result));
      if (result.result !== 'PASS') process.exitCode = 1;
      break;
    }
    case 'run': {
      const file = options._[0];
      if (!file) throw new ControlPlaneError('ARGUMENT_REQUIRED', 'Manifest path is required');
      process.stdout.write(canonicalJson(await executeTask(repoRoot, path.resolve(file))));
      break;
    }
    case 'verify': {
      const runId = options._[0];
      if (!runId) throw new ControlPlaneError('ARGUMENT_REQUIRED', 'run_id is required');
      process.stdout.write(canonicalJson(await verifyRun(repoRoot, runId)));
      break;
    }
    case 'promote': {
      const runId = options._[0];
      if (!runId) throw new ControlPlaneError('ARGUMENT_REQUIRED', 'run_id is required');
      process.stdout.write(canonicalJson(await promoteRun(repoRoot, runId, {
        principal: options.principal,
        accept: options.accept,
        email: options.email,
      })));
      break;
    }
    case 'status': {
      const paths = controlPaths(repoRoot);
      const events = await readJsonl(options.canonical ? paths.canonicalEvents : paths.runtimeEvents);
      process.stdout.write(canonicalJson(reduceState(events)));
      break;
    }
    case 'rebuild-state': {
      process.stdout.write(canonicalJson(await regenerateCanonicalState(repoRoot)));
      break;
    }
    case 'drift-check': {
      const taskId = options._[0];
      if (!taskId) throw new ControlPlaneError('ARGUMENT_REQUIRED', 'task_id is required');
      const result = await evaluateDrift(repoRoot, taskId);
      process.stdout.write(canonicalJson(result));
      if (result.result !== 'PASS') process.exitCode = 2;
      break;
    }
    case 'transport': {
      const [taskId, action, digest] = options._;
      if (!taskId || !action || !digest) {
        throw new ControlPlaneError('ARGUMENT_REQUIRED', 'transport requires task_id, action, and sha256');
      }
      process.stdout.write(canonicalJson(await recordTransport(repoRoot, taskId, action, digest)));
      break;
    }
    default:
      throw new ControlPlaneError('COMMAND_UNKNOWN', `Unknown command: ${command}`);
  }
}

main().catch((error) => {
  const normalized = error instanceof ControlPlaneError
    ? error
    : new ControlPlaneError('UNEXPECTED_FAILURE', error.message, { stack: error.stack });
  process.stderr.write(canonicalJson({
    result: 'FAIL',
    error: { code: normalized.code, message: normalized.message, details: normalized.details },
  }));
  process.exitCode = 1;
});
