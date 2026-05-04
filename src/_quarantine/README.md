# Quarantined POC code (D3 stabilization)

Files in this directory are **not part of the production TypeScript graph**. They are excluded via `tsconfig.json` (`"exclude": ["src/_quarantine"]`) so `tsc` does not typecheck them during the stabilization sprint.

## Why they live here

- **`POCTab.tsx`** and **`GraphDatabasePOC.tsx`** depended on **`@kuzu/kuzu-wasm`** and related browser APIs (e.g. `performance.memory`) without bundled types or a finalized graph-database product decision.
- They were **not imported** by production routes at quarantine time; the in-app **POC** tab showed a placeholder message instead of loading these components.

## Policy

- **Not deleted** — kept for a future graph-DB / wasm experiment when dependencies and scope are decided.
- **Do not import from `src/`** production code into this folder; treat it as an archive until re-promoted or removed intentionally.

## Related

- Stabilization branch: `stabilization/2026-05`
- Tranche: **T4 — POC quarantine**
