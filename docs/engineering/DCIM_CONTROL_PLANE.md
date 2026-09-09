# DCIM control plane and anti-drift architecture

## Decision

The conversation is not the project database. Handoffs explain history; they do not determine current state. Task execution is governed by a versioned manifest, an append-only event ledger, generated state, deterministic gates, and content-addressed artifacts.

## Directed responsibility graph

```text
PRINCIPAL
   ↓ commissions one bounded task
CONTROL PLANE
   ↓ binds state, capabilities, budget, and paths
ONE WRITER in a disposable worktree
   ↓ frozen patch
DETERMINISTIC GATES
   ↓
ONE READ-ONLY VERIFIER in a fresh worktree
   ↓ PASS or FAIL only
PRINCIPAL
   ↓ exact acceptance token
ATOMIC PROMOTION BRANCH
```

No peer voting, no verifier repair, no coordinator self-verification, and no automatic publication.

## Three orthogonal state machines

```text
EXECUTION
  CREATED → RUNNING → SUCCEEDED | FAILED | INTERRUPTED | REUSED

GOVERNANCE
  DRAFT → AUTHORIZED → IMPLEMENTED_UNVERIFIED
        → VERIFIED_PASS | VERIFIED_FAIL
        → PRINCIPAL_ACCEPTED | PRINCIPAL_REJECTED | SUPERSEDED

TRANSPORT
  NOT_MATERIALIZED → PRESENT → HASH_VERIFIED → CONSUMED
```

A successful process exit is not a verification result. A verification PASS is not principal acceptance. A rendered download link is not a persisted artifact.

## Drift circuit breaker

Execution is blocked when any configured threshold is exceeded:

- more than two control artifacts without a product delta;
- more than two approval requests for one substantive task;
- more than one request for the same SHA-256 artifact;
- task identifiers nested beyond two `REPAIR`, `RESUME`, or `CORRECTION` segments;
- more than two same-scope correction turns;
- a successful idempotency key is executed again instead of reused.

Every user action must create a product delta, a deterministic test/evidence result, an external evidence item, or a principal decision. Otherwise the system must not ask the user to act.

## Durable storage

```text
.dcim/
  schemas/                  versioned contracts
  policy/                   drift and capability policy
  state/events.jsonl        canonical, append-only accepted events
  state/current.generated.json
  tasks/                    small manifests
  runtime/                  gitignored attempts, worktrees, logs, artifacts
```

Runtime worktrees and artifacts are inside the repository's durable directory rather than `/tmp`. Artifacts are indexed by SHA-256. Duplicate materialization returns the existing object.

## Capability boundary

Every task explicitly declares five booleans:

```text
network
git_mutation
sockets
dependency_install
publication
```

The control plane fails closed if a manifest enables `network`, `sockets`, `dependency_install`, or `publication`. It also enforces no shell execution, no transient dependency, no out-of-allowlist write, no protected-path write, no writer/verifier Git mutation, canonical-repository end-state invariants, and no promotion unless Git mutation was authorized. Host-level process containment is still required before an arbitrary or agentic writer can be treated as unable—not merely forbidden and checked afterward—to reach the network, sockets, ignored files, or paths outside its worktree.

## Correction policy

One substantive authorization includes at most two same-scope correction turns. A correction is permitted only while task objective, write allowlist, protected paths, evidence law, and capability boundary remain unchanged. Any scope expansion is a new task.

## Verification policy

The verifier starts from the exact base commit, checks the frozen patch against the execution artifact record, applies it in a fresh worktree, requires the exact execution path set, runs its own gates, hashes the changed files before and after, and fails if its gates mutate product bytes or Git state. It cannot edit or issue a successor task.

## Promotion policy

Promotion requires:

1. execution `SUCCEEDED`;
2. governance `VERIFIED_PASS`;
3. manifest capability `git_mutation=true`;
4. exact token `<task_id>:<run_id>`;
5. named principal;
6. all promotion gates passing.

The control plane creates a new branch from the exact base commit, applies the frozen patch, reruns gates, and commits. It does not modify the current branch or push.

## Historical failure corpus now encoded as tests

- `/private/tmp` dependency rejection;
- argv arrays required; no zsh/bash wildcard ambiguity;
- stage labels excluded from substantive test-summary comparison;
- exact input hashes are checked in the detached base worktree rather than against a dirty host copy;
- unknown nested manifest fields fail;
- unsupported host capabilities fail closed;
- unauthorized and protected writes fail;
- writer Git mutation and canonical-repository mutation are detected;
- successful idempotency keys are reused;
- no more than two correction turns;
- duplicate SHA-256 transfer requests fail;
- execution/governance/transport remain separate;
- writer and verifier worktrees preserve canonical repository invariants;
- failed atomic promotion removes its temporary branch.

## Migration rule

No new bespoke mega-carrier should be introduced after this control plane is qualified. Existing historical carriers remain immutable evidence, not templates for future work.


## Containment limitation and next hardening boundary

The v0.1.1 executor uses disposable worktrees and verifies canonical repository and Git invariants. Those controls prevent ordinary drift from being accepted and expose many escape attempts, but they are postcondition controls. They do not constitute a kernel-enforced sandbox around an arbitrary executable. Before a hosted or locally network-capable coding agent is admitted, add and qualify a platform containment adapter that restricts filesystem roots, network namespaces or egress, sockets, subprocesses, credentials, and environment inheritance. Until then, all four external capabilities remain fail-closed.
## H1A canonical lifecycle boundary

H1A repairs one trust-boundary defect: the v0.1.1 promotion path records only `PRINCIPAL_ACCEPTED` in canonical state. Version 0.1.2 instead imports an evidence-bound native lifecycle from the accepted run and its independent verification.

### Native lifecycle profile

Native accepted events carry `payload.lifecycle_profile = DCIM_NATIVE_ACCEPTED_V1`, a one-based sequence number, a declared event count, and one stable run ID. The ledger rejects duplicate event IDs, mixed run IDs, and any native transition that is not the exact canonical prefix/order.

Historical imported events remain shape- and duplicate-validated but are not retroactively reclassified as native. This preserves the accepted T06 import while preventing new tasks from using the weaker historical shape.

### Evidence binding

Before branch creation, promotion verifies:

- the exact manifest digest, base commit, task ID, run ID, and idempotency key;
- exactly one runtime execution-start, execution-success, transport-present, and verification-success event;
- the frozen patch digest and verification record;
- every file and checksum in the content-addressed artifact directory;
- the exact product path and product-file hash set.

Promotion-generated `TRANSPORT_HASH_VERIFIED`, `TRANSPORT_CONSUMED`, and `PRINCIPAL_ACCEPTED` records are deterministic functions of the accepted evidence. Canonical event IDs are deterministic and collision checked.

### Exact promotion path

After the lifecycle is atomically appended in a disposable worktree, canonical state is regenerated and must report:

```text
execution_state   SUCCEEDED
governance_state  PRINCIPAL_ACCEPTED
transport_state   CONSUMED
```

The final path set must equal the writer-produced product paths plus the canonical ledger and generated state. Promotion gates may not alter any of those bytes. The implementation resets the index and stages only those named paths.

### Recovery and idempotency

A successful promotion writes a runtime-only `promotion.json` record binding the branch and commit. A repeated exact request reuses that commit only after checking its branch, parent, manifest, patch, verification, and final canonical task state. A mismatch fails closed. Failed attempts remove their temporary worktree and branch.

### Meanings H1A does not claim

A local promotion commit candidate is not a pushed branch, an open pull request, a passing trusted PR contract, or a merged canonical change. H1B will add accepted manifests, receipts, and base-trusted PR verification. H1C remains responsible for process isolation, credentials, locks, output/resource limits, and arbitrary agentic-writer safety.
