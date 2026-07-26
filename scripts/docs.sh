#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT_DIR"
bunx tsx scripts/docs/generate-api-docs.ts
vp fmt --write docs/API.md > /dev/null
