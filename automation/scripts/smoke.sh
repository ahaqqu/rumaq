#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

info()  { echo -e "==> $1"; }
ok()    { echo -e "  ✓  $1"; }
fail()  { echo -e "  ✗  $1"; }

info "Running production smoke tests..."

npx cucumber-js \
  "automation/tests/live/health/features/**/*.feature" \
  --import "automation/tests/live/health/step_definitions/**/*.js" \
  --format summary \
  "$@"

echo ""
ok "Production smoke tests passed!"
