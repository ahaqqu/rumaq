#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# RumaQ local test automation runner
# ============================================================
# Builds and runs the full Docker test suite locally:
#   - API via Miniflare (real D1/R2)
#   - Web via nginx (production Vite build)
#   - Reverse proxy on localhost:3000
#   - API integration tests (Vitest + fetch)
#   - E2E smoke test (Playwright)
#
# Usage:
#   ./scripts/test-local.sh              # run everything
#   ./scripts/test-local.sh --build      # rebuild images before running
#   ./scripts/test-local.sh --down       # tear down containers
#   ./scripts/test-local.sh --api        # run API tests only (needs stack)
#   ./scripts/test-local.sh --e2e        # run E2E tests only (needs stack)
#
# Prerequisites:
#   - Docker + Docker Compose
# ============================================================

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.test.yml"
MODE="${1:-run}"

require_cmd() {
  if ! command -v "$1" &>/dev/null; then
    echo "Error: $1 is not installed. $2"
    exit 1
  fi
}

info()  { echo -e "==> $1"; }
ok()    { echo -e "  ✓  $1"; }
fail()  { echo -e "  ✗  $1"; }

require_cmd docker "Install Docker: https://docs.docker.com/get-docker/"

cd "$ROOT_DIR"

# ------------------------------------------------------------------
# Check Docker is running
# ------------------------------------------------------------------
if ! docker info &>/dev/null; then
  fail "Docker is not running. Start Docker and try again."
  exit 1
fi

# ------------------------------------------------------------------
# Dispatch
# ------------------------------------------------------------------
case "$MODE" in
  run)
    info "Running full test suite (API integration + E2E) via Docker..."
    docker compose -f "$COMPOSE_FILE" up --build --abort-on-container-exit
    EXIT_CODE=$?

    if [[ $EXIT_CODE -eq 0 ]]; then
      echo ""
      ok "All tests passed!"
    else
      echo ""
      fail "Tests failed (exit code $EXIT_CODE)."
      info "Check playwright-report/ and test-results/ for details."
    fi
    exit $EXIT_CODE
    ;;

  build)
    info "Building Docker images..."
    docker compose -f "$COMPOSE_FILE" build
    ok "Images built. Run ./scripts/test-local.sh to start tests."
    ;;

  down)
    info "Tearing down test containers..."
    docker compose -f "$COMPOSE_FILE" down --volumes --remove-orphans
    ok "Containers removed."
    ;;

  api)
    info "Starting stack and running API integration tests..."
    docker compose -f "$COMPOSE_FILE" up --build -d api web proxy
    sleep 5
    info "Running: npm run test:api against http://localhost:3000"
    npm run test:api
    docker compose -f "$COMPOSE_FILE" down --volumes
    ;;

  e2e)
    info "Starting stack and running E2E tests..."
    docker compose -f "$COMPOSE_FILE" up --build -d api web proxy
    sleep 5
    info "Running: npm run test:e2e against http://localhost:3000"
    npm run test:e2e
    docker compose -f "$COMPOSE_FILE" down --volumes
    ;;

  *)
    echo "Usage: $0 [--build|--down|--api|--e2e]"
    echo ""
    echo "  (no flag)  Full Docker test suite"
    echo "  --build    Build images only"
    echo "  --down     Tear down containers"
    echo "  --api      API integration tests only"
    echo "  --e2e      E2E tests only"
    exit 1
    ;;
esac
