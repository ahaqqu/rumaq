#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# RumaQ deploy – local dev setup & Cloudflare deployment
# ============================================================
# Idempotent: run from a clean checkout (first time) or to
# update an existing local / Cloudflare deployment.
#
# Usage:
#   ./scripts/deploy.sh              # local + cloudflare
#   ./scripts/deploy.sh local        # setup local dev environment
#   ./scripts/deploy.sh dev          # run both dev servers concurrently
#   ./scripts/deploy.sh cloudflare   # deploy (or update) Cloudflare
#   ./scripts/deploy.sh all          # same as default
#   ./scripts/deploy.sh dry-run      # build frontend only
# ============================================================

MODE="${1:-all}"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WORKER_DIR="$ROOT_DIR/worker"

# Load .env from project root (CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, etc.)
if [[ -f $ROOT_DIR/.env ]]; then
  set -a
  source "$ROOT_DIR/.env"
  set +a
fi

DB_NAME="${D1_DATABASE_NAME:-rumaq}"
PAGES_PROJECT="${PAGES_PROJECT_NAME:-rumaq}"

cd "$ROOT_DIR"

# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------
require_cmd() {
  if ! command -v "$1" &>/dev/null; then
    echo "Error: $1 is not installed. $2"
    exit 1
  fi
}

info()  { echo -e "==> $1"; }
ok()    { echo -e "  ok  $1"; }
warn()  { echo -e "  warn $1"; }

wrangler_cmd() {
  local db=$1; shift
  wrangler d1 migrations apply "$db" "$@"
}

# ------------------------------------------------------------------
# Prerequisites
# ------------------------------------------------------------------
check_prereqs() {
  require_cmd node "Install Node.js (https://nodejs.org)."
  require_cmd npm "Install Node.js first."
  require_cmd wrangler "Install Wrangler: npm install -g wrangler"
}

# ------------------------------------------------------------------
# wrangler.toml – create from example if missing
# ------------------------------------------------------------------
ensure_wrangler_toml() {
  local mode=$1
  if [[ -f $WORKER_DIR/wrangler.toml ]]; then
    return
  fi

  info "worker/wrangler.toml not found – creating from example."

  if [[ ! -f $WORKER_DIR/wrangler.toml.example ]]; then
    echo "Error: worker/wrangler.toml.example not found."
    exit 1
  fi

  cp "$WORKER_DIR/wrangler.toml.example" "$WORKER_DIR/wrangler.toml"

  if [[ $mode == local ]]; then
    sed -i \
      -e 's/YOUR_ACCOUNT_ID/LOCAL/' \
      -e 's/YOUR_DATABASE_ID/00000000-0000-0000-0000-000000000000/' \
      "$WORKER_DIR/wrangler.toml"
    ok "Created worker/wrangler.toml with local defaults."
  else
    local account_id="${CLOUDFLARE_ACCOUNT_ID:-}"
    if [[ -z $account_id ]]; then
      read -r -p "Cloudflare account ID: " account_id
    fi
    sed -i "s|YOUR_ACCOUNT_ID|$account_id|" "$WORKER_DIR/wrangler.toml"

    # database_id will be filled by setup_database_remote later.
    ok "Created worker/wrangler.toml (account_id set)."
  fi
}

# ------------------------------------------------------------------
# .dev.vars – create template for local dev if missing
# ------------------------------------------------------------------
ensure_dev_vars() {
  if [[ -f $WORKER_DIR/.dev.vars ]]; then
    return
  fi

  info "worker/.dev.vars not found – creating template."

  cat > "$WORKER_DIR/.dev.vars" <<-EOF
# Local-only secrets for \`wrangler dev\`.
# Obtain real values from your Google Cloud Console and generate strong
# random strings for JWT and encryption secrets.
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
WORKER_JWT_SECRET=
WORKER_ENCRYPTION_KEY=
EOF

  warn "worker/.dev.vars created with placeholder values."
  warn "Edit worker/.dev.vars with real secrets before running the dev server."
}

# ------------------------------------------------------------------
# Dependencies
# ------------------------------------------------------------------
install_deps() {
  info "Installing frontend dependencies..."
  npm install

  info "Installing worker dependencies..."
  cd "$WORKER_DIR"
  npm install
  cd "$ROOT_DIR"
}

# ------------------------------------------------------------------
# Database – local (via Miniflare / --local)
# ------------------------------------------------------------------
setup_database_local() {
  info "Setting up local D1 database (${DB_NAME})..."

  # wrangler.d1.migrations.apply --local is idempotent
  cd "$WORKER_DIR"
  wrangler_cmd "$DB_NAME" --local
  cd "$ROOT_DIR"

  ok "Local database ready."
}

# ------------------------------------------------------------------
# Database – remote (Cloudflare D1)
# ------------------------------------------------------------------
setup_database_remote() {
  info "Setting up remote D1 database (${DB_NAME})..."

  cd "$WORKER_DIR"

  # Ensure database_id is set in wrangler.toml.
  local db_id
  db_id=$(grep -oP 'database_id\s*=\s*"\K[^"]+' "$WORKER_DIR/wrangler.toml" 2>/dev/null || true)

  if [[ $db_id == "YOUR_DATABASE_ID" || -z $db_id ]]; then
    # Fetch or create the remote D1 database.
    if wrangler d1 list --json 2>/dev/null | grep -q "\"name\": *\"$DB_NAME\""; then
      ok "Remote database \"$DB_NAME\" already exists – fetching its ID."
      db_id=$(wrangler d1 list --json 2>/dev/null \
              | grep -oP "\"name\": *\"$DB_NAME\".*?\"uuid\": *\"\K[^\"]+" \
              | head -1 || true)
    else
      echo "Creating remote D1 database \"$DB_NAME\"..."
      local create_out
      create_out=$(wrangler d1 create "$DB_NAME" 2>&1)
      echo "$create_out"
      db_id=$(echo "$create_out" | grep -oP 'database_id\s*=\s*"\K[^"]+' || true)
    fi

    if [[ -n $db_id ]]; then
      sed -i "s|database_id = \".*\"|database_id = \"$db_id\"|" "$WORKER_DIR/wrangler.toml"
      ok "Updated database_id in wrangler.toml."
    else
      warn "Could not determine database_id."
      warn "Manually copy the database_id into worker/wrangler.toml."
    fi
  fi

  # Apply migrations remotely (no --local flag)
  wrangler_cmd "$DB_NAME"

  cd "$ROOT_DIR"
}

# ------------------------------------------------------------------
# R2 bucket – create if missing
# ------------------------------------------------------------------
ensure_r2_bucket() {
  local bucket_name="${R2_BUCKET_NAME:-rumaq-receipts}"

  info "Ensuring R2 bucket \"${bucket_name}\"..."

  cd "$WORKER_DIR"

  if wrangler r2 bucket list --json 2>/dev/null | grep -q "\"name\": *\"$bucket_name\""; then
    ok "R2 bucket \"$bucket_name\" already exists."
  else
    wrangler r2 bucket create "$bucket_name"
    ok "Created R2 bucket \"$bucket_name\"."
  fi

  cd "$ROOT_DIR"
}

# ------------------------------------------------------------------
# Deploy Worker to Cloudflare
# ------------------------------------------------------------------
deploy_worker() {
  info "Deploying Worker..."

  cd "$WORKER_DIR"

  if [[ ! -f wrangler.toml ]]; then
    echo "Error: worker/wrangler.toml not found."
    echo "Run \`./scripts/deploy.sh cloudflare\` first to create it."
    exit 1
  fi

  npm run deploy
  cd "$ROOT_DIR"
  ok "Worker deployed."
}

# ------------------------------------------------------------------
# Build & deploy frontend to Cloudflare Pages
# ------------------------------------------------------------------
deploy_frontend() {
  info "Building frontend..."
  npm install
  npm run build

  info "Deploying to Cloudflare Pages (project: ${PAGES_PROJECT})..."
  wrangler pages deploy dist --project-name "$PAGES_PROJECT"
  ok "Frontend deployed."
}

# ------------------------------------------------------------------
# Build frontend (no deploy)
# ------------------------------------------------------------------
build_frontend() {
  info "Building frontend (dry-run)..."
  npm install
  npm run build
  ok "Frontend build succeeded (no deployment was made)."
}

# ------------------------------------------------------------------
# Check Cloudflare login
# ------------------------------------------------------------------
check_login() {
  if [ -n "$CLOUDFLARE_API_TOKEN" ]; then
    ok "Authenticated via CLOUDFLARE_API_TOKEN."
    return 0
  fi
  if ! wrangler whoami &>/dev/null; then
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
  echo "    Frontend (Vite):      npm run dev"
  echo "    Backend  (Worker):    cd worker && npm run dev"
  echo ""
  echo "  Make sure worker/.dev.vars has real secrets."
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
  echo "  Remind: set production secrets via:"
  echo "    cd worker && wrangler secret put GOOGLE_CLIENT_ID"
  echo "    cd worker && wrangler secret put GOOGLE_CLIENT_SECRET"
  echo "    cd worker && wrangler secret put WORKER_JWT_SECRET"
  echo "    cd worker && wrangler secret put WORKER_ENCRYPTION_KEY"
  echo ""
  echo "  Verify at your Pages URL:"
  echo "    https://${PAGES_PROJECT}.pages.dev"
  echo "============================================"
}

# ==================================================================
# MODE: local
# ==================================================================
do_local() {
  echo "=== RumaQ: local environment setup ==="
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
  setup_database_remote
  ensure_r2_bucket
  deploy_worker
  deploy_frontend
  summary_cloudflare
}

# ==================================================================
# MODE: dev – run both servers concurrently
# ==================================================================
do_dev() {
  echo "=== RumaQ: dev servers ==="
  check_prereqs

  cleanup() {
    echo ""
    info "Shutting down dev servers..."
    kill $FRONTEND_PID $BACKEND_PID 2>/dev/null || true
    wait $FRONTEND_PID $BACKEND_PID 2>/dev/null || true
  }
  trap cleanup EXIT INT TERM

  info "Starting frontend (Vite) on http://localhost:5173..."
  npm run dev &
  FRONTEND_PID=$!

  info "Starting backend (Worker) on http://localhost:8787..."
  cd "$WORKER_DIR"
  npm run dev &
  BACKEND_PID=$!
  cd "$ROOT_DIR"

  echo ""
  echo "  Frontend: http://localhost:5173"
  echo "  Backend:  http://localhost:8787"
  echo "  Press Ctrl+C to stop both."
  echo ""

  wait $FRONTEND_PID $BACKEND_PID
}

do_dry_run() {
  echo "=== RumaQ: dry-run (build only) ==="
  check_prereqs
  build_frontend
}

# ==================================================================
# Main dispatch
# ==================================================================
case "$MODE" in
  all|"")
    do_local
    echo ""
    do_cloudflare
    ;;
  local)
    do_local
    ;;
  dev)
    do_dev
    ;;
  cloudflare)
    do_cloudflare
    ;;
  dry-run)
    do_dry_run
    ;;
  *)
    echo "Unknown mode: $MODE"
    echo "Usage: $0 [all|local|dev|cloudflare|dry-run]"
    exit 1
    ;;
esac

echo ""
echo "=== Done ==="
