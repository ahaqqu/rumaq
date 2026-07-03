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
#   ./automation/scripts/test-local.sh              # run everything
#   ./automation/scripts/test-local.sh --build      # rebuild images before running
#   ./automation/scripts/test-local.sh --down       # tear down containers
#   ./automation/scripts/test-local.sh --api        # run API tests only (needs stack)
#   ./automation/scripts/test-local.sh --e2e        # run E2E tests only (needs stack)
#
# Prerequisites:
#   - Docker + Docker Compose
# ============================================================

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/automation/docker-compose.yml"
MODE="${1:-run}"
# Strip leading -- for convenience (--build → build)
MODE="${MODE#--}"

require_cmd() {
  if ! command -v "$1" &>/dev/null; then
    echo "Error: $1 is not installed. $2"
    exit 1
  fi
}

info()  { echo -e "==> $1"; }
ok()    { echo -e "  ✓  $1"; }
fail()  { echo -e "  ✗  $1"; }

install_docker() {
  info "Docker not found. Attempting auto-install..."
  if command -v curl &>/dev/null; then
    curl -fsSL https://get.docker.com | sh
  elif command -v wget &>/dev/null; then
    wget -qO- https://get.docker.com | sh
  elif command -v apt &>/dev/null; then
    sudo apt update && sudo apt install -y docker.io docker-compose-v2
  elif command -v dnf &>/dev/null; then
    sudo dnf install -y docker docker-compose
  elif command -v yum &>/dev/null; then
    sudo yum install -y docker docker-compose-plugin
  elif command -v pacman &>/dev/null; then
    sudo pacman -S --noconfirm docker docker-compose
  elif command -v zypper &>/dev/null; then
    sudo zypper install -y docker docker-compose
  elif command -v apk &>/dev/null; then
    sudo apk add docker docker-compose
  else
    fail "Could not auto-install Docker. Install manually: https://docs.docker.com/get-docker/"
    exit 1
  fi
  sudo systemctl enable --now docker 2>/dev/null || sudo rc-update add docker boot 2>/dev/null || true
  if ! groups "$USER" 2>/dev/null | grep -q docker; then
    sudo usermod -aG docker "$USER"
    info "Added $USER to docker group. Log out and back in, or run 'newgrp docker'."
  fi
  ok "Docker installed."
}

if ! command -v docker &>/dev/null; then
  install_docker
fi

# ------------------------------------------------------------------
# Check Docker group membership (permission fix)
# ------------------------------------------------------------------
if ! docker info &>/dev/null; then
  docker_err="$(docker info 2>&1)"
  if echo "$docker_err" | grep -qi "permission denied" 2>/dev/null; then
    info "Adding $USER to the docker group..."
    sudo usermod -aG docker "$USER"
    ok "User added to docker group. Log out and back in, or run 'newgrp docker'."
    info "After re-login, re-run this script."
    exit 0
  fi
fi

cd "$ROOT_DIR"

# ------------------------------------------------------------------
# Check Docker is running
# ------------------------------------------------------------------
if ! docker info &>/dev/null; then
  info "Docker is not running. Attempting to start it..."
  if command -v systemctl &>/dev/null; then
    sudo systemctl start docker
  elif command -v service &>/dev/null; then
    sudo service docker start
  elif command -v rc-service &>/dev/null; then
    sudo rc-service docker start
  else
    fail "Could not start Docker automatically. Start Docker manually and try again."
    exit 1
  fi
  # Wait for Docker to be ready
  for i in $(seq 1 10); do
    if docker info &>/dev/null; then
      ok "Docker is now running."
      break
    fi
    sleep 1
  done
  if ! docker info &>/dev/null; then
    fail "Docker still not running after 10s. Check 'sudo journalctl -u docker' for errors."
    exit 1
  fi
fi

# ------------------------------------------------------------------
# Dispatch
# ------------------------------------------------------------------
case "$MODE" in
  run)
    info "Running full test suite (API integration + E2E) via Docker..."
    docker compose -f "$COMPOSE_FILE" up --build --abort-on-container-exit
    EXIT_CODE=$?

    # Generate HTML report from vitest JSON (mounted volume)
    if [ -f "$ROOT_DIR/automation/test-results/vitest/api-results.json" ]; then
      node "$ROOT_DIR/automation/scripts/generate-test-report.js" 2>/dev/null && \
        ok "HTML report: automation/test-results/test-report.html" || true
    fi

    if [[ $EXIT_CODE -eq 0 ]]; then
      echo ""
      ok "All tests passed!"
    else
      echo ""
      fail "Tests failed (exit code $EXIT_CODE)."
      info "Check test-results/ for details."
    fi
    exit $EXIT_CODE
    ;;

  build)
    info "Building Docker images..."
    docker compose -f "$COMPOSE_FILE" build
    ok "Images built. Run ./automation/scripts/test-local.sh to start tests."
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
