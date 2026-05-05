# D3 — Claude handoff (DCIM stabilization)

**One-file handoff** for the next agent session. Update the **“Current state”** section after every pull, commit, or tranche.

---

## 1. Project (30 seconds)

- **Stack:** React 18 + TypeScript + Vite + Tailwind (static classes) + Dexie/IndexedDB. **No** `localStorage` / `sessionStorage` for app state.
- **Mission:** Labor-organizing / accountability tool — not corporate DCIM. See repo root `AGENTS.md`.
- **Branch:** `stabilization/2026-05` — keep aligned with `origin/stabilization/2026-05` unless told otherwise.
- **Conventions:** Named exports, Jotai for global atoms where used, `useEffect` with cleanup, no dynamic Tailwind class strings (see `.cursor/rules`).

**Binding language**

- **Non-compliance / under-compliance / subsidy gap** — not “fraud”.
- **Rightsholders** — not “stakeholders”.
- **11,992 facilities across 118 providers, edge-inclusive** — do not round the counts in copy.

**Methodology (numeric + coordinates)**

- Missing data is **undefined/NaN** or explicit UI copy — **not** silent `0` or `(0,0)` for “unknown” geocoding.
- **Forbidden on coords/metrics:** `?? 0`, `?? '0'`, `as number`, `!`, `@ts-ignore`, `Number.isFinite(x) ? x : 0` *then arithmetic* without a prior filter.
- **Allowed:** `undefined` check + `Number.isFinite` for each coordinate; **filter-then-map**; UI like **Location unknown**; narrow types *after* guards (e.g. T3-B `c7ec6e3b`).

---

## 2. Current state (update this block every session)

*Captured from repo workspace; re-verify before acting.*

| Item | Value |
|------|--------|
| **HEAD** | `9a2452a8` — `docs(readme): note geocoding completeness behavior in map layers` |
| **Working tree** | `src/components/GranularDrilldown.tsx` **modified** (T3-E implementation); `docs/handoffs/D3-T3E-Claude-handoff.md` and `D3-T3E-granular.patch` **untracked** unless you committed them |
| **`npx tsc --noEmit` error count** | **50** (with current `GranularDrilldown` edits applied locally) |
| **`GranularDrilldown` errors** | **0** |
| **`npm run test:run`** | **54 / 54** |

**If your numbers differ:** Re-run `git pull`, then `npx tsc --noEmit 2>&1 \| grep -c "error TS"` and fix drift before assuming this handoff is current.

---

## 3. T3-E status — `GranularDrilldown.tsx` (coord-as-missing-data)

### Done in working tree (not necessarily on `HEAD`)

1. After `useState` for `expanded`, derive **`geoCoords`**: both `latitude` and `longitude` must be defined and `Number.isFinite`, else **`null`** (comment: coord-as-missing-data, never zero-filled).
2. **`facility.provider ?? 'Unknown'`** for `DetailRow` (optional `provider` vs `value: string \| number`).
3. All lat/lng display and **`convertToDMS`**: branch on `geoCoords ? … : 'Location unknown'`.

**Precedent:** `git show c7ec6e3b` (T3-B — `PhotorealisticGisView` + `BrowserTacticalToolsPanel`).

**Do not use** `docs/handoffs/D3-T3E-granular.patch` with `git apply` — it was built against an older hunk and **fails with staleness** on line 48. The **source of truth** is the current file + the narrative in `D3-T3E-Claude-handoff.md` (or `git diff src/components/GranularDrilldown.tsx` before commit).

**Deep archive (diagnosis, old 7-line `tsc` list, line-by-line table):** `docs/handoffs/D3-T3E-Claude-handoff.md`

### One-file commit (when Daniel is ready)

```bash
git add src/components/GranularDrilldown.tsx
git status --short   # expect only that file for a pure T3-E commit
```

**Proposed message:**

```
fix(drilldown): T3-E — GranularDrilldown coord-as-missing-data contract

Cluster: GranularDrilldown.tsx optional coordinate handling (7 errors).

Cause: C — facility.latitude / facility.longitude are number | undefined
on Facility, but GranularDrilldown treated them as required. Optional
provider vs DetailRow value type also normalized (?? 'Unknown').

Approach: geoCoords null when lat/lng missing or non-finite; UI shows
"Location unknown" for missing geocoding; no zero-defaulting.

Tsc errors: 57 → 50 (-7).
Tests: 54/54 green.

Methodology: no ?? 0 on coords, no non-null/type assertions, T3-B-style
guards. Refs: stabilization/2026-05 D3-T3E
```

**Post-commit checks**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"   # expect 50
npx tsc --noEmit 2>&1 | grep GranularDrilldown || true
npm run test:run
grep -nE '\?\?\s*0|isFinite.*\?.*0|as\s+any|@ts-ignore|@ts-expect-error' src/components/GranularDrilldown.tsx || true
npm run build
```

**Optional tag:** `stabilization-d3-T3E-drilldown-coords`

---

## 4. TypeScript long tail (after T3-E lands on `main`)

Approximate **~50** project errors across **~26** files (counts move as tranches land). **Not** an authoritative list — regenerate with:

```bash
npx tsc --noEmit 2>&1 | grep "error TS" | sed 's/([0-9]*,[0-9]*)//' | cut -d: -f1 | sort -u
```

**Plausible next tranches** (from planning; re-prioritize with `tsc` + product needs):

| Area | Notes |
|------|--------|
| `NavigationSidebar` | ~3 errors, often mechanical |
| `DCIMCommandCenter` / **ComplianceStats** | Higher methodology stakes |
| **GlobeView** (or other map) | Same **coord-as-missing-data** pattern as T3-B / T3-E |
| `src/types.ts` **T6** | Remove or narrow `[key: string]: any` at `Facility` — **orthogonal** tranche, touch types carefully |

**T5** / allowlist work may be documented in `TS-ALLOWLIST.md` when present.

---

## 5. Commands cheat sheet

```bash
cd ~/Desktop/DCIM
git status
git log -3 --oneline

# Typecheck (exits 1/2 when errors exist)
npx tsc --noEmit 2>&1 | grep -c "error TS"
npx tsc --noEmit 2>&1 | grep "YourFile.tsx" || true

# Tests
npm run test:run

# Build
npm run build
```

**Shell tip:** Do not use `tsc && npm test` in one `&&` chain if you need the test result when `tsc` is non-zero — run them separately.

---

## 6. Handoff files in `docs/handoffs/`

| File | Use |
|------|-----|
| **`D3-Claude-handoff.md`** (this file) | **Start here** — current state + T3-E + long tail |
| `D3-T3E-Claude-handoff.md` | T3-E only: full diagnosis, full pre-fix JSX, methodology |
| `D3-T3E-granular.patch` | **Deprecated** for `git apply` — stale; keep for history or delete |
| `D3-cursor-handoff.md` | Older / parallel resume notes — verify age before trusting |

---

## 7. What to ask the human if stuck

- Whether **T3-E is already committed** on their machine (compare `HEAD` and `git diff`).
- Whether to **stage** `docs/handoffs/*` in the same commit or a separate docs commit.
- Whether **scope** is still “one file per tranche” or an exception is approved.

---

*End of handoff — paste this file (or the repo path `docs/handoffs/D3-Claude-handoff.md`) into Claude at session start.*
