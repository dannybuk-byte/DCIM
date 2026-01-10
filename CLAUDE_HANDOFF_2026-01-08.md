## Claude Handoff — DCIM Compliance App (Labor Organizing Tool)
**Date**: 2026-01-08  
**Workspace (Cursor worktree)**: `/Users/danielbuk/.cursor/worktrees/DCIM_Compliance_App/jkb`  
**Dev URL**: `http://localhost:5173/`  

### Debug-focused handoff (start here if debugging)
See: `CLAUDE_DEBUG_HANDOFF.md` (same folder). It contains reproduction steps, install/run commands for worktrees, and code pointers for the current warnings/errors.

### Mission / Context (do not drift)
This is a **labor organizing tool** to help unions/community organizers fight Big Tech and expose broken job promises and subsidy gaps. Antifragility work should support organizers: **no blank screens, offline resilience, evidence preservation, recoverability**.

### What was just implemented / integrated (high signal)
#### Newly added “final-layer” antifragility systems (and UI badges)
- **Resource Guardian** (`src/utils/resourceGuardian.ts`, `src/components/shared/ResourceGuardianPanel.tsx`)
  - Storage quota monitoring (`navigator.storage.estimate`)
  - Memory pressure monitoring (`performance.memory` when available)
  - Long task detection (PerformanceObserver: `longtask`)
  - Watchdog for UI freezes
  - Tab visibility tracking
  - UI: footer badge “healthy” opens Resource Guardian panel

- **Adaptive Load Manager** (`src/utils/adaptiveLoadManager.ts`, `src/components/shared/LoadManagerPanel.tsx`)
  - Priority queue, adaptive backpressure, load shedding
  - Dead letter queue for failed operations
  - UI: footer badge “idle/moderate/heavy…” opens Load Manager panel

- **Resilience Score** (`src/utils/resilienceScore.ts`, `src/components/shared/ResilienceScorePanel.tsx`)
  - 5-category scoring model + recommendations
  - UI: footer badge “A+ 100%” opens the full score panel

#### Previously integrated (still relevant)
- **Antifragility Dashboard** (`src/components/AntifragilityDashboard.tsx`) is now reachable from the main UI (footer shield button) via `src/components/DensityOptimizedLayout.tsx`.
- Existing advanced services already in repo:
  - `src/services/chaosEngineering.ts`
  - `src/services/gracefulDegradation.ts`
  - `src/services/selfHealing.ts`
  - `src/services/predictiveFailure.ts`
  - `src/utils/circuitBreaker.ts`
  - `src/config/featureFlags.ts`

### Recent commits (current branch)
Latest commits seen in this worktree:
- `2c6fd5fd` feat: Add Adaptive Load Manager + Resilience Score Calculator
- `2a6b0c89` feat: Add Resource Guardian - ultimate resource protection layer
- `c69ef1a8` feat: Integrate hidden Antifragility Dashboard into main UI

### Validation performed (“truly test antifragile”)
Using the in-app **Antifragility Dashboard → Chaos Engineering**:
- Enabled Chaos (safe mode ON).
- Ran **Latency Spike** → completed.
- Ran **Memory Pressure** → completed.
- Ran **Resource Exhaustion** → completed.
- Attempted **API Error Injection** → correctly blocked by safe mode (expected; labeled high severity).
- Cooldown enforcement verified (“Cooldown active. Wait …s”).

No blank screen observed during these runs; system remained usable.

### Known issues / friction (important for Claude)
#### Worktrees + dev server conflicts
Cursor auto-start task (`.vscode/tasks.json`) runs `npm run dev` on folder open. If the original repo folder and a worktree are both open, you can end up with:
- **Port 5173 already in use** errors from one task while another dev server is already running.

Recommendation:
- Run only **one** dev server at a time, in the chosen worktree.
- Consider updating task to pick a free port or to detect an existing listener.

#### Dependency install issues in worktrees
In this worktree, `npm run dev` initially failed with **`vite: command not found`** because devDependencies were not installed.
`npm install` also hit two issues:
- **Peer dep conflict**: `@langchain/community` peers `@browserbasehq/stagehand` which peers `zod@^3`, while repo uses `zod@^4`.
- **Permission issue**: `EACCES` under `~/.npm/_cacache`.

Working install command (used successfully):
```bash
cd "/Users/danielbuk/.cursor/worktrees/DCIM_Compliance_App/jkb"
mkdir -p .npm-cache
npm install --include=dev --legacy-peer-deps --cache ./.npm-cache
```

Then run:
```bash
npm run dev -- --port 5173
```

#### Console warning noise
- `selfHealing.ts` repeatedly logs: **“Deprecated API for given entry type.”**
  - This likely comes from a `PerformanceObserver` entry type mismatch. Fixing this reduces noise and improves trust in monitoring.
- PWA icon warning:
  - `Error while trying to use the following icon from the Manifest: http://localhost:5173/icon-192.png`
  - Probably missing file or invalid image; low priority but easy cleanup.

### Immediate next antifragile improvements (highest leverage)
1. **Fix the deprecated PerformanceObserver usage** in `src/services/selfHealing.ts` to eliminate repeated warnings.
2. **Add resilience regression automation** (Playwright):
   - Boot app, open Antifragility Dashboard, run allowed chaos experiments, assert app stays responsive and no fatal error boundary triggers.
3. **Make worktree bootstrapping antifragile**:
   - Add a `predev` script that checks for `node_modules/.bin/vite` and prints the exact install command above (including local cache workaround).

### Handy UI pointers for testing
- Footer badges:
  - **A+ 100%** → Resilience Score panel
  - **idle** → Load Manager panel
  - **healthy** → Resource Guardian panel
  - **shield button** → Antifragility Dashboard (Chaos/Self-Heal/Degradation/Predictive)

### Notes on project rules / conventions
- Functional React components only; named exports only.
- Avoid `any` (use `unknown` + guards).
- Tailwind: no dynamic class generation.
- Antifragility rules: circuit breakers, error boundaries, graceful fallbacks.

