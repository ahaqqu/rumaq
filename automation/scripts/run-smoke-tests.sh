#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# CI/worker-facing runner for production smoke tests.
# This is what the smoke.yml GitHub Actions workflow calls.
#
# To trigger this remotely from a dev machine, use:
#   scripts/trigger-smoke.sh
# ============================================================

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

info()  { echo -e "==> $1"; }
ok()    { echo -e "  ✓  $1"; }
fail()  { echo -e "  ✗  $1"; }

info "Running production smoke tests..."

npx cucumber-js \
  "automation/tests/live/**/*.feature" \
  --import "automation/tests/live/**/*.steps.js" \
  --format summary \
  "$@"

ok "Cucumber tests passed."

info "Running Playwright E2E login/logout test..."
npx playwright test --config automation/playwright.live.config.js

echo ""
ok "Production smoke tests passed!"
