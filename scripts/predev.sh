#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js not found in PATH."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "❌ npm not found in PATH."
  exit 1
fi

# Port safety:
# - If PORT is explicitly set, we enforce a port-availability check for that port.
# - If PORT is NOT set, we *do not* hard-fail on port conflicts (safe default for multi-worktree dev).
PORT="${PORT:-}"

if [[ -n "$PORT" ]]; then
  echo "🔎 predev: checking workspace readiness (port $PORT)"
else
  echo "🔎 predev: checking workspace readiness"
  echo "ℹ️  Tip: set PORT to enable port conflict checking (e.g. PORT=5175 npm run dev -- --port 5175)"
fi

if [[ ! -x "node_modules/.bin/vite" ]]; then
  echo "❌ Vite binary not found at node_modules/.bin/vite."
  echo
  echo "Known-good worktree install:"
  echo "  mkdir -p .npm-cache"
  echo "  npm install --include=dev --legacy-peer-deps --cache ./.npm-cache"
  echo
  echo "Note: Cursor may auto-run the dev server on folder open (see .vscode/tasks.json)."
  exit 1
fi

if [[ -n "$PORT" ]] && command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "❌ Port $PORT is already in use."
  echo
  lsof -nP -iTCP:"$PORT" -sTCP:LISTEN || true
  echo
  echo "Tip: stop the existing process, or run on a different port:"
  echo "  PORT=5175 npm run dev -- --port 5175"
  exit 1
fi

echo "✅ predev: OK"
