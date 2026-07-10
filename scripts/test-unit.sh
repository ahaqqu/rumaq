#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

WORKSPACE="${1:-all}"
shift || true

case "$WORKSPACE" in
  frontend)
    cd "$ROOT_DIR/frontend" && npx vitest run "$@"
    ;;
  backend)
    cd "$ROOT_DIR/backend" && npx vitest run "$@"
    ;;
  all)
    cd "$ROOT_DIR/frontend" && npx vitest run "$@"
    cd "$ROOT_DIR/backend" && npx vitest run "$@"
    ;;
  *)
    echo "Usage: $0 [frontend|backend|all] [vitest args...]"
    exit 1
    ;;
esac
