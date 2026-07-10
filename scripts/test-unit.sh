#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT_DIR/frontend" && npx vitest run
cd "$ROOT_DIR/backend" && npx vitest run
