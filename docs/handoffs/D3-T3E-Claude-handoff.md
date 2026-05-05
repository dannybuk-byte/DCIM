# D3 T3-E — GranularDrilldown coord-as-missing-data (Claude handoff)

**Start here for a new session:** [`D3-Claude-handoff.md`](./D3-Claude-handoff.md) — current repo state, post–T3-E long tail, and commit checklist. This file is the **deep T3-E archive** (diagnosis, full code excerpts, inline diff).

**Deliverables (this tranche):**

| File | Role |
|------|------|
| `docs/handoffs/D3-T3E-Claude-handoff.md` | Full narrative: baseline, diagnosis, methodology, verification, commit message |
| `docs/handoffs/D3-T3E-granular.patch` | Same unified diff as below; `git apply --check` verified on pre-T3-E `GranularDrilldown.tsx` |

**Purpose:** Single document for Claude (or any agent) to continue **T3-E** without relying on cut-off chat excerpts.  
**Scope:** `src/components/GranularDrilldown.tsx` only — one commit, manual commit gate.  
**Branch:** `stabilization/2026-05` (re-verify `git status` and `origin` after pull).

---

## Terminology (binding)

- Use **non-compliance / under-compliance / subsidy gap** — never “fraud”.
- Use **rightsholders** — never “stakeholders”.
- **11,992 facilities across 118 providers, edge-inclusive** — do not round or reduce.

---

## Methodology contract (coords + metrics)

- Missing geocoding must **not** surface as `(0, 0)` or numeric zero-fill.
- **Forbidden:** `?? 0` / `?? '0'` on coordinates; `Number.isFinite(x) ? x : 0` then math; `!`; `as number`; `as any`; `@ts-ignore` / `@ts-expect-error`.
- **Allowed:** `Number.isFinite(lat) && Number.isFinite(lng)` after `undefined` checks; filter-then-map at boundaries; UI string such as **Location unknown** distinct from real coordinates; narrow then call helpers expecting `number`.

**Precedent commit (T3-B):** `c7ec6e3b` — optional `lat`/`lng` on selection types; two-stage guards; `onFacilityClick` only selects when `Number.isFinite(f.latitude) && Number.isFinite(f.longitude)`; panel shows “Location unknown” and disables buttons with “Needs coordinates”.

```bash
git show c7ec6e3b --stat
git show c7ec6e3b -- src/components/shared/PhotorealisticGisView.tsx | head -120
git show c7ec6e3b -- src/components/shared/BrowserTacticalToolsPanel.tsx
```

---

## Step 0 — Baseline (last verified in Cursor session)

| Check | Expected / last run |
|--------|---------------------|
| `git log -1 --oneline` | `9a2452a8 docs(readme): note geocoding completeness behavior in map layers` (re-verify) |
| `git status` | Clean, tracking `origin/stabilization/2026-05` |
| `npx tsc --noEmit 2>&1 \| grep -c "error TS"` | **57** total errors (re-run after any local merges) |
| `npm run test:run` | **54/54** passing |

**Note:** `tsc` exits non-zero when errors exist; do not chain `tsc && tests` with `&&` if you need the test count regardless.

---

## Step 2 — Diagnosis (complete)

### `tsc` output for this file (7 errors)

```
src/components/GranularDrilldown.tsx(175,43): error TS2322: Type 'string | undefined' is not assignable to type 'string | number'.
src/components/GranularDrilldown.tsx(176,50): error TS18048: 'facility.latitude' is possibly 'undefined'.
src/components/GranularDrilldown.tsx(177,51): error TS18048: 'facility.longitude' is possibly 'undefined'.
src/components/GranularDrilldown.tsx(206,65): error TS18048: 'facility.latitude' is possibly 'undefined'.
src/components/GranularDrilldown.tsx(207,66): error TS18048: 'facility.longitude' is possibly 'undefined'.
src/components/GranularDrilldown.tsx(210,45): error TS2345: Argument of type 'number | undefined' is not assignable to parameter of type 'number'.
src/components/GranularDrilldown.tsx(214,45): error TS2345: Argument of type 'number | undefined' is not assignable to parameter of type 'number'.
```

### Cause classification

| Line | Code | Cause | Explanation |
|------|------|--------|---------------|
| 175 | `value={facility.provider}` | **Optional string vs `DetailRow`** (not coord) | `Facility.provider?: string` → `string \| undefined`. `DetailRow` requires `value: string \| number` (no `undefined`). **Not** id drift; same TS shape as strict consumer vs optional field. |
| 176–177 | `.toFixed` on lat/lng | **C** | `latitude` / `longitude` are optional on `Facility`. |
| 206–207 | `.toFixed` on lat/lng | **C** | Same. |
| 210, 214 | `convertToDMS(facility.latitude, …)` | **C** | `convertToDMS(decimal: number, …)` requires real `number`. |

### `Facility` excerpt (`src/types.ts`)

```typescript
  latitude?: number;
  longitude?: number;
  // ...
  provider?: string;
```

### `DetailRow` + `convertToDMS` (full definitions — end of same file)

```typescript
// Helper component for detail rows
interface DetailRowProps {
  label: string;
  value: string | number;
  valueColor?: string;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, valueColor = 'text-slate-300' }) => {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 px-2 rounded hover:bg-slate-800/30">
      <span className="text-xs text-slate-400 flex-shrink-0">{label}:</span>
      <span className={`text-xs font-medium ${valueColor} text-right break-words`}>
        {value}
      </span>
    </div>
  );
};

// Helper function to convert decimal degrees to DMS
function convertToDMS(decimal: number, isLatitude: boolean): string {
  const absolute = Math.abs(decimal);
  const degrees = Math.floor(absolute);
  const minutesDecimal = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesDecimal);
  const seconds = ((minutesDecimal - minutes) * 60).toFixed(2);

  const direction = isLatitude
    ? (decimal >= 0 ? 'N' : 'S')
    : (decimal >= 0 ? 'E' : 'W');

  return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
}
```

### Problem JSX block (full — Infrastructure → Coordinate System)

This is the **exact** region to fix (lines 165–217 in current file; line numbers may shift after edit).

```tsx
          {/* Level 2: Infrastructure Details */}
          <DrilldownSection
            id="infrastructure"
            title="🏗️ Infrastructure"
            depth={1}
            isExpanded={isExpanded('infrastructure')}
            onToggle={() => toggleExpand('infrastructure')}
          >
            <div className="space-y-2 mt-2">
              <DetailRow label="Facility Type" value={facility.type} />
              <DetailRow label="Provider" value={facility.provider} />
              <DetailRow label="Latitude" value={facility.latitude.toFixed(6)} />
              <DetailRow label="Longitude" value={facility.longitude.toFixed(6)} />

              {/* Level 3: Geographic Details */}
              <DrilldownSection
                id="geographic"
                title="🗺️ Geographic Details"
                depth={2}
                isExpanded={isExpanded('geographic')}
                onToggle={() => toggleExpand('geographic')}
              >
                <div className="space-y-2 mt-2">
                  <DetailRow label="Country" value={facility.country} />
                  <DetailRow label="State/Province" value={facility.state} />
                  <DetailRow label="City" value={facility.city} />
                  <DetailRow label="Postal Code" value={facility.postalCode || 'N/A'} />
                  <DetailRow label="Metro Area" value={facility.metroCode || 'N/A'} />
                  <DetailRow label="Coordinates" value={`${facility.latitude}, ${facility.longitude}`} />

                  {/* Level 4: Coordinate System Details */}
                  <DrilldownSection
                    id="coords"
                    title="📍 Coordinate System"
                    depth={3}
                    isExpanded={isExpanded('coords')}
                    onToggle={() => toggleExpand('coords')}
                  >
                    <div className="space-y-2 mt-2">
                      <DetailRow label="Format" value="Decimal Degrees (DD)" />
                      <DetailRow label="Datum" value="WGS84" />
                      <DetailRow label="Latitude (N)" value={`${facility.latitude.toFixed(8)}°`} />
                      <DetailRow label="Longitude (W)" value={`${facility.longitude.toFixed(8)}°`} />
                      <DetailRow
                        label="DMS Lat"
                        value={convertToDMS(facility.latitude, true)}
                      />
                      <DetailRow
                        label="DMS Lng"
                        value={convertToDMS(facility.longitude, false)}
                      />
                    </div>
                  </DrilldownSection>
                </div>
              </DrilldownSection>
```

### Out of scope for T3-E

- Do **not** change `src/types.ts` / `Facility` shape (separate tranche, e.g. T6).
- Do **not** fix other TS errors in other files.
- Do **not** add tests in this tranche (optional follow-up).
- If `tsc` shows **additional** errors in `GranularDrilldown.tsx` beyond the seven above, flag them; do not expand scope without Daniel.

---

## Step 3 — Implementation sketch (for Claude / Cursor)

1. **Inside** `GranularDrilldown`, after `useState` for `expanded`, derive a **narrowed coord pair** once per render (no `?? 0`):

   ```typescript
   const la = facility.latitude;
   const ln = facility.longitude;
   const geoCoords =
     la !== undefined && ln !== undefined && Number.isFinite(la) && Number.isFinite(ln)
       ? { lat: la, lng: ln }
       : null;
   ```

   Optional one-line contract comment above `geoCoords` (methodology only, not noise).

2. **Provider (line 175):** pass a `string | number` with no `undefined`, e.g. `facility.provider ?? 'Unknown'` (string fallback for **missing label** is fine; do not use this pattern for lat/lng numerics).

3. **All lat/lng display and DMS:** branch on `geoCoords` — when `null`, use the same user-visible string as T3-B for missing spatial data, e.g. **`Location unknown`** (must remain visually/logically distinct from rendering real `(0, 0)` as a fake default).

4. **Coordinates** summary row: `geoCoords ? \`${geoCoords.lat}, ${geoCoords.lng}\` : 'Location unknown'`.

5. Do **not** widen `DetailRow`’s `value` to accept `undefined` for this tranche (keeps change localized to call sites in this file).

---

## Step 3 — Unified diff (proposed; apply only after Daniel approves)

**Canonical machine-readable patch (verified `git apply --check` on tree at `9a2452a8`):**

`docs/handoffs/D3-T3E-granular.patch`

```bash
cd ~/Desktop/DCIM
git apply --check docs/handoffs/D3-T3E-granular.patch   # dry run
git apply docs/handoffs/D3-T3E-granular.patch           # after approval
```

**Same diff inline** (copy-paste safe; **only** `GranularDrilldown.tsx`):

```diff
diff --git a/src/components/GranularDrilldown.tsx b/src/components/GranularDrilldown.tsx
index b8c10752..41ded27c 100644
--- a/src/components/GranularDrilldown.tsx
+++ b/src/components/GranularDrilldown.tsx
@@ -48,6 +48,17 @@ interface GranularDrilldownProps {
 export const GranularDrilldown: React.FC<GranularDrilldownProps> = ({ facility, className = '' }) => {
   const [expanded, setExpanded] = useState<Set<string>>(new Set(['overview']));
 
+  // coord-as-missing-data: null when lat/lng absent or non-finite (never zero-filled).
+  const la = facility.latitude;
+  const ln = facility.longitude;
+  const geoCoords =
+    la !== undefined &&
+    ln !== undefined &&
+    Number.isFinite(la) &&
+    Number.isFinite(ln)
+      ? { lat: la, lng: ln }
+      : null;
+
   const toggleExpand = (id: string) => {
     setExpanded(prev => {
       const next = new Set(prev);
@@ -172,9 +183,15 @@ export const GranularDrilldown: React.FC<GranularDrilldownProps> = ({ facility,
           >
             <div className="space-y-2 mt-2">
               <DetailRow label="Facility Type" value={facility.type} />
-              <DetailRow label="Provider" value={facility.provider} />
-              <DetailRow label="Latitude" value={facility.latitude.toFixed(6)} />
-              <DetailRow label="Longitude" value={facility.longitude.toFixed(6)} />
+              <DetailRow label="Provider" value={facility.provider ?? 'Unknown'} />
+              <DetailRow
+                label="Latitude"
+                value={geoCoords ? geoCoords.lat.toFixed(6) : 'Location unknown'}
+              />
+              <DetailRow
+                label="Longitude"
+                value={geoCoords ? geoCoords.lng.toFixed(6) : 'Location unknown'}
+              />
 
               {/* Level 3: Geographic Details */}
               <DrilldownSection
@@ -190,7 +207,12 @@ export const GranularDrilldown: React.FC<GranularDrilldownProps> = ({ facility,
                   <DetailRow label="City" value={facility.city} />
                   <DetailRow label="Postal Code" value={facility.postalCode || 'N/A'} />
                   <DetailRow label="Metro Area" value={facility.metroCode || 'N/A'} />
-                  <DetailRow label="Coordinates" value={`${facility.latitude}, ${facility.longitude}`} />
+                  <DetailRow
+                    label="Coordinates"
+                    value={
+                      geoCoords ? `${geoCoords.lat}, ${geoCoords.lng}` : 'Location unknown'
+                    }
+                  />
                   
                   {/* Level 4: Coordinate System Details */}
                   <DrilldownSection
@@ -203,15 +225,29 @@ export const GranularDrilldown: React.FC<GranularDrilldownProps> = ({ facility,
                     <div className="space-y-2 mt-2">
                       <DetailRow label="Format" value="Decimal Degrees (DD)" />
                       <DetailRow label="Datum" value="WGS84" />
-                      <DetailRow label="Latitude (N)" value={`${facility.latitude.toFixed(8)}°`} />
-                      <DetailRow label="Longitude (W)" value={`${facility.longitude.toFixed(8)}°`} />
-                      <DetailRow 
-                        label="DMS Lat" 
-                        value={convertToDMS(facility.latitude, true)}
+                      <DetailRow
+                        label="Latitude (N)"
+                        value={
+                          geoCoords ? `${geoCoords.lat.toFixed(8)}°` : 'Location unknown'
+                        }
+                      />
+                      <DetailRow
+                        label="Longitude (W)"
+                        value={
+                          geoCoords ? `${geoCoords.lng.toFixed(8)}°` : 'Location unknown'
+                        }
+                      />
+                      <DetailRow
+                        label="DMS Lat"
+                        value={
+                          geoCoords ? convertToDMS(geoCoords.lat, true) : 'Location unknown'
+                        }
                       />
-                      <DetailRow 
-                        label="DMS Lng" 
-                        value={convertToDMS(facility.longitude, false)}
+                      <DetailRow
+                        label="DMS Lng"
+                        value={
+                          geoCoords ? convertToDMS(geoCoords.lng, false) : 'Location unknown'
+                        }
                       />
                     </div>
                   </DrilldownSection>
```

If `git apply` fails after a large merge, use **Implementation sketch** + **full problem JSX** above to re-diff against your tree.

---

## Step 4 — Verification commands (after apply)

```bash
cd ~/Desktop/DCIM

# Expect total errors 57 -> 50 (if baseline was 57)
npx tsc --noEmit 2>&1 | grep -c "error TS"

# Expect 0 GranularDrilldown lines
npx tsc --noEmit 2>&1 | grep "GranularDrilldown" || true

npm run test:run 2>&1 | tail -8

grep -nE '\?\?\s*0|isFinite.*\?.*0|as\s+any|@ts-ignore|@ts-expect-error|!\s*\.|!\s*\[' \
  src/components/GranularDrilldown.tsx || true

npm run build 2>&1 | tail -12
```

If anything fails: `git restore src/components/GranularDrilldown.tsx` and report.

---

## Step 5 — Commit message (Daniel commits manually)

```
fix(drilldown): T3-E — GranularDrilldown coord-as-missing-data contract

Cluster: GranularDrilldown.tsx optional coordinate handling (7 errors).

Cause: C — facility.latitude / facility.longitude are number | undefined
on Facility (per T1's optional fields), but GranularDrilldown was
treating them as required. Same pattern as T3-B.

Approach: filter facilities by Number.isFinite(latitude) &&
Number.isFinite(longitude) at the boundary where coords are required;
skip / render "no coords" UI for facilities lacking geocoding. No
zero-defaulting; missing coords surface as missing, not as (0, 0).

Tsc errors: 57 → 50 (-7).
Tests: 54/54 green.

Methodology preserved:
- No ?? 0 on coordinate metrics
- No Number.isFinite(x) ? x : 0 followed by arithmetic
- No non-null assertions or type assertions on coords
- Filter-then-map at consumer boundaries
- UI distinguishes "no coords" from valid coords (per T3-B precedent)

Refs: stabilization/2026-05 D3-T3E
```

(Add a sentence if `provider` fallback was included: optional `provider` normalized for `DetailRow` without widening `Facility`.)

---

## Step 6 — Optional tag

```bash
git tag -a stabilization-d3-T3E-drilldown-coords -m "T3-E complete: GranularDrilldown coord-as-missing-data contract"
git push --tags
```

---

## Goal recap

| Metric | Target |
|--------|--------|
| TS errors | −7 from baseline (GranularDrilldown cluster) |
| Tests | 54/54 unchanged |
| Files touched | 1 (`GranularDrilldown.tsx`) |
| Commits | 1 (manual) |

---

## Document control

- **Created for:** Claude / human continuity on T3-E.
- **Path:** `docs/handoffs/D3-T3E-Claude-handoff.md`
- **If totals differ** (e.g. repo already at 40 errors): re-run diagnosis grep for `GranularDrilldown` and adjust expected post-patch total accordingly.
