import { spawn } from 'node:child_process';
import { validateCommand } from './base.mjs';

export async function runProcess(argv, options = {}) {
  validateCommand(argv, options.label ?? 'command');
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const timeoutMs = options.timeoutMs ?? 120_000;
  const child = spawn(argv[0], argv.slice(1), {
    cwd: options.cwd,
    env: { ...process.env, ...(options.env ?? {}) },
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    stdout += chunk;
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill('SIGTERM');
    setTimeout(() => child.kill('SIGKILL'), 1_000).unref();
  }, timeoutMs);
  const result = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code, signal) => resolve({ code, signal }));
  }).finally(() => clearTimeout(timer));
  return {
    argv,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    duration_ms: Date.now() - startedMs,
    exit_code: result.code,
    signal: result.signal,
    timed_out: timedOut,
    stdout,
    stderr,
  };
}
