#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

CHECK=false
if [[ "${1:-}" == "--check" ]]; then
  CHECK=true
fi

if $CHECK; then
  echo "==> Checking formatting, lint, and types"
  vp check
else
  echo "==> Formatting and auto-fixing code"
  vp check --fix
fi

echo "==> Style OK"
