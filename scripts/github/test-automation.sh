#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

echo "=== Test Automation: integration & E2E ==="
"$ROOT_DIR/scripts/test.sh" automation-local
