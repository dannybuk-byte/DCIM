> **If this tab is blank:** you are probably in **Markdown Preview**. Click **Open Source** in the Markdown toolbar, or Command Palette → `Markdown: Open Source`. Or open the plain-text copy: **`HANDOFF-D3.txt`** in the **repo root** (same folder as `package.json`).

# DCIM TypeScript stabilization — handoff (copy this whole file)

**Same full text as `D3-handoff-for-claude.md`. Plain-text mirror: `HANDOFF-D3.txt` at repo root.**

**Purpose:** Resume Day 3 (`stabilization/2026-05`) without re-deriving context.  
**Audience:** Next coding agent (Claude or other).  
**Human gate:** Daniel reviews and commits; agents propose diffs only unless told otherwise.

Re-verify on pickup: `npx tsc --noEmit` (error count) and `npx vitest run` — numbers below were from 2026-05-04.

---

## Mission (unchanged)

- Drive `npx tsc --noEmit` error count down by **≥60%** from the Day 3 start baseline (~125) toward **≤40**, with remaining errors listed in `docs/dev/TS-ALLOWLIST.md` (T5 — file may not exist yet).
- **No new features.** Type fixes and minimal supporting type-shape changes only.
- **No `any`**, **`@ts-ignore`**, or blanket `String(x)` / `Number(x)` coercion to silence errors (see prior D3 brief for nuance: numeric `Facility.id` alignment is not “coercion”; it is correcting the model).

---

## Terminology (binding)

Use everywhere: code, comments, JSDoc, commits, allowlist, chat.

| Use | Never |
|-----|--------|
| non-compliance / under-compliance / subsidy gap | fraud |
| rightsholders | stakeholders |
| **11,992 facilities across 118 providers, edge-inclusive** | shortened or rounded variants |

If you find violations in existing code, **do not bundle fixes with type work** — flag as a **separate commit** for Daniel.

---

## Verified snapshot (2026-05-04, this workspace)

| Item | Value |
|------|--------|
| Branch | `stabilization/2026-05` (tracking `origin/stabilization/2026-05`, **ahead 1** commit locally) |
| `npx tsc --noEmit` | **81** errors |
| `npx vitest run` | **54** tests passed |
| Reference tag (from Daniel’s brief) | `stabilization-d2-tests-green` |

### Working tree note for Daniel

Uncommitted / dirty paths observed at handoff time (may include non-D3 edits):

- **T2 stabilization (intent of last Cursor session):**  
  `src/analyzers/assurance/complianceAssuranceEngine.ts`  
  `src/hooks/useComplianceAssurance.ts`  
  `src/analyzers/unified/intelligenceEngine.ts`
- **Also modified:** `.gitignore`, `public/commit-hash.txt`
- **Untracked:** `docs/DCIM_Execution_Checklist.md`, `docs/handoffs/`

**Action:** Decide whether T2 is one commit (or split: engine+hook vs `intelligenceEngine` only). Revert unrelated files if accidental.

---

## Tranche plan (sequential)

| Tranche | Cluster | Status |
|---------|---------|--------|
| **T1** | Facility type completion (TS2339 wave) | **Partial** — large reduction already |
| **T2** | `complianceAssuranceEngine.ts` string/number/undefined + optional `jobsCreated` | **Implemented in working tree** — align `facilityId` with `Facility.id: number`, `Map<number,…>`, explicit missing-jobs handling; hook + `IntelligenceFinding.affectedFacilities` widened for numeric ids |
| **T3** | Cross-analyzer / shared type mismatches | **Next** |
| **T4** | POC quarantine (`POCTab.tsx`, `GraphDatabasePOC.tsx`, missing wasm types) | Pending |
| **T5** | `docs/dev/TS-ALLOWLIST.md` for remainder | Pending |

After each tranche: `tsc` + `vitest run`, propose commit message, **wait for Daniel’s commit**, optional tag per internal process.

---

## T2 summary (what the next agent should know)

1. **`Facility.id` is `number`.** Assurance types and internal maps use **number** keys, not string.
2. **`jobsCreated` is optional.** Query filters use explicit `!== undefined` (behavior matches old `undefined < n` falsy cases). Job check uses **`NaN` deviation** and **`passed: false`** when missing; **`actual`** uses **`'Not reported'`** when missing so consumers do not treat missing as numeric zero.
3. **`useComplianceAssurance`:** `Map<number, AssuranceResult>`, `getResult(facilityId: number)`.
4. **`intelligenceEngine.ts`:** `IntelligenceFinding.affectedFacilities` is `Array<string | number>`; correlation map keys `string | number`. Removes a `number[]` → `string[]` mismatch. **Remaining errors in this file (3):** `DCIMAnalyzer` missing `isolationForest` / `arima`, implicit `any` on outlier — likely T3.

---

## Error heat map (top buckets, 81 total)

High counts first:

- `src/components/shared/DeckGLOverlay.tsx` (14) — lat/lon possibly undefined vs `Position`
- `src/components/GranularDrilldown.tsx` (7)
- `src/components/DCIMCommandCenter.tsx` (5) — includes tab type, `ComplianceStats`, `loadData`, `HelpCircle`, handler types
- `src/utils/securityPosture.ts` (4)
- `src/components/GlobeView.tsx` (4)
- `src/components/shared/PhotorealisticGisView.tsx` (3)
- `src/components/shared/NavigationSidebar.tsx` (3)
- `src/components/POCTab.tsx` (3) — wasm / `performance.memory`
- `src/analyzers/unified/intelligenceEngine.ts` (3)
- Plus scattered 1–2 error files: `App.tsx`, `EvidencePanel.tsx`, `predictive/engine.ts`, hooks, utils, tests, etc.

Run `npx tsc --noEmit 2>&1 | tee /tmp/tsc.txt` and slice as needed.

---

## Project rules (do not fight them)

- **IndexedDB via Dexie** — no `localStorage` / `sessionStorage` for app state.
- **Tailwind:** static classes only (no dynamic class strings).
- **React:** project convention prefers **no HTML `<form>`** — use click handlers where that rule applies.
- **`useEffect`:** include cleanup where applicable.
- Read **`AGENTS.md`** and **`.cursor/rules/`** if behavior conflicts.

---

## Suggested next steps for Claude

1. Confirm Daniel committed (or stash) **only** the T2-related files; clean stray edits to `.gitignore` / `public/commit-hash.txt` if unintended.
2. **T3:** Pick one cluster — e.g. `DCIMAnalyzer` surface in `intelligenceEngine.ts` + `predictive/engine.ts`, or `DCIMCommandCenter.tsx` UI/stat types — fix types only, one PR-sized cluster.
3. Re-run **`npx tsc --noEmit`** and **`npx vitest run`**; report new error **count** and delta.
4. When near ≤40 errors, **T5** allowlist document.
