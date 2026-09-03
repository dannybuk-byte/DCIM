# DCIM Build Control System

`tools/dcim-control` replaces task-specific mega-carriers with one tested executor and small, versioned manifests.

## Enforced guarantees in v0.1.1

- strict manifest validation, including unknown nested properties;
- command arguments are arrays and are never executed through a shell;
- `/tmp` and `/private/tmp` task dependencies are rejected;
- exact base-commit and input-hash binding inside the writer's detached base worktree;
- executor/runtime fingerprinting is part of each idempotency key;
- durable repository-local runtime storage under `.dcim/runtime/`;
- disposable detached Git worktrees for writer and verifier activity;
- exact write allowlists and protected-path enforcement;
- writer/verifier HEAD and shared-ref mutation detection;
- canonical repository status, diff, untracked-file, protected-file, and ref invariants checked before and after execution;
- maximum two same-scope correction turns;
- deterministic gates with captured argv, exit code, timeout, stdout, and stderr;
- content-addressed run artifacts;
- idempotent reuse of successful executions rather than `RESUME-*` proliferation;
- separate execution, governance, and transport state machines;
- a read-only verifier that rebinds the frozen patch and proves its gates did not mutate it;
- exact principal acceptance token before atomic promotion to a new branch;
- cleanup of failed promotion branches;
- a drift circuit breaker for artifact spirals, approval fatigue, nested repairs, and duplicate-digest transfer requests.

## Commands

```bash
npm run dcim:control -- validate .dcim/tasks/TASK.json
npm run dcim:control -- doctor .dcim/tasks/TASK.json
npm run dcim:control -- run .dcim/tasks/TASK.json
npm run dcim:control -- verify <run_id>
npm run dcim:control -- promote <run_id> \
  --principal "Daniel Buk" \
  --accept "<task_id>:<run_id>"
npm run dcim:control -- status
npm run dcim:control -- drift-check <task_id>
npm run dcim:control -- transport <task_id> requested <sha256>
```

The CLI emits JSON only. Decorative Terminal prose is not an acceptance interface.

## State boundaries

Runtime attempts are written to `.dcim/runtime/`, which is gitignored. Canonical project state is generated from `.dcim/state/events.jsonl`. A writer cannot promote itself. A verifier cannot repair. Promotion requires a verifier PASS plus an exact principal acceptance token.

## Qualification

```bash
node --test tools/dcim-control/test/control-plane.test.mjs tools/dcim-control/test/control-plane-hardening.test.mjs
node tools/dcim-control/cli.mjs validate .dcim/tasks/HARNESS-QUALIFICATION.example.json
node tools/dcim-control/cli.mjs doctor .dcim/tasks/HARNESS-QUALIFICATION.example.json
```

The tests exercise historical failure classes that caused T06 drift: transient-path assumptions, shell/argv ambiguity, stage-label comparison, stale or dirty input binding, write-boundary violations, protected-path mutation, writer Git mutation, canonical-repository mutation, repeated execution, duplicate transfers, bounded correction exhaustion, state-machine conflation, and failed-promotion cleanup.

## Fail-closed capability posture

Manifests declare `network`, `sockets`, `dependency_install`, `publication`, and `git_mutation`. In v0.1.1, execution fails closed when any of the first four are `true`; those capabilities cannot be enabled until host-level containment is implemented and qualified. `git_mutation=true` authorizes only the control plane's final isolated promotion step after verification and exact principal acceptance. It does not authorize the writer to mutate Git.

## Deliberate limitations

v0.1.1 does not call a hosted model directly, push branches, deploy, publish, or provide an operating-system sandbox around an arbitrary child process. It detects end-state canonical-repository and Git mutations, but detection is not equivalent to kernel-level prevention. Until a macOS/Linux containment layer is qualified, manifests should invoke only deterministic local commands or a separately contained writer. Network publication remains a separate, explicit act.
