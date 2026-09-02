# DCIM Build Control System

`tools/dcim-control` replaces task-specific mega-carriers with one tested executor and small, versioned manifests.

## Guarantees in v0.1

- one manifest schema with unknown top-level properties rejected;
- command arguments are arrays and never executed through a shell;
- `/tmp` and `/private/tmp` dependencies are rejected;
- exact base-commit and input-hash binding;
- durable repository-local runtime storage under `.dcim/runtime/`;
- disposable detached Git worktrees for writer and verifier activity;
- exact write allowlists and protected-path enforcement;
- maximum two same-scope correction turns;
- deterministic gates with captured argv, exit code, timeout, stdout, and stderr;
- content-addressed run artifacts;
- idempotent reuse of successful executions rather than `RESUME-*` proliferation;
- separate execution, governance, and transport state machines;
- a read-only verifier that proves its gates did not mutate the frozen patch;
- exact principal acceptance token before atomic promotion to a new branch;
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
node --test tools/dcim-control/test/control-plane.test.mjs
node tools/dcim-control/cli.mjs validate .dcim/tasks/HARNESS-QUALIFICATION.example.json
```

The tests exercise the historical failure classes that caused T06 drift: transient-path assumptions, shell/argv ambiguity, stage-label comparison, write-boundary violations, protected-path mutation, repeated execution, duplicate transfers, bounded correction exhaustion, and malformed state.

## Deliberate limitations

v0.1 does not call a hosted model directly and does not push branches. A task manifest may invoke a locally installed writer through an argv array. Promotion creates a local branch and commit only when `capabilities.git_mutation` is true and the principal supplies the exact acceptance token. Network publication remains a separate, explicit act.
