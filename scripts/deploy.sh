#!/usr/bin/env bash
set -euo pipefail

# RumaQ deployment script
# Builds the frontend and deploys both the Pages site and the Worker backend.
#
# Usage:
#   ./scripts/deploy.sh           # deploy everything
#   ./scripts/deploy.sh frontend  # deploy only Pages frontend
#   ./scripts/deploy.sh backend   # deploy only Worker backend
#   ./scripts/deploy.sh dry-run   # build only, do not deploy

MODE="${1:-all}"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WORKER_DIR="$ROOT_DIR/worker"

cd "$ROOT_DIR"

require_command() {
  if ! command -v "$1" &>/dev/null; then
    echo "Error: $1 is not installed. $2"
    exit 1
  fi
}

echo "=== RumaQ deploy ($MODE) ==="

require_command npm "Install Node.js first."
require_command wrangler "Install Wrangler: npm install -g wrangler"

if ! wrangler whoami &>/dev/null; then
  echo "Error: not logged in to Cloudflare. Run: wrangler login"
  exit 1
fi

# ---------------------------------------------------------------------------
# Backend (Cloudflare Worker)
# ---------------------------------------------------------------------------
deploy_backend() {
  echo ""
  echo "--- Deploying Worker ---"
  cd "$WORKER_DIR"

  if [[ ! -f wrangler.toml ]]; then
    echo "Error: worker/wrangler.toml not found."
    echo "Copy worker/wrangler.toml.example to worker/wrangler.toml and fill in your account_id and database_id."
    exit 1
  fi

  npm install
  npm run deploy
  cd "$ROOT_DIR"
}

# ---------------------------------------------------------------------------
# Frontend (Cloudflare Pages)
# ---------------------------------------------------------------------------
deploy_frontend() {
  echo ""
  echo "--- Building frontend ---"
  npm install
  npm run build

  echo ""
  echo "--- Deploying to Cloudflare Pages ---"
  # Pages project name is read from wrangler.toml/pages config or passed via env.
  local project_name="${PAGES_PROJECT_NAME:-rumaq}"
  wrangler pages deploy dist --project-name "$project_name"
}

# ---------------------------------------------------------------------------
# Main dispatch
# ---------------------------------------------------------------------------
case "$MODE" in
  backend)
    deploy_backend
    ;;
  frontend)
    deploy_frontend
    ;;
  dry-run)
    echo ""
    echo "--- Dry run: build only ---"
    npm install
    npm run build
    echo ""
    echo "Frontend build succeeded. No deployment was made."
    echo "Worker deployment skipped in dry-run mode."
    ;;
  all)
    deploy_backend
    deploy_frontend
    ;;
  *)
    echo "Unknown mode: $MODE"
    echo "Usage: $0 [all|frontend|backend|dry-run]"
    exit 1
    ;;
esac

echo ""
echo "=== Deploy complete ==="
