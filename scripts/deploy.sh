#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# RumaQ deploy – local dev setup & Cloudflare deployment
# ============================================================
# Idempotent: run from a clean checkout (first time) or to
# update an existing local / Cloudflare deployment.
#
# Usage:
#   ./scripts/deploy.sh                       # prepare local env + start dev servers
#   ./scripts/deploy.sh cloudflare            # deploy (or update) Cloudflare
#   ./scripts/deploy.sh cloudflare --dry-run  # validate without deploying
#   ./scripts/deploy.sh --dry-run             # alias for dry-run validation
#   ./scripts/deploy.sh frontend              # deploy only the frontend
# ============================================================

DRY_RUN=false
MODE=""
for arg in "$@"; do
  case "$arg" in
    --dry-run)
      DRY_RUN=true
      ;;
    local | cloudflare | frontend | dry-run)
      MODE="$arg"
      ;;
    *)
      echo "Unknown argument: $arg"
      echo "Usage: $0 [local|cloudflare|frontend|dry-run] [--dry-run]"
      exit 1
      ;;
  esac
done

if [[ -z $MODE ]]; then
  if $DRY_RUN; then
    MODE="cloudflare"
  else
    MODE="local"
  fi
fi

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

# Load .env from project root (CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, etc.)
if [[ -f $ROOT_DIR/.env ]]; then
  set -a
  source "$ROOT_DIR/.env"
  set +a
fi

DB_NAME="${D1_DATABASE_NAME:-rumaq}"
PAGES_PROJECT="${PAGES_PROJECT_NAME:-rumaq}"
R2_BUCKET_NAME="${R2_BUCKET_NAME:-rumaq-receipts}"

cd "$ROOT_DIR"

# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------
require_cmd() {
  if ! command -v "$1" &> /dev/null; then
    echo "Error: $1 is not installed. $2"
    exit 1
  fi
}

log() { echo -e "==> $1"; }
ok() { echo -e "  ok  $1"; }
warn() { echo -e "  warn $1"; }

wrangler_cmd() {
  local config=$1
  shift
  local db=$1
  shift
  wrangler d1 migrations apply "$db" --config "$config" "$@"
}

# Prepare a resolved wrangler config for deploy. If CLOUDFLARE_ACCOUNT_ID or
# CLOUDFLARE_DATABASE_ID are set, their values override the placeholders in the
# committed wrangler.cloudflare.toml. The original file is never modified.
resolve_wrangler_config() {
  local src="$BACKEND_DIR/wrangler.cloudflare.toml"
  local tmp="$BACKEND_DIR/wrangler.cloudflare.resolved.toml"

  cp "$src" "$tmp"

  if [[ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
    sed -i "s|^account_id = \"YOUR_ACCOUNT_ID\"|account_id = \"$CLOUDFLARE_ACCOUNT_ID\"|" "$tmp"
  fi

  if [[ -n "${CLOUDFLARE_DATABASE_ID:-}" ]]; then
    sed -i "s|^database_id = \"YOUR_DATABASE_ID\"|database_id = \"$CLOUDFLARE_DATABASE_ID\"|" "$tmp"
  fi

  printf '%s' "$tmp"
}

# Detect branch for branch-specific deployments
BRANCH_NAME="${BRANCH_NAME:-$(git rev-parse --abbrev-ref HEAD 2> /dev/null || echo 'main')}"
SANITIZED_BRANCH=$(echo "$BRANCH_NAME" | sed 's/[^a-zA-Z0-9-]/-/g')

if [[ "$BRANCH_NAME" == "main" || "$BRANCH_NAME" == "master" || "$BRANCH_NAME" == "HEAD" ]]; then
  WORKER_NAME="${WORKER_NAME:-api}"
  PAGES_ORIGIN="${PAGES_ORIGIN:-https://rumaq.pages.dev}"
  WORKER_URL="${WORKER_URL:-https://api.rumaq.workers.dev}"
  PAGES_BRANCH="main"
else
  WORKER_NAME="${WORKER_NAME:-rumaq-api-${SANITIZED_BRANCH}}"
  PAGES_ORIGIN="${PAGES_ORIGIN:-https://${SANITIZED_BRANCH}.rumaq.pages.dev}"
  WORKER_URL="${WORKER_URL:-https://${WORKER_NAME}.rumaq.workers.dev}"
  PAGES_BRANCH="$BRANCH_NAME"
  log "Branch: ${BRANCH_NAME} -> Worker: ${WORKER_NAME}, Frontend preview: ${PAGES_BRANCH}"
fi

# ------------------------------------------------------------------
# Prerequisites
# ------------------------------------------------------------------
check_prereqs() {
  require_cmd node "Install Node.js (https://nodejs.org)."
  require_cmd bun "Install Bun (https://bun.sh)."
  require_cmd wrangler "Install Wrangler: bun add -g wrangler"
}

# ------------------------------------------------------------------
# wrangler.toml – create from example if missing
# ------------------------------------------------------------------
ensure_wrangler_toml() {
  local mode=$1

  if [[ ! -f $BACKEND_DIR/wrangler.toml.example ]]; then
    echo "Error: backend/wrangler.toml.example not found."
    exit 1
  fi

  if [[ $mode == local ]]; then
    if [[ -f $BACKEND_DIR/wrangler.local.toml ]]; then
      ok "backend/wrangler.local.toml already exists."
      return
    fi

    log "Creating backend/wrangler.local.toml from example..."
    cp "$BACKEND_DIR/wrangler.toml.example" "$BACKEND_DIR/wrangler.local.toml"
    sed -i \
      -e 's/YOUR_ACCOUNT_ID/LOCAL/' \
      -e 's/YOUR_DATABASE_ID/00000000-0000-0000-0000-000000000000/' \
      "$BACKEND_DIR/wrangler.local.toml"
    ok "Created backend/wrangler.local.toml with local defaults."
  else
    local config_file="$BACKEND_DIR/wrangler.cloudflare.toml"

    if [[ -f $config_file ]]; then
      ok "backend/wrangler.cloudflare.toml already exists."
      return
    fi

    log "Creating backend/wrangler.cloudflare.toml from example..."

    cp "$BACKEND_DIR/wrangler.toml.example" "$config_file"

    local account_id="${CLOUDFLARE_ACCOUNT_ID:-}"
    if [[ -z $account_id ]]; then
      read -r -p "Cloudflare account ID: " account_id
    fi
    sed -i "s|YOUR_ACCOUNT_ID|$account_id|" "$config_file"

    ok "Created backend/wrangler.cloudflare.toml (account_id set)."
  fi
}

# ------------------------------------------------------------------
# .dev.vars – create from example for local dev if missing
# ------------------------------------------------------------------
ensure_dev_vars() {
  if [[ -f $BACKEND_DIR/.dev.vars ]]; then
    return
  fi

  if [[ ! -f $BACKEND_DIR/.dev.vars.example ]]; then
    echo "Error: backend/.dev.vars.example not found."
    exit 1
  fi

  log "backend/.dev.vars not found – copying from example."
  cp "$BACKEND_DIR/.dev.vars.example" "$BACKEND_DIR/.dev.vars"
  warn "backend/.dev.vars created with placeholder values."
  warn "Edit backend/.dev.vars with real secrets before running the dev server."
}

# ------------------------------------------------------------------
# Dependencies
# ------------------------------------------------------------------
install_deps() {
  log "Installing workspace dependencies..."
  bun install --frozen-lockfile
}

# ------------------------------------------------------------------
# Database – local (via Miniflare / --local)
# ------------------------------------------------------------------
setup_database_local() {
  log "Setting up local D1 database (${DB_NAME})..."

  cd "$BACKEND_DIR"
  wrangler_cmd "wrangler.local.toml" "$DB_NAME" --local
  cd "$ROOT_DIR"

  ok "Local database ready."
}

# ------------------------------------------------------------------
# Database – remote (Cloudflare D1)
# ------------------------------------------------------------------
setup_database_remote() {
  log "Setting up remote D1 database (${DB_NAME})..."

  if $DRY_RUN; then
    ok "Skipping remote D1 migration in dry-run mode."
    return
  fi

  local config_file
  config_file=$(resolve_wrangler_config)
  cd "$BACKEND_DIR"

  local db_id="${CLOUDFLARE_DATABASE_ID:-}"

  if [[ -z $db_id ]]; then
    db_id=$(grep -oP 'database_id\s*=\s*"\K[^"]+' "$config_file" 2> /dev/null || true)
  fi

  if [[ $db_id == "YOUR_DATABASE_ID" || -z $db_id ]]; then
    db_id=$(bun --no-deprecation "$ROOT_DIR/scripts/deploy/deploy-cf.js" d1-setup)
    if [[ -n $db_id ]]; then
      warn "Set CLOUDFLARE_DATABASE_ID=$db_id in your environment or .env to avoid recreating it."
    else
      warn "Could not determine database_id."
      warn "Set CLOUDFLARE_DATABASE_ID or manually copy the database_id into backend/wrangler.cloudflare.toml."
    fi
  fi

  if [[ -n $db_id && $db_id != "YOUR_DATABASE_ID" ]]; then
    sed -i "s|^database_id = \"YOUR_DATABASE_ID\"|database_id = \"$db_id\"|" "$config_file"
  fi

  wrangler_cmd "$config_file" "$DB_NAME" --remote
  rm -f "$config_file"
  cd "$ROOT_DIR"
}

# ------------------------------------------------------------------
# R2 bucket – create if missing
# ------------------------------------------------------------------
ensure_r2_bucket() {
  local bucket_name="${R2_BUCKET_NAME:-rumaq-receipts}"

  if $DRY_RUN; then
    ok "Skipping R2 bucket check in dry-run mode."
    return
  fi

  log "Ensuring R2 bucket \"${bucket_name}\"..."
  cd "$BACKEND_DIR"
  result=$(bun --no-deprecation "$ROOT_DIR/scripts/deploy/deploy-cf.js" r2-ensure)
  if [[ $result == "EXISTS" ]]; then
    ok "R2 bucket \"$bucket_name\" already exists."
  else
    ok "Created R2 bucket \"$bucket_name\"."
  fi
  cd "$ROOT_DIR"
}

# ------------------------------------------------------------------
# Validate required deploy variables
# ------------------------------------------------------------------
validate_deploy_env() {
  if [[ -z "${WORKER_URL:-}" ]]; then
    echo "Error: WORKER_URL is empty. Cannot build frontend with an empty API base."
    exit 1
  fi
}

# ------------------------------------------------------------------
# Put secrets on the Worker (standalone Worker, not Pages)
# ------------------------------------------------------------------
put_worker_secrets() {
  log "Setting Worker secrets for ${WORKER_NAME}..."

  if $DRY_RUN; then
    ok "Skipping secret upload in dry-run mode."
    return
  fi

  for key in GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET WORKER_JWT_SECRET WORKER_ENCRYPTION_KEY; do
    val="${!key:-}"
    if [ -n "$val" ]; then
      printf '%s' "$val" | bunx wrangler secret put "$key" --name "$WORKER_NAME" > /dev/null 2>&1 || true
      echo "  ✓  $key"
    else
      echo "  -  $key (skipped — not set)"
    fi
  done

  ok "Worker secrets set."
}

# ------------------------------------------------------------------
# Deploy Worker to Cloudflare
# ------------------------------------------------------------------
deploy_worker() {
  log "Deploying Worker (name: ${WORKER_NAME})..."

  if [[ ! -f $BACKEND_DIR/wrangler.cloudflare.toml ]]; then
    echo "Error: backend/wrangler.cloudflare.toml not found."
    echo "Run \`./scripts/deploy.sh cloudflare\` first to create it."
    exit 1
  fi

  local config_file
  config_file=$(resolve_wrangler_config)

  # shellcheck disable=SC2064
  trap "rm -f '$config_file'" EXIT INT TERM

  local dry_run_flag=""
  if $DRY_RUN; then
    dry_run_flag="--dry-run"
  fi

  # shellcheck disable=SC2086
  bunx wrangler deploy \
    --config "$config_file" \
    --name "$WORKER_NAME" \
    --var PAGES_ORIGIN:"$PAGES_ORIGIN" \
    ${dry_run_flag}

  rm -f "$config_file"
  trap - EXIT INT TERM

  if $DRY_RUN; then
    ok "Worker dry-run build succeeded."
  else
    ok "Worker deployed to ${WORKER_URL}."
  fi
}

# ------------------------------------------------------------------
# Build frontend (no deploy)
# ------------------------------------------------------------------
build_frontend() {
  log "Building frontend with Worker URL: ${WORKER_URL}..."
  bun install --frozen-lockfile
  VITE_API_BASE="$WORKER_URL" bunx vp build frontend
  ok "Frontend build succeeded."
}

# ------------------------------------------------------------------
# Deploy built frontend to Cloudflare Pages (static only)
# ------------------------------------------------------------------
pages_deploy() {
  log "Deploying static assets to Cloudflare Pages (project: ${PAGES_PROJECT}, branch: ${PAGES_BRANCH})..."
  wrangler pages deploy frontend/dist \
    --project-name "$PAGES_PROJECT" \
    --branch "$PAGES_BRANCH" \
    --no-bundle
  ok "Frontend deployed to ${PAGES_ORIGIN}."
}

# ------------------------------------------------------------------
# Build & deploy frontend to Cloudflare Pages (static only)
# ------------------------------------------------------------------
deploy_frontend() {
  build_frontend
  pages_deploy
}

# ------------------------------------------------------------------
# Dry-run validation for Cloudflare deploy
# ------------------------------------------------------------------
validate_cloudflare_deploy() {
  echo "=== RumaQ: Cloudflare deploy dry-run ==="
  check_prereqs
  ensure_wrangler_toml cloudflare
  validate_deploy_env
  install_deps

  log "Validating Worker build..."
  local config_file
  config_file=$(resolve_wrangler_config)

  # shellcheck disable=SC2064
  trap "rm -f '$config_file'" EXIT INT TERM

  bunx wrangler deploy \
    --config "$config_file" \
    --name "$WORKER_NAME" \
    --var PAGES_ORIGIN:"$PAGES_ORIGIN" \
    --dry-run

  rm -f "$config_file"
  trap - EXIT INT TERM

  log "Validating frontend build..."
  build_frontend
  ok "Dry-run complete. No resources were deployed."
}

# ------------------------------------------------------------------
# Check Cloudflare login
# ------------------------------------------------------------------
check_login() {
  if [ -n "$CLOUDFLARE_API_TOKEN" ]; then
    ok "Authenticated via CLOUDFLARE_API_TOKEN."
    return 0
  fi
  if ! wrangler whoami &> /dev/null; then
    echo "Error: not logged in to Cloudflare."
    echo "Set CLOUDFLARE_API_TOKEN or run: wrangler login"
    exit 1
  fi
  ok "Logged in to Cloudflare."
}

# ------------------------------------------------------------------
# Print summary after local setup
# ------------------------------------------------------------------
summary_local() {
  echo ""
  echo "============================================"
  echo "  Local environment ready!"
  echo "============================================"
  echo ""
  echo "  Start the dev servers:"
  echo "    bunx vp run dev"
  echo ""
  echo "  Make sure backend/.dev.vars has real secrets."
  echo "============================================"
}

# ------------------------------------------------------------------
# Print summary after Cloudflare deploy
# ------------------------------------------------------------------
summary_cloudflare() {
  echo ""
  echo "============================================"
  echo "  Cloudflare deployment complete!"
  echo "============================================"
  echo ""
  echo "  API Worker: ${WORKER_URL}"
  echo "  Frontend:   ${PAGES_ORIGIN}"
  echo ""
  echo "  Verify health: curl -I ${WORKER_URL}/api/health"
  echo "============================================"
}

# ------------------------------------------------------------------
# Prepare local environment (idempotent)
# ------------------------------------------------------------------
prepare_local() {
  check_prereqs
  ensure_wrangler_toml local
  ensure_dev_vars
  install_deps
  setup_database_local
  build_frontend
  summary_local
}

# ==================================================================
# MODE: cloudflare
# ==================================================================
do_cloudflare() {
  echo "=== RumaQ: Cloudflare deployment ==="
  check_prereqs
  check_login
  ensure_wrangler_toml cloudflare
  install_deps
  validate_deploy_env
  setup_database_remote
  ensure_r2_bucket
  put_worker_secrets
  deploy_worker
  build_frontend
  if ! $DRY_RUN; then
    pages_deploy
  fi
  summary_cloudflare
}

# ==================================================================
# MODE: local – run both servers concurrently
# ==================================================================
do_local() {
  echo "=== RumaQ: local environment ==="
  prepare_local

  cleanup() {
    echo ""
    log "Shutting down dev servers..."
    kill $FRONTEND_PID $BACKEND_PID 2> /dev/null || true
    wait $FRONTEND_PID $BACKEND_PID 2> /dev/null || true
  }
  trap cleanup EXIT INT TERM

  log "Starting frontend (Vite) on http://localhost:5173..."
  bunx vp dev frontend &
  FRONTEND_PID=$!

  log "Starting backend (Worker) on http://localhost:8787..."
  bunx vp dev backend &
  BACKEND_PID=$!

  echo ""
  echo "  Frontend: http://localhost:5173"
  echo "  Backend:  http://localhost:8787"
  echo "  Press Ctrl+C to stop both."
  echo ""

  wait $FRONTEND_PID $BACKEND_PID
}

do_dry_run() {
  DRY_RUN=true
  do_cloudflare
}

# ==================================================================
# Main dispatch
# ==================================================================
case "$MODE" in
  local | "")
    do_local
    ;;
  cloudflare)
    do_cloudflare
    ;;
  dry-run)
    do_dry_run
    ;;
  frontend)
    build_frontend
    if ! $DRY_RUN; then
      pages_deploy
    fi
    ;;
  *)
    echo "Unknown mode: $MODE"
    echo "Usage: $0 [local|cloudflare|dry-run|frontend] [--dry-run]"
    exit 1
    ;;
esac

echo ""
echo "=== Done ==="
