import fsp from 'node:fs/promises';
import path from 'node:path';
import {
  ControlPlaneError,
  canonicalize,
  canonicalJson,
  manifestDigest,
  sha256Bytes,
  sha256File,
  writeTextAtomic,
} from './base.mjs';

export const NATIVE_ACCEPTED_LIFECYCLE_PROFILE = 'DCIM_NATIVE_ACCEPTED_V1';
export const NATIVE_ACCEPTED_LIFECYCLE_ORDER = Object.freeze([
  'EXECUTION_STARTED',
  'EXECUTION_SUCCEEDED',
  'TRANSPORT_PRESENT',
  'VERIFICATION_SUCCEEDED',
  'TRANSPORT_HASH_VERIFIED',
  'TRANSPORT_CONSUMED',
  'PRINCIPAL_ACCEPTED',
]);

export const CANONICAL_LEDGER_PATH = '.dcim/state/events.jsonl';
export const CANONICAL_STATE_PATH = '.dcim/state/current.generated.json';

function fail(code, message, details = {}) {
  throw new ControlPlaneError(code, message, details);
}

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail('LIFECYCLE_INVALID', `${name} must be an object`);
  }
  return value;
}

function assertNonEmptyString(value, name) {
  if (typeof value !== 'string' || !value.trim()) {
    fail('LIFECYCLE_INVALID', `${name} must be a non-empty string`);
  }
  return value;
}

function assertSafeId(value, name) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{1,255}$/.test(value ?? '')) {
    fail('LIFECYCLE_INVALID', `${name} contains unsafe characters`, { value });
  }
  return value;
}

function assertSha1(value, name) {
  if (!/^[0-9a-f]{40}$/.test(value ?? '')) {
    fail('LIFECYCLE_INVALID', `${name} must be lowercase 40-hex`, { value });
  }
  return value;
}

function assertSha256(value, name, { allowDeleted = false } = {}) {
  if (allowDeleted && value === 'DELETED') return value;
  if (!/^[0-9a-f]{64}$/.test(value ?? '')) {
    fail('LIFECYCLE_INVALID', `${name} must be lowercase SHA-256`, { value });
  }
  return value;
}

function assertIso(value, name) {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    fail('LIFECYCLE_INVALID', `${name} must be an ISO date-time`, { value });
  }
  return value;
}

function assertUniqueStrings(values, name) {
  if (!Array.isArray(values) || values.some((value) => typeof value !== 'string')) {
    fail('LIFECYCLE_INVALID', `${name} must be a string array`);
  }
  if (new Set(values).size !== values.length) {
    fail('LIFECYCLE_INVALID', `${name} contains duplicates`, { values });
  }
  return values;
}

function assertFileHashMap(value, expectedPaths, name) {
  requireObject(value, name);
  const keys = Object.keys(value).sort();
  const expected = [...expectedPaths].sort();
  if (canonicalJson(keys) !== canonicalJson(expected)) {
    fail('LIFECYCLE_EVIDENCE_MISMATCH', `${name} keys differ from changed_paths`, {
      expected,
      observed: keys,
    });
  }
  for (const [file, digest] of Object.entries(value)) {
    assertNonEmptyString(file, `${name} key`);
    assertSha256(digest, `${name}.${file}`, { allowDeleted: true });
  }
  return value;
}

export function isNativeAcceptedLifecycleEvent(event) {
  return event?.payload?.lifecycle_profile === NATIVE_ACCEPTED_LIFECYCLE_PROFILE;
}

export function validateEventShape(event, index = null) {
  const label = index === null ? 'event' : `events[${index}]`;
  requireObject(event, label);
  if (event.schema_version !== 1) {
    fail('EVENT_INVALID', `${label}.schema_version must equal 1`, { event });
  }
  assertNonEmptyString(event.event_id, `${label}.event_id`);
  assertIso(event.observed_at, `${label}.observed_at`);
  assertNonEmptyString(event.type, `${label}.type`);
  assertNonEmptyString(event.task_id, `${label}.task_id`);
  requireObject(event.payload, `${label}.payload`);
  return event;
}

/**
 * Validate the complete event ledger shape and every native accepted lifecycle.
 * Historical/imported events are shape-checked and duplicate-checked but are not
 * retroactively forced through the native transition profile.
 */
export function validateLedgerEvents(events, { requireCompleteNative = false } = {}) {
  if (!Array.isArray(events)) {
    fail('EVENT_LEDGER_INVALID', 'Event ledger must be an array');
  }
  const ids = new Set();
  const nativeByTask = new Map();
  for (const [index, event] of events.entries()) {
    validateEventShape(event, index);
    if (ids.has(event.event_id)) {
      fail('EVENT_ID_DUPLICATE', 'Event ledger contains a duplicate event_id', {
        event_id: event.event_id,
        index,
      });
    }
    ids.add(event.event_id);
    if (!isNativeAcceptedLifecycleEvent(event)) continue;
    const list = nativeByTask.get(event.task_id) ?? [];
    list.push(event);
    nativeByTask.set(event.task_id, list);
  }

  const summaries = {};
  for (const [taskId, lifecycle] of nativeByTask.entries()) {
    if (lifecycle.length > NATIVE_ACCEPTED_LIFECYCLE_ORDER.length) {
      fail('NATIVE_LIFECYCLE_DUPLICATE', 'Native accepted lifecycle has too many events', {
        task_id: taskId,
        count: lifecycle.length,
      });
    }
    let runId = null;
    for (const [index, event] of lifecycle.entries()) {
      const expectedType = NATIVE_ACCEPTED_LIFECYCLE_ORDER[index];
      if (event.type !== expectedType) {
        fail('NATIVE_LIFECYCLE_TRANSITION_INVALID', 'Native accepted lifecycle is out of order', {
          task_id: taskId,
          index,
          expected_type: expectedType,
          observed_type: event.type,
        });
      }
      if (event.payload.lifecycle_sequence !== index + 1) {
        fail('NATIVE_LIFECYCLE_SEQUENCE_INVALID', 'Native accepted lifecycle sequence number is invalid', {
          task_id: taskId,
          index,
          expected_sequence: index + 1,
          observed_sequence: event.payload.lifecycle_sequence,
        });
      }
      if (event.payload.lifecycle_event_count !== NATIVE_ACCEPTED_LIFECYCLE_ORDER.length) {
        fail('NATIVE_LIFECYCLE_COUNT_INVALID', 'Native accepted lifecycle event count is invalid', {
          task_id: taskId,
          observed: event.payload.lifecycle_event_count,
        });
      }
      const eventRunId = assertNonEmptyString(event.payload.run_id, 'event.payload.run_id');
      if (runId === null) runId = eventRunId;
      if (runId !== eventRunId) {
        fail('NATIVE_LIFECYCLE_RUN_MISMATCH', 'Native accepted lifecycle mixes run IDs', {
          task_id: taskId,
          expected_run_id: runId,
          observed_run_id: eventRunId,
        });
      }
    }
    if (requireCompleteNative && lifecycle.length !== NATIVE_ACCEPTED_LIFECYCLE_ORDER.length) {
      fail('NATIVE_LIFECYCLE_INCOMPLETE', 'Native accepted lifecycle is incomplete', {
        task_id: taskId,
        count: lifecycle.length,
      });
    }
    summaries[taskId] = {
      task_id: taskId,
      run_id: runId,
      event_count: lifecycle.length,
      complete: lifecycle.length === NATIVE_ACCEPTED_LIFECYCLE_ORDER.length,
      event_ids: lifecycle.map((event) => event.event_id),
    };
  }
  return {
    result: 'PASS',
    event_count: events.length,
    native_lifecycles: summaries,
  };
}

export function assertCompleteAcceptedLifecycle(events, taskId, runId) {
  validateLedgerEvents(events);
  const lifecycle = events.filter(
    (event) =>
      event.task_id === taskId &&
      isNativeAcceptedLifecycleEvent(event) &&
      event.payload?.run_id === runId,
  );
  if (lifecycle.length !== NATIVE_ACCEPTED_LIFECYCLE_ORDER.length) {
    fail('NATIVE_LIFECYCLE_INCOMPLETE', 'Expected one complete native accepted lifecycle', {
      task_id: taskId,
      run_id: runId,
      count: lifecycle.length,
    });
  }
  for (const [index, event] of lifecycle.entries()) {
    if (event.type !== NATIVE_ACCEPTED_LIFECYCLE_ORDER[index]) {
      fail('NATIVE_LIFECYCLE_TRANSITION_INVALID', 'Native accepted lifecycle is not in canonical order');
    }
  }
  return lifecycle;
}

function selectRuntimeEvent(events, type, taskId, runId) {
  const matches = events.filter(
    (event) =>
      event?.schema_version === 1 &&
      event.type === type &&
      event.task_id === taskId &&
      event.payload?.run_id === runId,
  );
  if (matches.length !== 1) {
    fail('PROMOTION_RUNTIME_EVIDENCE_INVALID', `Expected exactly one ${type} runtime event`, {
      task_id: taskId,
      run_id: runId,
      count: matches.length,
    });
  }
  validateEventShape(matches[0]);
  return matches[0];
}

export function selectRuntimePromotionEvidence(events, result, verification, patchSha256) {
  const taskId = assertSafeId(result.task_id, 'result.task_id');
  const runId = assertSafeId(result.run_id, 'result.run_id');
  const selected = {
    execution_started: selectRuntimeEvent(events, 'EXECUTION_STARTED', taskId, runId),
    execution_succeeded: selectRuntimeEvent(events, 'EXECUTION_SUCCEEDED', taskId, runId),
    transport_present: selectRuntimeEvent(events, 'TRANSPORT_PRESENT', taskId, runId),
    verification_succeeded: selectRuntimeEvent(events, 'VERIFICATION_SUCCEEDED', taskId, runId),
  };

  const started = selected.execution_started.payload;
  if (
    started.idempotency_key !== result.idempotency_key ||
    started.manifest_sha256 !== result.manifest_sha256 ||
    started.base_commit !== result.base_commit
  ) {
    fail('PROMOTION_RUNTIME_EVIDENCE_INVALID', 'EXECUTION_STARTED does not bind the execution result', {
      started,
      result: {
        idempotency_key: result.idempotency_key,
        manifest_sha256: result.manifest_sha256,
        base_commit: result.base_commit,
      },
    });
  }
  const succeeded = selected.execution_succeeded.payload;
  if (
    succeeded.idempotency_key !== result.idempotency_key ||
    succeeded.artifact_sha256 !== result.artifact?.bundle_sha256
  ) {
    fail('PROMOTION_RUNTIME_EVIDENCE_INVALID', 'EXECUTION_SUCCEEDED does not bind the execution result');
  }
  if (selected.transport_present.payload?.artifact_sha256 !== result.artifact?.bundle_sha256) {
    fail('PROMOTION_RUNTIME_EVIDENCE_INVALID', 'TRANSPORT_PRESENT does not bind the execution artifact');
  }
  const verified = selected.verification_succeeded.payload;
  if (
    verified.verification_id !== verification.verification_id ||
    (verified.patch_sha256 && verified.patch_sha256 !== patchSha256)
  ) {
    fail('PROMOTION_RUNTIME_EVIDENCE_INVALID', 'VERIFICATION_SUCCEEDED does not bind the verification file');
  }
  return selected;
}

async function listFilesRecursive(root, current = '') {
  const absolute = path.join(root, current);
  const entries = await fsp.readdir(absolute, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const relative = current ? `${current}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...await listFilesRecursive(root, relative));
    else if (entry.isFile()) out.push(relative);
    else fail('ARTIFACT_SPECIAL_FILE', 'Artifact directory contains a non-regular file', { path: relative });
  }
  return out.sort();
}

/** Rehash every stored content-addressed artifact byte before promotion. */
export async function verifyContentAddressedArtifact(artifactDir, artifactRecord) {
  requireObject(artifactRecord, 'result.artifact');
  assertSha256(artifactRecord.bundle_sha256, 'result.artifact.bundle_sha256');
  requireObject(artifactRecord.files, 'result.artifact.files');
  const expectedFiles = Object.keys(artifactRecord.files).sort();
  for (const name of expectedFiles) {
    if (path.posix.normalize(name) !== name || name.startsWith('../') || path.isAbsolute(name)) {
      fail('ARTIFACT_PATH_INVALID', 'Artifact file path is unsafe', { path: name });
    }
    assertSha256(artifactRecord.files[name], `result.artifact.files.${name}`);
  }
  const actualFiles = (await listFilesRecursive(artifactDir)).filter((name) => name !== 'CHECKSUMS.json');
  if (canonicalJson(actualFiles) !== canonicalJson(expectedFiles)) {
    fail('ARTIFACT_FILE_SET_MISMATCH', 'Content-addressed artifact file set differs from its record', {
      expected: expectedFiles,
      observed: actualFiles,
    });
  }
  const observed = {};
  for (const name of expectedFiles) {
    const digest = await sha256File(path.join(artifactDir, name));
    if (digest !== artifactRecord.files[name]) {
      fail('ARTIFACT_FILE_HASH_MISMATCH', 'Content-addressed artifact bytes differ from their record', {
        path: name,
        expected: artifactRecord.files[name],
        observed: digest,
      });
    }
    observed[name] = digest;
  }
  const checksums = JSON.parse(await fsp.readFile(path.join(artifactDir, 'CHECKSUMS.json'), 'utf8'));
  if (canonicalJson(checksums) !== canonicalJson(artifactRecord.files)) {
    fail('ARTIFACT_CHECKSUM_INDEX_MISMATCH', 'CHECKSUMS.json differs from the execution result');
  }
  const bundle = sha256Bytes(canonicalJson(observed));
  if (bundle !== artifactRecord.bundle_sha256) {
    fail('ARTIFACT_BUNDLE_HASH_MISMATCH', 'Content-addressed artifact bundle digest differs', {
      expected: artifactRecord.bundle_sha256,
      observed: bundle,
    });
  }
  return { result: 'PASS', bundle_sha256: bundle, files: observed };
}

export function assertPromotionEvidenceBindings({
  manifest,
  result,
  verification,
  patchSha256,
  runtimeEvidence,
  artifactVerification,
}) {
  requireObject(manifest, 'manifest');
  requireObject(result, 'result');
  requireObject(verification, 'verification');
  if (manifest.task_id !== result.task_id || verification.task_id !== result.task_id) {
    fail('PROMOTION_EVIDENCE_MISMATCH', 'Task IDs differ across manifest, result, and verification');
  }
  if (verification.run_id !== result.run_id) {
    fail('PROMOTION_EVIDENCE_MISMATCH', 'Run IDs differ across result and verification');
  }
  if (manifestDigest(manifest) !== result.manifest_sha256) {
    fail('PROMOTION_EVIDENCE_MISMATCH', 'Manifest digest differs from execution result');
  }
  assertSha1(result.base_commit, 'result.base_commit');
  assertSha256(result.manifest_sha256, 'result.manifest_sha256');
  assertSha256(result.artifact?.bundle_sha256, 'result.artifact.bundle_sha256');
  assertSha256(patchSha256, 'patchSha256');
  if (verification.patch_sha256 !== patchSha256) {
    fail('PROMOTION_EVIDENCE_MISMATCH', 'Verification patch digest differs from frozen patch');
  }
  if (verification.governance_state !== 'VERIFIED_PASS' || verification.read_only_invariants !== 'PASS') {
    fail('PROMOTION_VERIFICATION_INVALID', 'Promotion requires VERIFIED_PASS and read_only_invariants=PASS');
  }
  assertUniqueStrings(result.changed_paths, 'result.changed_paths');
  assertFileHashMap(result.changed_file_sha256, result.changed_paths, 'result.changed_file_sha256');
  if (artifactVerification.bundle_sha256 !== result.artifact.bundle_sha256) {
    fail('PROMOTION_EVIDENCE_MISMATCH', 'Rehashed artifact bundle differs from result');
  }
  if (runtimeEvidence.execution_started.payload?.run_id !== result.run_id) {
    fail('PROMOTION_EVIDENCE_MISMATCH', 'Runtime evidence differs from result');
  }
  return { result: 'PASS' };
}

function offsetIso(base, milliseconds) {
  return new Date(Date.parse(base) + milliseconds).toISOString();
}

export function canonicalLifecycleEventId(type, taskId, runId, payload) {
  const digest = sha256Bytes(canonicalJson({
    profile: NATIVE_ACCEPTED_LIFECYCLE_PROFILE,
    type,
    task_id: taskId,
    run_id: runId,
    payload,
  }));
  return `native-v1-${type.toLowerCase().replaceAll('_', '-')}-${digest.slice(0, 24)}`;
}

function canonicalEvent(type, taskId, runId, observedAt, sequence, payload) {
  const fullPayload = {
    lifecycle_profile: NATIVE_ACCEPTED_LIFECYCLE_PROFILE,
    lifecycle_sequence: sequence,
    lifecycle_event_count: NATIVE_ACCEPTED_LIFECYCLE_ORDER.length,
    run_id: runId,
    ...payload,
  };
  return {
    schema_version: 1,
    event_id: canonicalLifecycleEventId(type, taskId, runId, fullPayload),
    observed_at: observedAt,
    type,
    task_id: taskId,
    payload: fullPayload,
  };
}

export function buildAcceptedLifecycle({
  result,
  verification,
  runtimeEvidence,
  principal,
  branch,
  acceptedAt,
  patchSha256,
  resultSha256,
  verificationSha256,
  artifactVerification,
}) {
  const taskId = assertSafeId(result.task_id, 'result.task_id');
  const runId = assertSafeId(result.run_id, 'result.run_id');
  assertSafeId(runtimeEvidence.execution_started.event_id, 'runtime execution event_id');
  assertNonEmptyString(principal, 'principal');
  assertNonEmptyString(branch, 'branch');
  assertIso(acceptedAt, 'acceptedAt');
  assertSha256(patchSha256, 'patchSha256');
  assertSha256(resultSha256, 'resultSha256');
  assertSha256(verificationSha256, 'verificationSha256');
  const artifactSha256 = assertSha256(result.artifact?.bundle_sha256, 'artifactSha256');

  const events = [
    canonicalEvent('EXECUTION_STARTED', taskId, runId, offsetIso(acceptedAt, 0), 1, {
      source_runtime_event_id: runtimeEvidence.execution_started.event_id,
      source_runtime_observed_at: runtimeEvidence.execution_started.observed_at,
      idempotency_key: result.idempotency_key,
      manifest_sha256: result.manifest_sha256,
      base_commit: result.base_commit,
      runtime_fingerprint_sha256: result.runtime_fingerprint?.sha256,
    }),
    canonicalEvent('EXECUTION_SUCCEEDED', taskId, runId, offsetIso(acceptedAt, 1), 2, {
      source_runtime_event_id: runtimeEvidence.execution_succeeded.event_id,
      source_runtime_observed_at: runtimeEvidence.execution_succeeded.observed_at,
      idempotency_key: result.idempotency_key,
      artifact_sha256: artifactSha256,
      patch_sha256: patchSha256,
      changed_paths: [...result.changed_paths],
      changed_file_sha256: { ...result.changed_file_sha256 },
    }),
    canonicalEvent('TRANSPORT_PRESENT', taskId, runId, offsetIso(acceptedAt, 2), 3, {
      source_runtime_event_id: runtimeEvidence.transport_present.event_id,
      source_runtime_observed_at: runtimeEvidence.transport_present.observed_at,
      artifact_sha256: artifactSha256,
    }),
    canonicalEvent('VERIFICATION_SUCCEEDED', taskId, runId, offsetIso(acceptedAt, 3), 4, {
      source_runtime_event_id: runtimeEvidence.verification_succeeded.event_id,
      source_runtime_observed_at: runtimeEvidence.verification_succeeded.observed_at,
      verification_id: verification.verification_id,
      patch_sha256: patchSha256,
      read_only_invariants: verification.read_only_invariants,
    }),
    canonicalEvent('TRANSPORT_HASH_VERIFIED', taskId, runId, offsetIso(acceptedAt, 4), 5, {
      artifact_sha256: artifactSha256,
      artifact_file_sha256: { ...artifactVerification.files },
      patch_sha256: patchSha256,
      result_sha256: resultSha256,
      verification_sha256: verificationSha256,
    }),
    canonicalEvent('TRANSPORT_CONSUMED', taskId, runId, offsetIso(acceptedAt, 5), 6, {
      artifact_sha256: artifactSha256,
      branch,
      consumed_into: 'PROMOTION_COMMIT_CANDIDATE',
    }),
    canonicalEvent('PRINCIPAL_ACCEPTED', taskId, runId, offsetIso(acceptedAt, 6), 7, {
      principal,
      branch,
      accepted_patch_sha256: patchSha256,
      manifest_sha256: result.manifest_sha256,
      verification_id: verification.verification_id,
    }),
  ];
  validateLedgerEvents(events, { requireCompleteNative: true });
  return events;
}

export async function appendAcceptedLifecycleAtomic(ledgerPath, lifecycleEvents) {
  const existingText = await fsp.readFile(ledgerPath, 'utf8').catch((error) => {
    if (error.code === 'ENOENT') return '';
    throw error;
  });
  if (existingText && !existingText.endsWith('\n')) {
    fail('EVENT_LEDGER_INVALID', 'Canonical event ledger must end with a newline before append');
  }
  const existing = existingText
    .split('\n')
    .filter((line) => line.trim())
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        fail('EVENT_LEDGER_INVALID', `Malformed canonical JSONL at line ${index + 1}`, {
          cause: error.message,
        });
      }
    });
  const combined = [...existing, ...lifecycleEvents];
  validateLedgerEvents(combined);
  const appendedText = lifecycleEvents
    .map((event) => JSON.stringify(canonicalize(event)))
    .join('\n') + '\n';
  await writeTextAtomic(ledgerPath, `${existingText}${appendedText}`, { mode: 0o600 });
  const after = await fsp.readFile(ledgerPath, 'utf8');
  if (!after.startsWith(existingText)) {
    fail('EVENT_LEDGER_NOT_APPEND_ONLY', 'Canonical ledger prefix changed during lifecycle append');
  }
  return { existing_event_count: existing.length, appended_event_count: lifecycleEvents.length };
}

export function assertAcceptedTaskState(state, taskId, runId) {
  const task = state.tasks?.[taskId];
  if (
    !task ||
    task.execution_state !== 'SUCCEEDED' ||
    task.governance_state !== 'PRINCIPAL_ACCEPTED' ||
    task.transport_state !== 'CONSUMED' ||
    task.latest_run_id !== runId
  ) {
    fail('CANONICAL_TASK_STATE_INCOMPLETE', 'Promoted task did not reduce to a complete accepted state', {
      task_id: taskId,
      run_id: runId,
      observed: task ?? null,
    });
  }
  return task;
}

function syntheticEvent(type, sequence, { taskId = 'MODEL-TASK-1', runId = 'run-1' } = {}) {
  const payload = {
    lifecycle_profile: NATIVE_ACCEPTED_LIFECYCLE_PROFILE,
    lifecycle_sequence: sequence,
    lifecycle_event_count: NATIVE_ACCEPTED_LIFECYCLE_ORDER.length,
    run_id: runId,
  };
  return {
    schema_version: 1,
    event_id: `model-${sequence}-${type}`,
    observed_at: new Date(Date.parse('2026-09-04T00:00:00.000Z') + sequence).toISOString(),
    type,
    task_id: taskId,
    payload,
  };
}

function permutations(values) {
  if (values.length <= 1) return [values];
  const out = [];
  for (let index = 0; index < values.length; index += 1) {
    const head = values[index];
    const tail = [...values.slice(0, index), ...values.slice(index + 1)];
    for (const rest of permutations(tail)) out.push([head, ...rest]);
  }
  return out;
}

/** Bounded exhaustive model check used as a deterministic gate. */
export function runBoundedLifecycleModelCheck() {
  let accepted = 0;
  let rejected = 0;
  for (const ordering of permutations([...NATIVE_ACCEPTED_LIFECYCLE_ORDER])) {
    const events = ordering.map((type, index) => syntheticEvent(type, index + 1));
    try {
      validateLedgerEvents(events, { requireCompleteNative: true });
      accepted += 1;
    } catch (error) {
      if (!(error instanceof ControlPlaneError)) throw error;
      rejected += 1;
    }
  }
  if (accepted !== 1 || rejected !== 5039) {
    fail('LIFECYCLE_MODEL_CHECK_FAILED', 'Bounded state-space exploration found an unexpected legal ordering', {
      accepted,
      rejected,
    });
  }
  const duplicate = NATIVE_ACCEPTED_LIFECYCLE_ORDER.map((type, index) => syntheticEvent(type, index + 1));
  duplicate[6].event_id = duplicate[0].event_id;
  let duplicateRejected = false;
  try {
    validateLedgerEvents(duplicate, { requireCompleteNative: true });
  } catch (error) {
    duplicateRejected = error instanceof ControlPlaneError && error.code === 'EVENT_ID_DUPLICATE';
  }
  if (!duplicateRejected) {
    fail('LIFECYCLE_MODEL_CHECK_FAILED', 'Duplicate event ID was not rejected');
  }
  return {
    result: 'PASS',
    permutations_checked: accepted + rejected,
    accepted_orderings: accepted,
    rejected_orderings: rejected,
    duplicate_event_test: 'PASS',
  };
}
