#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

echo "=== Smoke: live automation tests ==="
"$ROOT_DIR/scripts/test.sh" automation-live
