## DCIM: How to continue work (Cursor/Claude agents)

### Read first (in order)
1. `AGENT_STATUS.md` — current focus (updated on commits)
2. `PROJECT_STATUS.md` — auto-generated snapshot (updated on commits)
3. `DCIM_MASTER_HANDOFF.md` — full handoff / architecture / next steps
4. `DCIM Compliance App/.cursorrules` — hard constraints

### Non-negotiable constraints
- **No `localStorage` / `sessionStorage`** for new work (use IndexedDB via Dexie.js)
- **No dynamic Tailwind class construction** (`bg-${color}-500` etc.)
- Keep artifacts small (avoid huge single files)
- Clean up effects; wrap risky UI in error boundaries

### Workflow expectations
- If a change affects behavior, update `AGENT_STATUS.md` (what/why/next step).
- Let pre-commit auto-update `PROJECT_STATUS.md` + `.cursor/rules/current-context.mdc`.


