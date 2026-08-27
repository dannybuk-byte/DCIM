# DART v0.9 — Independent verification protocol

## Freeze boundary

The writer stops, records the exact HEAD/worktree status, freezes the diff and evidence packet, and does not repair anything before the independent report is complete.

## Verifier posture

- read-only;
- no network;
- no dependency installation;
- no edits;
- no commit/push/merge/deploy;
- use the same frozen spec and acceptance JSON;
- report criterion-by-criterion evidence, not a general impression.

## Blocking questions

1. Are raw bytes and physical row IDs preserved?
2. Is `application_id` prevented from becoming the row key?
3. Are row, application, DEC subject, facility subject, and origin distinct?
4. Do every same-lineage DART row and permit representation collapse to one counted origin?
5. Does the real gate—not a UI-only mock—derive one origin of two required?
6. Is score absent/null and corroborated false?
7. Does the API carry the same state the UI shows?
8. Are source-event and system-observation clocks separate?
9. Are conflicts, nulls, warrants, and unresolved identity visible?
10. Can any mock or fallback silently appear real?
11. Do test failures produce a failing process exit code?
12. Did any action exceed the authorization scope?

## Report states

- `PASS`
- `BLOCKING_FINDING`
- `MATERIAL_NONBLOCKING`
- `INDETERMINATE`
- `NOT_TESTED`

A verifier does not declare v0.9 complete; the final evidence checklist and principal disposition remain separate.
