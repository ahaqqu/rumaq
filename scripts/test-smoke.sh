#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# RumaQ production smoke test runner
# ============================================================
# Triggers the smoke.yml GitHub Actions workflow against the
# live rumaq.pages.dev deployment and waits for the result.
#
# Usage:
#   ./scripts/test-smoke.sh              # run with saved session secret
#   ./scripts/test-smoke.sh --watch       # stream logs while waiting
#
# Prerequisites:
#   - `gh` CLI installed and authenticated
#   - `RUMAQ_PROD_SESSION` repository secret set (for auth checks)
# ============================================================

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WATCH="${1:-}"

require_cmd() {
  if ! command -v "$1" &>/dev/null; then
    echo "Error: $1 is not installed. $2"
    exit 1
  fi
}

info()  { echo -e "==> $1"; }
ok()    { echo -e "  ✓  $1"; }
fail()  { echo -e "  ✗  $1"; }

require_cmd gh "Install GitHub CLI: https://cli.github.com"

cd "$ROOT_DIR"

# ------------------------------------------------------------------
# Trigger the workflow
# ------------------------------------------------------------------
info "Triggering production smoke workflow..."

if [[ -n "$WATCH" && "$WATCH" == "--watch" ]]; then
  gh workflow run smoke.yml --watch 2>&1 || true
else
  gh workflow run smoke.yml 2>&1 || true
fi

# Small delay to let GitHub register the run
sleep 3

# ------------------------------------------------------------------
# Find the most recent run and follow it
# ------------------------------------------------------------------
info "Polling latest smoke run..."

RUN_ID=$(gh run list --workflow=smoke.yml --limit 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null)

if [[ -z "$RUN_ID" ]]; then
  fail "Could not find workflow run. Check: gh run list --workflow=smoke.yml"
  exit 1
fi

info "Run ID: $RUN_ID"

# ------------------------------------------------------------------
# Poll until completion
# ------------------------------------------------------------------
while true; do
  STATUS=$(gh run view "$RUN_ID" --json status,conclusion --jq '"\(.status) \(.conclusion)"' 2>/dev/null | xargs)

  case "$STATUS" in
    "completed success")
      ok "Smoke tests passed!"
      exit 0
      ;;
    "completed failure")
      fail "Smoke tests failed!"
      info "View details: https://github.com/$(gh repo default --jq '.nameWithOwner')/actions/runs/$RUN_ID"
      exit 1
      ;;
    "completed "*)
      fail "Smoke tests ended: $STATUS"
      exit 1
      ;;
    *)
      echo "  ... $STATUS"
      sleep 10
      ;;
  esac
done
