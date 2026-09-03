# HARNESS-1 implementation status

**Version:** 0.1.1  
**Branch:** `feat/dcim-control-plane-v1`  
**Base:** canonical T06 commit `a2082dba90be990818c293a42a425f9bbd86707a` on `agent/dart-v0.9`  
**Reconciliation merge:** `3bc390a60c41f835678130cd0956cc12978462ef`  
**Status:** reconciled onto canonical T06; renewed qualification pending; not yet merged or admitted as the canonical executor

## Canonical predecessor

T06 is closed and canonical at `a2082dba90be990818c293a42a425f9bbd86707a`.

The exact protected product identities carried into this branch are:

- `server/dart/candidatePacket.js` — SHA-256 `8da30ce8a2d748db655af40f83ddb1560fc5ca787b54ac1c9a1b6a71fe5bbce7`;
- `server/dart/candidatePacket.test.js` — SHA-256 `68adad38f5be74f20e7aea54413b1e487eaa6cacc75348ead19e5065935f6e72`;
- `server/dart/index.js` — SHA-256 `1bfb1ac09a317bc0e718ed5abf760b33e161ffb50f8b722a294619511f8675e4`.

The accepted host evidence remains CandidatePacket `63/63`, governed DART `161/161`, and full host `362/362`. Corrected IV3 passed with zero findings and read-only invariants PASS. The private H8-R1 fixture-hydration gap remains open as a separate durability task and does not reopen T06.

## Implemented controls

- strict, versioned task-manifest, event, and result contracts;
- one stable JSON-only CLI instead of task-specific shell carriers;
- shell-free argv execution and transient-path rejection;
- exact base-commit and input-SHA-256 binding;
- runtime fingerprinting and idempotent successful-run reuse;
- durable repository-local runtime storage and content-addressed artifacts;
- disposable writer and verifier worktrees;
- write allowlists, protected paths, Git-state checks, and canonical-repository postconditions;
- bounded same-scope correction turns;
- separate execution, governance, and transport state machines;
- read-only patch verification before principal-gated promotion;
- drift circuit breakers for duplicate transfers, approval fatigue, control-artifact spirals, and nested repairs;
- append-only accepted-event state with reproducible generated state;
- Linux and macOS CI qualification;
- CODEOWNERS and a bounded-change PR checklist for human review.

## Qualification contract

The branch must now requalify on both Ubuntu and macOS after T06 reconciliation. Qualification requires:

1. exact verification of the three accepted T06 postimages;
2. validation of the governed 25-criteria/10-task specification bundle;
3. all control-plane unit and adversarial tests passing;
4. the qualification manifest validating and passing `doctor`;
5. canonical state rebuilding byte-for-byte from `.dcim/state/events.jsonl`;
6. the T06 task reducing to `SUCCEEDED / PRINCIPAL_ACCEPTED / CONSUMED`;
7. no product-source mutation by HARNESS-1.

The tests cover the T06 failure corpus at the control boundary: `/tmp` dependencies, shell/argv ambiguity, stage-label comparison, dirty-host input binding, unauthorized writes, protected-path mutation, writer Git mutation, canonical-repository mutation, repeated execution, duplicate artifact requests, bounded correction exhaustion, state-machine conflation, read-only verification, and failed-promotion cleanup.

## Deliberate fail-closed limits

Version 0.1.1 rejects manifests that request network access, sockets, dependency installation, or publication. It does not yet provide a kernel-enforced sandbox around arbitrary child processes. End-state mutation detection is not equivalent to preventing a malicious or compromised executable from reaching outside its worktree.

No hosted model integration, push, deployment, live-source admission, or automatic merge is included.

## Merge acceptance

HARNESS-1 may become canonical only after:

1. renewed CI succeeds on Linux and macOS at the reconciled branch head;
2. exact T06 postimage checks pass;
3. generated state is reproducible and records T06 as principal-accepted;
4. the PR diff receives principal review;
5. no new bespoke mega-carrier is introduced during migration;
6. the fixture-hydration and host-containment limitations remain explicit.

After canonical merge, M1/M2 will be the first real task commissioned through HARNESS-1. T07, provider-gateway work, live-source admission, deployment, and publication remain separate tasks.
