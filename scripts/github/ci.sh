#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

echo "=== CI: style check ==="
bash "$ROOT_DIR/scripts/style.sh" --check

echo "=== CI: docs check ==="
bash "$ROOT_DIR/scripts/docs.sh"
git diff --exit-code docs/API.md

echo "=== CI: frontend tests ==="
"$ROOT_DIR/scripts/test.sh" unit frontend --coverage

echo "=== CI: backend tests ==="
"$ROOT_DIR/scripts/test.sh" unit backend --coverage

echo "=== CI: audit ==="
bun audit --ignore=CVE-2026-14257

echo "=== CI: build ==="
bash "$ROOT_DIR/scripts/build.sh"

echo "=== CI: passed ==="
