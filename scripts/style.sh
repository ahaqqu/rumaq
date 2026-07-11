#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

ensure_deps() {
  if npx --no-install prettier --version > /dev/null 2>&1 && npx --no-install eslint --version > /dev/null 2>&1; then
    return
  fi
  echo "==> Installing style dependencies"
  npm install --no-fund --include=dev
}

ensure_deps

CHECK=false
if [[ "${1:-}" == "--check" ]]; then
  CHECK=true
fi

PRETTY_CMD="npx prettier"
ESLINT_CMD="npx eslint"

if $CHECK; then
  echo "==> Checking formatting and style"
  $PRETTY_CMD --check .
  $ESLINT_CMD .
else
  echo "==> Formatting code (frontend, backend, shell, docs)"
  $PRETTY_CMD --write .
  echo "==> Auto-fixing lint issues"
  $ESLINT_CMD . --fix
fi

echo "==> Style OK"
