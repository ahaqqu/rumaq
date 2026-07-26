#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

WORKSPACE="${1:-all}"
shift || true

case "$WORKSPACE" in
  frontend)
    cd "$ROOT_DIR" && vp test --project frontend "$@"
    ;;
  backend)
    cd "$ROOT_DIR" && vp test --project backend "$@"
    ;;
  all)
    cd "$ROOT_DIR" && vp test --project frontend "$@"
    cd "$ROOT_DIR" && vp test --project backend "$@"
    ;;
  *)
    echo "Usage: $0 [frontend|backend|all] [vitest args...]"
    exit 1
    ;;
esac
