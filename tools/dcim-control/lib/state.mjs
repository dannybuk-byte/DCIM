import crypto from 'node:crypto';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {
  ControlPlaneError,
  appendJsonlDurable,
  loadJson,
  writeJsonAtomic,
} from './base.mjs';

export function controlPaths(repoRoot) {
  return {
    root: path.join(repoRoot, '.dcim'),
    runtime: path.join(repoRoot, '.dcim', 'runtime'),
    runtimeEvents: path.join(repoRoot, '.dcim', 'runtime', 'events.jsonl'),
    runtimeRuns: path.join(repoRoot, '.dcim', 'runtime', 'runs'),
    worktrees: path.join(repoRoot, '.dcim', 'runtime', 'worktrees'),
    artifacts: path.join(repoRoot, '.dcim', 'runtime', 'artifacts', 'sha256'),
    canonicalEvents: path.join(repoRoot, '.dcim', 'state', 'events.jsonl'),
    canonicalState: path.join(repoRoot, '.dcim', 'state', 'current.generated.json'),
    driftPolicy: path.join(repoRoot, '.dcim', 'policy', 'drift-policy.json'),
  };
}

export async function ensureRuntime(repoRoot) {
  const paths = controlPaths(repoRoot);
  await Promise.all([
    fsp.mkdir(paths.runtimeRuns, { recursive: true }),
    fsp.mkdir(paths.worktrees, { recursive: true }),
    fsp.mkdir(paths.artifacts, { recursive: true }),
  ]);
  return paths;
}

export function newEvent(type, taskId, payload = {}) {
  return {
    schema_version: 1,
    event_id: crypto.randomUUID(),
    observed_at: new Date().toISOString(),
    type,
    task_id: taskId,
    payload,
  };
}

export async function appendRuntimeEvent(repoRoot, type, taskId, payload = {}) {
  const paths = await ensureRuntime(repoRoot);
  const event = newEvent(type, taskId, payload);
  await appendJsonlDurable(paths.runtimeEvents, event);
  return event;
}

export async function readJsonl(filePath, { allowMissing = true } = {}) {
  let text;
  try {
    text = await fsp.readFile(filePath, 'utf8');
  } catch (error) {
    if (allowMissing && error.code === 'ENOENT') return [];
    throw new ControlPlaneError('EVENT_LEDGER_UNREADABLE', `Cannot read event ledger: ${filePath}`, {
      cause: error.message,
    });
  }
  const events = [];
  for (const [index, line] of text.split(/\n/).entries()) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line));
    } catch (error) {
      throw new ControlPlaneError('EVENT_LEDGER_INVALID', `Malformed JSONL at line ${index + 1}`, {
        cause: error.message,
      });
    }
  }
  return events;
}

export function reduceState(events) {
  const tasks = {};
  const artifacts = {};
  for (const event of events) {
    if (!event || event.schema_version !== 1 || typeof event.type !== 'string') {
      throw new ControlPlaneError('EVENT_INVALID', 'Event does not conform to schema version 1', { event });
    }
    const taskId = event.task_id ?? 'GLOBAL';
    tasks[taskId] ??= {
      task_id: taskId,
      execution_state: 'CREATED',
      governance_state: 'DRAFT',
      transport_state: 'NOT_MATERIALIZED',
      last_event_at: null,
      run_ids: [],
    };
    const task = tasks[taskId];
    task.last_event_at = event.observed_at;
    switch (event.type) {
      case 'TASK_AUTHORIZED':
        task.governance_state = 'AUTHORIZED';
        break;
      case 'EXECUTION_STARTED':
        task.execution_state = 'RUNNING';
        if (event.payload?.run_id) task.run_ids.push(event.payload.run_id);
        break;
      case 'EXECUTION_SUCCEEDED':
        task.execution_state = 'SUCCEEDED';
        task.governance_state = 'IMPLEMENTED_UNVERIFIED';
        task.latest_run_id = event.payload?.run_id;
        break;
      case 'EXECUTION_REUSED':
        task.execution_state = 'REUSED';
        task.latest_run_id = event.payload?.run_id;
        break;
      case 'EXECUTION_FAILED':
        task.execution_state = event.payload?.interrupted ? 'INTERRUPTED' : 'FAILED';
        task.latest_run_id = event.payload?.run_id;
        break;
      case 'VERIFICATION_SUCCEEDED':
        task.governance_state = 'VERIFIED_PASS';
        task.latest_verification_id = event.payload?.verification_id;
        break;
      case 'VERIFICATION_FAILED':
        task.governance_state = 'VERIFIED_FAIL';
        task.latest_verification_id = event.payload?.verification_id;
        break;
      case 'PRINCIPAL_ACCEPTED':
        task.governance_state = 'PRINCIPAL_ACCEPTED';
        break;
      case 'PRINCIPAL_REJECTED':
        task.governance_state = 'PRINCIPAL_REJECTED';
        break;
      case 'TASK_SUPERSEDED':
        task.governance_state = 'SUPERSEDED';
        break;
      case 'TRANSPORT_PRESENT':
        task.transport_state = 'PRESENT';
        break;
      case 'TRANSPORT_HASH_VERIFIED':
        task.transport_state = 'HASH_VERIFIED';
        break;
      case 'TRANSPORT_CONSUMED':
        task.transport_state = 'CONSUMED';
        break;
      default:
        break;
    }
    const digest = event.payload?.artifact_sha256;
    if (digest) {
      artifacts[digest] ??= { artifact_sha256: digest, requested: 0, present: 0, consumed: 0 };
      if (event.type === 'TRANSPORT_REQUESTED') artifacts[digest].requested += 1;
      if (event.type === 'TRANSPORT_PRESENT') artifacts[digest].present += 1;
      if (event.type === 'TRANSPORT_CONSUMED') artifacts[digest].consumed += 1;
    }
  }
  const generatedAt = events.length
    ? events.map((event) => event.observed_at).filter(Boolean).sort().at(-1) ?? null
    : null;
  return {
    schema_version: 1,
    generated_at: generatedAt,
    tasks,
    artifacts,
  };
}

export async function regenerateCanonicalState(repoRoot) {
  const paths = controlPaths(repoRoot);
  const events = await readJsonl(paths.canonicalEvents, { allowMissing: true });
  const state = reduceState(events);
  await writeJsonAtomic(paths.canonicalState, state);
  return state;
}

function repairDepth(taskId) {
  return (taskId.match(/(?:REPAIR|RESUME|CORRECTION)/gi) ?? []).length;
}

export async function evaluateDrift(repoRoot, taskId, extraEvents = []) {
  const paths = await ensureRuntime(repoRoot);
  const policy = await loadJson(paths.driftPolicy).catch(() => ({
    max_control_artifacts_without_product_delta: 2,
    max_duplicate_digest_requests: 1,
    max_repair_depth: 2,
    max_approval_requests_per_task: 2,
    max_same_scope_correction_turns: 2,
  }));
  const events = [...(await readJsonl(paths.runtimeEvents)), ...extraEvents].filter(
    (event) => event.task_id === taskId,
  );
  const counts = {
    control_artifacts: events.filter((e) => e.type === 'CONTROL_ARTIFACT_CREATED').length,
    product_deltas: events.filter((e) => e.type === 'PRODUCT_DELTA_CREATED').length,
    approval_requests: events.filter((e) => e.type === 'APPROVAL_REQUESTED').length,
  };
  const digestRequests = new Map();
  for (const event of events.filter((e) => e.type === 'TRANSPORT_REQUESTED')) {
    const digest = event.payload?.artifact_sha256;
    if (digest) digestRequests.set(digest, (digestRequests.get(digest) ?? 0) + 1);
  }
  const reasons = [];
  if (
    counts.control_artifacts - counts.product_deltas >
    policy.max_control_artifacts_without_product_delta
  ) {
    reasons.push('CONTROL_ARTIFACT_SPIRAL');
  }
  if (counts.approval_requests > policy.max_approval_requests_per_task) {
    reasons.push('APPROVAL_FATIGUE');
  }
  if (repairDepth(taskId) > policy.max_repair_depth) {
    reasons.push('NESTED_REPAIR_DEPTH_EXCEEDED');
  }
  for (const [digest, count] of digestRequests.entries()) {
    if (count > policy.max_duplicate_digest_requests) {
      reasons.push(`DUPLICATE_DIGEST_REQUEST:${digest}`);
    }
  }
  return {
    task_id: taskId,
    result: reasons.length ? 'BLOCK' : 'PASS',
    reasons,
    counts,
    repair_depth: repairDepth(taskId),
    policy,
  };
}


export async function recordTransport(repoRoot, taskId, action, digest) {
  if (!['requested', 'present', 'hash-verified', 'consumed'].includes(action)) {
    throw new ControlPlaneError('TRANSPORT_ACTION_INVALID', 'Unsupported transport action');
  }
  if (!/^[0-9a-f]{64}$/i.test(digest ?? '')) {
    throw new ControlPlaneError('ARTIFACT_DIGEST_INVALID', 'Transport digest must be SHA-256');
  }
  const type = {
    requested: 'TRANSPORT_REQUESTED',
    present: 'TRANSPORT_PRESENT',
    'hash-verified': 'TRANSPORT_HASH_VERIFIED',
    consumed: 'TRANSPORT_CONSUMED',
  }[action];
  const event = newEvent(type, taskId, { artifact_sha256: digest.toLowerCase() });
  const drift = await evaluateDrift(repoRoot, taskId, [event]);
  if (action === 'requested' && drift.result === 'BLOCK') {
    throw new ControlPlaneError('DUPLICATE_TRANSPORT_BLOCKED', 'Duplicate artifact request blocked', drift);
  }
  await appendJsonlDurable(controlPaths(repoRoot).runtimeEvents, event);
  return event;
}

export function compareMeasuredSummaries(left, right, fields = []) {
  const defaultFields = ['result', 'file_count', 'total_tests', 'passed_tests', 'failed_tests', 'success'];
  const selected = fields.length ? fields : defaultFields;
  const differences = [];
  for (const field of selected) {
    if (left?.[field] !== right?.[field]) {
      differences.push({ field, left: left?.[field], right: right?.[field] });
    }
  }
  return { result: differences.length ? 'FAIL' : 'PASS', fields: selected, differences };
}
