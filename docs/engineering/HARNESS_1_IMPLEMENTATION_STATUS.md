# HARNESS-1 implementation status

**Version:** 0.1.1  
**Branch:** `feat/dcim-control-plane-v1`  
**Base:** `agent/dart-v0.9`  
**Status:** implemented in an isolated review branch; not yet merged or admitted as the canonical executor

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

The checked-in qualification runs the base and hardening suites, validates the example manifest, and proves that the committed generated state can be rebuilt byte-for-byte from the accepted event ledger.

The tests cover the T06 failure corpus at the control boundary: `/tmp` dependencies, shell/argv ambiguity, stage-label comparison, dirty-host input binding, unauthorized writes, protected-path mutation, writer Git mutation, canonical-repository mutation, repeated execution, duplicate artifact requests, bounded correction exhaustion, state-machine conflation, read-only verification, and failed-promotion cleanup.

## Deliberate fail-closed limits

Version 0.1.1 rejects manifests that request network access, sockets, dependency installation, or publication. It does not yet provide a kernel-enforced sandbox around arbitrary child processes. End-state mutation detection is not equivalent to preventing a malicious or compromised executable from reaching outside its worktree.

No hosted model integration, push, deployment, live-source admission, or automatic merge is included.

## Integration boundary

The current corrected T06 CandidatePacket result exists in Daniel Buk's separate Mac worktree and evidence packages. This branch was intentionally based on the last available GitHub `agent/dart-v0.9` commit and does not claim to contain or close that later local T06 state. Merge planning must first reconcile the exact Mac postimage with the GitHub branch without rewriting either evidence history.

## Merge acceptance

HARNESS-1 should become canonical only after:

1. CI succeeds on Linux and macOS;
2. the PR diff receives principal review;
3. the exact T06 postimage is reconciled into Git history through a separate bounded task;
4. the first real task manifest is prepared for M1/M2;
5. no new bespoke mega-carrier is introduced during that migration.
