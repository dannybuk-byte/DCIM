#!/bin/bash
#
# R-F13: thin wrapper — identity comes from scripts/generate-build-info.mjs
# (fail-closed resolver: CI env → git HEAD).
#
set -euo pipefail
cd "$(dirname "$0")"
node scripts/generate-build-info.mjs
